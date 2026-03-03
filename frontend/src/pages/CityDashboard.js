import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { MapContainer, TileLayer, Marker, Popup, Circle } from 'react-leaflet';
import L from 'leaflet';
import { getLiveDashboard, getMapData, assignResources } from '../services/api';
import socketService from '../services/socket';
import './CityDashboard.css';

// Fix Leaflet default marker icons
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
    iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
    iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
    shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

// ─── Seed Data (fallback when backend is down) ──────────────────────────────
const SEED_INCIDENTS = [
    { incidentId: 'INC-SEED-001', type: 'fire', severity: 4, status: 'assigned', riskScore: 78, address: '742 Industrial Blvd', description: 'Warehouse fire with possible hazmat exposure', reportedAt: new Date(Date.now() - 45 * 60000).toISOString(), location: { lat: 40.7614, lng: -73.9776 } },
    { incidentId: 'INC-SEED-002', type: 'medical', severity: 3, status: 'assigned', riskScore: 52, address: '118 E 60th St', description: 'Multi-vehicle accident with injuries', reportedAt: new Date(Date.now() - 22 * 60000).toISOString(), location: { lat: 40.7648, lng: -73.9688 } },
    { incidentId: 'INC-SEED-003', type: 'hazmat', severity: 5, status: 'reported', riskScore: 91, address: '350 5th Ave', description: 'Chemical spill near residential zone', reportedAt: new Date(Date.now() - 8 * 60000).toISOString(), location: { lat: 40.7484, lng: -73.9856 } },
    { incidentId: 'INC-SEED-004', type: 'traffic', severity: 2, status: 'assigned', riskScore: 35, address: '200 Central Park S', description: 'Road blockage causing traffic backlog', reportedAt: new Date(Date.now() - 67 * 60000).toISOString(), location: { lat: 40.7659, lng: -73.9798 } },
    { incidentId: 'INC-SEED-005', type: 'rescue', severity: 4, status: 'dispatching', riskScore: 65, address: 'Hudson River Greenway', description: 'Civilian trapped on embankment', reportedAt: new Date(Date.now() - 12 * 60000).toISOString(), location: { lat: 40.7510, lng: -74.0040 } },
    { incidentId: 'INC-SEED-006', type: 'police', severity: 3, status: 'assigned', riskScore: 48, address: 'Times Square Station', description: 'Crowd control request', reportedAt: new Date(Date.now() - 5 * 60000).toISOString(), location: { lat: 40.7580, lng: -73.9855 } },
];

const SEED_RESOURCES = [
    { resourceId: 'FT-NORTH-07', type: 'fire-truck', status: 'assigned', location: { lat: 40.7620, lng: -73.9780 } },
    { resourceId: 'AMB-SOUTH-02', type: 'ambulance', status: 'available', location: { lat: 40.7550, lng: -73.9850 } },
    { resourceId: 'PD-EAST-04', type: 'police', status: 'assigned', location: { lat: 40.7650, lng: -73.9690 } },
    { resourceId: 'HZ-WEST-01', type: 'hazmat', status: 'available', location: { lat: 40.7500, lng: -73.9900 } },
    { resourceId: 'FT-SOUTH-03', type: 'fire-truck', status: 'available', location: { lat: 40.7480, lng: -73.9820 } },
    { resourceId: 'AMB-NORTH-01', type: 'ambulance', status: 'assigned', location: { lat: 40.7630, lng: -73.9760 } },
    { resourceId: 'PD-WEST-02', type: 'police', status: 'available', location: { lat: 40.7520, lng: -73.9910 } },
    { resourceId: 'RSC-EAST-01', type: 'rescue', status: 'available', location: { lat: 40.7580, lng: -73.9700 } },
];

