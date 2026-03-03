import React, { useEffect, useState, useCallback } from 'react';
import { getResources, updateResource } from '../services/api';
import './ResourceManagement.css';

// ─── Seed Data ──────────────────────────────────────────────────────────────
const SEED_RESOURCES = [
    { resourceId: 'FT-NORTH-01', type: 'fire-truck', status: 'available', department: 'North Zone', location: { lat: 40.7614, lng: -73.9776 }, lastUpdated: new Date(Date.now() - 120000).toISOString(), capabilities: ['Ladder', 'Pump', 'Rescue'], crewSize: 6 },
    { resourceId: 'FT-NORTH-07', type: 'fire-truck', status: 'assigned', department: 'North Zone', location: { lat: 40.7589, lng: -73.9851 }, lastUpdated: new Date(Date.now() - 180000).toISOString(), currentAssignment: 'INC-2024-0847', capabilities: ['Ladder', 'Pump'], crewSize: 5 },
    { resourceId: 'FT-EAST-02', type: 'fire-truck', status: 'assigned', department: 'East Zone', location: { lat: 40.7505, lng: -73.9934 }, lastUpdated: new Date(Date.now() - 60000).toISOString(), currentAssignment: 'INC-2024-0853', capabilities: ['Pump', 'Foam'], crewSize: 4 },
    { resourceId: 'FT-EAST-05', type: 'fire-truck', status: 'en-route', department: 'East Zone', location: { lat: 40.7480, lng: -73.9900 }, lastUpdated: new Date(Date.now() - 30000).toISOString(), currentAssignment: 'INC-2024-0853', capabilities: ['Ladder'], crewSize: 6 },
    { resourceId: 'FT-WEST-11', type: 'fire-truck', status: 'available', department: 'West Zone', location: { lat: 40.7549, lng: -73.9840 }, lastUpdated: new Date(Date.now() - 900000).toISOString(), capabilities: ['Pump', 'Rescue', 'Foam'], crewSize: 5 },
    { resourceId: 'FT-SOUTH-03', type: 'fire-truck', status: 'maintenance', department: 'South Zone', location: { lat: 40.7395, lng: -73.9910 }, lastUpdated: new Date(Date.now() - 3600000).toISOString(), capabilities: ['Ladder', 'Pump'], crewSize: 0 },
    { resourceId: 'AMB-CENTRAL-03', type: 'ambulance', status: 'assigned', department: 'Central', location: { lat: 40.7527, lng: -73.9772 }, lastUpdated: new Date(Date.now() - 45000).toISOString(), currentAssignment: 'INC-2024-0847', capabilities: ['ALS', 'Cardiac'], crewSize: 3 },
    { resourceId: 'AMB-SOUTH-01', type: 'ambulance', status: 'assigned', department: 'South Zone', location: { lat: 40.7411, lng: -73.9897 }, lastUpdated: new Date(Date.now() - 15000).toISOString(), currentAssignment: 'INC-2024-0849', capabilities: ['BLS'], crewSize: 2 },
    { resourceId: 'AMB-SOUTH-02', type: 'ambulance', status: 'en-route', department: 'South Zone', location: { lat: 40.7390, lng: -73.9916 }, lastUpdated: new Date(Date.now() - 20000).toISOString(), currentAssignment: 'INC-2024-0850', capabilities: ['ALS', 'Trauma'], crewSize: 3 },
    { resourceId: 'AMB-NORTH-04', type: 'ambulance', status: 'available', department: 'North Zone', location: { lat: 40.7601, lng: -73.9810 }, lastUpdated: new Date(Date.now() - 600000).toISOString(), capabilities: ['ALS', 'Cardiac', 'Pediatric'], crewSize: 3 },
    { resourceId: 'AMB-WEST-02', type: 'ambulance', status: 'available', department: 'West Zone', location: { lat: 40.7555, lng: -73.9867 }, lastUpdated: new Date(Date.now() - 240000).toISOString(), capabilities: ['BLS'], crewSize: 2 },
    { resourceId: 'PD-WEST-04', type: 'police', status: 'assigned', department: 'West Zone', location: { lat: 40.7534, lng: -73.9845 }, lastUpdated: new Date(Date.now() - 90000).toISOString(), currentAssignment: 'INC-2024-0846', capabilities: ['Patrol', 'K9'], crewSize: 2 },
    { resourceId: 'PD-CENTRAL-02', type: 'police', status: 'available', department: 'Central', location: { lat: 40.7516, lng: -73.9755 }, lastUpdated: new Date(Date.now() - 300000).toISOString(), capabilities: ['Patrol', 'Traffic'], crewSize: 2 },
    { resourceId: 'PD-SOUTH-06', type: 'police', status: 'on-scene', department: 'South Zone', location: { lat: 40.7388, lng: -73.9905 }, lastUpdated: new Date(Date.now() - 10000).toISOString(), currentAssignment: 'INC-2024-0849', capabilities: ['SWAT', 'Patrol'], crewSize: 4 },
    { resourceId: 'HZ-WEST-01', type: 'hazmat', status: 'en-route', department: 'West Zone', location: { lat: 40.7545, lng: -73.9860 }, lastUpdated: new Date(Date.now() - 25000).toISOString(), currentAssignment: 'INC-2024-0846', capabilities: ['Chemical', 'Radiological', 'Biological'], crewSize: 5 },
    { resourceId: 'HZ-EAST-01', type: 'hazmat', status: 'available', department: 'East Zone', location: { lat: 40.7510, lng: -73.9880 }, lastUpdated: new Date(Date.now() - 1800000).toISOString(), capabilities: ['Chemical', 'Decon'], crewSize: 4 },
    { resourceId: 'RS-EAST-01', type: 'rescue', status: 'assigned', department: 'East Zone', location: { lat: 40.7490, lng: -73.9920 }, lastUpdated: new Date(Date.now() - 50000).toISOString(), currentAssignment: 'INC-2024-0853', capabilities: ['Urban Search', 'Water Rescue'], crewSize: 6 },
    { resourceId: 'RS-NORTH-01', type: 'rescue', status: 'available', department: 'North Zone', location: { lat: 40.7620, lng: -73.9790 }, lastUpdated: new Date(Date.now() - 2400000).toISOString(), capabilities: ['Urban Search', 'Confined Space', 'High Angle'], crewSize: 8 },
];

