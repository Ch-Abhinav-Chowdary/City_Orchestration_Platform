const Conflict = require('../models/Conflict');
const Assignment = require('../models/Assignment');
const Resource = require('../models/Resource');
const Incident = require('../models/Incident');
const eventStore = require('./eventStore');
const orchestrationEngine = require('./orchestrationEngine');
const { v4: uuidv4 } = require('uuid');

/**
 * Conflict Resolution Engine
 * Detects and resolves resource/coordination conflicts
 */
class ConflictEngine {
    /**
     * Check for conflicts after resource assignment
     */
    async detectConflicts(incidentId) {
        const conflicts = [];

        // Rule 1: Double assignment detection
        const doubleAssignments = await this.detectDoubleAssignments(incidentId);
        conflicts.push(...doubleAssignments);

        // Rule 2: Department collision (multiple departments at same location)
        const departmentCollisions = await this.detectDepartmentCollisions(incidentId);
        conflicts.push(...departmentCollisions);

        // Store detected conflicts
        for (const conflict of conflicts) {
            await conflict.save();
            await eventStore.append('ConflictDetected', {
                conflictId: conflict.conflictId,
                type: conflict.type,
                involvedIncidents: conflict.involvedIncidents,
                involvedResources: conflict.involvedResources
            });
        }

        return conflicts;
    }

    /**
     * Detect if a resource is assigned to multiple incidents
     */
    async detectDoubleAssignments(incidentId) {
        const conflicts = [];
        const incident = await Incident.findOne({ incidentId });

        for (const resourceId of incident.assignedResources) {
            // Find all active assignments for this resource
            const assignments = await Assignment.find({
                resourceId,
                status: 'assigned'
            }).populate('incidentId');

            if (assignments.length > 1) {
                // Double assignment detected
                const conflict = new Conflict({
                    conflictId: uuidv4(),
                    type: 'double-assignment',
                    involvedIncidents: assignments.map(a => a.incidentId),
                    involvedResources: [resourceId],
                    severity: 4
                });

                conflicts.push(conflict);
            }
        }

        return conflicts;
    }

    /**
     * Detect if hazmat and police are in same area (requires coordination)
     */
    async detectDepartmentCollisions(incidentId) {
        const conflicts = [];
        const incident = await Incident.findOne({ incidentId });

        // Get all incidents in nearby area (within 500m)
        const nearbyIncidents = await Incident.find({
            status: { $in: ['assigned', 'active'] },
            incidentId: { $ne: incidentId }
        });

        for (const nearby of nearbyIncidents) {
            const distance = this.calculateSimpleDistance(
                incident.location.lat,
                incident.location.lng,
                nearby.location.lat,
                nearby.location.lng
            );

            if (distance < 500) {
                // Get resource types
                const incidentResources = await Resource.find({
                    resourceId: { $in: incident.assignedResources }
                });
                const nearbyResources = await Resource.find({
                    resourceId: { $in: nearby.assignedResources }
                });

                const incidentTypes = new Set(incidentResources.map(r => r.type));
                const nearbyTypes = new Set(nearbyResources.map(r => r.type));

                // Check for hazmat + police collision
                if (
                    (incidentTypes.has('hazmat') && nearbyTypes.has('police')) ||
                    (incidentTypes.has('police') && nearbyTypes.has('hazmat'))
                ) {
                    const conflict = new Conflict({
                        conflictId: uuidv4(),
                        type: 'department-collision',
                        involvedIncidents: [incidentId, nearby.incidentId],
                        involvedResources: [
                            ...incident.assignedResources,
                            ...nearby.assignedResources
                        ],
                        severity: 3
                    });

                    conflicts.push(conflict);
                }
            }
        }

        return conflicts;
    }

