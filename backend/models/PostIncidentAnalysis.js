const mongoose = require('mongoose');

const postIncidentAnalysisSchema = new mongoose.Schema({
    incidentId: {
        type: String,
        required: true,
        unique: true,
        ref: 'Incident',
        index: true
    },
    analyzedAt: {
        type: Date,
        required: true,
        default: Date.now
    },
    timeline: [{
        timestamp: Date,
        eventType: String,
        description: String,
        delay: Number // seconds from expected time
    }],
    resourceUtilization: {
        totalAssigned: Number,
        averageResponseTime: Number, // seconds
        idleTime: Number, // total seconds idle
        efficiency: Number // 0-100 percentage
    },
    failureClassification: {
        detection: { type: Boolean, default: false },
        allocation: { type: Boolean, default: false },
        coordination: { type: Boolean, default: false },
        capacity: { type: Boolean, default: false }
    },
    rootCause: String,
    recommendations: [String],
    similarIncidents: [{
        incidentId: String,
        similarity: Number, // 0-1 score
        outcome: String
    }],
    metrics: {
        totalDuration: Number, // seconds
        responseTime: Number, // seconds from report to first resource
        resolutionTime: Number, // seconds from report to resolution
        conflictsCount: Number,
        manualOverridesCount: Number
    }
}, {
    timestamps: true
});

module.exports = mongoose.model('PostIncidentAnalysis', postIncidentAnalysisSchema);
