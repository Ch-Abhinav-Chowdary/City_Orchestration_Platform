import React, { useEffect, useState } from 'react';
import { BrowserRouter as Router, Routes, Route, NavLink } from 'react-router-dom';
import CityDashboard from './pages/CityDashboard';
import OrchestrationPanel from './pages/OrchestrationPanel';
import IncidentDetail from './pages/IncidentDetail';
import Simulation3D from './pages/Simulation3D';
import IntelligenceDashboard from './pages/IntelligenceDashboard';
import CounterfactualAnalysis from './pages/CounterfactualAnalysis';
import ModelTrainingData from './pages/ModelTrainingData';
import GuidePage from './pages/GuidePage';
import ResourceManagement from './pages/ResourceManagement';
import socketService from './services/socket';
import './App.css';

function App() {
    const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

    useEffect(() => {
        // Connect to Socket.io on app mount
        socketService.connect();
        socketService.subscribeToDashboard();

        return () => {
            socketService.disconnect();
        };
    }, []);

    const toggleSidebar = () => {
        setSidebarCollapsed(!sidebarCollapsed);
    };

    return (
        <Router>
            <div className="app">
                <nav className={`sidebar ${sidebarCollapsed ? 'collapsed' : ''}`}>
                    <button className="sidebar-toggle" onClick={toggleSidebar} title={sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}>
                        <span className="toggle-icon">{sidebarCollapsed ? '☰' : '✕'}</span>
                    </button>

                    <div className="sidebar-header">
                        <h2>{sidebarCollapsed ? 'EO' : <>Emergency<br />Orchestration</>}</h2>
                        <div className="status-indicator">
                            <span className="status-dot status-active"></span>
                            {!sidebarCollapsed && <span>SYSTEM ACTIVE</span>}
                        </div>
                    </div>

                    <div className="nav-links">
                        <NavLink to="/guide" className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'} title="Guide">
                            <span className="nav-icon">📖</span>
                            {!sidebarCollapsed && <span>Guide</span>}
                        </NavLink>

                        <NavLink to="/" className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'} title="City Overview">
                            <span className="nav-icon">🗺️</span>
                            {!sidebarCollapsed && <span>City Overview</span>}
                        </NavLink>

                        <NavLink to="/orchestration" className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'} title="Orchestration">
                            <span className="nav-icon">⚙️</span>
                            {!sidebarCollapsed && <span>Orchestration</span>}
                        </NavLink>

                        <NavLink to="/resources" className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'} title="Resource Management">
                            <span className="nav-icon">🚒</span>
                            {!sidebarCollapsed && <span>Resources</span>}
                        </NavLink>

                        <NavLink to="/counterfactual" className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'} title="What-If Analysis">
                            <span className="nav-icon">🔄</span>
                            {!sidebarCollapsed && <span>What-If Analysis</span>}
                        </NavLink>

                        <NavLink to="/intelligence" className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'} title="Intelligence">
                            <span className="nav-icon">📊</span>
                            {!sidebarCollapsed && <span>Intelligence</span>}
                        </NavLink>

                        <NavLink to="/training-data" className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'} title="Model Training Data">
                            <span className="nav-icon">🧠</span>
                            {!sidebarCollapsed && <span>Training Data</span>}
                        </NavLink>
                    </div>

                    {!sidebarCollapsed && (
                        <div className="sidebar-footer">
                            <div className="version-info">
                                Version 1.0.0<br />
                                Build: Production
                            </div>
                        </div>
                    )}
                </nav>

                <main className={`main-content ${sidebarCollapsed ? 'sidebar-collapsed' : ''}`}>
                    <Routes>
                        <Route path="/" element={<CityDashboard />} />
                        <Route path="/orchestration" element={<OrchestrationPanel />} />
                        <Route path="/incident/:id" element={<IncidentDetail />} />
                        <Route path="/simulation/:id" element={<Simulation3D />} />
                        <Route path="/counterfactual" element={<CounterfactualAnalysis />} />
                        <Route path="/intelligence" element={<IntelligenceDashboard />} />
                        <Route path="/training-data" element={<ModelTrainingData />} />
                        <Route path="/resources" element={<ResourceManagement />} />
                        <Route path="/guide" element={<GuidePage />} />
                    </Routes>
                </main>
            </div>
        </Router>
    );
}

export default App;