    /**
     * Resolve a conflict using specified strategy
     */
    async resolveConflict(conflictId, strategy, userId = null) {
        const conflict = await Conflict.findOne({ conflictId });
        if (!conflict) {
            throw new Error('Conflict not found');
        }

        let resolution = null;

        switch (strategy) {
            case 'rerank':
                resolution = await this.resolveByReranking(conflict);
                break;

            case 'alternative':
                resolution = await this.resolveByAlternative(conflict);
                break;

            case 'escalate':
                resolution = await this.resolveByEscalation(conflict);
                break;

            case 'manual-override':
                resolution = await this.resolveManually(conflict, userId);
                break;

            default:
                throw new Error('Unknown resolution strategy');
        }

        conflict.status = 'resolved';
        conflict.resolvedAt = new Date();
        conflict.resolution = resolution;
        await conflict.save();

        await eventStore.append('ConflictResolved', {
            conflictId: conflict.conflictId,
            strategy,
            resolution
        });

        return conflict;
    }

    /**
     * Resolve double-assignment by re-ranking priorities
     */
    async resolveByReranking(conflict) {
        if (conflict.type !== 'double-assignment') {
            return null;
        }

        const incidents = await Incident.find({
            incidentId: { $in: conflict.involvedIncidents }
        });

        // Sort by severity
        incidents.sort((a, b) => b.severity - a.severity);

        // Keep resource on highest priority incident
        const keepIncident = incidents[0];
        const revokeIncidents = incidents.slice(1);

        const actions = [];

        for (const incident of revokeIncidents) {
            // Revoke assignment
            const assignment = await Assignment.findOne({
                incidentId: incident.incidentId,
                resourceId: conflict.involvedResources[0],
                status: { $in: ['assigned', 'active'] }
            });

            if (assignment) {
                await orchestrationEngine.revokeAssignment(
                    assignment.assignmentId,
                    `Conflict resolution: resource prioritized to incident ${keepIncident.incidentId}`
                );
                actions.push({
                    action: 'revoke',
                    assignmentId: assignment.assignmentId,
                    incidentId: incident.incidentId
                });

                // Try to find alternative resource
                const alternative = await orchestrationEngine.assignResources(incident.incidentId);
                if (alternative) {
                    actions.push({
                        action: 'reassign',
                        incidentId: incident.incidentId,
                        newResourceId: alternative.resourceId
                    });
                }
            }
        }

        return {
            strategy: 'rerank',
            actions,
            resolvedBy: 'auto'
        };
    }

    /**
     * Resolve by finding alternative resources
     */
    async resolveByAlternative(conflict) {
        const actions = [];

        // Find all assignments in conflict
        const assignments = await Assignment.find({
            incidentId: { $in: conflict.involvedIncidents },
            resourceId: { $in: conflict.involvedResources },
            status: { $in: ['assigned', 'active'] }
        });

        // Sort by incident priority
        assignments.sort((a, b) => a.priority - b.priority);

        // Revoke lowest priority and reassign
        const lowestPriority = assignments[0];

        await orchestrationEngine.revokeAssignment(
            lowestPriority.assignmentId,
            'Conflict resolution: finding alternative'
        );

        actions.push({
            action: 'revoke',
            assignmentId: lowestPriority.assignmentId
        });

        const alternative = await orchestrationEngine.assignResources(lowestPriority.incidentId);
        if (alternative) {
            actions.push({
                action: 'assign-alternative',
                incidentId: lowestPriority.incidentId
            });
        }

        return {
            strategy: 'alternative',
            actions,
            resolvedBy: 'auto'
        };
    }

    /**
     * Escalate conflict for manual review
     */
    async resolveByEscalation(conflict) {
        conflict.status = 'escalated';
        await conflict.save();

        return {
            strategy: 'escalate',
            actions: [],
            resolvedBy: 'manual',
            note: 'Escalated for human decision'
        };
    }

    /**
     * Manual resolution
     */
    async resolveManually(conflict, userId) {
        return {
            strategy: 'manual-override',
            actions: [],
            resolvedBy: 'manual',
            userId
        };
    }

    calculateSimpleDistance(lat1, lng1, lat2, lng2) {
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
}

module.exports = new ConflictEngine();
