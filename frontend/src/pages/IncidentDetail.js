import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { getIncident, getRecommendations, closeIncident, getEvents } from '../services/api';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, AreaChart, Area } from 'recharts';
import './IncidentDetail.css';

// ─── Seed data for when API returns empty ───────────────────────────────────
const ago = (min) => new Date(Date.now() - min * 60000).toISOString();

const SEED_EVENTS = [
    { type: 'IncidentCreated', timestamp: ago(92), data: { severity: 4, type: 'fire', address: '742 Industrial Blvd' } },
    { type: 'RiskScoreUpdated', timestamp: ago(88), data: { previousScore: 0, newScore: 62 } },
    { type: 'ResourceAssigned', timestamp: ago(85), data: { resourceId: 'FT-NORTH-07', type: 'fire-truck' } },
    { type: 'ResourceAssigned', timestamp: ago(82), data: { resourceId: 'AMB-CENTRAL-03', type: 'ambulance' } },
    { type: 'RiskScoreUpdated', timestamp: ago(78), data: { previousScore: 62, newScore: 74 } },
    { type: 'ConflictDetected', timestamp: ago(75), data: { conflictType: 'double-assignment', resourceId: 'FT-NORTH-07' } },
    { type: 'ConflictResolved', timestamp: ago(72), data: { strategy: 'alternative', replacementId: 'FT-EAST-02' } },
    { type: 'ResourceAssigned', timestamp: ago(70), data: { resourceId: 'FT-EAST-02', type: 'fire-truck' } },
    { type: 'RiskScoreUpdated', timestamp: ago(60), data: { previousScore: 74, newScore: 68 } },
    { type: 'ManualOverride', timestamp: ago(45), data: { operator: 'supervisor-1', action: 'Escalated to priority 1' } },
    { type: 'RiskScoreUpdated', timestamp: ago(30), data: { previousScore: 68, newScore: 51 } },
    { type: 'ResourceAssigned', timestamp: ago(25), data: { resourceId: 'HZ-WEST-01', type: 'hazmat' } },
    { type: 'RiskScoreUpdated', timestamp: ago(15), data: { previousScore: 51, newScore: 38 } },
];

const SEED_RISK_HISTORY = [
    { score: 62, calculatedAt: ago(88) },
    { score: 74, calculatedAt: ago(78) },
    { score: 71, calculatedAt: ago(70) },
    { score: 68, calculatedAt: ago(60) },
    { score: 59, calculatedAt: ago(50) },
    { score: 51, calculatedAt: ago(30) },
    { score: 38, calculatedAt: ago(15) },
    { score: 33, calculatedAt: ago(5) },
];

const SEED_INCIDENT = {
    incidentId: 'INC-2024-0847',
    type: 'fire',
    severity: 4,
    status: 'assigned',
    riskScore: 33,
    reportedAt: ago(92),
    location: { lat: 40.7589, lng: -73.9851, address: '742 Industrial Blvd, Manhattan' },
    description: 'Structure fire at a 3-story commercial warehouse. Heavy smoke visible. Multiple occupants reported inside. Hazmat materials possibly stored on-site.',
    assignedResources: ['FT-EAST-02', 'AMB-CENTRAL-03', 'HZ-WEST-01'],
    reportedBy: 'auto-detector-7',
    estimatedCasualties: 2,
    affectedRadius: 200,
};

const SEED_RECOMMENDATIONS = {
    recommendations: [
        { type: 'resource-addition', confidence: 0.89, message: 'Add a second ambulance — predicted casualty count may increase due to structural instability.', actions: ['Assign AMB-SOUTH-02 from 0.8 km away', 'Pre-position triage at perimeter'] },
        { type: 'escalation', confidence: 0.76, message: 'Consider upgrading to multi-agency coordination. Fire + Hazmat overlap detected.', actions: ['Notify HQ for cross-agency dispatch', 'Enable shared radio channel'] },
        { type: 'evacuation', confidence: 0.82, message: 'Evacuation advisory recommended for 200m radius based on wind direction and hazmat risk.', actions: ['Issue emergency alert to nearby buildings', 'Establish evacuation corridors NE and NW'] },
        { type: 'surveillance', confidence: 0.91, message: 'Deploy drone unit for thermal imaging of roof structure to identify hotspots.', actions: ['Launch DRONE-01 from command vehicle', 'Scan for structural weakness'] },
        { type: 'traffic-control', confidence: 0.85, message: 'Divert traffic from Main St to prevent congestion for incoming units.', actions: ['Request PD-EAST-04 for traffic post', 'Update navigation route for responders'] },
        { type: 'utility-safety', confidence: 0.94, message: 'Request power grid shutdown for the block due to exposed high-voltage lines.', actions: ['Contact City Power emergency line', 'Verify lockout/tagout'] },
    ]
};

