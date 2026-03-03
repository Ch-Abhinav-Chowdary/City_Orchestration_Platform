require('dotenv').config();
const mongoose = require('mongoose');

const Resource = require('./models/Resource');
const Incident = require('./models/Incident');
const Assignment = require('./models/Assignment');
const Conflict = require('./models/Conflict');

const CITY_CENTER = { lat: 40.7580, lng: -73.9855 };
const NYC_ADDRESSES = [
    '123 Times Square, Manhattan',
    '456 Wall Street, Lower Manhattan',
    '789 Broadway, SoHo',
    '101 Fifth Avenue, Midtown',
    '234 Park Avenue, Upper East Side',
    '567 Lexington Ave, Murray Hill',
    '890 Amsterdam Ave, Upper West Side',
    '321 Atlantic Ave, Brooklyn',
    '654 Queens Blvd, Queens',
    '987 Grand Concourse, Bronx'
];

function randomLocation() {
    const offsetLat = (Math.random() - 0.5) * 10000;
    const offsetLng = (Math.random() - 0.5) * 10000;
    return {
        lat: CITY_CENTER.lat + (offsetLat / 111000),
        lng: CITY_CENTER.lng + (offsetLng / (111000 * Math.cos(CITY_CENTER.lat * Math.PI / 180))),
        address: NYC_ADDRESSES[Math.floor(Math.random() * NYC_ADDRESSES.length)]
    };
}

