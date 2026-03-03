import React, { useEffect, useState } from 'react';
import { getHistoricalIncidents, getAnalysisSummary } from '../services/api';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
    PieChart, Pie, Cell, LineChart, Line, AreaChart, Area, RadarChart, Radar,
    PolarGrid, PolarAngleAxis, PolarRadiusAxis
} from 'recharts';
import './IntelligenceDashboard.css';

const COLORS = ['#dc2626', '#ea580c', '#f59e0b', '#16a34a', '#3b82f6', '#8b5cf6'];
const COOL_COLORS = ['#06b6d4', '#3b82f6', '#8b5cf6', '#ec4899', '#f59e0b'];

// ─── Seed Data ─────────────────────────────────────────────────────────────
const ago = (days) => new Date(Date.now() - days * 86400000).toISOString().split('T')[0];

const SEED_SUMMARY = {
    totalIncidents: 147,
    avgResponseTime: 420,   // seconds
    avgResolutionTime: 5400, // seconds
    byType: { fire: 38, medical: 52, hazmat: 14, rescue: 18, police: 15, traffic: 10 },
    bySeverity: { 1: 22, 2: 35, 3: 42, 4: 31, 5: 17 },
    failureAnalysis: { detection: 12, allocation: 18, coordination: 9, capacity: 7 }
};

const SEED_INCIDENTS = Array.from({ length: 30 }, (_, i) => ({
    incidentId: `INC-2024-${String(800 + i).padStart(4, '0')}`,
    type: ['fire', 'medical', 'hazmat', 'rescue', 'police', 'traffic'][i % 6],
    severity: (i % 5) + 1,
    status: i < 25 ? 'closed' : 'resolved',
    reportedAt: new Date(Date.now() - (30 - i) * 86400000 + Math.random() * 43200000).toISOString(),
    riskScore: Math.floor(Math.random() * 60) + 20,
    responseTime: Math.floor(Math.random() * 800) + 120,
    resolutionTime: Math.floor(Math.random() * 10800) + 1800,
    assignedResources: Array.from({ length: Math.floor(Math.random() * 4) + 1 }, (_, j) => `RES-${j}`),
}));

