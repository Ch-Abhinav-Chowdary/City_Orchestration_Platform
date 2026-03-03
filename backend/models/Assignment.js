const mongoose = require('mongoose');

const assignmentSchema = new mongoose.Schema({
    assignmentId: {
        type: String,
        required: true,
        unique: true,
        index: true
    },
    incidentId: {
        type: String,
        required: true,
        ref: 'Incident',
        index: true
    },
    resourceId: {
        type: String,
        required: true,
        ref: 'Resource',
        index: true
    },
    assignedAt: {
        type: Date,
        required: true,
        default: Date.now
    },
    completedAt: Date,
    revokedAt: Date,
    status: {
        type: String,
        required: true,
        enum: ['pending', 'assigned', 'active', 'completed', 'revoked'],
        default: 'pending',
        index: true
    },
    priority: {
        type: Number,
        required: true,
        min: 1,
        max: 5
    },
    travelTime: Number, // estimated seconds
    distance: Number, // meters
    score: Number // assignment score from orchestration engine
}, {
    timestamps: true
});

// Compound index for querying active assignments
assignmentSchema.index({ incidentId: 1, status: 1 });
assignmentSchema.index({ resourceId: 1, status: 1 });

module.exports = mongoose.model('Assignment', assignmentSchema);
