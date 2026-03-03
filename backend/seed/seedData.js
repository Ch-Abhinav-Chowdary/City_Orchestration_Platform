require('dotenv').config();
const mongoose = require('mongoose');
const { v4: uuidv4 } = require('uuid');

// Import models
const Resource = require('../models/Resource');
const Incident = require('../models/Incident');
const Assignment = require('../models/Assignment');
const Conflict = require('../models/Conflict');
const eventStore = require('../services/eventStore');
const analysisEngine = require('../services/analysisEngine');

// City center: New York City (Times Square)
const CITY_CENTER = { lat: 40.7580, lng: -73.9855 };
const CITY_RADIUS = 5000; // 5km radius

/**
 * Generate random location within city bounds
 */
function randomLocation() {
    // Random offset in meters
    const offsetLat = (Math.random() - 0.5) * CITY_RADIUS * 2;
    const offsetLng = (Math.random() - 0.5) * CITY_RADIUS * 2;

    // Convert meters to degrees (approximate)
    const lat = CITY_CENTER.lat + (offsetLat / 111000);
    const lng = CITY_CENTER.lng + (offsetLng / (111000 * Math.cos(CITY_CENTER.lat * Math.PI / 180)));

    return { lat, lng };
}

/**
 * Generate resources (50 total)
 */
async function seedResources() {
    console.log('🚒 Seeding resources...');

    const zones = ['North', 'South', 'East', 'West', 'Central'];
    const resources = [];

    // 15 ambulances
    for (let i = 1; i <= 15; i++) {
        resources.push({
            resourceId: `amb-${String(i).padStart(3, '0')}`,
            type: 'ambulance',
            department: zones[i % zones.length],
            status: Math.random() > 0.2 ? 'available' : 'offline',
            location: randomLocation(),
            capabilities: ['emt', 'life-support'],
            crew: {
                size: 2,
                specializations: ['paramedic', 'emt']
            }
        });
    }

    // 10 fire trucks
    for (let i = 1; i <= 10; i++) {
        resources.push({
            resourceId: `fire-${String(i).padStart(3, '0')}`,
            type: 'fire-truck',
            department: zones[i % zones.length],
            status: Math.random() > 0.15 ? 'available' : 'offline',
            location: randomLocation(),
            capabilities: ['fire-suppression', 'rescue'],
            crew: {
                size: 4,
                specializations: ['firefighter', 'driver']
            }
        });
    }

    // 15 police units
    for (let i = 1; i <= 15; i++) {
        resources.push({
            resourceId: `police-${String(i).padStart(3, '0')}`,
            type: 'police',
            department: zones[i % zones.length],
            status: Math.random() > 0.1 ? 'available' : 'offline',
            location: randomLocation(),
            capabilities: ['law-enforcement', 'traffic-control'],
            crew: {
                size: 2,
                specializations: ['officer']
            }
        });
    }

    // 5 hazmat teams
    for (let i = 1; i <= 5; i++) {
        resources.push({
            resourceId: `hazmat-${String(i).padStart(3, '0')}`,
            type: 'hazmat',
            department: 'Central',
            status: Math.random() > 0.1 ? 'available' : 'offline',
            location: randomLocation(),
            capabilities: ['hazmat', 'decontamination', 'chemical'],
            crew: {
                size: 3,
                specializations: ['hazmat-specialist']
            }
        });
    }

    // 5 rescue units
    for (let i = 1; i <= 5; i++) {
        resources.push({
            resourceId: `rescue-${String(i).padStart(3, '0')}`,
            type: 'rescue',
            department: zones[i % zones.length],
            status: Math.random() > 0.2 ? 'available' : 'offline',
            location: randomLocation(),
            capabilities: ['technical-rescue', 'high-angle'],
            crew: {
                size: 4,
                specializations: ['rescue-specialist', 'rope-tech']
            }
        });
    }

    await Resource.insertMany(resources);
    console.log(`✅ Created ${resources.length} resources`);
}

/**
 * Generate historical incidents (100 closed incidents)
 */
