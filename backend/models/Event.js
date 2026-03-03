const mongoose = require('mongoose');

const eventSchema = new mongoose.Schema({
    eventId: {
        type: String,
        required: true,
        unique: true,
        index: true
    },
    timestamp: {
        type: Date,
        required: true,
        default: Date.now,
        index: true
    },
    type: {
        type: String,
        required: true,
        enum: [
            'IncidentCreated',
            'ResourceStatusUpdated',
            'ResourceAssigned',
            'ConflictDetected',
            'ConflictResolved',
            'RiskScoreUpdated',
            'ManualOverride',
            'IncidentClosed'
        ],
        index: true
    },
    payload: {
        type: mongoose.Schema.Types.Mixed,
        required: true
    },
    metadata: {
        source: String,
        userId: String,
        correlationId: String
    }
}, {
    timestamps: false, // Using custom timestamp field
    collection: 'events'
});

// Events are immutable - prevent updates
eventSchema.pre('findOneAndUpdate', function () {
    throw new Error('Events are immutable and cannot be updated');
});

eventSchema.pre('updateOne', function () {
    throw new Error('Events are immutable and cannot be updated');
});

module.exports = mongoose.model('Event', eventSchema);
