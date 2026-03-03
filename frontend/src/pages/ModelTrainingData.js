import React, { useEffect, useState } from 'react';
import { getTrainingData } from '../services/api';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
    ResponsiveContainer, PieChart, Pie, Cell, RadarChart,
    PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar
} from 'recharts';
import './ModelTrainingData.css';

const TYPE_COLORS = {
    fire: '#dc2626',
    medical: '#06b6d4',
    hazmat: '#f59e0b',
    rescue: '#8b5cf6',
    police: '#3b82f6',
    traffic: '#ea580c'
};

const SEVERITY_COLORS = ['#16a34a', '#06b6d4', '#f59e0b', '#ea580c', '#dc2626'];

const PIE_COLORS = ['#3b82f6', '#06b6d4', '#8b5cf6', '#16a34a', '#f59e0b', '#dc2626', '#ec4899'];

function ModelTrainingData() {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        try {
            setLoading(true);
            const response = await getTrainingData();
            setData(response.data.trainingData);
        } catch (err) {
            console.error('Failed to load training data:', err);
            setError(err.message || 'Failed to load training data');
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="loading-container">
                <div className="loading-text">Loading Training Data Statistics...</div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="error-container">
                <h3 className="error-title">Failed to Load Data</h3>
                <p className="error-message">{error}</p>
            </div>
        );
    }

    if (!data) return null;

    const { summary, incidents, analyses, events, assignments, resources, conflicts } = data;

    // Prepare chart data
    const typeChartData = Object.entries(incidents.byType).map(([name, value]) => ({
        name: name.charAt(0).toUpperCase() + name.slice(1),
        count: value,
        fill: TYPE_COLORS[name] || '#6b7280'
    }));

    const severityChartData = Object.entries(incidents.bySeverity).map(([level, value]) => ({
        name: `Severity ${level}`,
        count: value,
        fill: SEVERITY_COLORS[parseInt(level) - 1] || '#6b7280'
    }));

    const eventChartData = Object.entries(events.byType).map(([name, value]) => ({
        name: name.replace(/([A-Z])/g, ' $1').trim(),
        count: value
    }));

    const failureRadarData = Object.entries(analyses.failurePatterns).map(([name, value]) => ({
        subject: name.charAt(0).toUpperCase() + name.slice(1),
        count: value,
        fullMark: Math.max(...Object.values(analyses.failurePatterns), 1)
    }));

    const formatDate = (dateStr) => {
        if (!dateStr) return 'N/A';
        return new Date(dateStr).toLocaleDateString('en-US', {
            year: 'numeric', month: 'short', day: 'numeric'
        });
    };

    const CustomTooltip = ({ active, payload, label }) => {
        if (active && payload && payload.length) {
            return (
                <div style={{
                    background: 'rgba(15, 20, 25, 0.95)',
                    border: '1px solid rgba(59, 130, 246, 0.3)',
                    borderRadius: '8px',
                    padding: '10px 14px',
                    boxShadow: '0 8px 32px rgba(0,0,0,0.4)'
                }}>
                    <p style={{ color: '#e2e8f0', margin: 0, fontSize: '0.85rem', fontWeight: 600 }}>{label}</p>
                    <p style={{ color: '#06b6d4', margin: '4px 0 0', fontSize: '0.8rem' }}>
                        Count: {payload[0].value}
                    </p>
                </div>
            );
        }
        return null;
    };

    return (
        <div className="model-training-page">
            <div className="page-header">
                <div>
                    <h1 className="page-title">Model Training Data</h1>
                    <p className="page-subtitle">
                        Historical data powering the AI recommendation engine, counterfactual analysis, and risk prediction models
                    </p>
                </div>
            </div>

            {/* Hero summary */}
            <div className="training-hero">
                <h2>🧠 AI Training Data Overview</h2>
                <p>The platform's AI models learn from resolved incidents, resource assignments, post-incident analyses, and system events to improve future response recommendations.</p>
                <div className="hero-stats">
                    <div className="hero-stat">
                        <span className="hero-stat-value">{summary.totalDataPoints.toLocaleString()}</span>
                        <span className="hero-stat-label">Total Data Points</span>
                    </div>
                    <div className="hero-stat">
                        <span className="hero-stat-value">{summary.closedIncidents.toLocaleString()}</span>
                        <span className="hero-stat-label">Resolved Incidents</span>
                    </div>
                    <div className="hero-stat">
                        <span className="hero-stat-value">{summary.analysisCoverage}%</span>
                        <span className="hero-stat-label">Analysis Coverage</span>
                    </div>
                    <div className="hero-stat">
                        <span className="hero-stat-value">{assignments.successRate}%</span>
                        <span className="hero-stat-label">Assignment Success</span>
                    </div>
                </div>
                {summary.dateRange.from && (
                    <div className="date-range">
                        📅 Training data spans: {formatDate(summary.dateRange.from)} → {formatDate(summary.dateRange.to)}
                    </div>
                )}
            </div>

            {/* Model coverage bars */}
            <div className="coverage-section">
                <h3>📊 Data Coverage by AI Component</h3>
                <div className="coverage-bars">
                    <div className="coverage-item">
                        <span className="coverage-label">Recommendation Engine</span>
                        <div className="coverage-bar-track">
                            <div
                                className="coverage-bar-fill blue"
                                style={{ width: `${Math.min(summary.closedIncidents * 2, 100)}%` }}
                            />
                        </div>
                        <span className="coverage-value">{summary.closedIncidents} incidents</span>
                    </div>
                    <div className="coverage-item">
                        <span className="coverage-label">Post-Incident Analysis</span>
                        <div className="coverage-bar-track">
                            <div
                                className="coverage-bar-fill purple"
                                style={{ width: `${summary.analysisCoverage}%` }}
                            />
                        </div>
                        <span className="coverage-value">{summary.analysisCoverage}% covered</span>
                    </div>
                    <div className="coverage-item">
                        <span className="coverage-label">Counterfactual Engine</span>
                        <div className="coverage-bar-track">
                            <div
                                className="coverage-bar-fill green"
                                style={{ width: `${Math.min(summary.closedIncidents * 2, 100)}%` }}
                            />
                        </div>
                        <span className="coverage-value">{summary.closedIncidents} simulations possible</span>
                    </div>
                    <div className="coverage-item">
                        <span className="coverage-label">Risk Prediction Model</span>
                        <div className="coverage-bar-track">
                            <div
                                className="coverage-bar-fill orange"
                                style={{ width: `${Math.min(events.total * 0.5, 100)}%` }}
                            />
                        </div>
                        <span className="coverage-value">{events.total} events</span>
                    </div>
                </div>
            </div>

            {/* Data source cards */}
            <div className="training-sections">
                {/* Incidents Card */}
                <div className="training-card incidents">
                    <div className="card-header">
                        <div className="card-icon">🔥</div>
                        <div className="card-header-text">
                            <h3>Incident Records</h3>
                            <div className="card-count">{incidents.total} total • {incidents.closed} resolved</div>
                        </div>
                    </div>
                    <div className="card-body-stats">
                        {Object.entries(incidents.byType).map(([type, count]) => (
                            <div className="mini-stat" key={type}>
                                <span className="mini-stat-label">{type}</span>
                                <span className="mini-stat-value">{count}</span>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Post-Incident Analyses Card */}
                <div className="training-card analyses">
                    <div className="card-header">
                        <div className="card-icon">🔬</div>
                        <div className="card-header-text">
                            <h3>Post-Incident Analyses</h3>
                            <div className="card-count">{analyses.total} analyses completed</div>
                        </div>
                    </div>
                    <div className="card-body-stats single-col">
                        <div className="mini-stat">
                            <span className="mini-stat-label">With Recommendations</span>
                            <span className="mini-stat-value">{analyses.withRecommendations}</span>
                        </div>
                        <div className="mini-stat">
                            <span className="mini-stat-label">With Similar Matches</span>
                            <span className="mini-stat-value">{analyses.withSimilarIncidents}</span>
                        </div>
                        {Object.entries(analyses.failurePatterns).map(([pattern, count]) => (
                            <div className="mini-stat" key={pattern}>
                                <span className="mini-stat-label">{pattern} failures</span>
                                <span className="mini-stat-value">{count}</span>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Events Card */}
                <div className="training-card events">
                    <div className="card-header">
                        <div className="card-icon">⚡</div>
                        <div className="card-header-text">
                            <h3>System Events</h3>
                            <div className="card-count">{events.total} events tracked</div>
                        </div>
                    </div>
                    <div className="card-body-stats single-col">
                        {Object.entries(events.byType).map(([type, count]) => (
                            <div className="mini-stat" key={type}>
                                <span className="mini-stat-label">{type.replace(/([A-Z])/g, ' $1').trim()}</span>
                                <span className="mini-stat-value">{count}</span>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Assignments Card */}
                <div className="training-card assignments">
                    <div className="card-header">
                        <div className="card-icon">📋</div>
                        <div className="card-header-text">
                            <h3>Resource Assignments</h3>
                            <div className="card-count">{assignments.total} assignments • {assignments.successRate}% success</div>
                        </div>
                    </div>
                    <div className="card-body-stats">
                        <div className="mini-stat">
                            <span className="mini-stat-label">Completed</span>
                            <span className="mini-stat-value">{assignments.completed}</span>
                        </div>
                        <div className="mini-stat">
                            <span className="mini-stat-label">Revoked</span>
                            <span className="mini-stat-value">{assignments.revoked}</span>
                        </div>
                    </div>
                </div>

                {/* Resources Card */}
                <div className="training-card resources">
                    <div className="card-header">
                        <div className="card-icon">🚒</div>
                        <div className="card-header-text">
                            <h3>Resource Pool</h3>
                            <div className="card-count">{resources.total} resources in fleet</div>
                        </div>
                    </div>
                    <div className="card-body-stats">
                        {Object.entries(resources.byType).map(([type, count]) => (
                            <div className="mini-stat" key={type}>
                                <span className="mini-stat-label">{type}</span>
                                <span className="mini-stat-value">{count}</span>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Conflicts Card */}
                <div className="training-card conflicts">
                    <div className="card-header">
                        <div className="card-icon">⚠️</div>
                        <div className="card-header-text">
                            <h3>Conflict Resolution</h3>
                            <div className="card-count">{conflicts.total} conflicts • {conflicts.resolutionRate}% resolved</div>
                        </div>
                    </div>
                    <div className="card-body-stats">
                        <div className="mini-stat">
                            <span className="mini-stat-label">Total Conflicts</span>
                            <span className="mini-stat-value">{conflicts.total}</span>
                        </div>
                        <div className="mini-stat">
                            <span className="mini-stat-label">Resolved</span>
                            <span className="mini-stat-value">{conflicts.resolved}</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Charts section */}
            <div className="training-charts">
                {/* Incidents by Type */}
                <div className="chart-panel">
                    <h3>📊 Training Incidents by Type</h3>
                    <ResponsiveContainer width="100%" height={280}>
                        <BarChart data={typeChartData} barSize={36}>
                            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                            <XAxis dataKey="name" tick={{ fill: '#94a3b8', fontSize: 12 }} axisLine={{ stroke: 'rgba(255,255,255,0.1)' }} />
                            <YAxis tick={{ fill: '#94a3b8', fontSize: 12 }} axisLine={{ stroke: 'rgba(255,255,255,0.1)' }} />
                            <Tooltip content={<CustomTooltip />} />
                            <Bar dataKey="count" radius={[6, 6, 0, 0]}>
                                {typeChartData.map((entry, i) => (
                                    <Cell key={i} fill={entry.fill} />
                                ))}
                            </Bar>
                        </BarChart>
                    </ResponsiveContainer>
                </div>

                {/* Incidents by Severity */}
                <div className="chart-panel">
                    <h3>🎯 Training Incidents by Severity</h3>
                    <ResponsiveContainer width="100%" height={280}>
                        <BarChart data={severityChartData} barSize={36}>
                            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                            <XAxis dataKey="name" tick={{ fill: '#94a3b8', fontSize: 12 }} axisLine={{ stroke: 'rgba(255,255,255,0.1)' }} />
                            <YAxis tick={{ fill: '#94a3b8', fontSize: 12 }} axisLine={{ stroke: 'rgba(255,255,255,0.1)' }} />
                            <Tooltip content={<CustomTooltip />} />
                            <Bar dataKey="count" radius={[6, 6, 0, 0]}>
                                {severityChartData.map((entry, i) => (
                                    <Cell key={i} fill={entry.fill} />
                                ))}
                            </Bar>
                        </BarChart>
                    </ResponsiveContainer>
                </div>

                {/* Events Distribution */}
                <div className="chart-panel">
                    <h3>⚡ Event Stream Distribution</h3>
                    <ResponsiveContainer width="100%" height={280}>
                        <PieChart>
                            <Pie
                                data={eventChartData}
                                cx="50%"
                                cy="50%"
                                innerRadius={55}
                                outerRadius={100}
                                dataKey="count"
                                nameKey="name"
                                paddingAngle={3}
                                stroke="none"
                            >
                                {eventChartData.map((entry, i) => (
                                    <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                                ))}
                            </Pie>
                            <Tooltip content={<CustomTooltip />} />
                        </PieChart>
                    </ResponsiveContainer>
                </div>

                {/* Failure Pattern Radar */}
                {analyses.total > 0 && (
                    <div className="chart-panel">
                        <h3>🔬 Failure Pattern Distribution</h3>
                        <ResponsiveContainer width="100%" height={280}>
                            <RadarChart cx="50%" cy="50%" outerRadius="70%" data={failureRadarData}>
                                <PolarGrid stroke="rgba(255,255,255,0.08)" />
                                <PolarAngleAxis dataKey="subject" tick={{ fill: '#94a3b8', fontSize: 12 }} />
                                <PolarRadiusAxis tick={{ fill: '#64748b', fontSize: 10 }} />
                                <Radar
                                    name="Failures"
                                    dataKey="count"
                                    stroke="#8b5cf6"
                                    fill="#8b5cf6"
                                    fillOpacity={0.3}
                                />
                                <Tooltip content={<CustomTooltip />} />
                            </RadarChart>
                        </ResponsiveContainer>
                    </div>
                )}
            </div>
        </div>
    );
}

export default ModelTrainingData;
