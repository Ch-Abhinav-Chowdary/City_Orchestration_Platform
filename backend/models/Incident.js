const mongoose = require('mongoose');

const incidentSchema = new mongoose.Schema({
    incidentId: {
        type: String,
        required: true,
        unique: true,
        index: true
    },
    type: {
        type: String,
        required: true,
        enum: ['fire', 'medical', 'hazmat', 'rescue', 'police', 'traffic'],
        index: true
    },
    severity: {
        type: Number,
        required: true,
        min: 1,
        max: 5,
        index: true
    },
    status: {
        type: String,
        required: true,
        enum: ['reported', 'assigned', 'active', 'resolved', 'closed'],
        default: 'reported',
        index: true
    },
    location: {
        lat: { type: Number, required: true },
        lng: { type: Number, required: true },
        address: String,
        zone: String
    },
    description: String,
    reportedAt: {
        type: Date,
        required: true,
        default: Date.now
    },
    assignedAt: Date,
    resolvedAt: Date,
    closedAt: Date,
    assignedResources: [{
        type: String,
        ref: 'Resource'
    }],
    riskScore: {
        type: Number,
        default: 0,
        min: 0,
        max: 100
    },
    estimatedImpact: {
        radius: Number, // meters
        affectedPopulation: Number,
        environmentalRisk: String
    }
}, {
    timestamps: true
});

// Geospatial index for location queries
incidentSchema.index({ 'location.lat': 1, 'location.lng': 1 });

module.exports = mongoose.model('Incident', incidentSchema);
