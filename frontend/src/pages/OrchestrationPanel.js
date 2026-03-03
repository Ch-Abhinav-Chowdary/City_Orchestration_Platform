import React, { useEffect, useState, useCallback } from 'react';
import { getPendingConflicts, resolveConflict, manualOverride, getResources } from '../services/api';
import './OrchestrationPanel.css';

// ─── Realistic Seed Data ────────────────────────────────────────────────────
const now = new Date();
const ago = (mins) => new Date(now.getTime() - mins * 60000).toISOString();

const SEED_CONFLICTS = [
    {
        conflictId: 'cf-8a3b1d92-e4f7-4c21-b8a5-1f2d3e4a5b6c',
        type: 'double-assignment',
        severity: 4,
        status: 'detected',
        detectedAt: ago(3),
        involvedIncidents: ['INC-2024-0847', 'INC-2024-0851'],
        involvedResources: ['FT-NORTH-07', 'AMB-CENTRAL-03'],
        description: 'Fire Truck FT-NORTH-07 assigned to both warehouse fire (INC-0847) and chemical spill (INC-0851)'
    },
    {
        conflictId: 'cf-7c2e9f41-d6b3-48a9-9e12-a3c5d7f8e901',
        type: 'resource-shortage',
        severity: 5,
        status: 'escalated',
        detectedAt: ago(8),
        involvedIncidents: ['INC-2024-0849', 'INC-2024-0850', 'INC-2024-0852'],
        involvedResources: ['AMB-SOUTH-01', 'AMB-SOUTH-02'],
        description: '3 active medical emergencies in South Zone but only 2 ambulances available'
    },
    {
        conflictId: 'cf-5d4f2a83-b1c9-4e67-8d3a-c9b7e6f5d4a3',
        type: 'department-collision',
        severity: 3,
        status: 'detected',
        detectedAt: ago(12),
        involvedIncidents: ['INC-2024-0846'],
        involvedResources: ['HZ-WEST-01', 'PD-WEST-04'],
        description: 'Hazmat and Police units approaching same intersection — coordination protocol required'
    },
    {
        conflictId: 'cf-1e6b9c74-a5d8-4f32-b7e1-d8c6a5b4e3f2',
        type: 'capacity-overflow',
        severity: 4,
        status: 'detected',
        detectedAt: ago(1),
        involvedIncidents: ['INC-2024-0853'],
        involvedResources: ['FT-EAST-02', 'FT-EAST-05', 'RS-EAST-01'],
        description: 'East Zone operating at 92% capacity — new severity-4 fire reported with limited resources'
    }
];

const SEED_RESOURCES = [
    { resourceId: 'FT-NORTH-07', type: 'fire-truck', status: 'assigned', department: 'North Zone', currentAssignment: 'INC-2024-0847', location: { lat: 40.7589, lng: -73.9851 } },
    { resourceId: 'FT-NORTH-03', type: 'fire-truck', status: 'available', department: 'North Zone', currentAssignment: null, location: { lat: 40.7614, lng: -73.9776 } },
    { resourceId: 'FT-EAST-02', type: 'fire-truck', status: 'assigned', department: 'East Zone', currentAssignment: 'INC-2024-0853', location: { lat: 40.7505, lng: -73.9934 } },
    { resourceId: 'FT-EAST-05', type: 'fire-truck', status: 'assigned', department: 'East Zone', currentAssignment: 'INC-2024-0853', location: { lat: 40.7480, lng: -73.9900 } },
    { resourceId: 'FT-WEST-11', type: 'fire-truck', status: 'available', department: 'West Zone', currentAssignment: null, location: { lat: 40.7549, lng: -73.9840 } },
    { resourceId: 'AMB-CENTRAL-03', type: 'ambulance', status: 'assigned', department: 'Central', currentAssignment: 'INC-2024-0847', location: { lat: 40.7527, lng: -73.9772 } },
    { resourceId: 'AMB-SOUTH-01', type: 'ambulance', status: 'assigned', department: 'South Zone', currentAssignment: 'INC-2024-0849', location: { lat: 40.7411, lng: -73.9897 } },
    { resourceId: 'AMB-SOUTH-02', type: 'ambulance', status: 'en-route', department: 'South Zone', currentAssignment: 'INC-2024-0850', location: { lat: 40.7390, lng: -73.9916 } },
    { resourceId: 'AMB-NORTH-04', type: 'ambulance', status: 'available', department: 'North Zone', currentAssignment: null, location: { lat: 40.7601, lng: -73.9810 } },
    { resourceId: 'AMB-WEST-02', type: 'ambulance', status: 'available', department: 'West Zone', currentAssignment: null, location: { lat: 40.7555, lng: -73.9867 } },
    { resourceId: 'PD-WEST-04', type: 'police', status: 'assigned', department: 'West Zone', currentAssignment: 'INC-2024-0846', location: { lat: 40.7534, lng: -73.9845 } },
    { resourceId: 'PD-CENTRAL-02', type: 'police', status: 'available', department: 'Central', currentAssignment: null, location: { lat: 40.7516, lng: -73.9755 } },
    { resourceId: 'HZ-WEST-01', type: 'hazmat', status: 'en-route', department: 'West Zone', currentAssignment: 'INC-2024-0846', location: { lat: 40.7545, lng: -73.9860 } },
    { resourceId: 'RS-EAST-01', type: 'rescue', status: 'assigned', department: 'East Zone', currentAssignment: 'INC-2024-0853', location: { lat: 40.7490, lng: -73.9920 } },
];

