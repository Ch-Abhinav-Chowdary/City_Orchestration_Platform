const Event = require('../models/Event');
const { v4: uuidv4 } = require('uuid');

/**
 * Event Store Service - Append-only immutable event log
 * All system actions are recorded as events for auditability and replay
 */
class EventStore {
    /**
     * Append a new event to the store
     */
    async append(type, payload, metadata = {}) {
        try {
            const event = new Event({
                eventId: uuidv4(),
                timestamp: new Date(),
                type,
                payload,
                metadata: {
                    source: metadata.source || 'system',
                    userId: metadata.userId || null,
                    correlationId: metadata.correlationId || uuidv4()
                }
            });

            await event.save();
            console.log(`📝 Event stored: ${type} [${event.eventId}]`);
            return event;
        } catch (error) {
            console.error('❌ Event store error:', error.message);
            throw error;
        }
    }

    /**
     * Query events by type
     */
    async getByType(type, limit = 100) {
        return await Event.find({ type })
            .sort({ timestamp: -1 })
            .limit(limit);
    }

    /**
     * Query events by correlation ID (related events)
     */
    async getByCorrelation(correlationId) {
        return await Event.find({ 'metadata.correlationId': correlationId })
            .sort({ timestamp: 1 });
    }

    /**
     * Query events for a specific incident
     */
    async getByIncident(incidentId) {
        return await Event.find({
            $or: [
                { 'payload.incidentId': incidentId },
                { 'payload.incident.incidentId': incidentId }
            ]
        }).sort({ timestamp: 1 });
    }

    /**
     * Get all events in time range (for replay)
     */
    async getInRange(startTime, endTime, limit = 1000) {
        return await Event.find({
            timestamp: { $gte: startTime, $lte: endTime }
        })
            .sort({ timestamp: 1 })
            .limit(limit);
    }

    /**
     * Get recent events
     */
    async getRecent(limit = 50) {
        return await Event.find()
            .sort({ timestamp: -1 })
            .limit(limit);
    }

    /**
     * Get event count by type
     */
    async getCountByType() {
        return await Event.aggregate([
            {
                $group: {
                    _id: '$type',
                    count: { $sum: 1 }
                }
            }
        ]);
    }
}

module.exports = new EventStore();
