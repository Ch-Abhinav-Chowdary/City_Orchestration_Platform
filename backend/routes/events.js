const express = require('express');
const router = express.Router();
const eventStore = require('../services/eventStore');

/**
 * CREATE new event
 */
router.post('/', async (req, res) => {
    try {
        const { type, payload, metadata } = req.body;

        if (!type || !payload) {
            return res.status(400).json({ error: 'type and payload are required' });
        }

        const event = await eventStore.append(type, payload, metadata);

        res.status(201).json({
            success: true,
            event
        });
    } catch (error) {
        console.error('Error creating event:', error);
        res.status(500).json({ error: error.message });
    }
});

/**
 * GET events with filters
 */
router.get('/', async (req, res) => {
    try {
        const { type, incidentId, limit = 50 } = req.query;

        let events;

        if (type) {
            events = await eventStore.getByType(type, parseInt(limit));
        } else if (incidentId) {
            events = await eventStore.getByIncident(incidentId);
        } else {
            events = await eventStore.getRecent(parseInt(limit));
        }

        res.json({
            success: true,
            count: events.length,
            events
        });
    } catch (error) {
        console.error('Error fetching events:', error);
        res.status(500).json({ error: error.message });
    }
});

/**
 * GET event count by type
 */
router.get('/stats', async (req, res) => {
    try {
        const stats = await eventStore.getCountByType();

        res.json({
            success: true,
            stats
        });
    } catch (error) {
        console.error('Error fetching event stats:', error);
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;
