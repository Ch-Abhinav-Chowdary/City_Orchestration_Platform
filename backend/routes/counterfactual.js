const express = require('express');
const router = express.Router();
const counterfactualEngine = require('../services/counterfactualEngine');

/**
 * POST /api/counterfactual/simulate
 * Run a counterfactual simulation for an incident
 */
router.post('/simulate', async (req, res) => {
    try {
        const { incidentId, alternatives } = req.body;

        if (!incidentId) {
            return res.status(400).json({ error: 'incidentId is required' });
        }

        const result = await counterfactualEngine.simulateScenario(incidentId, alternatives || {});

        res.json({
            success: true,
            data: result
        });
    } catch (error) {
        console.error('Counterfactual simulation error:', error);
        res.status(500).json({
            error: error.message || 'Failed to run counterfactual simulation'
        });
    }
});

/**
 * GET /api/counterfactual/scenarios/:incidentId
 * Get all saved scenarios for an incident
 */
router.get('/scenarios/:incidentId', async (req, res) => {
    try {
        const { incidentId } = req.params;

        const scenarios = await counterfactualEngine.getScenarios(incidentId);

        res.json({
            success: true,
            data: scenarios
        });
    } catch (error) {
        console.error('Get scenarios error:', error);
        res.status(500).json({
            error: error.message || 'Failed to retrieve scenarios'
        });
    }
});

/**
 * POST /api/counterfactual/compare
 * Compare multiple counterfactual scenarios
 */
router.post('/compare', async (req, res) => {
    try {
        const { incidentId, scenarioIds } = req.body;

        if (!incidentId || !scenarioIds || scenarioIds.length === 0) {
            return res.status(400).json({
                error: 'incidentId and scenarioIds are required'
            });
        }

        if (scenarioIds.length < 2) {
            return res.status(400).json({
                error: 'At least 2 scenarioIds are required for comparison'
            });
        }

        const result = await counterfactualEngine.compareScenarios(incidentId, scenarioIds);

        res.json({
            success: true,
            data: result
        });
    } catch (error) {
        console.error('Compare scenarios error:', error);
        res.status(500).json({
            error: error.message || 'Failed to compare scenarios'
        });
    }
});

module.exports = router;