const SEED_DASHBOARD = {
    activeIncidents: SEED_INCIDENTS,
    resourceSummary: { total: SEED_RESOURCES.length, available: SEED_RESOURCES.filter(r => r.status === 'available').length, assigned: SEED_RESOURCES.filter(r => r.status === 'assigned').length, offline: 0 },
    riskLevels: { critical: SEED_INCIDENTS.filter(i => i.riskScore >= 70).length, high: SEED_INCIDENTS.filter(i => i.riskScore >= 50 && i.riskScore < 70).length, medium: SEED_INCIDENTS.filter(i => i.riskScore >= 30 && i.riskScore < 50).length, low: SEED_INCIDENTS.filter(i => i.riskScore < 30).length },
    recentConflicts: [
        { type: 'double-assignment', description: 'FT-NORTH-07 requested by two incidents', timestamp: new Date(Date.now() - 5 * 60000).toISOString() },
        { type: 'resource-shortage', description: 'No Hazmat units available in West Zone', timestamp: new Date(Date.now() - 15 * 60000).toISOString() },
        { type: 'delay-risk', description: 'Heavy traffic delaying AMB-SOUTH-02 arrival', timestamp: new Date(Date.now() - 25 * 60000).toISOString() },
        { type: 'jurisdiction-overlap', description: 'Incident borders two police precincts', timestamp: new Date(Date.now() - 40 * 60000).toISOString() },
        { type: 'equipment-mismatch', description: 'Ladder truck needed for high-rise fire', timestamp: new Date(Date.now() - 55 * 60000).toISOString() },
    ]
};

const SEED_MAP = {
    incidents: SEED_INCIDENTS,
    resources: SEED_RESOURCES
};

