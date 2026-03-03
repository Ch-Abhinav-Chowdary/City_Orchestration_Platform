const mongoose = require('mongoose');
const Incident = require('../models/Incident');
const Resource = require('../models/Resource');
const Assignment = require('../models/Assignment');
const PostIncidentAnalysis = require('../models/PostIncidentAnalysis');
const Event = require('../models/Event');

/**
 * Comprehensive Data Seeding Script
 * Generates realistic fake data including:
 * - Active incidents
 * - Closed incidents (for counterfactual analysis)
 * - Historical data with metrics
 * - Resource conflicts
 */

// NYC coordinates
const NYC_BOUNDS = {
    minLat: 40.6,
    maxLat: 40.85,
    minLng: -74.1,
    maxLng: -73.9
};

const INCIDENT_CONFIGS = {
    fire: {
        descriptions: ['Building fire', 'Apartment fire', 'Commercial fire', 'Warehouse fire', 'Residential fire'],
        resourceTypes: ['fire-truck', 'ambulance']
    },
    medical: {
        descriptions: ['Medical emergency', 'Cardiac arrest', 'Severe injury', 'Multiple casualties', 'Traffic accident'],
        resourceTypes: ['ambulance', 'police']
    },
    hazmat: {
        descriptions: ['Hazmat spill', 'Chemical leak', 'Gas leak', 'Industrial accident', 'Environmental hazard'],
        resourceTypes: ['hazmat', 'fire-truck']
    },
    rescue: {
        descriptions: ['Person trapped', 'Building collapse', 'Confined space rescue', 'High-angle rescue'],
        resourceTypes: ['rescue', 'fire-truck', 'ambulance']
    }
};

const NYC_NEIGHBORHOODS = [
    'Manhattan - Midtown', 'Manhattan - Upper East Side', 'Brooklyn - Williamsburg',
    'Brooklyn - Park Slope', 'Queens - Astoria', 'Bronx - Fordham', 'Staten Island - St. George'
];

function randomLocation() {
    return {
        lat: NYC_BOUNDS.minLat + Math.random() * (NYC_BOUNDS.maxLat - NYC_BOUNDS.minLat),
        lng: NYC_BOUNDS.minLng + Math.random() * (NYC_BOUNDS.maxLng - NYC_BOUNDS.minLng),
        address: `${Math.floor(Math.random() * 999) + 1} ${NYC_NEIGHBORHOODS[Math.floor(Math.random() * NYC_NEIGHBORHOODS.length)]}, NYC`
    };
}

function randomDate(daysAgo) {
    return new Date(Date.now() - daysAgo * 24 * 60 * 60 * 1000 - Math.random() * 24 * 60 * 60 * 1000);
}

async function seedResources() {
    console.log('🚒 Seeding resources...');

    const resources = [];
    const configs = [
        { type: 'fire-truck', count: 20, department: 'FDNY', capabilities: ['firefighting', 'rescue'] },
        { type: 'ambulance', count: 25, department: 'EMS', capabilities: ['medical', 'transport'] },
        { type: 'police', count: 30, department: 'NYPD', capabilities: ['law_enforcement'] },
        { type: 'hazmat', count: 5, department: 'FDNY-Hazmat', capabilities: ['hazmat'] },
        { type: 'rescue', count: 8, department: 'FDNY-Rescue', capabilities: ['rescue'] }
    ];

    for (const { type, count, department, capabilities } of configs) {
        for (let i = 1; i <= count; i++) {
            resources.push({
                resourceId: `${type.toUpperCase().replace('-', '')}-${String(i).padStart(3, '0')}`,
                type,
                department,
                status: Math.random() > 0.3 ? 'available' : 'assigned',
                location: randomLocation(),
                capabilities
            });
        }
    }

    await Resource.deleteMany({});
    await Resource.insertMany(resources);
    console.log(`✅ Created ${resources.length} resources`);
    return resources;
}