async function seedHistoricalIncidents() {
    console.log('📚 Seeding historical incidents...');

    const types = ['fire', 'medical', 'hazmat', 'rescue', 'police', 'traffic'];
    const incidents = [];

    for (let i = 1; i <= 100; i++) {
        const type = types[Math.floor(Math.random() * types.length)];
        const severity = Math.ceil(Math.random() * 5);

        const reportedAt = new Date(Date.now() - Math.random() * 90 * 24 * 60 * 60 * 1000); // Last 90 days
        const assignedAt = new Date(reportedAt.getTime() + Math.random() * 600000); // 0-10 min later
        const resolvedAt = new Date(assignedAt.getTime() + Math.random() * 3600000); // 0-60 min later

        incidents.push({
            incidentId: `hist-${String(i).padStart(3, '0')}`,
            type,
            severity,
            location: randomLocation(),
            description: `Historical ${type} incident - severity ${severity}`,
            status: 'closed',
            reportedAt,
            assignedAt,
            resolvedAt,
            closedAt: resolvedAt,
            riskScore: Math.floor(severity * 20 + Math.random() * 20)
        });
    }

    await Incident.insertMany(incidents);
    console.log(`✅ Created ${incidents.length} historical incidents`);

    // Generate analysis for some of them
    console.log('📊 Generating post-incident analyses...');

    for (let i = 0; i < 20; i++) {
        const incident = incidents[i];
        try {
            await analysisEngine.analyzeIncident(incident.incidentId);
        } catch (error) {
            console.error(`Failed to analyze ${incident.incidentId}:`, error.message);
        }
    }

    console.log('✅ Generated 20 post-incident analyses');
}

/**
 * Generate active incidents (8 active)
 */
async function seedActiveIncidents() {
    console.log('🚨 Seeding active incidents...');

    const incidents = [];

    // 2 high-severity incidents
    incidents.push({
        incidentId: uuidv4(),
        type: 'fire',
        severity: 5,
        location: randomLocation(),
        description: 'High-rise building fire - 15th floor',
        status: 'reported',
        reportedAt: new Date(Date.now() - 120000), // 2 minutes ago
        estimatedImpact: {
            radius: 500,
            affectedPopulation: 200
        }
    });

    incidents.push({
        incidentId: uuidv4(),
        type: 'hazmat',
        severity: 4,
        location: randomLocation(),
        description: 'Chemical spill at industrial facility',
        status: 'reported',
        reportedAt: new Date(Date.now() - 300000), // 5 minutes ago
        estimatedImpact: {
            radius: 1000,
            affectedPopulation: 500,
            environmentalRisk: 'high'
        }
    });

    // 3 medium-severity incidents (will be assigned)
    incidents.push({
        incidentId: uuidv4(),
        type: 'medical',
        severity: 3,
        location: randomLocation(),
        description: 'Multiple casualties - traffic accident',
        status: 'reported',
        reportedAt: new Date(Date.now() - 180000) // 3 minutes ago
    });

    incidents.push({
        incidentId: uuidv4(),
        type: 'rescue',
        severity: 3,
        location: randomLocation(),
        description: 'Person trapped in collapsed structure',
        status: 'reported',
        reportedAt: new Date(Date.now() - 420000) // 7 minutes ago
    });

    incidents.push({
        incidentId: uuidv4(),
        type: 'fire',
        severity: 2,
        location: randomLocation(),
        description: 'Vehicle fire on highway',
        status: 'reported',
        reportedAt: new Date(Date.now() - 240000) // 4 minutes ago
    });

    // 3 low-severity incidents
    incidents.push({
        incidentId: uuidv4(),
        type: 'traffic',
        severity: 1,
        location: randomLocation(),
        description: 'Minor traffic accident - no injuries',
        status: 'reported',
        reportedAt: new Date(Date.now() - 60000) // 1 minute ago
    });

    incidents.push({
        incidentId: uuidv4(),
        type: 'police',
        severity: 2,
        location: randomLocation(),
        description: 'Noise complaint',
        status: 'reported',
        reportedAt: new Date(Date.now() - 90000) // 1.5 minutes ago
    });

    incidents.push({
        incidentId: uuidv4(),
        type: 'medical',
        severity: 1,
        location: randomLocation(),
        description: 'Minor injury - assistance needed',
        status: 'reported',
        reportedAt: new Date(Date.now() - 45000) // 45 seconds ago
    });

    await Incident.insertMany(incidents);
    console.log(`✅ Created ${incidents.length} active incidents`);

    return incidents;
}

/**
 * Seed assignments and conflicts for active and historical incidents
 */
