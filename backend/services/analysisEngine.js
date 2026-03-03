const PostIncidentAnalysis = require('../models/PostIncidentAnalysis');
const Incident = require('../models/Incident');
const Assignment = require('../models/Assignment');
const Conflict = require('../models/Conflict');
const RiskScore = require('../models/RiskScore');
const eventStore = require('./eventStore');

/**
 * Post-Incident Intelligence Engine
 * Analyzes closed incidents to generate insights and recommendations
 */
class AnalysisEngine {
    /**
     * Perform comprehensive analysis on a closed incident
     */
    async analyzeIncident(incidentId) {
        const incident = await Incident.findOne({ incidentId });
        if (!incident) {
            throw new Error('Incident not found');
        }

        if (incident.status !== 'closed' && incident.status !== 'resolved') {
            throw new Error('Can only analyze closed/resolved incidents');
        }

        console.log(`📊 Analyzing incident ${incidentId}...`);

        // 1. Build timeline from events
        const timeline = await this.buildTimeline(incidentId);

        // 2. Calculate resource utilization
        const resourceUtilization = await this.calculateResourceUtilization(incidentId);

        // 3. Classify failures
        const failureClassification = await this.classifyFailures(incident, timeline, resourceUtilization);

        // 4. Determine root cause
        const rootCause = await this.determineRootCause(incident, failureClassification, timeline);

        // 5. Generate recommendations
        const recommendations = this.generateRecommendations(failureClassification, rootCause);

        // 6. Find similar incidents
        const similarIncidents = await this.findSimilarIncidents(incident);

        // 7. Calculate metrics
        const metrics = this.calculateMetrics(incident, timeline);

        // Store analysis
        const analysis = new PostIncidentAnalysis({
            incidentId,
            timeline,
            resourceUtilization,
            failureClassification,
            rootCause,
            recommendations,
            similarIncidents,
            metrics
        });

        await analysis.save();
        console.log(`✅ Analysis complete for ${incidentId}`);

        return analysis;
    }

    /**
     * Build chronological timeline from events
     */
    async buildTimeline(incidentId) {
        const events = await eventStore.getByIncident(incidentId);

        const timeline = events.map(event => {
            let description = '';
            let delay = 0;

            switch (event.type) {
                case 'IncidentCreated':
                    description = 'Incident reported';
                    break;
                case 'ResourceAssigned':
                    description = `Resources assigned: ${event.payload.assignments?.length || 0}`;
                    break;
                case 'ConflictDetected':
                    description = `Conflict detected: ${event.payload.type}`;
                    break;
                case 'ConflictResolved':
                    description = `Conflict resolved: ${event.payload.strategy}`;
                    break;
                case 'ManualOverride':
                    description = `Manual override by operator`;
                    break;
                case 'IncidentClosed':
                    description = 'Incident closed';
                    break;
            }

            return {
                timestamp: event.timestamp,
                eventType: event.type,
                description,
                delay
            };
        });

        return timeline;
    }

    /**
     * Calculate resource utilization metrics
     */
    async calculateResourceUtilization(incidentId) {
        const assignments = await Assignment.find({ incidentId });
        const incident = await Incident.findOne({ incidentId });

        if (assignments.length === 0) {
            return {
                totalAssigned: 0,
                averageResponseTime: 0,
                idleTime: 0,
                efficiency: 0
            };
        }

        let totalResponseTime = 0;
        let totalIdleTime = 0;

        for (const assignment of assignments) {
            // Response time = assignment time - incident report time
            const responseTime = (assignment.assignedAt - incident.reportedAt) / 1000; // seconds
            totalResponseTime += responseTime;

            // Idle time = completion time - expected arrival time
            if (assignment.completedAt) {
                const expectedArrival = new Date(assignment.assignedAt.getTime() + assignment.travelTime * 1000);
                const idleTime = Math.max(0, (assignment.completedAt - expectedArrival) / 1000);
                totalIdleTime += idleTime;
            }
        }

        const averageResponseTime = Math.round(totalResponseTime / assignments.length);
        const efficiency = Math.min(100, Math.round((1 - totalIdleTime / (totalResponseTime + 1)) * 100));

        return {
            totalAssigned: assignments.length,
            averageResponseTime,
            idleTime: Math.round(totalIdleTime),
            efficiency
        };
    }

    /**
     * Classify types of failures
     */
    async classifyFailures(incident, timeline, resourceUtilization) {
        const failures = {
            detection: false,
            allocation: false,
            coordination: false,
            capacity: false
        };

        // Detection failure: Long time from occurrence to report
        // (For demo, we assume report time is accurate)

        // Allocation failure: Long response time despite available resources
        if (resourceUtilization.averageResponseTime > 600) { // > 10 minutes
            failures.allocation = true;
        }

        // Coordination failure: Conflicts occurred
        const conflicts = await Conflict.countDocuments({
            involvedIncidents: incident.incidentId
        });
        if (conflicts > 0) {
            failures.coordination = true;
        }

        // Capacity failure: No resources available
        if (resourceUtilization.totalAssigned === 0) {
            failures.capacity = true;
        }

        return failures;
    }

