const Incident = require('../models/Incident');
const Resource = require('../models/Resource');
const Assignment = require('../models/Assignment');
const Event = require('../models/Event');
const orchestrationEngine = require('./orchestrationEngine');
const riskEngine = require('./riskEngine');
const { calculateDistance, estimateTravelTime } = require('../utils/geoUtils');

/**
 * Counterfactual Analysis Engine
 * Simulates "what-if" scenarios by replaying incidents with alternative decisions
 */
class CounterfactualEngine {
    constructor() {
        // In-memory store for counterfactual scenarios, keyed by incidentId
        // Each value is a Map of scenarioId -> scenario data
        this.scenarioStore = new Map();
        this.scenarioCounter = 0;
    }

    /**
     * Run a counterfactual simulation for a closed incident
     * @param {string} incidentId - The incident to analyze
     * @param {object} alternatives - Alternative decisions to apply
     * @returns {object} Comparison between actual and counterfactual outcomes
     */
    async simulateScenario(incidentId, alternatives = {}) {
        console.log(`🔄 Running counterfactual simulation for ${incidentId}`);

        // 1. Load the original incident and its history
        const originalIncident = await Incident.findOne({ incidentId });
        if (!originalIncident) {
            throw new Error('Incident not found');
        }

        if (originalIncident.status !== 'closed') {
            throw new Error('Can only run counterfactual analysis on closed incidents');
        }

        // 2. Get original assignments and events
        const originalAssignments = await Assignment.find({ incidentId });
        const originalEvents = await Event.find({
            'data.incidentId': incidentId
        }).sort({ timestamp: 1 });

        // 3. Extract actual outcome metrics
        const actualOutcome = await this.extractOutcomeMetrics(
            originalIncident,
            originalAssignments,
            originalEvents
        );

        // 4. Create counterfactual scenario
        const counterfactualOutcome = await this.runCounterfactualSimulation(
            originalIncident,
            alternatives
        );

        // 5. Calculate improvements
        const comparison = this.compareOutcomes(actualOutcome, counterfactualOutcome);

        // 6. Generate insights
        const insights = this.generateInsights(comparison, alternatives);

        const result = {
            incidentId,
            actualOutcome,
            counterfactualOutcome,
            comparison,
            insights,
            alternatives,
            simulatedAt: new Date()
        };

        // Auto-save the scenario for later retrieval and comparison
        const scenarioId = this.saveScenario(incidentId, result);
        result.scenarioId = scenarioId;

        return result;
    }

    /**
     * Save a scenario to the in-memory store
     * @returns {string} The generated scenario ID
     */
    saveScenario(incidentId, scenarioData) {
        this.scenarioCounter++;
        const scenarioId = `scenario-${incidentId}-${this.scenarioCounter}`;

        if (!this.scenarioStore.has(incidentId)) {
            this.scenarioStore.set(incidentId, new Map());
        }

        this.scenarioStore.get(incidentId).set(scenarioId, {
            scenarioId,
            ...scenarioData,
            savedAt: new Date()
        });

        console.log(`💾 Saved counterfactual scenario ${scenarioId} for incident ${incidentId}`);
        return scenarioId;
    }

    /**
     * Extract outcome metrics from actual incident
     */
    async extractOutcomeMetrics(incident, assignments, events) {
        const reportedAt = incident.reportedAt;
        const closedAt = incident.closedAt;
        const firstAssignedAt = incident.assignedAt;

        // Calculate response time (from report to first assignment)
        const responseTime = firstAssignedAt
            ? (firstAssignedAt - reportedAt) / 1000 / 60  // minutes
            : null;

        // Calculate resolution time (from report to close)
        const resolutionTime = closedAt
            ? (closedAt - reportedAt) / 1000 / 60  // minutes
            : null;

        // Calculate resource utilization
        const resourceCount = assignments.length;
        const uniqueResources = new Set(assignments.map(a => a.resourceId)).size;

        // Calculate average distance
        const distances = assignments.map(a => a.distance || 0);
        const avgDistance = distances.length > 0
            ? distances.reduce((sum, d) => sum + d, 0) / distances.length
            : 0;

        // Calculate average travel time
        const travelTimes = assignments.map(a => a.travelTime || 0);
        const avgTravelTime = travelTimes.length > 0
            ? travelTimes.reduce((sum, t) => sum + t, 0) / travelTimes.length
            : 0;

        return {
            responseTime,
            resolutionTime,
            resourceCount,
            uniqueResources,
            avgDistance: Math.round(avgDistance),
            avgTravelTime: Math.round(avgTravelTime),
            finalRiskScore: incident.riskScore || 0,
            assignments: assignments.map(a => ({
                resourceId: a.resourceId,
                distance: a.distance,
                travelTime: a.travelTime,
                score: a.score
            }))
        };
    }