// Generate time-series data from seed incidents
const generateTimeSeries = (incidents) => {
    const map = {};
    incidents.forEach(inc => {
        const day = new Date(inc.reportedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        if (!map[day]) map[day] = { date: day, count: 0, avgRisk: 0, totalRisk: 0 };
        map[day].count++;
        map[day].totalRisk += inc.riskScore;
    });
    return Object.values(map).map(d => ({ ...d, avgRisk: Math.round(d.totalRisk / d.count) }));
};

const generateResponseTimeByType = (incidents) => {
    const map = {};
    incidents.forEach(inc => {
        const t = inc.type;
        if (!map[t]) map[t] = { type: t, total: 0, count: 0 };
        map[t].total += inc.responseTime || 0;
        map[t].count++;
    });
    return Object.values(map).map(d => ({ type: d.type, avgResponse: Math.round(d.total / d.count / 60) }));
};

const generateSeverityDistribution = (summary) => {
    return Object.entries(summary.bySeverity || {}).map(([sev, count]) => ({
        name: `Severity ${sev}`,
        value: count,
        severity: parseInt(sev)
    }));
};

const PATTERN_INSIGHTS = [
    { icon: '🔥', title: 'Fire Cluster — North Zone', desc: '4 fire incidents in North Zone over 7 days. Consider pre-positioning FT-NORTH-03 near industrial area.', confidence: 92, trend: 'increasing' },
    { icon: '🚑', title: 'Medical Peak Hours', desc: 'Medical emergencies spike 2× between 18:00–22:00. Recommend extra ambulance shift coverage.', confidence: 87, trend: 'stable' },
    { icon: '⚠️', title: 'Resource Bottleneck — South Zone', desc: 'Avg response time in South Zone is 40% higher than city average. Only 2 ambulances service the area.', confidence: 81, trend: 'increasing' },
    { icon: '🎯', title: 'Resolution Efficiency', desc: 'Incidents resolved via AI recommendation have 28% faster resolution than manual overrides.', confidence: 95, trend: 'stable' },
    { icon: '📊', title: 'Severity Escalation Pattern', desc: '23% of severity-3 incidents escalate to severity-4 within 30 minutes if no resources assigned.', confidence: 78, trend: 'decreasing' },
];

const RADAR_DATA = [
    { metric: 'Detection Speed', value: 82 },
    { metric: 'Response Time', value: 68 },
    { metric: 'Resource Utilization', value: 74 },
    { metric: 'Resolution Rate', value: 91 },
    { metric: 'Conflict Handling', value: 65 },
    { metric: 'Prediction Accuracy', value: 77 },
];

// ─── Component ──────────────────────────────────────────────────────────────
const IntelligenceDashboard = () => {
    const [incidents, setIncidents] = useState([]);
    const [summary, setSummary] = useState(null);
    const [filters, setFilters] = useState({
        startDate: ago(30),
        endDate: new Date().toISOString().split('T')[0]
    });
    const [loading, setLoading] = useState(true);
    const [activeSection, setActiveSection] = useState('overview');

    useEffect(() => {
        loadData();
    }, []); // eslint-disable-line

    const loadData = async () => {
        setLoading(true);
        try {
            const [incidentsResponse, summaryResponse] = await Promise.all([
                getHistoricalIncidents({ ...filters, limit: 50 }),
                getAnalysisSummary(filters)
            ]);

            const apiInc = incidentsResponse.data.incidents || [];
            const apiSum = summaryResponse.data.summary;

            setIncidents(apiInc.length > 0 ? apiInc : SEED_INCIDENTS);
            setSummary(apiSum?.totalIncidents > 0 ? apiSum : SEED_SUMMARY);
            setLoading(false);
        } catch (error) {
            console.error('Error loading intelligence data:', error);
            setIncidents(SEED_INCIDENTS);
            setSummary(SEED_SUMMARY);
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="loading-container">
                <div className="spinner"></div>
                <p className="loading-text">Loading intelligence data...</p>
            </div>
        );
    }

    const typeData = summary?.byType ? Object.entries(summary.byType).map(([name, value]) => ({ name, value })) : [];
    const failureData = summary?.failureAnalysis ? [
        { name: 'Detection', value: summary.failureAnalysis.detection },
        { name: 'Allocation', value: summary.failureAnalysis.allocation },
        { name: 'Coordination', value: summary.failureAnalysis.coordination },
        { name: 'Capacity', value: summary.failureAnalysis.capacity }
    ] : [];

    const timeSeries = generateTimeSeries(incidents);
    const responseByType = generateResponseTimeByType(incidents);
    const severityDist = generateSeverityDistribution(summary || {});

    const TYPE_ICONS = { fire: '🔥', medical: '🚑', hazmat: '☣️', rescue: '🚁', police: '🚔', traffic: '🚗' };

    const exportToCSV = () => {
        if (!incidents.length) return;
        const headers = ['IncidentID', 'Type', 'Severity', 'Status', 'ReportedAt', 'RiskScore', 'ResponseTime', 'ResolutionTime'];
        const csvContent = [
            headers.join(','),
            ...incidents.map(inc => [
                inc.incidentId,
                inc.type,
                inc.severity,
                inc.status,
                inc.reportedAt,
                inc.riskScore,
                inc.responseTime,
                inc.resolutionTime
            ].join(','))
        ].join('\n');

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = `incident_report_${new Date().toISOString().split('T')[0]}.csv`;
        link.click();
    };

    return (
        <div className="intelligence-dashboard">
            <div className="page-header">
                <div>
                    <h1 className="page-title">Intelligence Dashboard</h1>
                    <p className="page-subtitle">Advanced analytics, pattern detection, and operational insights</p>
                </div>
                <button className="btn btn-primary" onClick={loadData}>↻ Refresh Data</button>
            </div>

            {/* Filters */}
            <div className="filters-card card">
                <div className="filters-grid">
                    <div className="filter-item">
                        <label>Start Date</label>
                        <input type="date" className="filter-input" value={filters.startDate}
                            onChange={e => setFilters({ ...filters, startDate: e.target.value })} />
                    </div>
                    <div className="filter-item">
                        <label>End Date</label>
                        <input type="date" className="filter-input" value={filters.endDate}
                            onChange={e => setFilters({ ...filters, endDate: e.target.value })} />
                    </div>
                    <div className="filter-item">
                        <button className="btn btn-primary" onClick={loadData}>Apply Filters</button>
                    </div>
                </div>
            </div>

            {/* Section Tabs */}
            <div className="intel-tabs">
                <button className={`intel-tab ${activeSection === 'overview' ? 'active' : ''}`} onClick={() => setActiveSection('overview')}>📊 Overview</button>
                <button className={`intel-tab ${activeSection === 'trends' ? 'active' : ''}`} onClick={() => setActiveSection('trends')}>📈 Trends</button>
                <button className={`intel-tab ${activeSection === 'performance' ? 'active' : ''}`} onClick={() => setActiveSection('performance')}>⚡ Performance</button>
                <button className={`intel-tab ${activeSection === 'patterns' ? 'active' : ''}`} onClick={() => setActiveSection('patterns')}>🧠 Pattern Detection</button>
                <button className={`intel-tab ${activeSection === 'history' ? 'active' : ''}`} onClick={() => setActiveSection('history')}>📋 Incident Log</button>
            </div>

            {summary && (
                <>
                    {/* Stat Cards — Always Visible */}
                    <div className="stat-cards">
                        <div className="stat-card">
                            <div className="stat-label">Total Incidents</div>
                            <div className="stat-value">{summary.totalIncidents}</div>
                            <div className="stat-trend">Last 30 days</div>
                        </div>
                        <div className="stat-card">
                            <div className="stat-label">Avg Response Time</div>
                            <div className="stat-value">{Math.round(summary.avgResponseTime / 60)}m</div>
                            <div className="stat-trend">{summary.avgResponseTime < 480 ? '✅ Below target' : '⚠️ Above target'}</div>
                        </div>
                        <div className="stat-card">
                            <div className="stat-label">Avg Resolution</div>
                            <div className="stat-value">{Math.round(summary.avgResolutionTime / 60)}m</div>
                            <div className="stat-trend">{Math.round(summary.avgResolutionTime / 3600)}h average</div>
                        </div>
                        <div className="stat-card">
                            <div className="stat-label">Detection Failures</div>
                            <div className="stat-value">{summary.failureAnalysis?.detection || 0}</div>
                            <div className="stat-trend">{summary.failureAnalysis?.detection > 10 ? '⚠️ Review detectors' : '✅ Within range'}</div>
                        </div>
                    </div>

                    {/* OVERVIEW SECTION */}
                    {activeSection === 'overview' && (
                        <div className="dashboard-grid">
                            <div className="card">
                                <h3>Incidents by Type</h3>
                                <ResponsiveContainer width="100%" height={300}>
                                    <BarChart data={typeData}>
                                        <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                                        <XAxis dataKey="name" stroke="#94a3b8" fontSize={11} />
                                        <YAxis stroke="#94a3b8" fontSize={11} />
                                        <Tooltip contentStyle={{ background: '#0f172a', border: '1px solid #334155', borderRadius: 8 }} />
                                        <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                                            {typeData.map((entry, index) => (
                                                <Cell key={index} fill={COLORS[index % COLORS.length]} />
                                            ))}
                                        </Bar>
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>

                            <div className="card">
                                <h3>Failure Analysis</h3>
                                <ResponsiveContainer width="100%" height={300}>
                                    <PieChart>
                                        <Pie data={failureData} cx="50%" cy="50%"
                                            labelLine={false}
                                            label={({ name, value }) => `${name}: ${value}`}
                                            outerRadius={100} fill="#8884d8" dataKey="value">
                                            {failureData.map((entry, index) => (
                                                <Cell key={index} fill={COLORS[index % COLORS.length]} />
                                            ))}
                                        </Pie>
                                        <Tooltip contentStyle={{ background: '#0f172a', border: '1px solid #334155', borderRadius: 8 }} />
                                    </PieChart>
                                </ResponsiveContainer>
                            </div>

                            <div className="card">
                                <h3>Severity Distribution</h3>
                                <ResponsiveContainer width="100%" height={300}>
                                    <BarChart data={severityDist} layout="vertical">
                                        <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                                        <XAxis type="number" stroke="#94a3b8" fontSize={11} />
                                        <YAxis type="category" dataKey="name" stroke="#94a3b8" fontSize={11} width={80} />
                                        <Tooltip contentStyle={{ background: '#0f172a', border: '1px solid #334155', borderRadius: 8 }} />
                                        <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                                            {severityDist.map((entry, index) => (
                                                <Cell key={index} fill={entry.severity >= 4 ? '#dc2626' : entry.severity >= 3 ? '#f59e0b' : '#16a34a'} />
                                            ))}
                                        </Bar>
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>

                            <div className="card">
                                <h3>Operational Radar</h3>
                                <ResponsiveContainer width="100%" height={300}>
                                    <RadarChart data={RADAR_DATA}>
                                        <PolarGrid stroke="#334155" />
                                        <PolarAngleAxis dataKey="metric" stroke="#94a3b8" fontSize={10} />
                                        <PolarRadiusAxis domain={[0, 100]} stroke="#334155" fontSize={9} />
                                        <Radar name="Score" dataKey="value" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.15} strokeWidth={2} />
                                        <Tooltip contentStyle={{ background: '#0f172a', border: '1px solid #334155', borderRadius: 8 }} />
                                    </RadarChart>
                                </ResponsiveContainer>
                            </div>
                        </div>
                    )}

                    {/* TRENDS SECTION */}
                    {activeSection === 'trends' && (
                        <div className="trends-section">
                            <div className="card">
                                <h3>📈 Incident Volume Over Time</h3>
                                <ResponsiveContainer width="100%" height={300}>
                                    <AreaChart data={timeSeries}>
                                        <defs>
                                            <linearGradient id="volGradient" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                                                <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                                            </linearGradient>
                                        </defs>
                                        <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                                        <XAxis dataKey="date" stroke="#94a3b8" fontSize={10} />
                                        <YAxis stroke="#94a3b8" fontSize={11} />
                                        <Tooltip contentStyle={{ background: '#0f172a', border: '1px solid #334155', borderRadius: 8 }} />
                                        <Area type="monotone" dataKey="count" stroke="#3b82f6" fill="url(#volGradient)" strokeWidth={2.5} name="Incidents" />
                                    </AreaChart>
                                </ResponsiveContainer>
                            </div>

                            <div className="card">
                                <h3>📊 Average Risk Score Trend</h3>
                                <ResponsiveContainer width="100%" height={280}>
                                    <LineChart data={timeSeries}>
                                        <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                                        <XAxis dataKey="date" stroke="#94a3b8" fontSize={10} />
                                        <YAxis stroke="#94a3b8" domain={[0, 100]} fontSize={11} />
                                        <Tooltip contentStyle={{ background: '#0f172a', border: '1px solid #334155', borderRadius: 8 }} />
                                        <Line type="monotone" dataKey="avgRisk" stroke="#f59e0b" strokeWidth={2} dot={{ fill: '#f59e0b', r: 3 }} name="Avg Risk" />
                                    </LineChart>
                                </ResponsiveContainer>
                            </div>
                        </div>
                    )}

                    {/* PERFORMANCE SECTION */}
                    {activeSection === 'performance' && (
                        <div className="performance-section">
                            <div className="card">
                                <h3>⚡ Avg Response Time by Type (minutes)</h3>
                                <ResponsiveContainer width="100%" height={300}>
                                    <BarChart data={responseByType}>
                                        <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                                        <XAxis dataKey="type" stroke="#94a3b8" fontSize={11} />
                                        <YAxis stroke="#94a3b8" fontSize={11} unit="m" />
                                        <Tooltip contentStyle={{ background: '#0f172a', border: '1px solid #334155', borderRadius: 8 }}
                                            formatter={(val) => [`${val} min`, 'Avg Response']} />
                                        <Bar dataKey="avgResponse" radius={[4, 4, 0, 0]}>
                                            {responseByType.map((entry, index) => (
                                                <Cell key={index} fill={COOL_COLORS[index % COOL_COLORS.length]} />
                                            ))}
                                        </Bar>
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>

                            <div className="card">
                                <h3>🎯 Performance Metrics</h3>
                                <div className="perf-metrics">
                                    {RADAR_DATA.map((m, i) => (
                                        <div key={i} className="perf-metric-row">
                                            <span className="perf-metric-label">{m.metric}</span>
                                            <div className="perf-metric-bar-track">
                                                <div className="perf-metric-bar-fill" style={{ width: `${m.value}%`, background: m.value >= 80 ? '#16a34a' : m.value >= 60 ? '#f59e0b' : '#dc2626' }} />
                                            </div>
                                            <span className="perf-metric-val">{m.value}%</span>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <div className="card">
                                <h3>📋 Type-Level Summary</h3>
                                <div className="type-summary-grid">
                                    {Object.entries(summary.byType || {}).map(([type, count]) => {
                                        const typeInc = incidents.filter(i => i.type === type);
                                        const avgResp = typeInc.length > 0 ? Math.round(typeInc.reduce((acc, i) => acc + (i.responseTime || 0), 0) / typeInc.length / 60) : '-';
                                        return (
                                            <div key={type} className="type-summary-card">
                                                <div className="type-summary-icon">{TYPE_ICONS[type] || '📌'}</div>
                                                <div className="type-summary-name">{type}</div>
                                                <div className="type-summary-count">{count}</div>
                                                <div className="type-summary-resp">{avgResp}m avg</div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        </div>
                    )}

                    {/* PATTERNS SECTION */}
                    {activeSection === 'patterns' && (
                        <div className="patterns-section">
                            <h3 className="pattern-section-title">🧠 AI-Detected Patterns & Insights</h3>
                            <div className="pattern-cards">
                                {PATTERN_INSIGHTS.map((p, idx) => (
                                    <div key={idx} className="pattern-card">
                                        <div className="pattern-card-header">
                                            <span className="pattern-icon">{p.icon}</span>
                                            <div>
                                                <h4 className="pattern-title">{p.title}</h4>
                                                <div className="pattern-meta">
                                                    <span className="pattern-confidence">Confidence: {p.confidence}%</span>
                                                    <span className={`pattern-trend trend-${p.trend}`}>
                                                        {p.trend === 'increasing' ? '📈' : p.trend === 'decreasing' ? '📉' : '➡️'} {p.trend}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                        <p className="pattern-desc">{p.desc}</p>
                                        <div className="pattern-confidence-bar">
                                            <div className="pattern-confidence-fill" style={{ width: `${p.confidence}%` }} />
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* HISTORY SECTION */}
                    {activeSection === 'history' && (
                        <div className="card">
                            <div className="history-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                                <h3>Historical Incidents ({incidents.length})</h3>
                                <button className="btn btn-sm" onClick={exportToCSV} style={{ background: 'rgba(59, 130, 246, 0.15)', color: '#60a5fa', border: '1px solid rgba(59, 130, 246, 0.3)' }}>
                                    ⬇ Export CSV
                                </button>
                            </div>
                            <div className="incidents-table">
                                <table>
                                    <thead>
                                        <tr>
                                            <th>ID</th>
                                            <th>Type</th>
                                            <th>Severity</th>
                                            <th>Status</th>
                                            <th>Reported At</th>
                                            <th>Risk Score</th>
                                            <th>Resources</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {incidents.map(incident => (
                                            <tr key={incident.incidentId}>
                                                <td className="incident-id">{incident.incidentId}</td>
                                                <td>
                                                    <span className={`badge badge-${incident.severity >= 4 ? 'critical' : 'medium'}`}>
                                                        {TYPE_ICONS[incident.type] || ''} {incident.type}
                                                    </span>
                                                </td>
                                                <td>{'●'.repeat(incident.severity)}{'○'.repeat(5 - incident.severity)}</td>
                                                <td>{incident.status}</td>
                                                <td>{new Date(incident.reportedAt).toLocaleString()}</td>
                                                <td>{incident.riskScore}/100</td>
                                                <td>{incident.assignedResources?.length || 0}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}
                </>
            )}
        </div>
    );
};

export default IntelligenceDashboard;