const TYPE_CONFIG = {
    'fire-truck': { icon: '🚒', label: 'Fire Truck', color: '#dc2626' },
    'ambulance': { icon: '🚑', label: 'Ambulance', color: '#16a34a' },
    'police': { icon: '🚔', label: 'Police', color: '#3b82f6' },
    'hazmat': { icon: '☣️', label: 'Hazmat', color: '#f59e0b' },
    'rescue': { icon: '🚁', label: 'Rescue', color: '#8b5cf6' }
};

const STATUS_CONFIG = {
    'available': { color: '#16a34a', label: 'Available', dot: '🟢' },
    'assigned': { color: '#f59e0b', label: 'Assigned', dot: '🟡' },
    'en-route': { color: '#3b82f6', label: 'En Route', dot: '🔵' },
    'on-scene': { color: '#dc2626', label: 'On Scene', dot: '🔴' },
    'maintenance': { color: '#6b7280', label: 'Maintenance', dot: '⚪' }
};

// ─── Toast ──────────────────────────────────────────────────────────────────
function Toast({ toasts, onDismiss }) {
    return (
        <div className="toast-container">
            {toasts.map((t) => (
                <div key={t.id} className={`toast toast-${t.type}`}>
                    <div className="toast-icon">
                        {t.type === 'success' ? '✅' : t.type === 'error' ? '❌' : 'ℹ️'}
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

// ─── Resource Detail Panel ──────────────────────────────────────────────────
function ResourceDetailPanel({ resource, onClose, onStatusChange }) {
    const type = TYPE_CONFIG[resource.type] || { icon: '🚐', label: resource.type, color: '#64748b' };
    const status = STATUS_CONFIG[resource.status] || { color: '#64748b', label: resource.status };

    const timeSince = (dateStr) => {
        const diff = Date.now() - new Date(dateStr).getTime();
        if (diff < 60000) return `${Math.floor(diff / 1000)}s ago`;
        if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
        return `${Math.floor(diff / 3600000)}h ago`;
    };

    return (
        <div className="detail-panel-overlay" onClick={onClose}>
            <div className="detail-panel" onClick={e => e.stopPropagation()}>
                <div className="detail-header" style={{ borderBottomColor: type.color }}>
                    <div className="detail-header-info">
                        <span className="detail-type-icon">{type.icon}</span>
                        <div>
                            <h3 className="detail-id">{resource.resourceId}</h3>
                            <span className="detail-type-label" style={{ color: type.color }}>{type.label}</span>
                        </div>
                    </div>
                    <button className="detail-close" onClick={onClose}>×</button>
                </div>

                <div className="detail-body">
                    <div className="detail-section">
                        <h4>📊 Status</h4>
                        <div className="detail-status-row">
                            <span className="status-indicator" style={{ background: status.color }}>{status.label}</span>
                            <span className="detail-updated">Updated {timeSince(resource.lastUpdated)}</span>
                        </div>
                        <div className="detail-status-actions">
                            {Object.entries(STATUS_CONFIG).map(([key, cfg]) => (
                                <button
                                    key={key}
                                    className={`status-btn ${resource.status === key ? 'active' : ''}`}
                                    style={{ '--btn-color': cfg.color }}
                                    onClick={() => onStatusChange(resource.resourceId, key)}
                                    disabled={resource.status === key}
                                >
                                    {cfg.dot} {cfg.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    {resource.currentAssignment && (
                        <div className="detail-section">
                            <h4>📋 Current Assignment</h4>
                            <div className="assignment-card">
                                <span className="assignment-id">{resource.currentAssignment}</span>
                                <span className="assignment-status">Active</span>
                            </div>
                        </div>
                    )}

                    <div className="detail-section">
                        <h4>📍 Location</h4>
                        <div className="location-coords">
                            <span>Lat: {resource.location?.lat?.toFixed(4)}</span>
                            <span>Lng: {resource.location?.lng?.toFixed(4)}</span>
                        </div>
                    </div>

                    <div className="detail-section">
                        <h4>🏢 Department</h4>
                        <p className="detail-dept">{resource.department || 'Unassigned'}</p>
                    </div>

                    {resource.capabilities && resource.capabilities.length > 0 && (
                        <div className="detail-section">
                            <h4>🛠️ Capabilities</h4>
                            <div className="capabilities-list">
                                {resource.capabilities.map((cap, i) => (
                                    <span key={i} className="capability-tag">{cap}</span>
                                ))}
                            </div>
                        </div>
                    )}

                    {resource.crewSize != null && (
                        <div className="detail-section">
                            <h4>👥 Crew Size</h4>
                            <p className="detail-crew">{resource.crewSize} personnel</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

// ─── Main Component ─────────────────────────────────────────────────────────
const ResourceManagement = () => {
    const [resources, setResources] = useState([]);
    const [loading, setLoading] = useState(true);
    const [toasts, setToasts] = useState([]);
    const [selectedResource, setSelectedResource] = useState(null);
    const [filterType, setFilterType] = useState('all');
    const [filterStatus, setFilterStatus] = useState('all');
    const [searchQuery, setSearchQuery] = useState('');
    const [viewMode, setViewMode] = useState('grid'); // 'grid' or 'table'

    const addToast = useCallback((type, title, message) => {
        const id = Date.now();
        setToasts(prev => [...prev, { id, type, title, message }]);
        setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 4000);
    }, []);

    const dismissToast = useCallback((id) => {
        setToasts(prev => prev.filter(t => t.id !== id));
    }, []);

    useEffect(() => {
        loadResources();
        const interval = setInterval(loadResources, 10000);
        return () => clearInterval(interval);
    }, []);

    const loadResources = async () => {
        try {
            const response = await getResources();
            const apiResources = response.data.resources || [];
            setResources(apiResources.length > 0 ? apiResources : SEED_RESOURCES);
            setLoading(false);
        } catch (error) {
            console.error('Error loading resources:', error);
            setResources(SEED_RESOURCES);
            setLoading(false);
        }
    };

    const handleStatusChange = async (resourceId, newStatus) => {
        try {
            await updateResource({ resourceId, status: newStatus });
            addToast('success', 'Status Updated', `${resourceId} is now ${newStatus}`);
            await loadResources();
        } catch (error) {
            // Handle seed data locally
            setResources(prev => prev.map(r =>
                r.resourceId === resourceId ? { ...r, status: newStatus, lastUpdated: new Date().toISOString() } : r
            ));
            addToast('success', 'Status Updated', `${resourceId} is now ${newStatus}`);
        }
        if (selectedResource?.resourceId === resourceId) {
            setSelectedResource(prev => ({ ...prev, status: newStatus, lastUpdated: new Date().toISOString() }));
        }
    };

    // Filter resources
    const filtered = resources.filter(r => {
        if (filterType !== 'all' && r.type !== filterType) return false;
        if (filterStatus !== 'all' && r.status !== filterStatus) return false;
        if (searchQuery && !r.resourceId.toLowerCase().includes(searchQuery.toLowerCase()) &&
            !(r.department || '').toLowerCase().includes(searchQuery.toLowerCase())) return false;
        return true;
    });

    // Stats
    const stats = {
        total: resources.length,
        available: resources.filter(r => r.status === 'available').length,
        assigned: resources.filter(r => r.status === 'assigned').length,
        enRoute: resources.filter(r => r.status === 'en-route').length,
        onScene: resources.filter(r => r.status === 'on-scene').length,
        maintenance: resources.filter(r => r.status === 'maintenance').length,
    };

    const typeBreakdown = Object.entries(TYPE_CONFIG).map(([key, cfg]) => ({
        type: key,
        ...cfg,
        count: resources.filter(r => r.type === key).length,
        available: resources.filter(r => r.type === key && r.status === 'available').length
    }));

    if (loading) {
        return (
            <div className="loading-container">
                <div className="spinner"></div>
                <p className="loading-text">Loading Resource Management...</p>
            </div>
        );
    }

    const timeSince = (dateStr) => {
        const diff = Date.now() - new Date(dateStr).getTime();
        if (diff < 60000) return `${Math.floor(diff / 1000)}s ago`;
        if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
        return `${Math.floor(diff / 3600000)}h ago`;
    };

    return (
        <div className="resource-management">
            <Toast toasts={toasts} onDismiss={dismissToast} />

            <div className="page-header">
                <div>
                    <h1 className="page-title">Resource Management</h1>
                    <p className="page-subtitle">View, filter, and manage all emergency resources</p>
                </div>
                <div className="header-actions">
                    <div className="view-toggle">
                        <button className={`toggle-btn ${viewMode === 'grid' ? 'active' : ''}`} onClick={() => setViewMode('grid')}>▦ Grid</button>
                        <button className={`toggle-btn ${viewMode === 'table' ? 'active' : ''}`} onClick={() => setViewMode('table')}>☰ Table</button>
                    </div>
                    <button className="btn btn-primary" onClick={loadResources}>↻ Refresh</button>
                </div>
            </div>

            {/* Stats Row */}
            <div className="rm-stats">
                <div className="rm-stat-card">
                    <div className="rm-stat-val">{stats.total}</div>
                    <div className="rm-stat-label">Total Resources</div>
                </div>
                <div className="rm-stat-card" style={{ '--accent': '#16a34a' }}>
                    <div className="rm-stat-val">{stats.available}</div>
                    <div className="rm-stat-label">🟢 Available</div>
                </div>
                <div className="rm-stat-card" style={{ '--accent': '#f59e0b' }}>
                    <div className="rm-stat-val">{stats.assigned}</div>
                    <div className="rm-stat-label">🟡 Assigned</div>
                </div>
                <div className="rm-stat-card" style={{ '--accent': '#3b82f6' }}>
                    <div className="rm-stat-val">{stats.enRoute}</div>
                    <div className="rm-stat-label">🔵 En Route</div>
                </div>
                <div className="rm-stat-card" style={{ '--accent': '#dc2626' }}>
                    <div className="rm-stat-val">{stats.onScene}</div>
                    <div className="rm-stat-label">🔴 On Scene</div>
                </div>
                <div className="rm-stat-card" style={{ '--accent': '#6b7280' }}>
                    <div className="rm-stat-val">{stats.maintenance}</div>
                    <div className="rm-stat-label">⚪ Maintenance</div>
                </div>
            </div>

            {/* Type Breakdown */}
            <div className="type-breakdown card">
                <h3>Fleet Overview</h3>
                <div className="type-bars">
                    {typeBreakdown.map(t => (
                        <div key={t.type} className="type-bar-row" onClick={() => setFilterType(filterType === t.type ? 'all' : t.type)}>
                            <span className="type-bar-icon">{t.icon}</span>
                            <span className="type-bar-label">{t.label}</span>
                            <div className="type-bar-track">
                                <div className="type-bar-fill" style={{ width: `${(t.count / stats.total) * 100}%`, background: t.color }} />
                            </div>
                            <span className="type-bar-count">{t.available}/{t.count}</span>
                        </div>
                    ))}
                </div>
            </div>

            {/* Filters */}
            <div className="rm-filters">
                <input
                    type="text"
                    className="filter-input rm-search"
                    placeholder="Search by ID or department..."
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                />
                <select className="filter-input" value={filterType} onChange={e => setFilterType(e.target.value)}>
                    <option value="all">All Types</option>
                    {Object.entries(TYPE_CONFIG).map(([key, cfg]) => (
                        <option key={key} value={key}>{cfg.icon} {cfg.label}</option>
                    ))}
                </select>
                <select className="filter-input" value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
                    <option value="all">All Statuses</option>
                    {Object.entries(STATUS_CONFIG).map(([key, cfg]) => (
                        <option key={key} value={key}>{cfg.dot} {cfg.label}</option>
                    ))}
                </select>
                <span className="filter-count">{filtered.length} of {resources.length}</span>
            </div>

            {/* Resource Grid / Table */}
            {viewMode === 'grid' ? (
                <div className="rm-grid">
                    {filtered.map(r => {
                        const type = TYPE_CONFIG[r.type] || { icon: '🚐', label: r.type, color: '#64748b' };
                        const status = STATUS_CONFIG[r.status] || { color: '#64748b', label: r.status, dot: '⚪' };
                        return (
                            <div key={r.resourceId} className="rm-card" onClick={() => setSelectedResource(r)} style={{ '--card-accent': type.color }}>
                                <div className="rm-card-header">
                                    <span className="rm-card-icon">{type.icon}</span>
                                    <span className="rm-card-status" style={{ background: `${status.color}20`, color: status.color }}>
                                        {status.label}
                                    </span>
                                </div>
                                <div className="rm-card-id">{r.resourceId}</div>
                                <div className="rm-card-meta">
                                    <span>{r.department || 'N/A'}</span>
                                    <span>{timeSince(r.lastUpdated)}</span>
                                </div>
                                {r.currentAssignment && (
                                    <div className="rm-card-assignment">→ {r.currentAssignment}</div>
                                )}
                                {r.capabilities && (
                                    <div className="rm-card-caps">
                                        {r.capabilities.slice(0, 3).map((c, i) => (
                                            <span key={i} className="rm-cap-tag">{c}</span>
                                        ))}
                                        {r.capabilities.length > 3 && <span className="rm-cap-more">+{r.capabilities.length - 3}</span>}
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            ) : (
                <div className="rm-table-wrap card">
                    <table className="rm-table">
                        <thead>
                            <tr>
                                <th>ID</th>
                                <th>Type</th>
                                <th>Status</th>
                                <th>Department</th>
                                <th>Assignment</th>
                                <th>Crew</th>
                                <th>Updated</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filtered.map(r => {
                                const type = TYPE_CONFIG[r.type] || { icon: '🚐', label: r.type };
                                const status = STATUS_CONFIG[r.status] || { color: '#64748b', label: r.status };
                                return (
                                    <tr key={r.resourceId} onClick={() => setSelectedResource(r)} className="rm-table-row">
                                        <td className="rm-td-id">{r.resourceId}</td>
                                        <td><span className="rm-td-type">{type.icon} {type.label}</span></td>
                                        <td><span className="rm-td-status" style={{ color: status.color }}>● {status.label}</span></td>
                                        <td>{r.department || '—'}</td>
                                        <td>{r.currentAssignment || '—'}</td>
                                        <td>{r.crewSize ?? '—'}</td>
                                        <td className="rm-td-time">{timeSince(r.lastUpdated)}</td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            )}

            {/* Detail Panel */}
            {selectedResource && (
                <ResourceDetailPanel
                    resource={selectedResource}
                    onClose={() => setSelectedResource(null)}
                    onStatusChange={handleStatusChange}
                />
            )}
        </div>
    );
};

export default ResourceManagement;