    /**
     * Run counterfactual simulation with alternative decisions
     */
    async runCounterfactualSimulation(originalIncident, alternatives) {
        // Create a simulated incident state
        const simulatedIncident = {
            ...originalIncident.toObject(),
            _id: undefined,
            incidentId: `${originalIncident.incidentId}-counterfactual`,
            status: 'reported'
        };

        // Apply alternative parameters
        if (alternatives.location) {
            simulatedIncident.location = alternatives.location;
        }

        if (alternatives.severity) {
            simulatedIncident.severity = alternatives.severity;
        }

        // Simulate resource assignment with alternatives
        const simulatedAssignments = await this.simulateResourceAssignment(
            simulatedIncident,
            alternatives
        );

        // Calculate simulated metrics
        const simulatedResponseTime = alternatives.responseDelay || 5; // Default 5 min
        const simulatedResolutionTime = this.estimateResolutionTime(
            simulatedIncident,
            simulatedAssignments
        );

        // Calculate resource metrics
        const resourceCount = simulatedAssignments.length;
        const uniqueResources = new Set(simulatedAssignments.map(a => a.resourceId)).size;

        const distances = simulatedAssignments.map(a => a.distance || 0);
        const avgDistance = distances.length > 0
            ? distances.reduce((sum, d) => sum + d, 0) / distances.length
            : 0;

        const travelTimes = simulatedAssignments.map(a => a.travelTime || 0);
        const avgTravelTime = travelTimes.length > 0
            ? travelTimes.reduce((sum, t) => sum + t, 0) / travelTimes.length
            : 0;

        // Estimate final risk score
        const finalRiskScore = this.estimateFinalRiskScore(
            simulatedIncident,
            simulatedResponseTime,
            simulatedResolutionTime
        );

        return {
            responseTime: simulatedResponseTime,
            resolutionTime: simulatedResolutionTime,
            resourceCount,
            uniqueResources,
            avgDistance: Math.round(avgDistance),
            avgTravelTime: Math.round(avgTravelTime),
            finalRiskScore,
            assignments: simulatedAssignments.map(a => ({
                resourceId: a.resourceId,
                distance: a.distance,
                travelTime: a.travelTime,
                score: a.score
            }))
        };
    }

    /**
     * Simulate resource assignment with alternative decisions
     */
    async simulateResourceAssignment(incident, alternatives) {
        const assignments = [];

        // If specific resources are provided as alternatives
        if (alternatives.resources && alternatives.resources.length > 0) {
            for (const resourceId of alternatives.resources) {
                const resource = await Resource.findOne({ resourceId });
                if (resource) {
                    const distance = calculateDistance(
                        incident.location.lat,
                        incident.location.lng,
                        resource.location.lat,
                        resource.location.lng
                    );

                    assignments.push({
                        resourceId,
                        distance: Math.round(distance),
                        travelTime: estimateTravelTime(distance),
                        score: 100 - (distance / 100) // Simple scoring
                    });
                }
            }
        } else {
            // Use orchestration engine logic to find optimal resources
            const requirements = orchestrationEngine.getResourceRequirements(incident);

            for (const req of requirements) {
                const candidates = await Resource.find({
                    type: req.type,
                    status: 'available'
                }).limit(5);

                if (candidates.length > 0) {
                    // Pick the closest one
                    const scored = candidates.map(resource => {
                        const distance = calculateDistance(
                            incident.location.lat,
                            incident.location.lng,
                            resource.location.lat,
                            resource.location.lng
                        );

                        return {
                            resourceId: resource.resourceId,
                            distance: Math.round(distance),
                            travelTime: estimateTravelTime(distance),
                            score: 100 - (distance / 100)
                        };
                    });

                    scored.sort((a, b) => b.score - a.score);
                    assignments.push(scored[0]);
                }
            }
        }

        return assignments;
    }