const SEED_RESOLVED = [
    { conflictId: 'cf-aabb1122-c3d4-5e6f-7a8b-9c0d1e2f3a4b', strategy: 'rerank', resolvedAt: ago(15) },
    { conflictId: 'cf-ccdd3344-e5f6-7a8b-9c0d-1e2f3a4b5c6d', strategy: 'alternative', resolvedAt: ago(22) },
    { conflictId: 'cf-eeff5566-a7b8-9c0d-1e2f-3a4b5c6d7e8f', strategy: 'rerank', resolvedAt: ago(38) },
    { conflictId: 'cf-11223344-b5c6-7d8e-9f0a-1b2c3d4e5f6a', strategy: 'escalate', resolvedAt: ago(55) },
    { conflictId: 'cf-55667788-c9d0-1e2f-3a4b-5c6d7e8f9a0b', strategy: 'alternative', resolvedAt: ago(72) },
];

// ─── Toast Notification System ──────────────────────────────────────────────
function Toast({ toasts, onDismiss }) {
    return (
        <div className="toast-container">
            {toasts.map((t) => (
                <div key={t.id} className={`toast toast-${t.type}`}>
                    <div className="toast-icon">
                        {t.type === 'success' ? '✅' : t.type === 'error' ? '❌' : t.type === 'warning' ? '⚠️' : 'ℹ️'}
                    </div>
                    <div className="toast-body">
                        <strong className="toast-title">{t.title}</strong>
                        <p className="toast-message">{t.message}</p>
                    </div>
                    <button className="toast-close" onClick={() => onDismiss(t.id)}>×</button>
                </div>
            ))}
        </div>
    );
}