async function seedIncidents() {
    console.log('🚨 Seeding incidents...');

    const incidents = [];
    const baseTimestamp = Date.now();

    // 10 Active incidents (reported/assigned/active)
    for (let i = 0; i < 10; i++) {
        const type = Object.keys(INCIDENT_CONFIGS)[Math.floor(Math.random() * 4)];
        const config = INCIDENT_CONFIGS[type];
        const severity = Math.floor(Math.random() * 5) + 1;
        const status = ['reported', 'assigned', 'active'][Math.floor(Math.random() * 3)];
        const reportedAt = new Date(Date.now() - Math.random() * 2 * 60 * 60 * 1000); // Last 2 hours

        incidents.push({
            incidentId: `INC-${baseTimestamp + i}-ACTIVE`,
            type,
            severity,
            status,
            location: randomLocation(),
            description: config.descriptions[Math.floor(Math.random() * config.descriptions.length)],
            reportedAt,
            assignedAt: status !== 'reported' ? new Date(reportedAt.getTime() + 5 * 60 * 1000) : null,
            riskScore: Math.min(severity * 15 + Math.floor(Math.random() * 25), 100),
            estimatedImpact: {
                radius: 100 + severity * 200
            }
        });
    }

    // 30 Closed incidents (for counterfactual analysis and historical data)
    for (let i = 0; i < 30; i++) {
        const type = Object.keys(INCIDENT_CONFIGS)[Math.floor(Math.random() * 4)];
        const config = INCIDENT_CONFIGS[type];
        const severity = Math.floor(Math.random() * 5) + 1;
        const daysAgo = Math.floor(Math.random() * 30);
        const reportedAt = randomDate(daysAgo);
        const assignedAt = new Date(reportedAt.getTime() + (5 + Math.random() * 10) * 60 * 1000);
        const closedAt = new Date(assignedAt.getTime() + (30 + Math.random() * 60) * 60 * 1000);

        incidents.push({
            incidentId: `INC-${baseTimestamp + 10 + i}-CLOSED`,
            type,
            severity,
            status: 'closed',
            location: randomLocation(),
            description: config.descriptions[Math.floor(Math.random() * config.descriptions.length)],
            reportedAt,
            assignedAt,
            closedAt,
            riskScore: Math.min(severity * 15 + Math.floor(Math.random() * 25), 100),
            estimatedImpact: {
                radius: 100 + severity * 200
            }
        });
    }

    // 10 Resolved incidents (historical)
    for (let i = 0; i < 10; i++) {
        const type = Object.keys(INCIDENT_CONFIGS)[Math.floor(Math.random() * 4)];
        const config = INCIDENT_CONFIGS[type];
        const severity = Math.floor(Math.random() * 5) + 1;
        const daysAgo = Math.floor(Math.random() * 7);
        const reportedAt = randomDate(daysAgo);
        const assignedAt = new Date(reportedAt.getTime() + (5 + Math.random() * 10) * 60 * 1000);

        incidents.push({
            incidentId: `INC-${baseTimestamp + 40 + i}-RESOLVED`,
            type,
            severity,
            status: 'resolved',
            location: randomLocation(),
            description: config.descriptions[Math.floor(Math.random() * config.descriptions.length)],
            reportedAt,
            assignedAt,
            resolvedAt: new Date(assignedAt.getTime() + (20 + Math.random() * 40) * 60 * 1000),
            riskScore: Math.min(severity * 15 + Math.floor(Math.random() * 25), 100),
            estimatedImpact: {
                radius: 100 + severity * 200
            }
        });
    }

    await Incident.deleteMany({});
    try {
        const created = await Incident.insertMany(incidents);
        console.log(`✅ Created ${created.length} incidents (10 active, 30 closed, 10 resolved)`);
        return created;
    } catch (error) {
        console.error('Failed to insert incidents:', error.message);
        if (error.errors) {
            Object.keys(error.errors).forEach(key => {
                console.error(`  Field: ${key}, Error: ${error.errors[key].message}`);
            });
        }
        throw error;
    }
}

async function seedAssignments(incidents, resources) {
    console.log('📋 Seeding assignments...');

    const assignments = [];

    for (const incident of incidents) {
        if (incident.status !== 'reported') {
            const config = INCIDENT_CONFIGS[incident.type];
            const numResources = Math.floor(Math.random() * 3) + 1;

            for (let i = 0; i < numResources; i++) {
                const resourceType = config.resourceTypes[i % config.resourceTypes.length];
                const availableResources = resources.filter(r => r.type === resourceType);

                if (availableResources.length > 0) {
                    const resource = availableResources[Math.floor(Math.random() * availableResources.length)];

                    const distance = Math.sqrt(
                        Math.pow((incident.location.lat - resource.location.lat) * 111000, 2) +
                        Math.pow((incident.location.lng - resource.location.lng) * 111000, 2)
                    );

                    assignments.push({
                        incidentId: incident.incidentId,
                        resourceId: resource.resourceId,
                        assignedAt: incident.assignedAt,
                        status: incident.status === 'closed' ? 'completed' : 'active',
                        distance: Math.round(distance),
                        travelTime: Math.round(distance / 500),
                        score: 100 - (distance / 100)
                    });
                }
            }
        }
    }

    await Assignment.deleteMany({});
    await Assignment.insertMany(assignments);
    console.log(`✅ Created ${assignments.length} assignments`);
    return assignments;
}