    /**
     * Estimate resolution time based on incident and resources
     */
    estimateResolutionTime(incident, assignments) {
        const baseTime = {
            fire: 60,
            medical: 30,
            hazmat: 90,
            rescue: 45,
            police: 40,
            traffic: 25
        }[incident.type] || 40;

        const severityMultiplier = 1 + (incident.severity * 0.2);
        const resourceBonus = Math.max(0, (assignments.length - 1) * 5);

        return Math.round(baseTime * severityMultiplier - resourceBonus);
    }

    /**
     * Estimate final risk score
     */
    estimateFinalRiskScore(incident, responseTime, resolutionTime) {
        const severityScore = incident.severity * 20;
        const responseScore = Math.min(responseTime * 1.5, 30);
        const resolutionScore = Math.min(resolutionTime * 0.5, 20);

        const totalScore = severityScore + responseScore + resolutionScore;
        return Math.min(Math.round(totalScore), 100);
    }

    /**
     * Compare actual vs counterfactual outcomes
     */
    compareOutcomes(actual, counterfactual) {
        const improvements = {};

        if (actual.responseTime && counterfactual.responseTime) {
            improvements.responseTime = {
                actual: actual.responseTime,
                counterfactual: counterfactual.responseTime,
                difference: actual.responseTime - counterfactual.responseTime,
                percentChange: ((actual.responseTime - counterfactual.responseTime) / actual.responseTime * 100).toFixed(1)
            };
        }

        if (actual.resolutionTime && counterfactual.resolutionTime) {
            improvements.resolutionTime = {
                actual: actual.resolutionTime,
                counterfactual: counterfactual.resolutionTime,
                difference: actual.resolutionTime - counterfactual.resolutionTime,
                percentChange: ((actual.resolutionTime - counterfactual.resolutionTime) / actual.resolutionTime * 100).toFixed(1)
            };
        }

        improvements.avgDistance = {
            actual: actual.avgDistance,
            counterfactual: counterfactual.avgDistance,
            difference: actual.avgDistance - counterfactual.avgDistance,
            percentChange: ((actual.avgDistance - counterfactual.avgDistance) / actual.avgDistance * 100).toFixed(1)
        };

        improvements.finalRiskScore = {
            actual: actual.finalRiskScore,
            counterfactual: counterfactual.finalRiskScore,
            difference: actual.finalRiskScore - counterfactual.finalRiskScore,
            percentChange: ((actual.finalRiskScore - counterfactual.finalRiskScore) / Math.max(actual.finalRiskScore, 1) * 100).toFixed(1)
        };

        improvements.resourceEfficiency = {
            actual: actual.uniqueResources,
            counterfactual: counterfactual.uniqueResources,
            difference: actual.uniqueResources - counterfactual.uniqueResources
        };

        return improvements;
    }