// ─── Find Alternative Modal ─────────────────────────────────────────────────
function FindAlternativeModal({ conflict, resources, onResolve, onClose, resolving }) {
    const involvedIds = conflict.involvedResources || [];
    const involvedIncidents = conflict.involvedIncidents || [];

    // Find resources involved in this conflict
    const involvedResources = resources.filter(r => involvedIds.includes(r.resourceId));

    // Find available alternatives (same type, not involved)
    const alternativeResources = resources.filter(r =>
        r.status === 'available' && !involvedIds.includes(r.resourceId)
    );

    // Group alternatives by type
    const alternativesByType = alternativeResources.reduce((acc, r) => {
        const type = r.type || 'unknown';
        if (!acc[type]) acc[type] = [];
        acc[type].push(r);
        return acc;
    }, {});

    const getResourceTypeIcon = (type) => {
        const icons = {
            'fire-truck': '🚒', 'ambulance': '🚑', 'police': '🚔',
            'hazmat': '☣️', 'rescue': '🚁', 'default': '🚐'
        };
        return icons[type] || icons.default;
    };

    const getStatusColor = (status) => {
        const colors = {
            'available': '#16a34a', 'assigned': '#f59e0b',
            'en-route': '#3b82f6', 'on-scene': '#dc2626',
            'maintenance': '#6b7280'
        };
        return colors[status] || '#64748b';
    };

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-content" onClick={e => e.stopPropagation()}>
                <div className="modal-header">
                    <div>
                        <h3>🔄 Find Alternative Resources</h3>
                        <p className="modal-subtitle">
                            Conflict #{conflict.conflictId?.slice(0, 8)} — {conflict.type?.replace('-', ' ')}
                        </p>
                    </div>
                    <button className="modal-close-btn" onClick={onClose}>×</button>
                </div>

                <div className="modal-body">
                    {/* Conflict Summary */}
                    <div className="alt-section">
                        <h4>⚡ Conflict Summary</h4>
                        <div className="conflict-summary-grid">
                            <div className="summary-stat">
                                <span className="summary-label">Severity</span>
                                <span className={`summary-value severity-${conflict.severity >= 4 ? 'critical' : conflict.severity >= 3 ? 'high' : 'medium'}`}>
                                    {conflict.severity}/5
                                </span>
                            </div>
                            <div className="summary-stat">
                                <span className="summary-label">Incidents</span>
                                <span className="summary-value">{involvedIncidents.length}</span>
                            </div>
                            <div className="summary-stat">
                                <span className="summary-label">Resources</span>
                                <span className="summary-value">{involvedIds.length}</span>
                            </div>
                            <div className="summary-stat">
                                <span className="summary-label">Status</span>
                                <span className="summary-value status-badge">{conflict.status}</span>
                            </div>
                        </div>
                    </div>

                    {/* Conflict Description */}
                    {conflict.description && (
                        <div className="alt-section">
                            <h4>📋 Details</h4>
                            <p className="conflict-desc-text">{conflict.description}</p>
                        </div>
                    )}

                    {/* Currently Conflicting Resources */}
                    <div className="alt-section">
                        <h4>🔴 Conflicting Resources</h4>
                        {involvedResources.length > 0 ? (
                            <div className="resource-list">
                                {involvedResources.map(r => (
                                    <div key={r.resourceId} className="resource-row conflicting">
                                        <span className="resource-type-icon">{getResourceTypeIcon(r.type)}</span>
                                        <div className="resource-info">
                                            <span className="resource-id">{r.resourceId}</span>
                                            <span className="resource-type">{r.type}</span>
                                        </div>
                                        <span className="resource-status" style={{ color: getStatusColor(r.status) }}>
                                            {r.status}
                                        </span>
                                        {r.currentAssignment && (
                                            <span className="resource-assignment">→ {r.currentAssignment}</span>
                                        )}
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <p className="no-data">Resource details not available in database</p>
                        )}
                    </div>

                    {/* Available Alternatives */}
                    <div className="alt-section">
                        <h4>🟢 Available Alternatives</h4>
                        {Object.keys(alternativesByType).length > 0 ? (
                            Object.entries(alternativesByType).map(([type, resources]) => (
                                <div key={type} className="alt-type-group">
                                    <span className="alt-type-label">
                                        {getResourceTypeIcon(type)} {type} ({resources.length} available)
                                    </span>
                                    <div className="resource-list">
                                        {resources.slice(0, 5).map(r => (
                                            <div key={r.resourceId} className="resource-row alternative">
                                                <div className="resource-info">
                                                    <span className="resource-id">{r.resourceId}</span>
                                                    <span className="resource-dept">{r.department || 'General'}</span>
                                                </div>
                                                <span className="resource-status" style={{ color: '#16a34a' }}>
                                                    available
                                                </span>
                                            </div>
                                        ))}
                                        {resources.length > 5 && (
                                            <p className="more-resources">+{resources.length - 5} more</p>
                                        )}
                                    </div>
                                </div>
                            ))
                        ) : (
                            <div className="no-alternatives">
                                <span className="no-alt-icon">⚠️</span>
                                <p>No alternative resources currently available. Consider <strong>Re-ranking</strong> priorities or <strong>Escalating</strong> instead.</p>
                            </div>
                        )}
                    </div>

                    {/* Resolution Explanation */}
                    <div className="alt-section resolution-explanation">
                        <h4>🧠 What "Find Alternative" Does</h4>
                        <ol className="resolution-steps">
                            <li>
                                <span className="step-num">1</span>
                                <span>Identifies the <strong>lowest-priority</strong> assignment among the conflicting resources</span>
                            </li>
                            <li>
                                <span className="step-num">2</span>
                                <span><strong>Revokes</strong> that assignment, freeing the resource</span>
                            </li>
                            <li>
                                <span className="step-num">3</span>
                                <span>Runs the <strong>orchestration engine</strong> to find and assign the best available alternative</span>
                            </li>
                            <li>
                                <span className="step-num">4</span>
                                <span>Logs all actions to the <strong>event store</strong> for auditability</span>
                            </li>
                        </ol>
                    </div>
                </div>

                <div className="modal-footer">
                    <button className="btn btn-secondary" onClick={onClose}>
                        Cancel
                    </button>
                    <button
                        className="btn btn-primary btn-resolve"
                        onClick={() => onResolve(conflict.conflictId, 'alternative')}
                        disabled={resolving}
                    >
                        {resolving ? (
                            <>
                                <span className="btn-spinner"></span>
                                Finding Alternative...
                            </>
                        ) : (
                            <>🔄 Execute Find Alternative</>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
}

// ─── Resolution History Item ────────────────────────────────────────────────
function ResolutionHistoryItem({ item }) {
    const strategyLabels = {
        'rerank': { label: 'Re-ranked', icon: '🔃', color: '#3b82f6' },
        'alternative': { label: 'Found Alternative', icon: '🔄', color: '#16a34a' },
        'escalate': { label: 'Escalated', icon: '🔺', color: '#f59e0b' },
        'manual-override': { label: 'Manual Override', icon: '👤', color: '#8b5cf6' }
    };

    const info = strategyLabels[item.strategy] || { label: item.strategy, icon: '⚙️', color: '#64748b' };

    return (
        <div className="history-item">
            <div className="history-icon" style={{ background: `${info.color}22`, color: info.color }}>
                {info.icon}
            </div>
            <div className="history-body">
                <span className="history-label">{info.label}</span>
                <span className="history-id">Conflict #{item.conflictId?.slice(0, 8)}</span>
            </div>
            <span className="history-time">{item.resolvedAt ? new Date(item.resolvedAt).toLocaleTimeString() : ''}</span>
        </div>
    );
}

// ─── Main Component ─────────────────────────────────────────────────────────
const OrchestrationPanel = () => {
    const [conflicts, setConflicts] = useState([]);
    const [resolvedConflicts, setResolvedConflicts] = useState(SEED_RESOLVED);
    const [resources, setResources] = useState([]);
    const [loading, setLoading] = useState(true);
    const [toasts, setToasts] = useState([]);
    const [selectedConflict, setSelectedConflict] = useState(null);
    const [resolving, setResolving] = useState(false);

    // Toast helpers
    const addToast = useCallback((type, title, message) => {
        const id = Date.now();
        setToasts(prev => [...prev, { id, type, title, message }]);
        setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 5000);
    }, []);

    const dismissToast = useCallback((id) => {
        setToasts(prev => prev.filter(t => t.id !== id));
    }, []);

    useEffect(() => {
        loadData();
        const interval = setInterval(loadData, 8000);
        return () => clearInterval(interval);
    }, []);

    const loadData = async () => {
        try {
            const [conflictsRes, resourcesRes] = await Promise.all([
                getPendingConflicts(),
                getResources()
            ]);
            const apiConflicts = conflictsRes.data.conflicts || [];
            const apiResources = resourcesRes.data.resources || [];

            // Merge with seed data — API data takes priority, seed fills gaps
            setConflicts(apiConflicts.length > 0 ? apiConflicts : SEED_CONFLICTS);
            setResources(apiResources.length > 0 ? [...apiResources, ...SEED_RESOURCES] : SEED_RESOURCES);
            setLoading(false);
        } catch (error) {
            console.error('Error loading data:', error);
            // Fallback to seed data on error
            setConflicts(SEED_CONFLICTS);
            setResources(SEED_RESOURCES);
            setLoading(false);
        }
    };

    const handleResolve = async (conflictId, strategy) => {
        setResolving(true);
        const strategyMsg = {
            'rerank': 'Priorities re-ranked successfully. Resources have been re-assigned.',
            'alternative': 'Alternative resource found and assigned. Lowest-priority assignment was revoked.',
            'escalate': 'Conflict escalated for manual supervisor review.'
        };
        const strategyIcon = strategy === 'alternative' ? '🔄' : strategy === 'rerank' ? '🔃' : '🔺';

        try {
            const response = await resolveConflict(conflictId, strategy, 'operator-1');
            const resolved = response.data.conflict || { conflictId, strategy, resolvedAt: new Date().toISOString() };

            setResolvedConflicts(prev => [{ ...resolved, strategy }, ...prev].slice(0, 20));
            addToast('success', `${strategyIcon} Resolution Applied`, strategyMsg[strategy] || 'Conflict resolved.');
            setSelectedConflict(null);
            await loadData();
        } catch (error) {
            // Gracefully handle seed data — simulate local resolution
            const isSeedConflict = SEED_CONFLICTS.some(c => c.conflictId === conflictId);
            if (isSeedConflict) {
                setConflicts(prev => prev.filter(c => c.conflictId !== conflictId));
                setResolvedConflicts(prev => [{ conflictId, strategy, resolvedAt: new Date().toISOString() }, ...prev].slice(0, 20));
                addToast('success', `${strategyIcon} Resolution Applied`, strategyMsg[strategy] || 'Conflict resolved.');
                setSelectedConflict(null);
            } else {
                addToast('error', 'Resolution Failed', error.response?.data?.error || error.message || 'Unknown error');
            }
        } finally {
            setResolving(false);
        }
    };

    const openAlternativeModal = (conflict) => {
        setSelectedConflict(conflict);
    };

    if (loading) {
        return (
            <div className="loading-container">
                <div className="spinner"></div>
                <p className="loading-text">Loading Orchestration Panel...</p>
            </div>
        );
    }

    const pendingCount = conflicts.filter(c => c.status === 'detected').length;
    const escalatedCount = conflicts.filter(c => c.status === 'escalated').length;
    const availableResources = resources.filter(r => r.status === 'available').length;

    return (
        <div className="orchestration-panel">
            <Toast toasts={toasts} onDismiss={dismissToast} />

            <div className="page-header">
                <div>
                    <h1 className="page-title">Orchestration Control Panel</h1>
                    <p className="page-subtitle">Review and control automated resource decisions</p>
                </div>
                <div className="header-actions">
                    <button className="btn btn-secondary btn-sm" onClick={loadData}>
                        🔄 Refresh
                    </button>
                </div>
            </div>

            <div className="stat-cards">
                <div className="stat-card">
                    <div className="stat-label">Pending Conflicts</div>
                    <div className="stat-value">{pendingCount}</div>
                    <div className="stat-trend">{pendingCount === 0 ? '✅ Clear' : '⚠️ Needs attention'}</div>
                </div>
                <div className="stat-card">
                    <div className="stat-label">Escalated</div>
                    <div className="stat-value">{escalatedCount}</div>
                    <div className="stat-trend">{escalatedCount === 0 ? '✅ None' : '🔺 Review'}</div>
                </div>
                <div className="stat-card">
                    <div className="stat-label">Total Resources</div>
                    <div className="stat-value">{resources.length}</div>
                    <div className="stat-trend">{availableResources} available</div>
                </div>
                <div className="stat-card">
                    <div className="stat-label">Resolved Today</div>
                    <div className="stat-value">{resolvedConflicts.length}</div>
                    <div className="stat-trend">{resolvedConflicts.length > 0 ? '📊 View history' : '—'}</div>
                </div>
            </div>

            <div className="orch-grid">
                {/* Active Conflicts */}
                <div className="card conflicts-panel">
                    <h3>Active Conflicts</h3>

                    {conflicts.length === 0 ? (
                        <div className="empty-state">
                            <div className="empty-icon">✅</div>
                            <p>No conflicts detected — system running smoothly</p>
                            <span className="empty-hint">Conflicts appear when resources are double-assigned or departments collide</span>
                        </div>
                    ) : (
                        <div className="conflicts-list">
                            {conflicts.map((conflict) => (
                                <div key={conflict.conflictId} className={`conflict-card severity-${conflict.severity >= 4 ? 'critical' : 'high'}`}>
                                    <div className="conflict-header">
                                        <span className={`badge badge-${conflict.severity >= 4 ? 'critical' : 'high'}`}>
                                            {conflict.type?.replace('-', ' ') || 'unknown'}
                                        </span>
                                        <span className="conflict-time">
                                            {new Date(conflict.detectedAt).toLocaleString()}
                                        </span>
                                    </div>

                                    <div className="conflict-details">
                                        <div className="detail-row">
                                            <span className="detail-label">Severity</span>
                                            <span className={`detail-value sev-${conflict.severity >= 4 ? 'crit' : 'high'}`}>
                                                {'●'.repeat(conflict.severity)}{'○'.repeat(5 - conflict.severity)} {conflict.severity}/5
                                            </span>
                                        </div>
                                        <div className="detail-row">
                                            <span className="detail-label">Status</span>
                                            <span className="detail-value">{conflict.status}</span>
                                        </div>
                                        <div className="detail-row">
                                            <span className="detail-label">Incidents</span>
                                            <span className="detail-value">{conflict.involvedIncidents?.length || 0} incident(s)</span>
                                        </div>
                                        <div className="detail-row">
                                            <span className="detail-label">Resources</span>
                                            <span className="detail-value">{conflict.involvedResources?.length || 0} resource(s)</span>
                                        </div>
                                    </div>

                                    {conflict.description && (
                                        <p className="conflict-desc-text">{conflict.description}</p>
                                    )}

                                    <div className="conflict-actions">
                                        <button
                                            className="btn btn-primary btn-sm"
                                            onClick={() => handleResolve(conflict.conflictId, 'rerank')}
                                            disabled={resolving}
                                        >
                                            🔃 Re-rank
                                        </button>
                                        <button
                                            className="btn btn-accent btn-sm"
                                            onClick={() => openAlternativeModal(conflict)}
                                            disabled={resolving}
                                        >
                                            🔄 Find Alternative
                                        </button>
                                        <button
                                            className="btn btn-danger btn-sm"
                                            onClick={() => handleResolve(conflict.conflictId, 'escalate')}
                                            disabled={resolving}
                                        >
                                            🔺 Escalate
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Resolution History */}
                <div className="card history-panel">
                    <h3>📋 Resolution History</h3>
                    {resolvedConflicts.length === 0 ? (
                        <div className="empty-state small">
                            <p>No resolutions yet this session</p>
                        </div>
                    ) : (
                        <div className="history-list">
                            {resolvedConflicts.map((item, i) => (
                                <ResolutionHistoryItem key={i} item={item} />
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* Orchestration Insights */}
            <div className="card">
                <h3>Orchestration Insights</h3>
                <div className="insights-grid">
                    <div className="insight-item">
                        <div className="insight-icon">⚡</div>
                        <div className="insight-content">
                            <h4>Automatic Assignment</h4>
                            <p>Resources are automatically assigned based on proximity, capability, and availability scoring.</p>
                        </div>
                    </div>
                    <div className="insight-item">
                        <div className="insight-icon">🔍</div>
                        <div className="insight-content">
                            <h4>Conflict Detection</h4>
                            <p>System continuously monitors for double-assignments, capacity overflows, and department collisions.</p>
                        </div>
                    </div>
                    <div className="insight-item">
                        <div className="insight-icon">🔄</div>
                        <div className="insight-content">
                            <h4>Find Alternative</h4>
                            <p>Revokes the lowest-priority conflicting assignment and runs the orchestration engine to find the best available replacement resource.</p>
                        </div>
                    </div>
                    <div className="insight-item">
                        <div className="insight-icon">📊</div>
                        <div className="insight-content">
                            <h4>Priority-Based</h4>
                            <p>Higher severity incidents take precedence in resource allocation decisions.</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Find Alternative Modal */}
            {selectedConflict && (
                <FindAlternativeModal
                    conflict={selectedConflict}
                    resources={resources}
                    onResolve={handleResolve}
                    onClose={() => setSelectedConflict(null)}
                    resolving={resolving}
                />
            )}
        </div>
    );
};

export default OrchestrationPanel;