async function seedPostIncidentAnalyses(incidents) {
    console.log('📊 Seeding post-incident analyses...');

    const analyses = [];
    const closedIncidents = incidents.filter(i => i.status === 'closed');

    for (const incident of closedIncidents) {
        const responseTime = Math.floor(Math.random() * 15) + 5; // 5-20 min
        const resolutionTime = Math.floor(Math.random() * 60) + 30; // 30-90 min
        const efficiency = 0.6 + Math.random() * 0.3;

        const failureTypes = ['none', 'minor', 'moderate', 'major'];
        const failureWeights = [0.5, 0.3, 0.15, 0.05];
        let cumulativeWeight = 0;
        let failureClassification = 'none';
        const randomValue = Math.random();

        for (let i = 0; i < failureTypes.length; i++) {
            cumulativeWeight += failureWeights[i];
            if (randomValue < cumulativeWeight) {
                failureClassification = failureTypes[i];
                break;
            }
        }

        analyses.push({
            incidentId: incident.incidentId,
            analyzedAt: new Date(incident.closedAt.getTime() + 24 * 60 * 60 * 1000),
            metrics: {
                responseTime,
                resolutionTime,
                resourcesUsed: Math.floor(Math.random() * 5) + 2
            },
            resourceUtilization: {
                efficiency,
                wastedTime: Math.floor((1 - efficiency) * resolutionTime)
            },
            failureClassification,
            recommendations: [
                'Continue current protocol',
                'Monitor resource availability',
                'Review response times'
            ]
        });
    }

    await PostIncidentAnalysis.deleteMany({});
    await PostIncidentAnalysis.insertMany(analyses);
    console.log(`✅ Created ${analyses.length} post-incident analyses`);
    return analyses;
}

async function seedEvents(incidents) {
    console.log('📝 Seeding events...');

    const events = [];

    for (const incident of incidents) {
        events.push({
            type: 'incident.created',
            timestamp: incident.reportedAt,
            data: {
                incidentId: incident.incidentId,
                type: incident.type,
                severity: incident.severity
            }
        });

        if (incident.assignedAt) {
            events.push({
                type: 'incident.assigned',
                timestamp: incident.assignedAt,
                data: { incidentId: incident.incidentId }
            });
        }

        if (incident.closedAt) {
            events.push({
                type: 'incident.closed',
                timestamp: incident.closedAt,
                data: { incidentId: incident.incidentId }
            });
        }
    }

    await Event.deleteMany({});
    await Event.insertMany(events);
    console.log(`✅ Created ${events.length} events`);
}

async function seedAll() {
    try {
        console.log('🌱 Starting comprehensive data seeding...\n');

        console.log('Step 1: Seeding resources...');
        const resources = await seedResources();
        console.log('✅ Resources complete\n');

        console.log('Step 2: Seeding incidents...');
        const incidents = await seedIncidents();
        console.log('✅ Incidents complete\n');

        console.log('Step 3: Seeding assignments...');
        const assignments = await seedAssignments(incidents, resources);
        console.log('✅ Assignments complete\n');

        console.log('Step 4: Seeding analyses...');
        const analyses = await seedPostIncidentAnalyses(incidents);
        console.log('✅ Analyses complete\n');

        console.log('Step 5: Seeding events...');
        await seedEvents(incidents);
        console.log('✅ Events complete\n');

        console.log('\n📊 Summary:');
        console.log(`   - Resources: ${resources.length}`);
        console.log(`   - Incidents: ${incidents.length}`);
        console.log(`   - Assignments: ${assignments.length}`);
        console.log(`   - Analyses: ${analyses.length}`);
        console.log('\n🎉 Database ready!');

    } catch (error) {
        console.error('❌ Error:', error.message);
        console.error('Full error:', error);
        if (error.errors) {
            Object.keys(error.errors).forEach(key => {
                console.error(`  - ${key}: ${error.errors[key].message}`);
            });
        }
        throw error;
    }
}

module.exports = { seedAll };

if (require.main === module) {
    const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/emergency-orchestration';

    mongoose.connect(mongoUri)
        .then(() => {
            console.log('📡 Connected to MongoDB');
            return seedAll();
        })
        .then(() => {
            console.log('\n👋 Closing connection...');
            return mongoose.connection.close();
        })
        .then(() => {
            console.log('✅ Done!');
            process.exit(0);
        })
        .catch((error) => {
            console.error('❌ Fatal error:', error);
            process.exit(1);
        });
}
