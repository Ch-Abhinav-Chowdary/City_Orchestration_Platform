const mongoose = require('mongoose');

const resourceSchema = new mongoose.Schema({
    resourceId: {
        type: String,
        required: true,
        unique: true,
        index: true
    },
    type: {
        type: String,
        required: true,
        enum: ['ambulance', 'fire-truck', 'police', 'hazmat', 'rescue'],
        index: true
    },
    department: {
        type: String,
        required: true
    },
    status: {
        type: String,
        required: true,
        enum: ['available', 'assigned', 'active', 'offline'],
        default: 'available',
        index: true
    },
    location: {
        lat: { type: Number, required: true },
        lng: { type: Number, required: true }
    },
    capabilities: [String],
    currentAssignment: {
        type: String,
        ref: 'Incident',
        default: null
    },
    lastUpdated: {
        type: Date,
        default: Date.now
    },
    crew: {
        size: Number,
        specializations: [String]
    }
}, {
    timestamps: true
});

// Geospatial index for proximity queries
resourceSchema.index({ 'location.lat': 1, 'location.lng': 1 });

module.exports = mongoose.model('Resource', resourceSchema);