async function seedAssignmentsAndConflicts(activeIncidents) {
    console.log('🔧 Seeding assignments and conflicts...');

    const availableResources = await Resource.find({ status: 'available' });
    const assignmentsToCreate = [];
    const conflictsToCreate = [];

    // Assign resources to active incidents
    for (const incident of activeIncidents) {
        const needed = incident.severity >= 4 ? 3 : (incident.severity === 3 ? 2 : 1);
        const candidates = availableResources.sort(() => 0.5 - Math.random()).slice(0, needed);
        for (const res of candidates) {
            const assignedAt = new Date(incident.reportedAt.getTime() + Math.floor(Math.random() * 5 * 60 * 1000)); // 0-5 min
            const travelTime = Math.floor(120 + Math.random() * 900); // seconds
            const distance = Math.floor(500 + Math.random() * 4500);
            const assignment = {
                assignmentId: uuidv4(),
                incidentId: incident.incidentId,
                resourceId: res.resourceId,
                assignedAt,
                status: Math.random() > 0.3 ? 'assigned' : 'active',
                priority: incident.severity,
                travelTime,
                distance,
                score: Math.round(60 + Math.random() * 40)
            };
            assignmentsToCreate.push(assignment);
            await eventStore.append('ResourceAssigned', { incidentId: incident.incidentId, assignments: [assignment] });
        }
    }

    // Create a double-assignment conflict between two active incidents using same resource
    if (activeIncidents.length >= 2 && availableResources.length > 0) {
        const res = availableResources[0];
        const incA = activeIncidents[0];
        const incB = activeIncidents[1];
        const conf = {
            conflictId: uuidv4(),
            type: 'double-assignment',
            detectedAt: new Date(),
            status: 'detected',
            involvedIncidents: [incA.incidentId, incB.incidentId],
            involvedResources: [res.resourceId],
            severity: 4
        };
        conflictsToCreate.push(conf);
        await eventStore.append('ConflictDetected', { conflictId: conf.conflictId, type: conf.type, involvedIncidents: conf.involvedIncidents });
    }

    // Capacity overflow -> escalated
    if (activeIncidents.length >= 4) {
        const conf2 = {
            conflictId: uuidv4(),
            type: 'capacity-overflow',
            detectedAt: new Date(Date.now() - 10 * 60000),
            status: 'escalated',
            involvedIncidents: activeIncidents.slice(2, 4).map(i => i.incidentId),
            involvedResources: availableResources.slice(2, 5).map(r => r.resourceId),
            severity: 5
        };
        conflictsToCreate.push(conf2);
        await eventStore.append('ConflictDetected', { conflictId: conf2.conflictId, type: conf2.type, involvedIncidents: conf2.involvedIncidents });
    }

    // Resolved conflict
    if (activeIncidents.length >= 5) {
        const conf3 = {
            conflictId: uuidv4(),
            type: 'department-collision',
            detectedAt: new Date(Date.now() - 30 * 60000),
            resolvedAt: new Date(Date.now() - 20 * 60000),
            status: 'resolved',
            involvedIncidents: [activeIncidents[4].incidentId],
            involvedResources: availableResources.slice(5, 7).map(r => r.resourceId),
            resolution: {
                strategy: 'alternative',
                actions: [{ action: 'reassign', resourceId: availableResources[6] ? availableResources[6].resourceId : null }],
                resolvedBy: 'auto'
            },
            severity: 3
        };
        conflictsToCreate.push(conf3);
        await eventStore.append('ConflictDetected', { conflictId: conf3.conflictId, type: conf3.type, involvedIncidents: conf3.involvedIncidents });
        await eventStore.append('ConflictResolved', { conflictId: conf3.conflictId, strategy: 'alternative' });
    }

    // Insert into DB
    if (assignmentsToCreate.length > 0) {
        await Assignment.insertMany(assignmentsToCreate);
    }
    if (conflictsToCreate.length > 0) {
        await Conflict.insertMany(conflictsToCreate);
    }

    console.log(`✅ Created ${assignmentsToCreate.length} assignments and ${conflictsToCreate.length} conflicts`);
}