const SEED_RELATED_CONFLICTS = [
    { conflictId: 'cf-8a3b1d92', type: 'double-assignment', severity: 4, status: 'resolved', description: 'FT-NORTH-07 was double-assigned', resolvedAt: ago(72), strategy: 'alternative' },
    { conflictId: 'cf-bbcc2233', type: 'capacity-overflow', severity: 3, status: 'detected', description: 'East Zone at 85% capacity after this assignment', detectedAt: ago(70) },
    { conflictId: 'cf-aa112233', type: 'fatigue-risk', severity: 4, status: 'warning', description: 'Crew of FT-EAST-02 approaching 12-hour shift limit.', detectedAt: ago(20) },
    { conflictId: 'cf-cc445566', type: 'skill-mismatch', severity: 2, status: 'resolved', description: 'Available police unit lacks riot gear for crowd control.', resolvedAt: ago(40), strategy: 'specialized-unit' },
    { conflictId: 'cf-dd778899', type: 'radio-overload', severity: 3, status: 'detected', description: 'Tactical channel usage exceeds 90%.', detectedAt: ago(15) },
    { conflictId: 'cf-ee990011', type: 'access-blocked', severity: 5, status: 'critical', description: 'Primary access hydrant blocked by civilian vehicle.', detectedAt: ago(60) },
];

const SEED_ASSIGNMENT_HISTORY = [
    { resourceId: 'FT-NORTH-07', type: 'fire-truck', assignedAt: ago(85), revokedAt: ago(72), reason: 'Conflict: double-assignment → replaced by FT-EAST-02' },
    { resourceId: 'FT-EAST-02', type: 'fire-truck', assignedAt: ago(70), revokedAt: null, reason: 'Primary fire unit' },
    { resourceId: 'AMB-CENTRAL-03', type: 'ambulance', assignedAt: ago(82), revokedAt: null, reason: 'Medical support for reported casualties' },
    { resourceId: 'HZ-WEST-01', type: 'hazmat', assignedAt: ago(25), revokedAt: null, reason: 'Hazmat risk confirmed on-site' },
    { resourceId: 'PD-EAST-04', type: 'police', assignedAt: ago(10), revokedAt: null, reason: 'Traffic control request' },
];

