const express = require('express');
const router = express.Router();
const Incident = require('../models/Incident');
const eventStore = require('../services/eventStore');
const orchestrationEngine = require('../services/orchestrationEngine');
const conflictEngine = require('../services/conflictEngine');
const riskEngine = require('../services/riskEngine');
const analysisEngine = require('../services/analysisEngine');
const { v4: uuidv4 } = require('uuid');

/**
 * CREATE new incident
 */
router.post('/', async (req, res) => {
    try {
        const { type, severity, location, description } = req.body;

        const incidentId = uuidv4();

        const incident = new Incident({
            incidentId,
            type,
            severity,
            location,
            description,
            status: 'reported'
        });

        await incident.save();

        // Log event
        await eventStore.append('IncidentCreated', {
            incident: {
                incidentId,
                type,
                severity,
                location
            }
        });

        // Calculate initial risk score
        await riskEngine.calculateRiskScore(incidentId);

        console.log(`🚨 New incident created: ${incidentId}`);

        res.status(201).json({
            success: true,
            incident
        });
    } catch (error) {
        console.error('Error creating incident:', error);
        res.status(500).json({ error: error.message });
    }
});

/**
 * GET all incidents with filters
 */
router.get('/', async (req, res) => {
    try {
        const { status, type, severity, limit = 50 } = req.query;

        const query = {};
        if (status) query.status = status;
        if (type) query.type = type;
        if (severity) query.severity = parseInt(severity);

        const incidents = await Incident.find(query)
            .sort({ reportedAt: -1 })
            .limit(parseInt(limit));

        res.json({
            success: true,
            count: incidents.length,
            incidents
        });
    } catch (error) {
        console.error('Error fetching incidents:', error);
        res.status(500).json({ error: error.message });
    }
});

/**
 * GET single incident by ID
 */
router.get('/:id', async (req, res) => {
    try {
        const incident = await Incident.findOne({ incidentId: req.params.id });

        if (!incident) {
            return res.status(404).json({ error: 'Incident not found' });
        }

        // Get risk history
        const riskHistory = await riskEngine.getRiskHistory(req.params.id, 10);

        // Get events
        const events = await eventStore.getByIncident(req.params.id);

        res.json({
            success: true,
            incident,
            riskHistory,
            events: events.slice(0, 20)
        });
    } catch (error) {
        console.error('Error fetching incident:', error);
        res.status(500).json({ error: error.message });
    }
});

/**
 * CLOSE incident
 */
router.post('/:id/close', async (req, res) => {
    try {
        const incident = await Incident.findOne({ incidentId: req.params.id });

        if (!incident) {
            return res.status(404).json({ error: 'Incident not found' });
        }

        incident.status = 'closed';
        incident.closedAt = new Date();
        await incident.save();

        // Log event
        await eventStore.append('IncidentClosed', {
            incidentId: req.params.id,
            closedAt: new Date()
        });

        // Trigger post-incident analysis
        const analysis = await analysisEngine.analyzeIncident(req.params.id);

        res.json({
            success: true,
            incident,
            analysis
        });
    } catch (error) {
        console.error('Error closing incident:', error);
        res.status(500).json({ error: error.message });
    }
});

/**
 * UPDATE incident status
 */
router.patch('/:id/status', async (req, res) => {
    try {
        const { status } = req.body;

        const incident = await Incident.findOne({ incidentId: req.params.id });

        if (!incident) {
            return res.status(404).json({ error: 'Incident not found' });
        }

        incident.status = status;
        if (status === 'resolved') {
            incident.resolvedAt = new Date();
        }
        await incident.save();

        res.json({
            success: true,
            incident
        });
    } catch (error) {
        console.error('Error updating incident:', error);
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;
