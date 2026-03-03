const express = require('express');
const router = express.Router();
const Incident = require('../models/Incident');
const Resource = require('../models/Resource');
const Conflict = require('../models/Conflict');
const riskEngine = require('../services/riskEngine');

/**
 * GET live dashboard data
 */
router.get('/live', async (req, res) => {
    try {
        // Get active incidents
        const activeIncidents = await Incident.find({
            status: { $in: ['reported', 'assigned', 'active'] }
        }).sort({ reportedAt: -1 });

        // Get resource summary
        const totalResources = await Resource.countDocuments();
        const availableResources = await Resource.countDocuments({ status: 'available' });
        const assignedResources = await Resource.countDocuments({ status: 'assigned' });
        const offlineResources = await Resource.countDocuments({ status: 'offline' });

        // Get risk distribution
        const riskLevels = await riskEngine.getRiskDistribution();

        // Get recent conflicts
        const recentConflicts = await Conflict.find({
            status: { $in: ['detected', 'escalated'] }
        }).sort({ detectedAt: -1 }).limit(5);

        res.json({
            success: true,
            activeIncidents,
            resourceSummary: {
                total: totalResources,
                available: availableResources,
                assigned: assignedResources,
                offline: offlineResources
            },
            riskLevels,
            recentConflicts
        });
    } catch (error) {
        console.error('Error fetching dashboard data:', error);
        res.status(500).json({ error: error.message });
    }
});

/**
 * GET map data (simplified for map rendering)
 */
router.get('/map-data', async (req, res) => {
    try {
        const incidents = await Incident.find({
            status: { $in: ['reported', 'assigned', 'active'] }
        }).select('incidentId type severity status location riskScore');

        const resources = await Resource.find({
            status: { $in: ['available', 'assigned'] }
        }).select('resourceId type status location currentAssignment');

        res.json({
            success: true,
            incidents,
            resources
        });
    } catch (error) {
        console.error('Error fetching map data:', error);
        res.status(500).json({ error: error.message });
    }
});

/**
 * GET system metrics
 */
router.get('/metrics', async (req, res) => {
    try {
        const totalIncidents = await Incident.countDocuments();
        const activeIncidents = await Incident.countDocuments({
            status: { $in: ['reported', 'assigned', 'active'] }
        });
        const closedIncidents = await Incident.countDocuments({ status: 'closed' });

        const totalConflicts = await Conflict.countDocuments();
        const resolvedConflicts = await Conflict.countDocuments({ status: 'resolved' });

        res.json({
            success: true,
            metrics: {
                totalIncidents,
                activeIncidents,
                closedIncidents,
                totalConflicts,
                resolvedConflicts,
                conflictResolutionRate: totalConflicts > 0
                    ? ((resolvedConflicts / totalConflicts) * 100).toFixed(1)
                    : 0
            }
        });
    } catch (error) {
        console.error('Error fetching metrics:', error);
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;