    /**
     * Determine root cause using rule-based logic
     */
    async determineRootCause(incident, failures, timeline) {
        if (failures.capacity) {
            return 'Insufficient resource capacity - all resources were occupied';
        }

        if (failures.coordination && failures.allocation) {
            return 'Resource contention led to allocation delays';
        }

        if (failures.coordination) {
            return 'Coordination conflicts between multiple departments';
        }

        if (failures.allocation) {
            return 'Suboptimal resource allocation algorithm performance';
        }

        if (failures.detection) {
            return 'Delayed incident detection';
        }

        return 'No significant failures detected - normal response';
    }

    /**
     * Generate actionable recommendations
     */
    generateRecommendations(failures, rootCause) {
        const recommendations = [];

        if (failures.capacity) {
            recommendations.push('Increase resource pool in this zone');
            recommendations.push('Pre-position resources during high-demand periods');
        }

        if (failures.coordination) {
            recommendations.push('Improve inter-department coordination protocols');
            recommendations.push('Establish clearer priority rules');
        }

        if (failures.allocation) {
            recommendations.push('Optimize resource assignment algorithm weights');
            recommendations.push('Consider predictive pre-positioning');
        }

        if (failures.detection) {
            recommendations.push('Enhance detection mechanisms');
            recommendations.push('Deploy additional sensors in this area');
        }

        if (recommendations.length === 0) {
            recommendations.push('Continue current procedures - response was effective');
        }

        return recommendations;
    }

    /**
     * Find similar past incidents for pattern matching
     */
    async findSimilarIncidents(incident, limit = 3) {
        const candidates = await Incident.find({
            incidentId: { $ne: incident.incidentId },
            type: incident.type,
            status: { $in: ['closed', 'resolved'] }
        }).limit(20);

        // Score similarity
        const scored = candidates.map(candidate => {
            let similarityScore = 0;

            // Same type: +40
            similarityScore += 40;

            // Similar severity: +30
            const severityDiff = Math.abs(candidate.severity - incident.severity);
            similarityScore += Math.max(0, 30 - severityDiff * 10);

            // Similar location (within 2km): +30
            const distance = this.calculateDistance(
                incident.location.lat,
                incident.location.lng,
                candidate.location.lat,
                candidate.location.lng
            );
            if (distance < 2000) {
                similarityScore += Math.max(0, 30 * (1 - distance / 2000));
            }

            return {
                incidentId: candidate.incidentId,
                similarity: similarityScore / 100, // Normalize to 0-1
                outcome: candidate.status
            };
        });

        // Sort by similarity
        scored.sort((a, b) => b.similarity - a.similarity);

        return scored.slice(0, limit);
    }

    /**
     * Calculate key metrics
     */
    calculateMetrics(incident, timeline) {
        const reportTime = incident.reportedAt;
        const resolveTime = incident.resolvedAt || incident.closedAt || new Date();

        const totalDuration = Math.round((resolveTime - reportTime) / 1000);

        // Find first resource assignment event
        const firstAssignment = timeline.find(e => e.eventType === 'ResourceAssigned');
        const responseTime = firstAssignment
            ? Math.round((new Date(firstAssignment.timestamp) - reportTime) / 1000)
            : totalDuration;

        const resolutionTime = totalDuration;

        const conflictsCount = timeline.filter(e => e.eventType === 'ConflictDetected').length;
        const manualOverridesCount = timeline.filter(e => e.eventType === 'ManualOverride').length;

        return {
            totalDuration,
            responseTime,
            resolutionTime,
            conflictsCount,
            manualOverridesCount
        };
    }

    calculateDistance(lat1, lng1, lat2, lng2) {
        const R = 6371e3;
        const φ1 = lat1 * Math.PI / 180;
        const φ2 = lat2 * Math.PI / 180;
        const Δφ = (lat2 - lat1) * Math.PI / 180;
        const Δλ = (lng2 - lng1) * Math.PI / 180;

        const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
            Math.cos(φ1) * Math.cos(φ2) *
            Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

        return R * c;
    }

    /**
     * Get analysis for an incident
     */
    async getAnalysis(incidentId) {
        return await PostIncidentAnalysis.findOne({ incidentId });
    }

    /**
     * Get all analyses with filters
     */
    async getAllAnalyses(filters = {}) {
        const query = {};

        if (filters.startDate && filters.endDate) {
            query.analyzedAt = {
                $gte: new Date(filters.startDate),
                $lte: new Date(filters.endDate)
            };
        }

        return await PostIncidentAnalysis.find(query)
            .sort({ analyzedAt: -1 })
            .limit(filters.limit || 50);
    }
}

module.exports = new AnalysisEngine();