const CityDashboard = () => {
    const [loading, setLoading] = useState(true);
    const [dashboardData, setDashboardData] = useState(null);
    const [mapData, setMapData] = useState(null);

    useEffect(() => {
        loadData();
        const interval = setInterval(loadData, 5000);
        return () => clearInterval(interval);
    }, []);

    const loadData = async () => {
        try {
            const [dashResponse, mapResponse] = await Promise.all([
                getLiveDashboard(),
                getMapData()
            ]);
            setDashboardData(dashResponse.data);
            setMapData(mapResponse.data);
        } catch (error) {
            console.error('Using seed data — backend not available:', error.message);
            if (!dashboardData) setDashboardData(SEED_DASHBOARD);
            if (!mapData) setMapData(SEED_MAP);
        } finally {
            setLoading(false);
        }
    };

    const handleQuickAssign = async (incidentId) => {
        try {
            await assignResources(incidentId, true);
            alert('Resources assigned successfully!');
            loadData();
        } catch (error) {
            alert('Failed to assign resources: ' + error.message);
        }
    };

    if (loading) {
        return (
            <div className="loading-container">
                <div className="spinner"></div>
                <p className="loading-text">Loading City Overview...</p>
            </div>
        );
    }

    if (!dashboardData || !mapData) {
        return (
            <div className="loading-container">
                <div className="spinner"></div>
                <p className="loading-text">Connecting to backend...</p>
            </div>
        );
    }

    const getSeverityColor = (severity) => {
        if (severity >= 4) return '#dc2626';
        if (severity === 3) return '#ea580c';
        if (severity === 2) return '#06b6d4';
        return '#16a34a';
    };

    const getRiskColor = (score) => {
        if (score >= 70) return '#dc2626';
        if (score >= 50) return '#ea580c';
        if (score >= 30) return '#06b6d4';
        return '#16a34a';
    };

    return (
        <div className="city-dashboard">
            <div className="page-header">
                <div>
                    <h1 className="page-title">City Overview</h1>
                    <p className="page-subtitle">Real-time emergency monitoring and coordination</p>
                </div>
            </div>

            {/* Stats Cards */}
            <div className="stat-cards">
                <div className="stat-card">
                    <div className="stat-label">Active Incidents</div>
                    <div className="stat-value">{dashboardData.activeIncidents.length}</div>
                    <div className="stat-trend">
                        {dashboardData.riskLevels.critical > 0 && (
                            <span className="negative">{dashboardData.riskLevels.critical} Critical</span>
                        )}
                    </div>
                </div>

                <div className="stat-card">
                    <div className="stat-label">Available Resources</div>
                    <div className="stat-value">{dashboardData.resourceSummary.available}</div>
                    <div className="stat-trend">
                        of {dashboardData.resourceSummary.total} total
                    </div>
                </div>

                <div className="stat-card">
                    <div className="stat-label">Assigned Resources</div>
                    <div className="stat-value">{dashboardData.resourceSummary.assigned}</div>
                    <div className="stat-trend">
                        {dashboardData.resourceSummary.offline} offline
                    </div>
                </div>

                <div className="stat-card">
                    <div className="stat-label">Active Conflicts</div>
                    <div className="stat-value">{dashboardData.recentConflicts.length}</div>
                    <div className="stat-trend">
                        {dashboardData.recentConflicts.length === 0 ? (
                            <span className="">No conflicts</span>
                        ) : (
                            <span className="negative">Needs attention</span>
                        )}
                    </div>
                </div>
            </div>

            {/* Main Grid */}
            <div className="dashboard-grid">
                {/* Map */}
                <div className="card">
                    <h3>City Map</h3>
                    <div className="map-container">
                        <MapContainer
                            center={[40.7580, -73.9855]}
                            zoom={13}
                            style={{ height: '500px', width: '100%' }}
                        >
                            <TileLayer
                                url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
                                attribution='© OpenStreetMap contributors'
                            />

                            {/* Incidents */}
                            {mapData.incidents.map((incident) => (
                                <React.Fragment key={incident.incidentId}>
                                    <Marker position={[incident.location.lat, incident.location.lng]}>
                                        <Popup>
                                            <div className="map-popup">
                                                <h4>{incident.type.toUpperCase()}</h4>
                                                <p><strong>Severity:</strong> {incident.severity}/5</p>
                                                <p><strong>Status:</strong> {incident.status}</p>
                                                <p><strong>Risk Score:</strong> {incident.riskScore}/100</p>
                                                <Link to={`/incident/${incident.incidentId}`} className="btn btn-primary btn-sm">
                                                    View Details
                                                </Link>
                                            </div>
                                        </Popup>
                                    </Marker>
                                    <Circle
                                        center={[incident.location.lat, incident.location.lng]}
                                        radius={200}
                                        pathOptions={{
                                            color: getSeverityColor(incident.severity),
                                            fillColor: getSeverityColor(incident.severity),
                                            fillOpacity: 0.2
                                        }}
                                    />
                                </React.Fragment>
                            ))}

                            {/* Resources - Small markers */}
                            {mapData.resources.map((resource) => (
                                <Circle
                                    key={resource.resourceId}
                                    center={[resource.location.lat, resource.location.lng]}
                                    radius={50}
                                    pathOptions={{
                                        color: resource.status === 'available' ? '#16a34a' : '#06b6d4',
                                        fillColor: resource.status === 'available' ? '#16a34a' : '#06b6d4',
                                        fillOpacity: 0.6
                                    }}
                                >
                                    <Popup>
                                        <div className="map-popup">
                                            <h4>{resource.resourceId}</h4>
                                            <p><strong>Type:</strong> {resource.type}</p>
                                            <p><strong>Status:</strong> {resource.status}</p>
                                        </div>
                                    </Popup>
                                </Circle>
                            ))}
                        </MapContainer>
                    </div>

                    <div className="map-legend">
                        <div className="legend-item">
                            <span className="legend-color" style={{ background: '#dc2626' }}></span>
                            <span>Critical (Severity 4-5)</span>
                        </div>
                        <div className="legend-item">
                            <span className="legend-color" style={{ background: '#ea580c' }}></span>
                            <span>High (Severity 3)</span>
                        </div>
                        <div className="legend-item">
                            <span className="legend-color" style={{ background: '#06b6d4' }}></span>
                            <span>Medium (Severity 2)</span>
                        </div>
                        <div className="legend-item">
                            <span className="legend-color" style={{ background: '#16a34a' }}></span>
                            <span>Low (Severity 1) / Available Resource</span>
                        </div>
                    </div>
                </div>

                {/* Incidents List */}
                <div className="card">
                    <h3>Active Incidents</h3>
                    <div className="incidents-list">
                        {dashboardData.activeIncidents.map((incident) => (
                            <div key={incident.incidentId} className="incident-card">
                                <div className="incident-header">
                                    <span className={`badge badge-${incident.severity >= 4 ? 'critical' :
                                        incident.severity === 3 ? 'high' :
                                            incident.severity === 2 ? 'medium' : 'low'
                                        }`}>
                                        {incident.type}
                                    </span>
                                    <span className="incident-time">
                                        {new Date(incident.reportedAt).toLocaleTimeString()}
                                    </span>
                                </div>

                                <div className="incident-details">
                                    {incident.address && <p className="incident-address">📍 {incident.address}</p>}
                                    <p><strong>Severity:</strong> {incident.severity}/5</p>
                                    <p><strong>Risk:</strong> {incident.riskScore}/100</p>
                                    <p><strong>Status:</strong> {incident.status}</p>
                                </div>

                                <div className="incident-actions">
                                    {incident.status === 'reported' && (
                                        <button
                                            className="btn btn-primary btn-sm"
                                            onClick={() => handleQuickAssign(incident.incidentId)}
                                        >
                                            Quick Assign
                                        </button>
                                    )}
                                    <Link
                                        to={`/incident/${incident.incidentId}`}
                                        className="btn btn-primary btn-sm view-details-btn"
                                    >
                                        <span>View Details</span>
                                        <span className="btn-icon">→</span>
                                    </Link>
                                </div>
                            </div>
                        ))}

                        {dashboardData.activeIncidents.length === 0 && (
                            <div className="empty-state">
                                <p>No active incidents</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Risk Distribution */}
            <div className="card">
                <h3>Risk Distribution</h3>
                <div className="risk-bars">
                    <div className="risk-bar-item">
                        <div className="risk-bar-label">
                            <span>Critical (70-100)</span>
                            <span>{dashboardData.riskLevels.critical}</span>
                        </div>
                        <div className="risk-bar-container">
                            <div
                                className="risk-bar risk-bar-critical"
                                style={{ width: `${(dashboardData.riskLevels.critical / Math.max(dashboardData.activeIncidents.length, 1)) * 100}%` }}
                            ></div>
                        </div>
                    </div>

                    <div className="risk-bar-item">
                        <div className="risk-bar-label">
                            <span>High (50-69)</span>
                            <span>{dashboardData.riskLevels.high}</span>
                        </div>
                        <div className="risk-bar-container">
                            <div
                                className="risk-bar risk-bar-high"
                                style={{ width: `${(dashboardData.riskLevels.high / Math.max(dashboardData.activeIncidents.length, 1)) * 100}%` }}
                            ></div>
                        </div>
                    </div>

                    <div className="risk-bar-item">
                        <div className="risk-bar-label">
                            <span>Medium (30-49)</span>
                            <span>{dashboardData.riskLevels.medium}</span>
                        </div>
                        <div className="risk-bar-container">
                            <div
                                className="risk-bar risk-bar-medium"
                                style={{ width: `${(dashboardData.riskLevels.medium / Math.max(dashboardData.activeIncidents.length, 1)) * 100}%` }}
                            ></div>
                        </div>
                    </div>

                    <div className="risk-bar-item">
                        <div className="risk-bar-label">
                            <span>Low (0-29)</span>
                            <span>{dashboardData.riskLevels.low}</span>
                        </div>
                        <div className="risk-bar-container">
                            <div
                                className="risk-bar risk-bar-low"
                                style={{ width: `${(dashboardData.riskLevels.low / Math.max(dashboardData.activeIncidents.length, 1)) * 100}%` }}
                            ></div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default CityDashboard;
