const express = require('express');
const router = express.Router();
const Incident = require('../models/Incident');
const PostIncidentAnalysis = require('../models/PostIncidentAnalysis');
const analysisEngine = require('../services/analysisEngine');

/**
 * GET historical incidents with filters
 */
router.get('/incidents', async (req, res) => {
    try {
        const {
            startDate,
            endDate,
            type,
            severity,
            status = 'closed',
            limit = 50
        } = req.query;

        const query = { status };

        if (startDate && endDate) {
            query.reportedAt = {
                $gte: new Date(startDate),
                $lte: new Date(endDate)
            };
        }

        if (type) query.type = type;
        if (severity) query.severity = { $in: severity.split(',').map(Number) };

        const incidents = await Incident.find(query)
            .sort({ reportedAt: -1 })
            .limit(parseInt(limit));

        res.json({
            success: true,
            count: incidents.length,
            incidents
        });
    } catch (error) {
        console.error('Error fetching historical incidents:', error);
        res.status(500).json({ error: error.message });
    }
});

/**
 * GET full post-incident analysis
 */
router.get('/incident/:id', async (req, res) => {
    try {
        let analysis = await analysisEngine.getAnalysis(req.params.id);

        // If no analysis exists, create it
        if (!analysis) {
            const incident = await Incident.findOne({ incidentId: req.params.id });

            if (!incident) {
                return res.status(404).json({ error: 'Incident not found' });
            }

            if (incident.status !== 'closed' && incident.status !== 'resolved') {
                return res.status(400).json({ error: 'Incident must be closed for analysis' });
            }

            analysis = await analysisEngine.analyzeIncident(req.params.id);
        }

        res.json({
            success: true,
            analysis
        });
    } catch (error) {
        console.error('Error fetching analysis:', error);
        res.status(500).json({ error: error.message });
    }
});

/**
 * GET analytics summary
 */
router.get('/summary', async (req, res) => {
    try {
        const { startDate, endDate } = req.query;

        const query = { status: { $in: ['closed', 'resolved'] } };

        if (startDate && endDate) {
            query.reportedAt = {
                $gte: new Date(startDate),
                $lte: new Date(endDate)
            };
        }

        const incidents = await Incident.find(query);

        // Calculate aggregations
        const totalIncidents = incidents.length;
        const byType = {};
        const bySeverity = {};
        let totalResponseTime = 0;
        let totalResolutionTime = 0;

        for (const incident of incidents) {
            // Count by type
            byType[incident.type] = (byType[incident.type] || 0) + 1;

            // Count by severity
            bySeverity[incident.severity] = (bySeverity[incident.severity] || 0) + 1;

            // Response time
            if (incident.assignedAt) {
                totalResponseTime += (incident.assignedAt - incident.reportedAt) / 1000;
            }

            // Resolution time
            if (incident.resolvedAt || incident.closedAt) {
                const resolvedTime = incident.resolvedAt || incident.closedAt;
                totalResolutionTime += (resolvedTime - incident.reportedAt) / 1000;
            }
        }

        const avgResponseTime = totalIncidents > 0
            ? Math.round(totalResponseTime / totalIncidents)
            : 0;

        const avgResolutionTime = totalIncidents > 0
            ? Math.round(totalResolutionTime / totalIncidents)
            : 0;

        // Failure analysis
        const analyses = await PostIncidentAnalysis.find({});
        let detectionFailures = 0;
        let allocationFailures = 0;
        let coordinationFailures = 0;
        let capacityFailures = 0;

        for (const analysis of analyses) {
            if (analysis.failureClassification.detection) detectionFailures++;
            if (analysis.failureClassification.allocation) allocationFailures++;
            if (analysis.failureClassification.coordination) coordinationFailures++;
            if (analysis.failureClassification.capacity) capacityFailures++;
        }

        res.json({
            success: true,
            summary: {
                totalIncidents,
                byType,
                bySeverity,
                avgResponseTime,
                avgResolutionTime,
                failureAnalysis: {
                    detection: detectionFailures,
                    allocation: allocationFailures,
                    coordination: coordinationFailures,
                    capacity: capacityFailures
                }
            }
        });
    } catch (error) {
        console.error('Error fetching summary:', error);
        res.status(500).json({ error: error.message });
    }
});

/**
 * GET training data statistics
 * Returns comprehensive stats about data available for AI model training
 */
