const mongoose = require('mongoose');

const riskScoreSchema = new mongoose.Schema({
    incidentId: {
        type: String,
        required: true,
        ref: 'Incident',
        index: true
    },
    calculatedAt: {
        type: Date,
        required: true,
        default: Date.now,
        index: true
    },
    score: {
        type: Number,
        required: true,
        min: 0,
        max: 100
    },
    factors: {
        severity: { type: Number, default: 0 },
        responseDelay: { type: Number, default: 0 },
        resourceStress: { type: Number, default: 0 },
        environmental: { type: Number, default: 0 }
    },
    trend: {
        type: String,
        enum: ['increasing', 'stable', 'decreasing'],
        default: 'stable'
    }
}, {
    timestamps: false
});

// Compound index for time-series queries
riskScoreSchema.index({ incidentId: 1, calculatedAt: -1 });

module.exports = mongoose.model('RiskScore', riskScoreSchema);
