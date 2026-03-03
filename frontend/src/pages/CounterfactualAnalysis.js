import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import {
    Chart as ChartJS,
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    BarElement,
    RadialLinearScale,
    ArcElement,
    Title,
    Tooltip,
    Legend,
    Filler
} from 'chart.js';
import { Bar, Radar, Line } from 'react-chartjs-2';
import './CounterfactualAnalysis.css';

// Register Chart.js components
ChartJS.register(
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    BarElement,
    RadialLinearScale,
    ArcElement,
    Title,
    Tooltip,
    Legend,
    Filler
);

const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

function CounterfactualAnalysis() {
    const navigate = useNavigate();
    const [closedIncidents, setClosedIncidents] = useState([]);
    const [selectedIncident, setSelectedIncident] = useState(null);
    const [alternatives, setAlternatives] = useState({
        resources: [],
        responseDelay: 5,
        severity: null,
        weatherCondition: 'clear',
        timeOfDay: 'day',
        resourceCount: 1,
        priorityOverride: false,
        trafficCondition: 'normal',
        communicationDelay: 0
    });
    const [simulation, setSimulation] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    useEffect(() => {
        loadClosedIncidents();
    }, []);

    const loadClosedIncidents = async () => {
        try {
            const response = await axios.get(`${API_BASE}/incidents?status=closed&limit=30`);
            setClosedIncidents(response.data.incidents || response.data.data || []);
        } catch (err) {
            console.error('Failed to load closed incidents:', err);
            setError('Failed to load incidents');
        }
    };

    const handleIncidentSelect = async (incident) => {
        setSelectedIncident(incident);
        setSimulation(null);
        setAlternatives({
            ...alternatives,
            severity: incident.severity
        });
    };

    const runSimulation = async () => {
        if (!selectedIncident) return;

        setLoading(true);
        setError(null);

        try {
            const response = await axios.post(`${API_BASE}/counterfactual/simulate`, {
                incidentId: selectedIncident.incidentId,
                alternatives: {
                    ...alternatives,
                    severity: alternatives.severity !== selectedIncident.severity ? alternatives.severity : undefined
                }
            });

            setSimulation(response.data.data);
        } catch (err) {
            console.error('Simulation failed:', err);
            setError(err.response?.data?.error || 'Simulation failed');
        } finally {
            setLoading(false);
        }
    };

    const getImpactClass = (value) => {
        if (value > 0) return 'improvement';
        if (value < 0) return 'degradation';
        return 'neutral';
    };

    const formatTime = (minutes) => {
        if (!minutes) return 'N/A';
        if (minutes < 60) return `${Math.round(minutes)}m`;
        const hours = Math.floor(minutes / 60);
        const mins = Math.round(minutes % 60);
        return `${hours}h ${mins}m`;
    };

    // Chart configurations
    const radarChartData = simulation ? {
        labels: ['Response Time', 'Resolution Time', 'Resource Efficiency', 'Risk Reduction', 'Cost Efficiency', 'Coverage Area'],
        datasets: [
            {
                label: 'Actual',
                data: [
                    Math.min(100, 100 - (simulation.comparison?.responseTime?.actual || 0)),
                    Math.min(100, 100 - (simulation.comparison?.resolutionTime?.actual || 0) / 2),
                    simulation.actualOutcome?.resourceEfficiency || 65,
                    100 - (simulation.actualOutcome?.finalRiskScore || 50),
                    simulation.actualOutcome?.costEfficiency || 70,
                    simulation.actualOutcome?.coverageArea || 75
                ],
                backgroundColor: 'rgba(255, 99, 132, 0.2)',
                borderColor: 'rgba(255, 99, 132, 1)',
                borderWidth: 2,
                pointBackgroundColor: 'rgba(255, 99, 132, 1)'
            },
            {
                label: 'Counterfactual',
                data: [
                    Math.min(100, 100 - (simulation.comparison?.responseTime?.counterfactual || 0)),
                    Math.min(100, 100 - (simulation.comparison?.resolutionTime?.counterfactual || 0) / 2),
                    simulation.counterfactualOutcome?.resourceEfficiency || 80,
                    100 - (simulation.counterfactualOutcome?.finalRiskScore || 30),
                    simulation.counterfactualOutcome?.costEfficiency || 85,
                    simulation.counterfactualOutcome?.coverageArea || 90
                ],
                backgroundColor: 'rgba(54, 162, 235, 0.2)',
                borderColor: 'rgba(54, 162, 235, 1)',
                borderWidth: 2,
                pointBackgroundColor: 'rgba(54, 162, 235, 1)'
            }
        ]
    } : null;

    const barChartData = simulation ? {
        labels: ['Response Time', 'Resolution Time', 'Avg Distance', 'Risk Score'],
        datasets: [
            {
                label: 'Actual',
                data: [
                    simulation.comparison?.responseTime?.actual || 0,
                    (simulation.comparison?.resolutionTime?.actual || 0) / 60,
                    (simulation.comparison?.avgDistance?.actual || 0) / 100,
                    simulation.comparison?.finalRiskScore?.actual || 0
                ],
                backgroundColor: 'rgba(255, 99, 132, 0.8)',
                borderColor: 'rgba(255, 99, 132, 1)',
                borderWidth: 1
            },
            {
                label: 'Counterfactual',
                data: [
                    simulation.comparison?.responseTime?.counterfactual || 0,
                    (simulation.comparison?.resolutionTime?.counterfactual || 0) / 60,
                    (simulation.comparison?.avgDistance?.counterfactual || 0) / 100,
                    simulation.comparison?.finalRiskScore?.counterfactual || 0
                ],
                backgroundColor: 'rgba(54, 162, 235, 0.8)',
                borderColor: 'rgba(54, 162, 235, 1)',
                borderWidth: 1
            }
        ]
    } : null;

    const timelineChartData = simulation ? {
        labels: ['T+0', 'T+5m', 'T+10m', 'T+15m', 'T+30m', 'T+45m', 'T+60m', 'T+90m'],
        datasets: [
            {
                label: 'Actual Risk Progression',
                data: [
                    simulation.actualOutcome?.initialRiskScore || 80,
                    (simulation.actualOutcome?.initialRiskScore || 80) - 5,
                    (simulation.actualOutcome?.initialRiskScore || 80) - 10,
                    (simulation.actualOutcome?.initialRiskScore || 80) - 15,
                    (simulation.actualOutcome?.initialRiskScore || 80) - 25,
                    (simulation.actualOutcome?.initialRiskScore || 80) - 35,
                    (simulation.actualOutcome?.initialRiskScore || 80) - 45,
                    simulation.actualOutcome?.finalRiskScore || 35
                ],
                borderColor: 'rgba(255, 99, 132, 1)',
                backgroundColor: 'rgba(255, 99, 132, 0.1)',
                fill: true,
                tension: 0.4
            },
            {
                label: 'Counterfactual Risk Progression',
                data: [
                    simulation.counterfactualOutcome?.initialRiskScore || 80,
                    (simulation.counterfactualOutcome?.initialRiskScore || 80) - 8,
                    (simulation.counterfactualOutcome?.initialRiskScore || 80) - 18,
                    (simulation.counterfactualOutcome?.initialRiskScore || 80) - 28,
                    (simulation.counterfactualOutcome?.initialRiskScore || 80) - 40,
                    (simulation.counterfactualOutcome?.initialRiskScore || 80) - 50,
                    (simulation.counterfactualOutcome?.initialRiskScore || 80) - 60,
                    simulation.counterfactualOutcome?.finalRiskScore || 15
                ],
                borderColor: 'rgba(54, 162, 235, 1)',
                backgroundColor: 'rgba(54, 162, 235, 0.1)',
                fill: true,
                tension: 0.4
            }
        ]
    } : null;


    const chartOptions = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: {
                labels: {
                    color: 'rgba(255, 255, 255, 0.8)',
                    font: { size: 11 }
                }
            }
        },
        scales: {
            r: {
                grid: { color: 'rgba(255, 255, 255, 0.1)' },
                angleLines: { color: 'rgba(255, 255, 255, 0.1)' },
                pointLabels: { color: 'rgba(255, 255, 255, 0.7)', font: { size: 10 } },
                ticks: { display: false }
            }
        }
    };

    const barOptions = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: {
                labels: { color: 'rgba(255, 255, 255, 0.8)' }
            }
        },
        scales: {
            x: {
                grid: { color: 'rgba(255, 255, 255, 0.1)' },
                ticks: { color: 'rgba(255, 255, 255, 0.7)' }
            },
            y: {
                grid: { color: 'rgba(255, 255, 255, 0.1)' },
                ticks: { color: 'rgba(255, 255, 255, 0.7)' }
            }
        }
    };

    const lineOptions = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: {
                labels: { color: 'rgba(255, 255, 255, 0.8)' }
            },
            title: {
                display: true,
                text: 'Risk Score Over Time',
                color: 'rgba(255, 255, 255, 0.9)'
            }
        },
        scales: {
            x: {
                grid: { color: 'rgba(255, 255, 255, 0.1)' },
                ticks: { color: 'rgba(255, 255, 255, 0.7)' }
            },
            y: {
                grid: { color: 'rgba(255, 255, 255, 0.1)' },
                ticks: { color: 'rgba(255, 255, 255, 0.7)' },
                min: 0,
                max: 100
            }
        }
    };

    return (
        <div className="counterfactual-analysis fade-in">
            <div className="page-header">
                <div>
                    <h1>Counterfactual Analysis</h1>
                    <p className="page-subtitle">
                        Explore "what-if" scenarios with advanced parameters and visualizations
                    </p>
                </div>
            </div>

            <div className="analysis-grid">
                {/* Incident Selection */}
                <div className="card incident-selector">
                    <h3>Select Closed Incident</h3>
                    <div className="incidents-list">
                        {closedIncidents.map(incident => (
                            <div
                                key={incident.incidentId}
                                className={`incident-item ${selectedIncident?.incidentId === incident.incidentId ? 'selected' : ''}`}
                                onClick={() => handleIncidentSelect(incident)}
                            >
                                <div className="incident-item-header">
                                    <span className="incident-id">{incident.incidentId}</span>
                                    <span className={`badge badge-${incident.severity >= 4 ? 'critical' : incident.severity >= 3 ? 'high' : 'medium'}`}>
                                        Severity {incident.severity}
                                    </span>
                                </div>
                                <div className="incident-item-details">
                                    <span>{incident.type.toUpperCase()}</span>
                                    <span>{incident.location?.address || 'Location N/A'}</span>
                                </div>
                                <div className="incident-item-meta">
                                    <span>{new Date(incident.reportedAt).toLocaleDateString()}</span>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Enhanced Alternative Configuration */}
                {selectedIncident && (
                    <div className="card alternatives-config enhanced">
                        <h3>Configure Simulation Parameters</h3>
                        <div className="config-form">
                            {/* Basic Parameters */}
                            <div className="param-section">
                                <h4>📊 Response Parameters</h4>
                                <div className="param-grid">
                                    <div className="form-group">
                                        <label>Response Delay (min)</label>
                                        <input
                                            type="number"
                                            value={alternatives.responseDelay}
                                            onChange={(e) => setAlternatives({
                                                ...alternatives,
                                                responseDelay: parseInt(e.target.value)
                                            })}
                                            min="1"
                                            max="60"
                                        />
                                    </div>

                                    <div className="form-group">
                                        <label>Alternative Severity</label>
                                        <select
                                            value={alternatives.severity}
                                            onChange={(e) => setAlternatives({
                                                ...alternatives,
                                                severity: parseInt(e.target.value)
                                            })}
                                        >
                                            {[1, 2, 3, 4, 5].map(level => (
                                                <option key={level} value={level}>
                                                    Level {level} {level === selectedIncident.severity ? '(Original)' : ''}
                                                </option>
                                            ))}
                                        </select>
                                    </div>

                                    <div className="form-group">
                                        <label>Resource Count</label>
                                        <input
                                            type="number"
                                            value={alternatives.resourceCount}
                                            onChange={(e) => setAlternatives({
                                                ...alternatives,
                                                resourceCount: parseInt(e.target.value)
                                            })}
                                            min="1"
                                            max="10"
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Environmental Factors */}
                            <div className="param-section">
                                <h4>🌤️ Environmental Factors</h4>
                                <div className="param-grid">
                                    <div className="form-group">
                                        <label>Weather Condition</label>
                                        <select
                                            value={alternatives.weatherCondition}
                                            onChange={(e) => setAlternatives({
                                                ...alternatives,
                                                weatherCondition: e.target.value
                                            })}
                                        >
                                            <option value="clear">Clear ☀️</option>
                                            <option value="rain">Rain 🌧️</option>
                                            <option value="snow">Snow ❄️</option>
                                            <option value="fog">Fog 🌫️</option>
                                            <option value="storm">Storm ⛈️</option>
                                        </select>
                                    </div>

                                    <div className="form-group">
                                        <label>Time of Day</label>
                                        <select
                                            value={alternatives.timeOfDay}
                                            onChange={(e) => setAlternatives({
                                                ...alternatives,
                                                timeOfDay: e.target.value
                                            })}
                                        >
                                            <option value="morning">Morning (6AM-12PM) 🌅</option>
                                            <option value="day">Day (12PM-6PM) ☀️</option>
                                            <option value="evening">Evening (6PM-10PM) 🌆</option>
                                            <option value="night">Night (10PM-6AM) 🌙</option>
                                        </select>
                                    </div>

                                    <div className="form-group">
                                        <label>Traffic Condition</label>
                                        <select
                                            value={alternatives.trafficCondition}
                                            onChange={(e) => setAlternatives({
                                                ...alternatives,
                                                trafficCondition: e.target.value
                                            })}
                                        >
                                            <option value="light">Light Traffic 🚗</option>
                                            <option value="normal">Normal Traffic 🚙</option>
                                            <option value="heavy">Heavy Traffic 🚛</option>
                                            <option value="gridlock">Gridlock 🚧</option>
                                        </select>
                                    </div>
                                </div>
                            </div>

                            {/* Communication Factors */}
                            <div className="param-section">
                                <h4>📡 Communication Factors</h4>
                                <div className="param-grid">
                                    <div className="form-group">
                                        <label>Communication Delay (sec)</label>
                                        <input
                                            type="number"
                                            value={alternatives.communicationDelay}
                                            onChange={(e) => setAlternatives({
                                                ...alternatives,
                                                communicationDelay: parseInt(e.target.value)
                                            })}
                                            min="0"
                                            max="300"
                                        />
                                    </div>

                                    <div className="form-group checkbox-group">
                                        <label>
                                            <input
                                                type="checkbox"
                                                checked={alternatives.priorityOverride}
                                                onChange={(e) => setAlternatives({
                                                    ...alternatives,
                                                    priorityOverride: e.target.checked
                                                })}
                                            />
                                            Priority Override Mode
                                        </label>
                                        <small>Bypass normal resource allocation</small>
                                    </div>
                                </div>
                            </div>

                            <button
                                className="btn btn-primary run-simulation-btn"
                                onClick={runSimulation}
                                disabled={loading}
                            >
                                {loading ? (
                                    <>
                                        <span className="spinner"></span>
                                        Running Simulation...
                                    </>
                                ) : (
                                    <>
                                        🔬 Run Advanced Simulation
                                    </>
                                )}
                            </button>

                            {error && (
                                <div className="error-message">
                                    {error}
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>

            {/* Simulation Results with Charts */}
            {simulation && (
                <div className="simulation-results slide-up">
                    {/* Charts Section */}
                    <div className="charts-section">
                        <h2>📈 Visual Analysis</h2>

                        <div className="charts-grid">
                            {/* Radar Chart - Multi-factor Comparison */}
                            <div className="chart-card">
                                <h4>Multi-Factor Performance Comparison</h4>
                                <div className="chart-container radar-chart">
                                    {radarChartData && (
                                        <Radar data={radarChartData} options={chartOptions} />
                                    )}
                                </div>
                            </div>

                            {/* Bar Chart - Key Metrics */}
                            <div className="chart-card">
                                <h4>Key Metrics Comparison</h4>
                                <div className="chart-container bar-chart">
                                    {barChartData && (
                                        <Bar data={barChartData} options={barOptions} />
                                    )}
                                </div>
                            </div>

                            {/* Timeline Chart - Risk Progression */}
                            <div className="chart-card wide">
                                <h4>Risk Score Timeline</h4>
                                <div className="chart-container timeline-chart">
                                    {timelineChartData && (
                                        <Line data={timelineChartData} options={lineOptions} />
                                    )}
                                </div>
                            </div>

                        </div>
                    </div>

                    {/* Metrics Cards */}
                    <div className="card metrics-section">
                        <h2>📊 Detailed Metrics</h2>
                        <p className="results-subtitle">
                            Comparing actual outcome with counterfactual scenario
                        </p>

                        <div className="metrics-grid">
                            {simulation.comparison?.responseTime && (
                                <div className="metric-card">
                                    <div className="metric-label">Response Time</div>
                                    <div className="metric-comparison">
                                        <div className="metric-value">
                                            <span className="label">Actual</span>
                                            <span className="value">{formatTime(simulation.comparison.responseTime.actual)}</span>
                                        </div>
                                        <div className="metric-arrow">→</div>
                                        <div className="metric-value">
                                            <span className="label">Counterfactual</span>
                                            <span className="value">{formatTime(simulation.comparison.responseTime.counterfactual)}</span>
                                        </div>
                                    </div>
                                    <div className={`metric-impact ${getImpactClass(simulation.comparison.responseTime.difference)}`}>
                                        {simulation.comparison.responseTime.difference > 0 ? '↓' : '↑'}
                                        {Math.abs(simulation.comparison.responseTime.percentChange)}%
                                        {simulation.comparison.responseTime.difference > 0 ? ' faster' : ' slower'}
                                    </div>
                                </div>
                            )}

                            {simulation.comparison?.resolutionTime && (
                                <div className="metric-card">
                                    <div className="metric-label">Resolution Time</div>
                                    <div className="metric-comparison">
                                        <div className="metric-value">
                                            <span className="label">Actual</span>
                                            <span className="value">{formatTime(simulation.comparison.resolutionTime.actual)}</span>
                                        </div>
                                        <div className="metric-arrow">→</div>
                                        <div className="metric-value">
                                            <span className="label">Counterfactual</span>
                                            <span className="value">{formatTime(simulation.comparison.resolutionTime.counterfactual)}</span>
                                        </div>
                                    </div>
                                    <div className={`metric-impact ${getImpactClass(simulation.comparison.resolutionTime.difference)}`}>
                                        {simulation.comparison.resolutionTime.difference > 0 ? '↓' : '↑'}
                                        {Math.abs(simulation.comparison.resolutionTime.percentChange)}%
                                    </div>
                                </div>
                            )}

                            <div className="metric-card">
                                <div className="metric-label">Average Distance</div>
                                <div className="metric-comparison">
                                    <div className="metric-value">
                                        <span className="label">Actual</span>
                                        <span className="value">{simulation.comparison?.avgDistance?.actual || 0}m</span>
                                    </div>
                                    <div className="metric-arrow">→</div>
                                    <div className="metric-value">
                                        <span className="label">Counterfactual</span>
                                        <span className="value">{simulation.comparison?.avgDistance?.counterfactual || 0}m</span>
                                    </div>
                                </div>
                                <div className={`metric-impact ${getImpactClass(simulation.comparison?.avgDistance?.difference || 0)}`}>
                                    {(simulation.comparison?.avgDistance?.difference || 0) > 0 ? '↓' : '↑'}
                                    {Math.abs(simulation.comparison?.avgDistance?.percentChange || 0)}%
                                </div>
                            </div>

                            <div className="metric-card">
                                <div className="metric-label">Final Risk Score</div>
                                <div className="metric-comparison">
                                    <div className="metric-value">
                                        <span className="label">Actual</span>
                                        <span className="value">{simulation.comparison?.finalRiskScore?.actual || 0}</span>
                                    </div>
                                    <div className="metric-arrow">→</div>
                                    <div className="metric-value">
                                        <span className="label">Counterfactual</span>
                                        <span className="value">{simulation.comparison?.finalRiskScore?.counterfactual || 0}</span>
                                    </div>
                                </div>
                                <div className={`metric-impact ${getImpactClass(simulation.comparison?.finalRiskScore?.difference || 0)}`}>
                                    {(simulation.comparison?.finalRiskScore?.difference || 0) > 0 ? '↓' : '↑'}
                                    {Math.abs(simulation.comparison?.finalRiskScore?.difference || 0)} points
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Insights Section */}
                    {simulation.insights && simulation.insights.length > 0 && (
                        <div className="insights-section card">
                            <h3>💡 Key Insights</h3>
                            <div className="insights-list">
                                {simulation.insights.map((insight, idx) => (
                                    <div key={idx} className={`insight-card ${insight.type}`}>
                                        <div className="insight-icon">
                                            {insight.type === 'improvement' && '✓'}
                                            {insight.type === 'warning' && '⚠'}
                                            {insight.type === 'recommendation' && '💡'}
                                        </div>
                                        <div className="insight-content">
                                            <div className="insight-message">{insight.message}</div>
                                            <div className="insight-meta">
                                                <span className={`impact-badge impact-${insight.impact}`}>
                                                    {insight.impact} impact
                                                </span>
                                                <span className="insight-metric">{insight.metric}</span>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Simulation Parameters Used */}
                    <div className="card simulation-params">
                        <h3>⚙️ Simulation Parameters Used</h3>
                        <div className="params-display">
                            <div className="param-item">
                                <span className="param-label">Weather:</span>
                                <span className="param-value">{alternatives.weatherCondition}</span>
                            </div>
                            <div className="param-item">
                                <span className="param-label">Time of Day:</span>
                                <span className="param-value">{alternatives.timeOfDay}</span>
                            </div>
                            <div className="param-item">
                                <span className="param-label">Traffic:</span>
                                <span className="param-value">{alternatives.trafficCondition}</span>
                            </div>
                            <div className="param-item">
                                <span className="param-label">Response Delay:</span>
                                <span className="param-value">{alternatives.responseDelay}m</span>
                            </div>
                            <div className="param-item">
                                <span className="param-label">Resource Count:</span>
                                <span className="param-value">{alternatives.resourceCount}</span>
                            </div>
                            <div className="param-item">
                                <span className="param-label">Priority Override:</span>
                                <span className="param-value">{alternatives.priorityOverride ? 'Yes' : 'No'}</span>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

export default CounterfactualAnalysis;
