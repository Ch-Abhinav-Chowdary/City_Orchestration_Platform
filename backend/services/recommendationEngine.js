const Incident = require('../models/Incident');
const PostIncidentAnalysis = require('../models/PostIncidentAnalysis');
const Assignment = require('../models/Assignment');

/**
 * Enhanced Recommendation Engine
 * Suggests actions for active incidents based on similar past incidents
 * with confidence scoring and success rate tracking
 */
class RecommendationEngine {
    constructor() {
        // Track individual recommendation outcomes
        this.recommendationHistory = new Map();
        // Track aggregated pattern-level success rates
        // Key: patternKey, Value: { total, successful }
        this.patternSuccessStore = new Map();
    }

    /**
     * Get recommendations for an active incident with confidence scores
     */
    async getRecommendations(incidentId) {
        const incident = await Incident.findOne({ incidentId });
        if (!incident) {
            throw new Error('Incident not found');
        }

        console.log(`💡 Generating enhanced recommendations for ${incidentId}`);

        // Find similar past incidents with multi-factor matching
        const similarIncidents = await this.findSimilarEnhanced(incident);

        if (similarIncidents.length === 0) {
            return {
                incidentId,
                recommendations: [{
                    type: 'standard',
                    confidence: 0.5,
                    confidenceFactors: {
                        historicalMatch: 0,
                        patternStrength: 0,
                        successRate: 0.5
                    },
                    message: 'No similar past incidents found. Following standard protocol.',
                    actions: this.getStandardActions(incident),
                    reasoning: 'No historical data available for this incident type and context'
                }]
            };
        }

        // Extract successful patterns with confidence scoring
        const recommendations = [];

        for (const similar of similarIncidents) {
            const analysis = await PostIncidentAnalysis.findOne({
                incidentId: similar.incidentId
            });

            if (analysis) {
                // Calculate confidence score
                const confidence = this.calculateConfidence(similar, analysis, incident);

                // Get success rate for this pattern
                const successRate = await this.getPatternSuccessRate(
                    incident.type,
                    similar.patternKey
                );

                recommendations.push({
                    type: 'historical',
                    confidence: confidence.overall,
                    confidenceFactors: confidence.factors,
                    successRate,
                    message: `Based on similar ${incident.type} incident from ${analysis.analyzedAt.toLocaleDateString()}`,
                    pastIncidentId: similar.incidentId,
                    similarity: similar.similarity,
                    patternStrength: similar.patternStrength,
                    metrics: {
                        responseTime: analysis.metrics.responseTime,
                        efficiency: analysis.resourceUtilization.efficiency,
                        outcome: analysis.failureClassification
                    },
                    actions: analysis.recommendations || this.getStandardActions(incident),
                    reasoning: this.generateReasoning(similar, analysis, confidence)
                });
            }
        }

        // Sort by confidence
        recommendations.sort((a, b) => b.confidence - a.confidence);

        return {
            incidentId,
            recommendations: recommendations.length > 0
                ? recommendations.slice(0, 3) // Top 3 recommendations
                : [{
                    type: 'standard',
                    confidence: 0.5,
                    confidenceFactors: {
                        historicalMatch: 0,
                        patternStrength: 0,
                        successRate: 0.5
                    },
                    message: 'Following standard protocol',
                    actions: this.getStandardActions(incident),
                    reasoning: 'Standard operating procedure'
                }]
        };
    }

    /**
     * Enhanced similarity finding with multi-factor matching
     */
    async findSimilarEnhanced(incident, limit = 5) {
        const candidates = await Incident.find({
            type: incident.type,
            status: { $in: ['closed', 'resolved'] }
        }).limit(50);

        const scored = candidates.map(candidate => {
            let score = 0;
            const factors = {};

            // Type match (40 points)
            score += 40;
            factors.typeMatch = 40;

            // Severity similarity (30 points)
            const severityDiff = Math.abs(candidate.severity - incident.severity);
            const severityScore = Math.max(0, 30 - severityDiff * 10);
            score += severityScore;
            factors.severityMatch = severityScore;

            // Location proximity (20 points)
            const distance = this.calculateDistance(
                incident.location.lat,
                incident.location.lng,
                candidate.location.lat,
                candidate.location.lng
            );
            const locationScore = distance < 5000 ? 20 * (1 - distance / 5000) : 0;
            score += locationScore;
            factors.locationMatch = locationScore;

            // Time-of-day similarity (10 points)
            const incidentHour = new Date(incident.reportedAt).getHours();
            const candidateHour = new Date(candidate.reportedAt).getHours();
            const hourDiff = Math.abs(incidentHour - candidateHour);
            const timeScore = Math.max(0, 10 - hourDiff * 0.5);
            score += timeScore;
            factors.timeMatch = timeScore;

            // Pattern strength (based on outcome)
            const patternStrength = candidate.status === 'resolved' ? 1.2 : 1.0;

            return {
                incidentId: candidate.incidentId,
                similarity: score / 100,
                patternStrength,
                patternKey: `${incident.type}-${incident.severity}-${Math.floor(distance / 1000)}km`,
                factors,
                outcome: candidate.status
            };
        });

        scored.sort((a, b) => (b.similarity * b.patternStrength) - (a.similarity * a.patternStrength));
        return scored.slice(0, limit);
    }

