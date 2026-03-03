const RiskScore = require('../models/RiskScore');
const Incident = require('../models/Incident');
const Resource = require('../models/Resource');
const Assignment = require('../models/Assignment');
const eventStore = require('./eventStore');

/**
 * Dynamic Risk Scoring Engine
 * Calculates real-time risk scores for incidents
 */
class RiskEngine {
    constructor() {
        this.updateInterval = null;
    }

    /**
     * Start automatic risk score calculation for all active incidents
     */
    startAutoUpdate(intervalSeconds = 15) {
        if (this.updateInterval) {
            clearInterval(this.updateInterval);
        }

        console.log(`📊 Starting risk score auto-update (every ${intervalSeconds}s)`);

        this.updateInterval = setInterval(async () => {
            await this.updateAllActiveIncidents();
        }, intervalSeconds * 1000);
    }

    /**
     * Stop automatic updates
     */
    stopAutoUpdate() {
        if (this.updateInterval) {
            clearInterval(this.updateInterval);
            this.updateInterval = null;
        }
    }

    /**
     * Update risk scores for all active incidents
     */
    async updateAllActiveIncidents() {
        const activeIncidents = await Incident.find({
            status: { $in: ['reported', 'assigned', 'active'] }
        });

        for (const incident of activeIncidents) {
            await this.calculateRiskScore(incident.incidentId);
        }
    }

    /**
     * Calculate risk score for a specific incident
     * Formula: weighted sum of severity, delay, resource stress, environmental factors
     */
    async calculateRiskScore(incidentId) {
        const incident = await Incident.findOne({ incidentId });
        if (!incident) {
            throw new Error('Incident not found');
        }

        // Get previous risk score for trend analysis
        const previousScore = await RiskScore.findOne({ incidentId })
            .sort({ calculatedAt: -1 });

        // 1. Base severity factor (0-30 points per severity level)
        const severityScore = incident.severity * 30;

        // 2. Response delay factor (2 points per minute)
        const now = new Date();
        const reportedAt = incident.reportedAt;
        const responseDelayMinutes = (now - reportedAt) / (1000 * 60);
        const delayScore = Math.min(responseDelayMinutes * 2, 50); // Cap at 50

        // 3. Resource stress index (0-20 points based on system load)
        const resourceStressScore = await this.calculateResourceStress();

        // 4. Environmental factors (0-10 points)
        // In real system: weather, traffic, time of day
        // For demo: random 0-10
        const environmentalScore = Math.random() * 10;

        // Calculate total (normalize to 0-100)
        const totalScore = (severityScore + delayScore + resourceStressScore + environmentalScore) / 2.1;
        const normalizedScore = Math.min(Math.max(totalScore, 0), 100);

        // Determine trend
        let trend = 'stable';
        if (previousScore) {
            const diff = normalizedScore - previousScore.score;
            if (diff > 5) trend = 'increasing';
            else if (diff < -5) trend = 'decreasing';
        }

        // Store risk score
        const riskScore = new RiskScore({
            incidentId,
            score: Math.round(normalizedScore),
            factors: {
                severity: Math.round(severityScore),
                responseDelay: Math.round(delayScore),
                resourceStress: Math.round(resourceStressScore),
                environmental: Math.round(environmentalScore)
            },
            trend
        });

        await riskScore.save();

        // Update incident
        incident.riskScore = Math.round(normalizedScore);
        await incident.save();

        // Emit event if score is critical
        if (normalizedScore >= 70) {
            await eventStore.append('RiskScoreUpdated', {
                incidentId,
                score: Math.round(normalizedScore),
                trend,
                level: 'critical'
            });
        }

        return riskScore;
    }

    /**
     * Calculate resource stress index
     * Ratio of active incidents to available resources
     */
    async calculateResourceStress() {
        const [totalResources, availableResources, activeIncidents] = await Promise.all([
            Resource.countDocuments(),
            Resource.countDocuments({ status: 'available' }),
            Incident.countDocuments({ status: { $in: ['reported', 'assigned', 'active'] } })
        ]);

        if (totalResources === 0) return 20; // Max stress if no resources

        const utilizationRatio = (totalResources - availableResources) / totalResources;
        const incidentLoad = activeIncidents / Math.max(availableResources, 1);

        // Combine utilization and incident load
        const stressIndex = (utilizationRatio * 10) + (Math.min(incidentLoad, 2) * 10);

        return Math.min(stressIndex, 20); // Cap at 20 points
    }

    /**
     * Get risk score history for an incident
     */
    async getRiskHistory(incidentId, limit = 20) {
        return await RiskScore.find({ incidentId })
            .sort({ calculatedAt: -1 })
            .limit(limit);
    }

    /**
     * Get current risk distribution across all incidents
     */
    async getRiskDistribution() {
        const activeIncidents = await Incident.find({
            status: { $in: ['reported', 'assigned', 'active'] }
        });

        const distribution = {
            critical: 0,   // 70-100
            high: 0,       // 50-69
            medium: 0,     // 30-49
            low: 0         // 0-29
        };

        for (const incident of activeIncidents) {
            const score = incident.riskScore || 0;
            if (score >= 70) distribution.critical++;
            else if (score >= 50) distribution.high++;
            else if (score >= 30) distribution.medium++;
            else distribution.low++;
        }

        return distribution;
    }
}

module.exports = new RiskEngine();