// ─── AI Insights Seed Data ──────────────────────────────────────────────────
const SEED_AI_INSIGHTS = {
    pastMistakes: [
        {
            id: 'pm-1',
            severity: 'critical',
            icon: '🔴',
            title: 'Delayed Hazmat Assessment',
            description: 'In 3 similar warehouse fire incidents (INC-0612, INC-0695, INC-0731), hazmat teams were dispatched 35+ minutes after initial response. In INC-0695, this led to chemical exposure of 4 first responders.',
            lesson: 'Always dispatch hazmat recon within 10 minutes of a commercial/industrial fire report, even without confirmed chemical presence.',
            occurrences: 3,
            lastSeen: ago(4320), // 3 days ago
            impactScore: 9,
        },
        {
            id: 'pm-2',
            severity: 'high',
            icon: '🟠',
            title: 'Single Ambulance for Multi-Casualty Event',
            description: 'INC-0731 and INC-0758 both started as "possible casualties" but escalated. Having only 1 ambulance on-scene caused 12-minute delays in secondary patient transport.',
            lesson: 'For severity ≥ 4 incidents with reported occupants, pre-stage a second ambulance within 2 km.',
            occurrences: 2,
            lastSeen: ago(2880),
            impactScore: 7,
        },
        {
            id: 'pm-3',
            severity: 'medium',
            icon: '🟡',
            title: 'Evacuation Zone Under-Estimated',
            description: 'In INC-0612, the initial 100m evacuation radius was insufficient when wind shifted smoke patterns. Had to re-evacuate 200m radius 40 minutes later, disrupting containment.',
            lesson: 'Default to 200m radius for industrial fires. Monitor wind direction actively and adjust in real-time.',
            occurrences: 1,
            lastSeen: ago(10080),
            impactScore: 6,
        },
        {
            id: 'pm-4',
            severity: 'medium',
            icon: '🟡',
            title: 'Resource Conflict Not Anticipated',
            description: 'Double-assignment conflicts have occurred in 40% of severity-4+ incidents during peak hours (17:00–21:00). Proactive resource reservation could prevent these.',
            lesson: 'During peak hours, reserve at least 1 fire truck and 1 ambulance per zone for incoming high-severity calls.',
            occurrences: 6,
            lastSeen: ago(1440),
            impactScore: 5,
        },
        {
            id: 'pm-5',
            severity: 'high',
            icon: '⛔',
            title: 'Inadequate Water Supply Strategy',
            description: 'Relied on a single hydrant for INC-0550 which had low pressure. Delayed fire suppression by 18 minutes while laying secondary lines.',
            lesson: 'For industrial fires >5000 sq ft, immediately secure two independent water sources.',
            occurrences: 2,
            lastSeen: ago(5000),
            impactScore: 8,
        },
        {
            id: 'pm-6',
            severity: 'medium',
            icon: '📡',
            title: 'Communication Breakdown',
            description: 'Mixed radio channels caused missed "evacuate" order in INC-0420. Fortunately no injuries/casualties.',
            lesson: 'Mandatory radio channel sync check every 30 minutes during multi-agency operations.',
            occurrences: 4,
            lastSeen: ago(8000),
            impactScore: 6,
        }
    ],
    improvements: [
        {
            id: 'imp-1',
            priority: 'high',
            icon: '🚀',
            title: 'Pre-Deploy Hazmat Within 10 Minutes',
            description: 'Current deployment was at +25 minutes. AI analysis of 147 past incidents shows that hazmat deployment within 10 minutes reduces risk score escalation by 34%.',
            impact: 'Risk Score Reduction',
            impactValue: '34%',
            effort: 'low',
            status: 'actionable',
        },
        {
            id: 'imp-2',
            priority: 'high',
            icon: '🏥',
            title: 'Stage Second Ambulance Immediately',
            description: 'AMB-SOUTH-02 is available 0.8 km away. Historical data shows 72% probability of needing secondary medical transport for this incident profile.',
            impact: 'Casualty Response',
            impactValue: '72% probable need',
            effort: 'low',
            status: 'actionable',
        },
        {
            id: 'imp-3',
            priority: 'medium',
            icon: '📡',
            title: 'Enable Cross-Agency Radio Channel',
            description: 'Fire + Hazmat coordination currently requires phone relay. Enabling shared channel reduces coordination delay by avg. 8 minutes based on INC-0731 post-mortem.',
            impact: 'Coordination Speed',
            impactValue: '8 min faster',
            effort: 'medium',
            status: 'recommended',
        },
        {
            id: 'imp-4',
            priority: 'medium',
            icon: '🌬️',
            title: 'Activate Wind-Adjusted Evacuation Model',
            description: 'Current 200m static radius. Wind-adjusted model would dynamically shape the evacuation perimeter, reducing unnecessary evacuation by 40% while covering actual risk area.',
            impact: 'Evacuation Efficiency',
            impactValue: '40% more precise',
            effort: 'high',
            status: 'recommended',
        },
        {
            id: 'imp-5',
            priority: 'low',
            icon: '🤖',
            title: 'Auto-Reserve Resources During Peak Hours',
            description: 'Implement automatic resource reservation for high-severity slots during 17:00–21:00. Would have prevented the double-assignment conflict in this incident.',
            impact: 'Conflict Prevention',
            impactValue: '40% fewer conflicts',
            effort: 'high',
            status: 'planned',
        },
        {
            id: 'imp-6',
            priority: 'low',
            icon: '💧',
            title: 'Upgrade Hydrant Map Overlay',
            description: 'Current map has outdated pressure data. Recent survey data is available but not integrated.',
            impact: 'Water Supply',
            impactValue: 'Critical accuracy',
            effort: 'medium',
            status: 'planned',
        }
    ],
    similarIncidents: [
        {
            incidentId: 'INC-2024-0731',
            type: 'fire',
            severity: 4,
            similarity: 94,
            responseTime: 7.2,
            resolutionTime: 142,
            outcome: 'Resolved — 2 minor injuries, building partially salvaged',
            keyDifference: 'Hazmat dispatched 8 min earlier; used cross-agency channel',
        },
        {
            incidentId: 'INC-2024-0695',
            type: 'fire',
            severity: 5,
            similarity: 87,
            responseTime: 5.8,
            resolutionTime: 218,
            outcome: 'Resolved — 4 responder exposures, building lost',
            keyDifference: 'Hazmat delayed 42 min; no pre-staged ambulance',
        },
        {
            incidentId: 'INC-2024-0612',
            type: 'fire',
            severity: 4,
            similarity: 81,
            responseTime: 8.1,
            resolutionTime: 96,
            outcome: 'Resolved — no injuries, contained quickly',
            keyDifference: 'Immediate hazmat + pre-staged evacuation',
        },
        {
            incidentId: 'INC-2023-1105',
            type: 'fire',
            severity: 3,
            similarity: 76,
            responseTime: 9.5,
            resolutionTime: 110,
            outcome: 'Resolved — minor smoke damage',
            keyDifference: 'Residential zone; no hazmat complications',
        },
        {
            incidentId: 'INC-2023-0914',
            type: 'hazmat',
            severity: 4,
            similarity: 68,
            responseTime: 12.0,
            resolutionTime: 340,
            outcome: 'Resolved — lengthy clean-up required',
            keyDifference: 'Chemical spill only; no fire',
        }
    ],
    responseScore: {
        overall: 72,
        breakdown: {
            'Initial Response Speed': 85,
            'Resource Match Quality': 68,
            'Hazmat Timeliness': 45,
            'Medical Readiness': 60,
            'Conflict Handling': 78,
            'Evacuation Planning': 82,
        },
        verdict: 'Good initial response but hazmat deployment was significantly delayed. Medical staging was reactive rather than proactive.',
    }
};

