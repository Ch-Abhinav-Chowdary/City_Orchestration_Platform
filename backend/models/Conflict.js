const mongoose = require('mongoose');

const conflictSchema = new mongoose.Schema({
    conflictId: {
        type: String,
        required: true,
        unique: true,
        index: true
    },
    type: {
        type: String,
        required: true,
        enum: ['double-assignment', 'capacity-overflow', 'department-collision'],
        index: true
    },
    detectedAt: {
        type: Date,
        required: true,
        default: Date.now
    },
    resolvedAt: Date,
    status: {
        type: String,
        required: true,
        enum: ['detected', 'escalated', 'resolved'],
        default: 'detected',
        index: true
    },
    involvedIncidents: [{
        type: String,
        ref: 'Incident'
    }],
    involvedResources: [{
        type: String,
        ref: 'Resource'
    }],
    resolution: {
        strategy: {
            type: String,
            enum: ['rerank', 'alternative', 'escalate', 'manual-override']
        },
        actions: [mongoose.Schema.Types.Mixed],
        resolvedBy: {
            type: String,
            enum: ['auto', 'manual']
        },
        userId: String
    },
    severity: {
        type: Number,
        min: 1,
        max: 5,
        default: 3
    }
}, {
    timestamps: true
});

module.exports = mongoose.model('Conflict', conflictSchema);