    /**
     * Generate insights from comparison
     */
    generateInsights(comparison, alternatives) {
        const insights = [];

        // Response time insights
        if (comparison.responseTime && comparison.responseTime.difference > 0) {
            insights.push({
                type: 'improvement',
                metric: 'responseTime',
                message: `Response time could have been ${comparison.responseTime.percentChange}% faster (${Math.round(comparison.responseTime.difference)} minutes saved)`,
                impact: 'high'
            });
        } else if (comparison.responseTime && comparison.responseTime.difference < 0) {
            insights.push({
                type: 'warning',
                metric: 'responseTime',
                message: `Alternative would have increased response time by ${Math.abs(comparison.responseTime.percentChange)}%`,
                impact: 'medium'
            });
        }

        // Distance insights
        if (comparison.avgDistance.difference > 500) {
            insights.push({
                type: 'improvement',
                metric: 'distance',
                message: `Resources could have traveled ${Math.round(comparison.avgDistance.difference)}m less on average`,
                impact: 'medium'
            });
        }

        // Risk score insights
        if (comparison.finalRiskScore.difference > 10) {
            insights.push({
                type: 'improvement',
                metric: 'riskScore',
                message: `Final risk score could have been ${comparison.finalRiskScore.difference} points lower`,
                impact: 'high'
            });
        }

        // Resource efficiency insights
        if (comparison.resourceEfficiency.difference > 0) {
            insights.push({
                type: 'improvement',
                metric: 'resources',
                message: `Could have used ${comparison.resourceEfficiency.difference} fewer resources`,
                impact: 'medium'
            });
        }

        // Overall assessment
        const positiveImprovements = insights.filter(i => i.type === 'improvement').length;
        if (positiveImprovements >= 3) {
            insights.push({
                type: 'recommendation',
                metric: 'overall',
                message: 'Alternative approach shows significant improvements across multiple metrics',
                impact: 'high'
            });
        }

        return insights;
    }

    /**
     * Get all counterfactual scenarios for an incident
     */
    async getScenarios(incidentId) {
        const incidentScenarios = this.scenarioStore.get(incidentId);
        if (!incidentScenarios) {
            return [];
        }
        return Array.from(incidentScenarios.values());
    }

    /**
     * Compare multiple stored counterfactual scenarios
     * @param {string} incidentId - The incident these scenarios belong to
     * @param {string[]} scenarioIds - IDs of scenarios to compare
     * @returns {object} Structured comparison across all requested scenarios
     */
    async compareScenarios(incidentId, scenarioIds) {
        const incidentScenarios = this.scenarioStore.get(incidentId);
        if (!incidentScenarios) {
            throw new Error(`No scenarios found for incident ${incidentId}`);
        }

        // Retrieve each requested scenario
        const scenarios = [];
        for (const id of scenarioIds) {
            const scenario = incidentScenarios.get(id);
            if (!scenario) {
                throw new Error(`Scenario ${id} not found for incident ${incidentId}`);
            }
            scenarios.push(scenario);
        }

        // Build pairwise comparisons between all scenarios
        const pairwiseComparisons = [];
        for (let i = 0; i < scenarios.length; i++) {
            for (let j = i + 1; j < scenarios.length; j++) {
                const a = scenarios[i];
                const b = scenarios[j];
                pairwiseComparisons.push({
                    scenarioA: a.scenarioId,
                    scenarioB: b.scenarioId,
                    comparison: this.compareOutcomes(
                        a.counterfactualOutcome,
                        b.counterfactualOutcome
                    )
                });
            }
        }

        // Build summary table of key metrics across all scenarios
        const summaryTable = scenarios.map(s => ({
            scenarioId: s.scenarioId,
            alternatives: s.alternatives,
            responseTime: s.counterfactualOutcome.responseTime,
            resolutionTime: s.counterfactualOutcome.resolutionTime,
            resourceCount: s.counterfactualOutcome.resourceCount,
            avgDistance: s.counterfactualOutcome.avgDistance,
            finalRiskScore: s.counterfactualOutcome.finalRiskScore,
            simulatedAt: s.simulatedAt
        }));

        // Determine best scenario per metric
        const bestScenarios = {
            fastestResponse: summaryTable.reduce((best, s) =>
                s.responseTime < best.responseTime ? s : best
            ).scenarioId,
            fastestResolution: summaryTable.reduce((best, s) =>
                s.resolutionTime < best.resolutionTime ? s : best
            ).scenarioId,
            lowestRisk: summaryTable.reduce((best, s) =>
                s.finalRiskScore < best.finalRiskScore ? s : best
            ).scenarioId,
            fewestResources: summaryTable.reduce((best, s) =>
                s.resourceCount < best.resourceCount ? s : best
            ).scenarioId
        };

        return {
            incidentId,
            scenariosCompared: scenarioIds.length,
            summaryTable,
            pairwiseComparisons,
            bestScenarios,
            comparedAt: new Date()
        };
    }
}

module.exports = new CounterfactualEngine();
