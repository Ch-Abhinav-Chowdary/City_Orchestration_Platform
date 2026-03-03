const express = require('express');
const router = express.Router();
const orchestrationEngine = require('../services/orchestrationEngine');
const conflictEngine = require('../services/conflictEngine');
const recommendationEngine = require('../services/recommendationEngine');
const eventStore = require('../services/eventStore');
const Assignment = require('../models/Assignment');

/**
 * TRIGGER automatic resource assignment for an incident
 */
router.post('/assign', async (req, res) => {
    try {
        const { incidentId, autoResolveConflicts = true } = req.body;

        if (!incidentId) {
            return res.status(400).json({ error: 'incidentId is required' });
        }

        // Assign resources
        const assignments = await orchestrationEngine.assignResources(incidentId);

        // Check for conflicts
        const conflicts = await conflictEngine.detectConflicts(incidentId);

        // Auto-resolve if enabled
        if (autoResolveConflicts && conflicts.length > 0) {
            for (const conflict of conflicts) {
                await conflictEngine.resolveConflict(conflict.conflictId, 'rerank');
            }
        }

        res.json({
            success: true,
            assignments,
            conflicts,
            conflictsAutoResolved: autoResolveConflicts && conflicts.length > 0
        });
    } catch (error) {
        console.error('Error in orchestration:', error);
        res.status(500).json({ error: error.message });
    }
});

/**
 * MANUAL override - assign specific resource to incident
 */
router.post('/override', async (req, res) => {
    try {
        const { incidentId, resourceId, reason, userId } = req.body;

        if (!incidentId || !resourceId) {
            return res.status(400).json({ error: 'incidentId and resourceId are required' });
        }

        // Create manual assignment (bypassing orchestration logic)
        const Resource = require('../models/Resource');
        const Incident = require('../models/Incident');
        const { v4: uuidv4 } = require('uuid');

        const resource = await Resource.findOne({ resourceId });
        const incident = await Incident.findOne({ incidentId });

        if (!resource || !incident) {
            return res.status(404).json({ error: 'Resource or incident not found' });
        }

        const assignment = new Assignment({
            assignmentId: uuidv4(),
            incidentId,
            resourceId,
            priority: incident.severity,
            status: 'assigned',
            travelTime: 0,
            distance: 0,
            score: 100 // Manual override gets max score
        });

        await assignment.save();

        // Update resource
        resource.currentAssignment = incidentId;
        resource.status = 'assigned';
        await resource.save();

        // Update incident
        incident.assignedResources.push(resourceId);
        incident.status = 'assigned';
        await incident.save();

        // Log manual override event
        await eventStore.append('ManualOverride', {
            incidentId,
            resourceId,
            reason: reason || 'Manual operator decision',
            userId: userId || 'unknown'
        }, {
            userId,
            source: 'manual-override'
        });

        res.json({
            success: true,
            assignment,
            message: 'Manual override successful'
        });
    } catch (error) {
        console.error('Error in manual override:', error);
        res.status(500).json({ error: error.message });
    }
});

/**
 * GET pending decisions (conflicts awaiting resolution)
 */
router.get('/pending', async (req, res) => {
    try {
        const Conflict = require('../models/Conflict');

        const pendingConflicts = await Conflict.find({
            status: { $in: ['detected', 'escalated'] }
        }).sort({ detectedAt: -1 });

        res.json({
            success: true,
            count: pendingConflicts.length,
            conflicts: pendingConflicts
        });
    } catch (error) {
        console.error('Error fetching pending decisions:', error);
        res.status(500).json({ error: error.message });
    }
});

/**
 * RESOLVE conflict
 */
router.post('/resolve-conflict', async (req, res) => {
    try {
        const { conflictId, strategy, userId } = req.body;

        if (!conflictId || !strategy) {
            return res.status(400).json({ error: 'conflictId and strategy are required' });
        }

        const conflict = await conflictEngine.resolveConflict(conflictId, strategy, userId);

        res.json({
            success: true,
            conflict
        });
    } catch (error) {
        console.error('Error resolving conflict:', error);
        res.status(500).json({ error: error.message });
    }
});

/**
 * GET recommendations for an incident
 */
router.get('/recommendations/:incidentId', async (req, res) => {
    try {
        const recommendations = await recommendationEngine.getRecommendations(req.params.incidentId);

        res.json({
            success: true,
            recommendations
        });
    } catch (error) {
        console.error('Error getting recommendations:', error);
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;