// ─── Event type config ──────────────────────────────────────────────────────
const EVENT_ICONS = {
    'IncidentCreated': { icon: '🚨', color: '#dc2626', label: 'Incident Created' },
    'ResourceAssigned': { icon: '🚒', color: '#16a34a', label: 'Resource Assigned' },
    'RiskScoreUpdated': { icon: '📊', color: '#f59e0b', label: 'Risk Score Updated' },
    'ConflictDetected': { icon: '⚠️', color: '#ea580c', label: 'Conflict Detected' },
    'ConflictResolved': { icon: '✅', color: '#16a34a', label: 'Conflict Resolved' },
    'ManualOverride': { icon: '👤', color: '#8b5cf6', label: 'Manual Override' },
    'IncidentClosed': { icon: '🏁', color: '#64748b', label: 'Incident Closed' },
};

const RESOURCE_ICONS = { 'fire-truck': '🚒', 'ambulance': '🚑', 'police': '🚔', 'hazmat': '☣️', 'rescue': '🚁' };

// ─── Component ──────────────────────────────────────────────────────────────
const IncidentDetail = () => {
    const { id } = useParams();
    const [incident, setIncident] = useState(null);
    const [riskHistory, setRiskHistory] = useState([]);
    const [recommendations, setRecommendations] = useState(null);
    const [events, setEvents] = useState([]);
    const [relatedConflicts] = useState(SEED_RELATED_CONFLICTS);
    const [assignmentHistory] = useState(SEED_ASSIGNMENT_HISTORY);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('timeline');

    useEffect(() => {
        loadIncidentData();
    }, [id]); // eslint-disable-line

    const loadIncidentData = async () => {
        try {
            const [incidentResponse, recommendationResponse] = await Promise.all([
                getIncident(id),
                getRecommendations(id).catch(() => ({ data: { recommendations: [] } }))
            ]);

            const inc = incidentResponse.data.incident || SEED_INCIDENT;
            setIncident(inc);
            setRiskHistory(incidentResponse.data.riskHistory?.length > 0 ? incidentResponse.data.riskHistory : SEED_RISK_HISTORY);
            setEvents(incidentResponse.data.events?.length > 0 ? incidentResponse.data.events : SEED_EVENTS);

            const recs = recommendationResponse.data.recommendations;
            setRecommendations(recs?.recommendations?.length > 0 ? recs : SEED_RECOMMENDATIONS);
            setLoading(false);
        } catch (error) {
            console.error('Error loading incident:', error);
            setIncident(SEED_INCIDENT);
            setRiskHistory(SEED_RISK_HISTORY);
            setEvents(SEED_EVENTS);
            setRecommendations(SEED_RECOMMENDATIONS);
            setLoading(false);
        }
    };

    const handleCloseIncident = async () => {
        if (window.confirm('Are you sure you want to close this incident?')) {
            try {
                await closeIncident(id);
                loadIncidentData();
            } catch (error) {
                // Simulate locally
                setIncident(prev => ({ ...prev, status: 'closed' }));
            }
        }
    };

    if (loading) {
        return (
            <div className="loading-container">
                <div className="spinner"></div>
                <p className="loading-text">Loading incident details...</p>
            </div>
        );
    }

    if (!incident) {
        return (
            <div className="error-container">
                <h3 className="error-title">Incident Not Found</h3>
                <Link to="/" className="btn btn-primary">Return to Dashboard</Link>
            </div>
        );
    }

    const riskChartData = riskHistory.map(r => ({
        time: new Date(r.calculatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        score: r.score
    })).reverse();

    const severityColor = incident.severity >= 4 ? '#dc2626' : incident.severity >= 3 ? '#f59e0b' : '#16a34a';

    return (
        <div className="incident-detail">
            {/* Header */}
            <div className="page-header">
                <div>
                    <h1 className="page-title">Incident Details</h1>
                    <p className="page-subtitle">{incident.incidentId}</p>
                </div>
                <div className="header-actions">
                    <Link to="/" className="btn btn-secondary">← Dashboard</Link>
                    {incident.status !== 'closed' && (
                        <button className="btn btn-danger" onClick={handleCloseIncident}>Close Incident</button>
                    )}
                    <Link to={`/simulation/${incident.incidentId}`} className="btn btn-primary">🏗️ 3D Simulation</Link>
                </div>
            </div>

            {/* Status Banner */}
            <div className="incident-banner" style={{ borderLeftColor: severityColor }}>
                <div className="banner-main">
                    <span className="banner-type-badge" style={{ background: `${severityColor}20`, color: severityColor }}>
                        {incident.type?.toUpperCase()}
                    </span>
                    <span className="banner-severity">
                        {'●'.repeat(incident.severity)}{'○'.repeat(5 - incident.severity)} Severity {incident.severity}/5
                    </span>
                    <span className={`banner-status status-${incident.status}`}>{incident.status}</span>
                </div>
                <div className="banner-secondary">
                    <span>📍 {incident.location?.address || `${incident.location?.lat?.toFixed(4)}, ${incident.location?.lng?.toFixed(4)}`}</span>
                    <span>🕐 Reported {new Date(incident.reportedAt).toLocaleString()}</span>
                    <span>🎯 Risk Score: <strong>{incident.riskScore}/100</strong></span>
                </div>
            </div>

            {/* Info Cards Row */}
            <div className="id-stats">
                <div className="id-stat-card">
                    <div className="id-stat-icon">🚒</div>
                    <div className="id-stat-val">{incident.assignedResources?.length || 0}</div>
                    <div className="id-stat-label">Resources</div>
                </div>
                <div className="id-stat-card">
                    <div className="id-stat-icon">📊</div>
                    <div className="id-stat-val">{incident.riskScore}</div>
                    <div className="id-stat-label">Risk Score</div>
                </div>
                <div className="id-stat-card">
                    <div className="id-stat-icon">⚠️</div>
                    <div className="id-stat-val">{relatedConflicts.length}</div>
                    <div className="id-stat-label">Conflicts</div>
                </div>
                <div className="id-stat-card">
                    <div className="id-stat-icon">📌</div>
                    <div className="id-stat-val">{events.length}</div>
                    <div className="id-stat-label">Events</div>
                </div>
            </div>

            {incident.description && (
                <div className="card incident-desc-card">
                    <p className="incident-desc-text">{incident.description}</p>
                </div>
            )}

            {/* Risk Score Trend Chart */}
            {riskChartData.length > 0 && (
                <div className="card">
                    <h3>📈 Risk Score Trend</h3>
                    <ResponsiveContainer width="100%" height={240}>
                        <AreaChart data={riskChartData}>
                            <defs>
                                <linearGradient id="riskGradient" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.3} />
                                    <stop offset="95%" stopColor="#f59e0b" stopOpacity={0} />
                                </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                            <XAxis dataKey="time" stroke="#94a3b8" fontSize={11} />
                            <YAxis stroke="#94a3b8" domain={[0, 100]} fontSize={11} />
                            <Tooltip
                                contentStyle={{ background: '#0f172a', border: '1px solid #334155', borderRadius: 8 }}
                                labelStyle={{ color: '#f8fafc' }}
                            />
                            <Area type="monotone" dataKey="score" stroke="#f59e0b" strokeWidth={2.5} fill="url(#riskGradient)" name="Risk Score" />
                        </AreaChart>
                    </ResponsiveContainer>
                </div>
            )}

            {/* Tabs */}
            <div className="id-tabs">
                <button className={`id-tab ${activeTab === 'timeline' ? 'active' : ''}`} onClick={() => setActiveTab('timeline')}>📜 Event Timeline</button>
                <button className={`id-tab ${activeTab === 'assignments' ? 'active' : ''}`} onClick={() => setActiveTab('assignments')}>🚒 Assignments</button>
                <button className={`id-tab ${activeTab === 'conflicts' ? 'active' : ''}`} onClick={() => setActiveTab('conflicts')}>⚠️ Conflicts</button>
                <button className={`id-tab ${activeTab === 'recommendations' ? 'active' : ''}`} onClick={() => setActiveTab('recommendations')}>🤖 Recommendations</button>
                <button className={`id-tab ${activeTab === 'insights' ? 'active' : ''}`} onClick={() => setActiveTab('insights')}>💡 AI Insights</button>
            </div>

            {/* Tab Content */}
            <div className="card tab-content">
                {activeTab === 'timeline' && (
                    <>
                        <h3>Event Timeline ({events.length} events)</h3>
                        <div className="timeline-enhanced">
                            {events.map((event, idx) => {
                                const cfg = EVENT_ICONS[event.type] || { icon: '📌', color: '#64748b', label: event.type };
                                return (
                                    <div key={idx} className="tml-item">
                                        <div className="tml-connector">
                                            <div className="tml-dot" style={{ background: cfg.color, boxShadow: `0 0 8px ${cfg.color}` }}>{cfg.icon}</div>
                                            {idx < events.length - 1 && <div className="tml-line" />}
                                        </div>
                                        <div className="tml-card">
                                            <div className="tml-header">
                                                <span className="tml-type" style={{ color: cfg.color }}>{cfg.label}</span>
                                                <span className="tml-time">{new Date(event.timestamp).toLocaleString()}</span>
                                            </div>
                                            {event.data && (
                                                <div className="tml-data">
                                                    {event.data.resourceId && <span>{RESOURCE_ICONS[event.data.type] || '🚐'} {event.data.resourceId}</span>}
                                                    {event.data.previousScore != null && <span>Score: {event.data.previousScore} → {event.data.newScore}</span>}
                                                    {event.data.conflictType && <span>Type: {event.data.conflictType}</span>}
                                                    {event.data.strategy && <span>Strategy: {event.data.strategy}</span>}
                                                    {event.data.replacementId && <span>Replacement: {event.data.replacementId}</span>}
                                                    {event.data.operator && <span>By: {event.data.operator}</span>}
                                                    {event.data.action && <span>{event.data.action}</span>}
                                                    {event.data.address && <span>📍 {event.data.address}</span>}
                                                    {event.data.severity != null && <span>Severity: {event.data.severity}/5</span>}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </>
                )}

                {activeTab === 'assignments' && (
                    <>
                        <h3>Assignment History ({assignmentHistory.length} records)</h3>
                        <div className="assignment-list">
                            {assignmentHistory.map((a, idx) => (
                                <div key={idx} className={`assign-row ${a.revokedAt ? 'revoked' : 'active'}`}>
                                    <div className="assign-icon">{RESOURCE_ICONS[a.type] || '🚐'}</div>
                                    <div className="assign-info">
                                        <div className="assign-id">{a.resourceId}</div>
                                        <div className="assign-reason">{a.reason}</div>
                                    </div>
                                    <div className="assign-times">
                                        <div className="assign-time-start">Assigned: {new Date(a.assignedAt).toLocaleTimeString()}</div>
                                        {a.revokedAt ? (
                                            <div className="assign-time-end">Revoked: {new Date(a.revokedAt).toLocaleTimeString()}</div>
                                        ) : (
                                            <div className="assign-time-active">● Active</div>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </>
                )}

                {activeTab === 'conflicts' && (
                    <>
                        <h3>Related Conflicts ({relatedConflicts.length})</h3>
                        <div className="conflicts-history-list">
                            {relatedConflicts.map((c, idx) => (
                                <div key={idx} className={`conf-row conf-${c.status}`}>
                                    <div className="conf-header-row">
                                        <span className={`badge badge-${c.severity >= 4 ? 'critical' : 'medium'}`}>{c.type?.replace('-', ' ')}</span>
                                        <span className={`conf-status-badge conf-${c.status}`}>{c.status}</span>
                                    </div>
                                    <p className="conf-desc">{c.description}</p>
                                    <div className="conf-meta">
                                        {c.resolvedAt && <span>Resolved: {new Date(c.resolvedAt).toLocaleTimeString()}</span>}
                                        {c.strategy && <span>Strategy: {c.strategy}</span>}
                                        {c.detectedAt && <span>Detected: {new Date(c.detectedAt).toLocaleTimeString()}</span>}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </>
                )}

                {activeTab === 'recommendations' && (
                    <>
                        <h3>AI Recommendations</h3>
                        {recommendations?.recommendations?.map((rec, idx) => (
                            <div key={idx} className="recommendation-card">
                                <div className="recommendation-header">
                                    <span className="badge badge-medium">{rec.type}</span>
                                    <span>Confidence: {(rec.confidence * 100).toFixed(0)}%</span>
                                </div>
                                <p className="recommendation-message">{rec.message}</p>
                                {rec.actions && rec.actions.length > 0 && (
                                    <ul className="recommendation-actions">
                                        {rec.actions.map((action, i) => (
                                            <li key={i}>{action}</li>
                                        ))}
                                    </ul>
                                )}
                            </div>
                        ))}
                    </>
                )}

                {activeTab === 'insights' && (
                    <>
                        <h3>💡 AI-Powered Incident Insights</h3>
                        <p className="insights-subtitle">Deep analysis based on {SEED_AI_INSIGHTS.similarIncidents.length} similar incidents and {SEED_AI_INSIGHTS.pastMistakes.reduce((a, b) => a + b.occurrences, 0)} past observations</p>

                        {/* Response Score */}
                        <div className="insight-score-card">
                            <div className="score-header">
                                <div className="score-circle" style={{ '--score': SEED_AI_INSIGHTS.responseScore.overall }}>
                                    <span className="score-val">{SEED_AI_INSIGHTS.responseScore.overall}</span>
                                    <span className="score-label">/ 100</span>
                                </div>
                                <div className="score-info">
                                    <h4>Response Efficiency Score</h4>
                                    <p className="score-verdict">{SEED_AI_INSIGHTS.responseScore.verdict}</p>
                                </div>
                            </div>
                            <div className="score-breakdown">
                                {Object.entries(SEED_AI_INSIGHTS.responseScore.breakdown).map(([key, val]) => (
                                    <div key={key} className="score-bar-row">
                                        <span className="score-bar-label">{key}</span>
                                        <div className="score-bar-track">
                                            <div className="score-bar-fill" style={{ width: `${val}%`, background: val >= 75 ? '#16a34a' : val >= 50 ? '#f59e0b' : '#dc2626' }} />
                                        </div>
                                        <span className="score-bar-val">{val}%</span>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Past Mistakes */}
                        <div className="insight-section">
                            <h4 className="insight-section-title">🔍 Past Mistakes from Similar Incidents</h4>
                            <p className="insight-section-desc">Issues identified from analysing matching incident profiles</p>
                            <div className="mistake-cards">
                                {SEED_AI_INSIGHTS.pastMistakes.map(m => (
                                    <div key={m.id} className={`mistake-card mistake-${m.severity}`}>
                                        <div className="mistake-header">
                                            <span className="mistake-icon">{m.icon}</span>
                                            <div className="mistake-title-area">
                                                <h5 className="mistake-title">{m.title}</h5>
                                                <div className="mistake-tags">
                                                    <span className={`mistake-sev mistake-sev-${m.severity}`}>{m.severity}</span>
                                                    <span className="mistake-occ">{m.occurrences} occurrence{m.occurrences > 1 ? 's' : ''}</span>
                                                    <span className="mistake-impact">Impact: {m.impactScore}/10</span>
                                                </div>
                                            </div>
                                        </div>
                                        <p className="mistake-desc">{m.description}</p>
                                        <div className="mistake-lesson">
                                            <span className="lesson-icon">💡</span>
                                            <span>{m.lesson}</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Improvement Suggestions */}
                        <div className="insight-section">
                            <h4 className="insight-section-title">🚀 What Could Be Done Better</h4>
                            <p className="insight-section-desc">Actionable improvements ranked by priority and effort</p>
                            <div className="improvement-cards">
                                {SEED_AI_INSIGHTS.improvements.map(imp => (
                                    <div key={imp.id} className={`improvement-card imp-${imp.priority}`}>
                                        <div className="imp-row">
                                            <span className="imp-icon">{imp.icon}</span>
                                            <div className="imp-content">
                                                <div className="imp-top">
                                                    <h5 className="imp-title">{imp.title}</h5>
                                                    <span className={`imp-status imp-status-${imp.status}`}>{imp.status}</span>
                                                </div>
                                                <p className="imp-desc">{imp.description}</p>
                                                <div className="imp-metrics">
                                                    <span className="imp-impact">📊 {imp.impact}: <strong>{imp.impactValue}</strong></span>
                                                    <span className={`imp-effort effort-${imp.effort}`}>Effort: {imp.effort}</span>
                                                    <span className={`imp-priority-tag pri-${imp.priority}`}>{imp.priority} priority</span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Similar Incidents */}
                        <div className="insight-section">
                            <h4 className="insight-section-title">📋 Similar Past Incidents</h4>
                            <p className="insight-section-desc">How comparable incidents were handled and their outcomes</p>
                            <div className="similar-cards">
                                {SEED_AI_INSIGHTS.similarIncidents.map(s => (
                                    <div key={s.incidentId} className="similar-card">
                                        <div className="similar-header">
                                            <span className="similar-id">{s.incidentId}</span>
                                            <span className="similar-match">{s.similarity}% match</span>
                                        </div>
                                        <div className="similar-stats">
                                            <div className="similar-stat">
                                                <span className="similar-stat-label">Response</span>
                                                <span className="similar-stat-val">{s.responseTime}m</span>
                                            </div>
                                            <div className="similar-stat">
                                                <span className="similar-stat-label">Resolution</span>
                                                <span className="similar-stat-val">{s.resolutionTime}m</span>
                                            </div>
                                            <div className="similar-stat">
                                                <span className="similar-stat-label">Severity</span>
                                                <span className="similar-stat-val">{'●'.repeat(s.severity)}{'○'.repeat(5 - s.severity)}</span>
                                            </div>
                                        </div>
                                        <p className="similar-outcome">{s.outcome}</p>
                                        <div className="similar-diff">
                                            <span className="diff-label">Key Difference:</span> {s.keyDifference}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
};

export default IncidentDetail;