    /**
     * Calculate multi-factor confidence score
     */
    calculateConfidence(similarIncident, analysis, currentIncident) {
        const factors = {};

        // Historical match quality (0-0.4)
        factors.historicalMatch = similarIncident.similarity * 0.4;

        // Pattern strength based on past success (0-0.3)
        const wasSuccessful = analysis.failureClassification === 'none' ||
            analysis.failureClassification === 'minor';
        factors.patternStrength = wasSuccessful ? 0.3 : 0.15;

        // Resource availability match (0-0.2)
        factors.resourceAvailability = 0.2; // Simplified - could check actual availability

        // Recency bonus (0-0.1)
        const daysSince = (Date.now() - analysis.analyzedAt) / (1000 * 60 * 60 * 24);
        factors.recency = Math.max(0, 0.1 * (1 - daysSince / 365));

        const overall = Object.values(factors).reduce((sum, val) => sum + val, 0);

        return {
            overall: Math.min(overall, 1.0),
            factors
        };
    }

    /**
     * Get success rate for a specific pattern
     */
    async getPatternSuccessRate(incidentType, patternKey) {
        // Use real tracked data if available
        const tracked = this.patternSuccessStore.get(patternKey);
        if (tracked && tracked.total > 0) {
            return {
                rate: tracked.successful / tracked.total,
                sampleSize: tracked.total
            };
        }

        // Fall back to baseline defaults when no tracking data exists yet
        return {
            rate: 0.7,
            sampleSize: 0
        };
    }

    /**
     * Track recommendation outcome
     */
    async trackRecommendationOutcome(incidentId, recommendationId, wasFollowed, wasSuccessful, patternKey) {
        // Store individual outcome
        const key = `${incidentId}-${recommendationId}`;
        this.recommendationHistory.set(key, {
            wasFollowed,
            wasSuccessful,
            patternKey,
            timestamp: new Date()
        });

        // Aggregate into pattern-level success store
        if (patternKey) {
            const existing = this.patternSuccessStore.get(patternKey) || { total: 0, successful: 0 };
            existing.total++;
            if (wasSuccessful) {
                existing.successful++;
            }
            this.patternSuccessStore.set(patternKey, existing);
            console.log(`📊 Pattern ${patternKey}: ${existing.successful}/${existing.total} success rate`);
        }

        console.log(`📊 Tracked recommendation outcome: ${key} - Success: ${wasSuccessful}`);
    }

    /**
     * Generate human-readable reasoning
     */
    generateReasoning(similar, analysis, confidence) {
        const reasons = [];

        if (similar.similarity > 0.8) {
            reasons.push('Very high similarity to past incident');
        } else if (similar.similarity > 0.6) {
            reasons.push('Good similarity to past incident');
        }

        if (confidence.factors.patternStrength > 0.25) {
            reasons.push('Pattern has proven successful in the past');
        }

        if (similar.factors.locationMatch > 15) {
            reasons.push('Same geographic area');
        }

        if (similar.factors.timeMatch > 7) {
            reasons.push('Similar time of day');
        }

        return reasons.join('. ') + '.';
    }

    /**
     * Get standard actions for incident type
     */
    getStandardActions(incident) {
        const actions = [];

        switch (incident.type) {
            case 'fire':
                actions.push('Dispatch fire trucks immediately');
                actions.push('Prepare medical units');
                actions.push('Establish perimeter');
                if (incident.severity >= 4) {
                    actions.push('Request additional fire units');
                    actions.push('Evacuate surrounding buildings');
                }
                break;

            case 'medical':
                actions.push('Dispatch ambulance');
                actions.push('Alert nearest hospital');
                if (incident.severity >= 4) {
                    actions.push('Request air ambulance if available');
                }
                break;

            case 'hazmat':
                actions.push('Dispatch hazmat team');
                actions.push('Establish wide exclusion zone');
                actions.push('Alert environmental agency');
                actions.push('Prepare decontamination');
                break;

            case 'rescue':
                actions.push('Dispatch rescue team');
                actions.push('Prepare medical support');
                actions.push('Assess structural safety');
                break;

            default:
                actions.push('Dispatch appropriate resources');
                actions.push('Assess situation');
        }

        return actions;
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
}

module.exports = new RecommendationEngine();