router.get('/training-data', async (req, res) => {
    try {
        const Event = require('../models/Event');
        const Assignment = require('../models/Assignment');
        const Resource = require('../models/Resource');
        const Conflict = require('../models/Conflict');

        // --- Incident statistics ---
        const totalIncidents = await Incident.countDocuments();
        const closedIncidents = await Incident.countDocuments({ status: { $in: ['closed', 'resolved'] } });
        const activeIncidents = await Incident.countDocuments({ status: { $in: ['reported', 'assigned', 'active'] } });

        // By type
        const incidentTypes = ['fire', 'medical', 'hazmat', 'rescue', 'police', 'traffic'];
        const byType = {};
        for (const type of incidentTypes) {
            byType[type] = await Incident.countDocuments({ type, status: { $in: ['closed', 'resolved'] } });
        }

        // By severity
        const bySeverity = {};
        for (let s = 1; s <= 5; s++) {
            bySeverity[s] = await Incident.countDocuments({ severity: s, status: { $in: ['closed', 'resolved'] } });
        }

        // Date range of training data
        const oldestIncident = await Incident.findOne({ status: { $in: ['closed', 'resolved'] } }).sort({ reportedAt: 1 }).select('reportedAt');
        const newestIncident = await Incident.findOne({ status: { $in: ['closed', 'resolved'] } }).sort({ reportedAt: -1 }).select('reportedAt');

        // --- Post-incident analyses ---
        const totalAnalyses = await PostIncidentAnalysis.countDocuments();
        const analysesWithRecommendations = await PostIncidentAnalysis.countDocuments({
            recommendations: { $exists: true, $not: { $size: 0 } }
        });
        const analysesWithSimilar = await PostIncidentAnalysis.countDocuments({
            similarIncidents: { $exists: true, $not: { $size: 0 } }
        });

        // Failure pattern counts
        const failurePatterns = {
            detection: await PostIncidentAnalysis.countDocuments({ 'failureClassification.detection': true }),
            allocation: await PostIncidentAnalysis.countDocuments({ 'failureClassification.allocation': true }),
            coordination: await PostIncidentAnalysis.countDocuments({ 'failureClassification.coordination': true }),
            capacity: await PostIncidentAnalysis.countDocuments({ 'failureClassification.capacity': true })
        };

        // --- Events ---
        const totalEvents = await Event.countDocuments();
        const eventsByType = {};
        const eventTypes = ['IncidentCreated', 'ResourceAssigned', 'ConflictDetected', 'ConflictResolved', 'RiskScoreUpdated', 'ManualOverride', 'IncidentClosed'];
        for (const type of eventTypes) {
            eventsByType[type] = await Event.countDocuments({ type });
        }

        // --- Assignments ---
        const totalAssignments = await Assignment.countDocuments();
        const completedAssignments = await Assignment.countDocuments({ status: 'completed' });
        const revokedAssignments = await Assignment.countDocuments({ status: 'revoked' });

        // --- Resources ---
        const totalResources = await Resource.countDocuments();
        const resourcesByType = {};
        const resourceTypes = await Resource.distinct('type');
        for (const type of resourceTypes) {
            resourcesByType[type] = await Resource.countDocuments({ type });
        }

        // --- Conflicts ---
        const totalConflicts = await Conflict.countDocuments();
        const resolvedConflicts = await Conflict.countDocuments({ status: 'resolved' });

        // --- Calculate model readiness ---
        const dataPoints = totalIncidents + totalEvents + totalAssignments + totalAnalyses;
        const coveragePercent = totalIncidents > 0 ? Math.round((totalAnalyses / closedIncidents) * 100) : 0;

        res.json({
            success: true,
            trainingData: {
                summary: {
                    totalDataPoints: dataPoints,
                    totalIncidents,
                    closedIncidents,
                    activeIncidents,
                    analysisCoverage: coveragePercent,
                    dateRange: {
                        from: oldestIncident?.reportedAt || null,
                        to: newestIncident?.reportedAt || null
                    }
                },
                incidents: {
                    total: totalIncidents,
                    closed: closedIncidents,
                    byType,
                    bySeverity
                },
                analyses: {
                    total: totalAnalyses,
                    withRecommendations: analysesWithRecommendations,
                    withSimilarIncidents: analysesWithSimilar,
                    failurePatterns
                },
                events: {
                    total: totalEvents,
                    byType: eventsByType
                },
                assignments: {
                    total: totalAssignments,
                    completed: completedAssignments,
                    revoked: revokedAssignments,
                    successRate: totalAssignments > 0
                        ? ((completedAssignments / totalAssignments) * 100).toFixed(1)
                        : 0
                },
                resources: {
                    total: totalResources,
                    byType: resourcesByType
                },
                conflicts: {
                    total: totalConflicts,
                    resolved: resolvedConflicts,
                    resolutionRate: totalConflicts > 0
                        ? ((resolvedConflicts / totalConflicts) * 100).toFixed(1)
                        : 0
                }
            }
        });
    } catch (error) {
        console.error('Error fetching training data stats:', error);
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;
