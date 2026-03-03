const Resource = require('../models/Resource');
const Incident = require('../models/Incident');
const Assignment = require('../models/Assignment');
const eventStore = require('./eventStore');
const { calculateDistance, estimateTravelTime } = require('../utils/geoUtils');
const { v4: uuidv4 } = require('uuid');

/**
 * Resource Orchestration Engine
 * Assigns optimal resources to incidents based on multi-criteria scoring
 */
class OrchestrationEngine {
    /**
     * Assign resources to an incident
     */
    async assignResources(incidentId, options = {}) {
        const incident = await Incident.findOne({ incidentId });
        if (!incident) {
            throw new Error('Incident not found');
        }

        console.log(`🎯 Orchestrating resources for incident ${incidentId}`);

        // Determine resource requirements based on incident type and severity
        const requirements = this.getResourceRequirements(incident);

        const assignments = [];

        for (const req of requirements) {
            const assignment = await this.assignSingleResource(incident, req);
            if (assignment) {
                assignments.push(assignment);
            }
        }

        // Update incident status
        if (assignments.length > 0) {
            incident.status = 'assigned';
            incident.assignedAt = new Date();
            incident.assignedResources = assignments.map(a => a.resourceId);
            await incident.save();

            await eventStore.append('ResourceAssigned', {
                incidentId: incident.incidentId,
                assignments: assignments.map(a => ({
                    resourceId: a.resourceId,
                    score: a.score
                }))
            });
        }

        return assignments;
    }

    /**
     * Determine what resources are needed for an incident
     */
    getResourceRequirements(incident) {
        const requirements = [];

        switch (incident.type) {
            case 'fire':
                requirements.push({ type: 'fire-truck', count: incident.severity >= 4 ? 2 : 1 });
                requirements.push({ type: 'ambulance', count: 1 });
                if (incident.severity >= 4) {
                    requirements.push({ type: 'rescue', count: 1 });
                }
                break;

            case 'medical':
                requirements.push({ type: 'ambulance', count: incident.severity >= 3 ? 2 : 1 });
                break;

            case 'hazmat':
                requirements.push({ type: 'hazmat', count: 1 });
                requirements.push({ type: 'fire-truck', count: 1 });
                requirements.push({ type: 'police', count: 1 });
                break;

            case 'rescue':
                requirements.push({ type: 'rescue', count: 1 });
                requirements.push({ type: 'ambulance', count: 1 });
                break;

            case 'police':
                requirements.push({ type: 'police', count: incident.severity >= 4 ? 2 : 1 });
                break;

            case 'traffic':
                requirements.push({ type: 'police', count: 1 });
                if (incident.severity >= 3) {
                    requirements.push({ type: 'ambulance', count: 1 });
                }
                break;

            default:
                requirements.push({ type: 'police', count: 1 });
        }

        return requirements;
    }

    /**
     * Assign a single resource based on scoring
     */
    async assignSingleResource(incident, requirement) {
        // Find available or low-priority-assigned resources of the required type
        const candidates = await Resource.find({
            type: requirement.type,
            status: { $in: ['available', 'assigned'] }
        });

        if (candidates.length === 0) {
            console.log(`⚠️  No ${requirement.type} resources available`);
            return null;
        }

        // Score each candidate
        const scoredCandidates = await Promise.all(
            candidates.map(async (resource) => {
                const score = await this.scoreResource(resource, incident);
                return { resource, score };
            })
        );

        // Sort by score (highest first)
        scoredCandidates.sort((a, b) => b.score - a.score);

        // Select best resource
        const best = scoredCandidates[0];

        if (best.score < 20) {
            console.log(`⚠️  Best ${requirement.type} score too low: ${best.score}`);
            return null;
        }

        // Create assignment
        const distance = calculateDistance(
            incident.location.lat,
            incident.location.lng,
            best.resource.location.lat,
            best.resource.location.lng
        );

        const assignment = new Assignment({
            assignmentId: uuidv4(),
            incidentId: incident.incidentId,
            resourceId: best.resource.resourceId,
            priority: incident.severity,
            status: 'assigned',
            travelTime: estimateTravelTime(distance),
            distance: Math.round(distance),
            score: best.score
        });

        await assignment.save();

        // Update resource
        best.resource.currentAssignment = incident.incidentId;
        best.resource.status = 'assigned';
        best.resource.lastUpdated = new Date();
        await best.resource.save();

        console.log(`✅ Assigned ${best.resource.resourceId} to ${incident.incidentId} (score: ${best.score.toFixed(1)})`);

        return assignment;
    }

    /**
     * Score a resource for an incident
     * Higher score = better match
     */
    async scoreResource(resource, incident) {
        let score = 0;

        // 1. Distance score (40% weight) - closer is better
        const distance = calculateDistance(
            incident.location.lat,
            incident.location.lng,
            resource.location.lat,
            resource.location.lng
        );

        // Normalize distance: 0m = 40 points, 10km = 0 points
        const maxDistance = 10000; // 10km
        const distanceScore = Math.max(0, 40 * (1 - distance / maxDistance));
        score += distanceScore;

        // 2. Availability score (30% weight)
        if (resource.status === 'available') {
            score += 30;
        } else if (resource.status === 'assigned') {
            // Check if current assignment is lower priority
            const currentAssignment = await Assignment.findOne({
                resourceId: resource.resourceId,
                status: 'assigned'
            });

            if (currentAssignment && currentAssignment.priority < incident.severity) {
                score += 15; // Can borrow from lower priority
            } else {
                score += 5; // Might be available soon
            }
        }

        // 3. Capability match score (20% weight)
        // All resources of same type have base capability
        score += 20;

        // 4. Department preference (10% weight)
        // Prefer resources from same zone
        if (resource.department === incident.location.zone) {
            score += 10;
        }

        return score;
    }

    /**
     * Revoke a resource assignment
     */
    async revokeAssignment(assignmentId, reason) {
        const assignment = await Assignment.findOne({ assignmentId });
        if (!assignment) {
            throw new Error('Assignment not found');
        }

        assignment.status = 'revoked';
        assignment.revokedAt = new Date();
        await assignment.save();

        // Free up the resource
        const resource = await Resource.findOne({ resourceId: assignment.resourceId });
        if (resource) {
            resource.status = 'available';
            resource.currentAssignment = null;
            await resource.save();
        }

        await eventStore.append('ResourceAssigned', {
            incidentId: assignment.incidentId,
            resourceId: assignment.resourceId,
            action: 'revoked',
            reason
        });

        return assignment;
    }
}

module.exports = new OrchestrationEngine();