async function seed() {
    try {
        console.log('🌱 Seeding comprehensive data...\n');

        await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/emergency-orchestration');
        console.log('✅ Connected to MongoDB\n');

        // Clear all collections
        await Resource.deleteMany({});
        await Incident.deleteMany({});
        await Assignment.deleteMany({});
        await Conflict.deleteMany({});
        console.log('🗑️  Cleared existing data\n');

        const baseTime = Date.now();
        const types = ['fire', 'medical', 'hazmat', 'rescue'];

        // ========== RESOURCES ==========
        console.log('🚒 Creating resources...');
        const resources = [];

        // 15 ambulances (5 assigned)
        for (let i = 1; i <= 15; i++) {
            resources.push({
                resourceId: `AMB-${String(i).padStart(3, '0')}`,
                type: 'ambulance',
                department: 'EMS',
                status: i <= 5 ? 'assigned' : 'available',
                location: randomLocation(),
                capabilities: ['medical']
            });
        }

        // 10 fire trucks (3 assigned)
        for (let i = 1; i <= 10; i++) {
            resources.push({
                resourceId: `FIRE-${String(i).padStart(3, '0')}`,
                type: 'fire-truck',
                department: 'FDNY',
                status: i <= 3 ? 'assigned' : 'available',
                location: randomLocation(),
                capabilities: ['firefighting']
            });
        }

        // 15 police (4 assigned)
        for (let i = 1; i <= 15; i++) {
            resources.push({
                resourceId: `POL-${String(i).padStart(3, '0')}`,
                type: 'police',
                department: 'NYPD',
                status: i <= 4 ? 'assigned' : 'available',
                location: randomLocation(),
                capabilities: ['law_enforcement']
            });
        }

        // 5 hazmat (1 assigned)
        for (let i = 1; i <= 5; i++) {
            resources.push({
                resourceId: `HAZ-${String(i).padStart(3, '0')}`,
                type: 'hazmat',
                department: 'FDNY-Hazmat',
                status: i <= 1 ? 'assigned' : 'available',
                location: randomLocation(),
                capabilities: ['hazmat']
            });
        }

        // 5 rescue (1 assigned)
        for (let i = 1; i <= 5; i++) {
            resources.push({
                resourceId: `RES-${String(i).padStart(3, '0')}`,
                type: 'rescue',
                department: 'FDNY-Rescue',
                status: i <= 1 ? 'assigned' : 'available',
                location: randomLocation(),
                capabilities: ['rescue']
            });
        }

        await Resource.insertMany(resources);
        const assignedCount = resources.filter(r => r.status === 'assigned').length;
        console.log(`✅ ${resources.length} resources (${assignedCount} assigned, ${resources.length - assignedCount} available)\n`);

        // ========== INCIDENTS ==========
        console.log('🚨 Creating incidents...');
        const incidents = [];

        // 10 Active incidents (mix of reported, assigned, active)
        for (let i = 0; i < 10; i++) {
            const type = types[Math.floor(Math.random() * types.length)];
            const severity = Math.floor(Math.random() * 5) + 1;
            const reportedAt = new Date(baseTime - Math.random() * 2 * 60 * 60 * 1000);
            const status = ['reported', 'assigned', 'active'][Math.floor(Math.random() * 3)];

            incidents.push({
                incidentId: `INC-ACT-${i}`,
                type,
                severity,
                status,
                location: randomLocation(),
                description: `Active ${type} emergency - priority response required`,
                reportedAt,
                assignedAt: status !== 'reported' ? new Date(reportedAt.getTime() + 5 * 60000) : undefined,
                riskScore: Math.min(severity * 15 + Math.floor(Math.random() * 25), 100)
            });
        }

        // 30 Closed incidents (for counterfactual analysis)
        for (let i = 0; i < 30; i++) {
            const type = types[Math.floor(Math.random() * types.length)];
            const severity = Math.floor(Math.random() * 5) + 1;
            const daysAgo = Math.floor(Math.random() * 30) + 1;
            const reportedAt = new Date(baseTime - daysAgo * 24 * 60 * 60 * 1000);
            const assignedAt = new Date(reportedAt.getTime() + (5 + Math.random() * 10) * 60000);
            const resolvedAt = new Date(assignedAt.getTime() + (30 + Math.random() * 60) * 60000);
            const closedAt = new Date(resolvedAt.getTime() + 5 * 60000);

            incidents.push({
                incidentId: `INC-HIST-${i}`,
                type,
                severity,
                status: 'closed',
                location: randomLocation(),
                description: `Historical ${type} incident - case resolved`,
                reportedAt,
                assignedAt,
                resolvedAt,
                closedAt,
                riskScore: Math.min(severity * 15 + Math.floor(Math.random() * 25), 100)
            });
        }

        await Incident.insertMany(incidents);
        console.log(`✅ ${incidents.length} incidents (10 active, 30 closed for analysis)\n`);

        // ========== ASSIGNMENTS ==========
        console.log('📋 Creating assignments...');
        const assignments = [];
        const activeIncidents = incidents.filter(inc => inc.status === 'assigned' || inc.status === 'active');
        const assignedResources = resources.filter(r => r.status === 'assigned');

        for (let i = 0; i < Math.min(activeIncidents.length, assignedResources.length); i++) {
            assignments.push({
                assignmentId: `ASGN-${i}`,
                incidentId: activeIncidents[i].incidentId,
                resourceId: assignedResources[i].resourceId,
                assignedAt: activeIncidents[i].assignedAt || new Date(),
                status: 'active',
                priority: Math.floor(Math.random() * 5) + 1,
                distance: Math.floor(Math.random() * 5000) + 500,
                travelTime: Math.floor(Math.random() * 900) + 300,
                score: 70 + Math.floor(Math.random() * 30)
            });
        }

        await Assignment.insertMany(assignments);
        console.log(`✅ ${assignments.length} active assignments\n`);

        // ========== CONFLICTS ==========
        console.log('⚠️  Creating conflicts...');
        const conflictTypes = ['double-assignment', 'capacity-overflow', 'department-collision'];
        const conflicts = [];

        // 3 Pending (detected) conflicts
        for (let i = 0; i < 3; i++) {
            conflicts.push({
                conflictId: `CONF-P-${i}`,
                type: conflictTypes[i % 3],
                status: 'detected',
                detectedAt: new Date(baseTime - Math.random() * 30 * 60000),
                severity: Math.floor(Math.random() * 3) + 2,
                involvedIncidents: [incidents[i].incidentId],
                involvedResources: [resources[i].resourceId]
            });
        }

        // 2 Escalated conflicts
        for (let i = 0; i < 2; i++) {
            conflicts.push({
                conflictId: `CONF-E-${i}`,
                type: conflictTypes[i % 3],
                status: 'escalated',
                detectedAt: new Date(baseTime - 2 * 60 * 60000),
                severity: 4 + Math.floor(Math.random() * 2),
                involvedIncidents: [incidents[3 + i].incidentId],
                involvedResources: [resources[10 + i].resourceId]
            });
        }

        // 3 Resolved conflicts
        for (let i = 0; i < 3; i++) {
            conflicts.push({
                conflictId: `CONF-R-${i}`,
                type: conflictTypes[i % 3],
                status: 'resolved',
                detectedAt: new Date(baseTime - 24 * 60 * 60000),
                resolvedAt: new Date(baseTime - 23 * 60 * 60000),
                severity: Math.floor(Math.random() * 3) + 1,
                involvedIncidents: [incidents[6 + i].incidentId],
                involvedResources: [resources[20 + i].resourceId],
                resolution: { strategy: 'rerank', resolvedBy: 'auto' }
            });
        }

        await Conflict.insertMany(conflicts);
        const pending = conflicts.filter(c => c.status === 'detected').length;
        const escalated = conflicts.filter(c => c.status === 'escalated').length;
        console.log(`✅ ${conflicts.length} conflicts (${pending} pending, ${escalated} escalated)\n`);

        // ========== SUMMARY ==========
        console.log('╔═══════════════════════════════════════════╗');
        console.log('║         Database Seeded Successfully!      ║');
        console.log('╚═══════════════════════════════════════════╝\n');
        console.log('📊 Data Summary:');
        console.log(`   Resources:    ${resources.length} (${assignedCount} assigned)`);
        console.log(`   Incidents:    ${incidents.length} (10 active, 30 closed)`);
        console.log(`   Assignments:  ${assignments.length}`);
        console.log(`   Conflicts:    ${conflicts.length} (${pending} pending, ${escalated} escalated)`);
        console.log('\n🎉 Ready for testing!\n');

        await mongoose.connection.close();
        process.exit(0);
    } catch (error) {
        console.error('❌ Error:', error);
        process.exit(1);
    }
}

seed();
