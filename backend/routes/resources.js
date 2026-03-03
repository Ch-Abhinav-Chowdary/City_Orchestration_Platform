const express = require('express');
const router = express.Router();
const Resource = require('../models/Resource');
const eventStore = require('../services/eventStore');

/**
 * GET all resources with filters
 */
router.get('/', async (req, res) => {
    try {
        const { status, type, lat, lng, radius } = req.query;

        const query = {};
        if (status) query.status = status;
        if (type) query.type = type;

        let resources = await Resource.find(query);

        // Filter by proximity if coordinates provided
        if (lat && lng && radius) {
            const targetLat = parseFloat(lat);
            const targetLng = parseFloat(lng);
            const maxRadius = parseFloat(radius);

            resources = resources.filter(resource => {
                const distance = calculateDistance(
                    targetLat,
                    targetLng,
                    resource.location.lat,
                    resource.location.lng
                );
                return distance <= maxRadius;
            });
        }

        res.json({
            success: true,
            count: resources.length,
            resources
        });
    } catch (error) {
        console.error('Error fetching resources:', error);
        res.status(500).json({ error: error.message });
    }
});

/**
 * UPDATE resource status/location
 */
router.post('/update', async (req, res) => {
    try {
        const { resourceId, status, location } = req.body;

        const resource = await Resource.findOne({ resourceId });

        if (!resource) {
            return res.status(404).json({ error: 'Resource not found' });
        }

        if (status) resource.status = status;
        if (location) resource.location = location;
        resource.lastUpdated = new Date();

        await resource.save();

        // Log event
        await eventStore.append('ResourceStatusUpdated', {
            resourceId,
            status: status || resource.status,
            location: location || resource.location
        });

        res.json({
            success: true,
            resource
        });
    } catch (error) {
        console.error('Error updating resource:', error);
        res.status(500).json({ error: error.message });
    }
});

/**
 * GET resource by ID
 */
router.get('/:id', async (req, res) => {
    try {
        const resource = await Resource.findOne({ resourceId: req.params.id });

        if (!resource) {
            return res.status(404).json({ error: 'Resource not found' });
        }

        res.json({
            success: true,
            resource
        });
    } catch (error) {
        console.error('Error fetching resource:', error);
        res.status(500).json({ error: error.message });
    }
});

function calculateDistance(lat1, lng1, lat2, lng2) {
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

module.exports = router;