async function seedHistoricalAssignments() {
    console.log('🕰️ Seeding assignments/events for historical incidents...');
    const closedIncidents = await Incident.find({ status: 'closed' }).limit(60);
    const availableResources = await Resource.find({});
    const assignments = [];

    for (const inc of closedIncidents) {
        const num = Math.ceil(1 + Math.random() * 2);
        const candidates = availableResources.sort(() => 0.5 - Math.random()).slice(0, num);
        const assignedAt = new Date(inc.reportedAt.getTime() + Math.floor(Math.random() * 10 * 60 * 1000));
        for (const res of candidates) {
            const travelTime = Math.floor(120 + Math.random() * 1200);
            const distance = Math.floor(500 + Math.random() * 5000);
            const completedAt = new Date(assignedAt.getTime() + travelTime * 1000 + Math.floor(Math.random() * 30 * 60 * 1000));
            const a = {
                assignmentId: uuidv4(),
                incidentId: inc.incidentId,
                resourceId: res.resourceId,
                assignedAt,
                completedAt,
                status: 'completed',
                priority: inc.severity,
                travelTime,
                distance,
                score: Math.round(60 + Math.random() * 40)
            };
            assignments.push(a);
            await eventStore.append('ResourceAssigned', { incidentId: inc.incidentId, assignments: [a] });
        }
        await eventStore.append('IncidentClosed', { incidentId: inc.incidentId, closedAt: inc.closedAt || inc.resolvedAt });
    }

    if (assignments.length > 0) {
        await Assignment.insertMany(assignments);
    }
    console.log(`✅ Created ${assignments.length} historical assignments`);

    // Generate analyses for these
    for (let i = 0; i < 40 && i < closedIncidents.length; i++) {
        try {
            await analysisEngine.analyzeIncident(closedIncidents[i].incidentId);
        } catch (err) {
            console.error('Analysis error:', err.message);
        }
    }
}

/**
 * Main seed function
 */
async function seedDatabase() {
    try {
        console.log('');
        console.log('╔══════════════════════════════════════════════════════════╗');
        console.log('║          Emergency Platform - Database Seeding           ║');
        console.log('╚══════════════════════════════════════════════════════════╝');
        console.log('');

        // Connect to database
        await mongoose.connect(process.env.MONGODB_URI, {
            useNewUrlParser: true,
            useUnifiedTopology: true,
        });
        console.log('✅ Connected to MongoDB');

        // Clear existing data
        console.log('🗑️  Clearing existing data...');
        await Resource.deleteMany({});
        await Incident.deleteMany({});
        await Assignment.deleteMany({});
        await mongoose.connection.collection('events').deleteMany({});
        await mongoose.connection.collection('conflicts').deleteMany({});
        await mongoose.connection.collection('riskscores').deleteMany({});
        await mongoose.connection.collection('postincidentanalyses').deleteMany({});
        console.log('✅ Database cleared');

        // Seed data
        await seedResources();
        await seedHistoricalIncidents();
        await seedHistoricalAssignments();
        const activeIncidents = await seedActiveIncidents();
        await seedAssignmentsAndConflicts(activeIncidents);

        console.log('');
        console.log('╔══════════════════════════════════════════════════════════╗');
        console.log('║                   Seeding Complete!                      ║');
        console.log('╚══════════════════════════════════════════════════════════╝');
        console.log('');
        console.log('📊 Summary:');
        console.log('   • 50 resources across 5 types');
        const totalHistorical = await Incident.countDocuments({ status: 'closed' });
        const totalActive = await Incident.countDocuments({ status: 'reported' });
        const totalAssignments = await Assignment.countDocuments();
        const totalConflicts = await Conflict.countDocuments();
        const totalAnalyses = await mongoose.connection.collection('postincidentanalyses').countDocuments();
        console.log(`   • ${totalHistorical} historical incidents (with ${Math.min(20, totalAnalyses)} analyzed)`);
        console.log(`   • ${totalActive} active incidents (varying severity)`);
        console.log(`   • ${totalAssignments} assignments across incidents`);
        console.log(`   • ${totalConflicts} conflicts (detected/pending/escalated/resolved)`);
        console.log('');
        console.log('💡 Next steps:');
        console.log('   1. Start the server: npm run dev');
        console.log('   2. Test orchestration: POST /api/orchestration/assign');
        console.log('      with body: { "incidentId": "' + activeIncidents[0].incidentId + '" }');
        console.log('   3. View dashboard: GET /api/dashboard/live');
        console.log('');

        process.exit(0);
    } catch (error) {
        console.error('❌ Seeding error:', error);
        process.exit(1);
    }
}

// Run seeding
seedDatabase();
