import React, { useState, useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';
import './GuidePage.css';

// ─── Feature Data ───────────────────────────────────────────────────────────
const FEATURES = [
    {
        id: 'dashboard',
        title: 'City Overview',
        icon: '🗺️',
        color: '#3b82f6',
        route: '/',
        tagline: 'See everything happening in your city at a glance',
        description: 'The City Overview is your command center. It shows a live map with all active incidents, resource positions, and risk zones. You can see real-time stats, quickly assign resources, and monitor the overall emergency status of the city.',
        steps: [
            { icon: '👀', text: 'Open the dashboard to see all active incidents on the city map' },
            { icon: '📍', text: 'Click any incident marker on the map to see its details' },
            { icon: '⚡', text: 'Use "Quick Assign" to automatically deploy the best resources' },
            { icon: '📊', text: 'Monitor risk scores and system metrics in the stats panel' }
        ],
        tips: ['The map updates in real-time via WebSocket', 'Red markers = high severity, orange = medium'],
        visual: 'dashboard'
    },
    {
        id: 'orchestration',
        title: 'Orchestration Panel',
        icon: '⚙️',
        color: '#8b5cf6',
        route: '/orchestration',
        tagline: 'Control how resources are assigned to emergencies',
        description: 'When multiple incidents compete for the same resources, conflicts arise. The Orchestration Panel detects these conflicts and gives you three powerful tools to resolve them: Re-rank priorities, Find Alternative resources, or Escalate for supervisor review.',
        steps: [
            { icon: '🔍', text: 'View all active resource conflicts in the conflicts list' },
            { icon: '🔃', text: 'Click "Re-rank" to let the AI re-prioritize automatically' },
            { icon: '🔄', text: 'Click "Find Alternative" to see available replacement resources' },
            { icon: '🔺', text: 'Click "Escalate" if the conflict needs supervisor attention' }
        ],
        tips: ['The panel auto-refreshes every 8 seconds', 'Resolution history tracks all your decisions'],
        visual: 'orchestration'
    },
    {
        id: 'counterfactual',
        title: 'What-If Analysis',
        icon: '🔄',
        color: '#06b6d4',
        route: '/counterfactual',
        tagline: 'Explore "what if" scenarios to improve response strategies',
        description: 'Ever wondered "What if we had responded 5 minutes faster?" or "What if we deployed different resources?" The What-If Analysis lets you simulate alternative scenarios for past incidents and compare outcomes to find the best strategy.',
        steps: [
            { icon: '📋', text: 'Select a past incident to analyze' },
            { icon: '🔧', text: 'Modify parameters like response time, resource count, or strategy' },
            { icon: '▶️', text: 'Run the simulation to see projected outcomes' },
            { icon: '📊', text: 'Compare multiple scenarios side by side' }
        ],
        tips: ['Save scenarios to revisit them later', 'Compare at least 2 scenarios for meaningful insights'],
        visual: 'whatif'
    },
    {
        id: 'intelligence',
        title: 'Intelligence Dashboard',
        icon: '📊',
        color: '#16a34a',
        route: '/intelligence',
        tagline: 'Analyze historical data and spot patterns',
        description: 'The Intelligence Dashboard provides deep analytics on past incidents. View trends by type, severity distribution, and use filters to drill into specific time periods. This data helps you identify patterns and improve future emergency responses.',
        steps: [
            { icon: '📅', text: 'Use date filters to select a time range for analysis' },
            { icon: '📈', text: 'Review incident-by-type bar charts for patterns' },
            { icon: '🥧', text: 'Check the severity pie chart for risk distribution' },
            { icon: '🔎', text: 'Click any incident for detailed post-incident analysis' }
        ],
        tips: ['Filter by date range to compare periods', 'Hover on chart segments for exact numbers'],
        visual: 'intelligence'
    },
    {
        id: 'training',
        title: 'Model Training Data',
        icon: '🧠',
        color: '#f59e0b',
        route: '/training-data',
        tagline: 'See what data feeds the AI decision engine',
        description: 'This page shows you exactly what data the AI models are trained on. It displays coverage across six data sources — incidents, analyses, events, assignments, resources, and conflicts — with visualizations showing data quality and completeness.',
        steps: [
            { icon: '🔢', text: 'Check the hero stats for total data volume' },
            { icon: '📊', text: 'Review coverage bars — higher is better' },
            { icon: '🃏', text: 'Click data source cards for detailed breakdowns' },
            { icon: '📈', text: 'Use the charts to spot gaps in training data' }
        ],
        tips: ['Green coverage bars = strong AI performance area', 'Low data areas may need manual data collection'],
        visual: 'training'
    },
    {
        id: 'resources',
        title: 'Resource Management',
        icon: '🚒',
        color: '#ea580c',
        route: '/resources',
        tagline: 'Monitor and manage your entire emergency fleet',
        description: 'The Resource Management page gives you a complete view of every vehicle in your fleet — fire trucks, ambulances, police cars, hazmat units, and rescue teams. Filter by type, zone, or status. Switch between grid and table views. Click any resource to see its full details, location, and assignment history.',
        steps: [
            { icon: '🔍', text: 'Use the search bar and filters to find specific resources' },
            { icon: '🔄', text: 'Toggle between Grid view and Table view for different perspectives' },
            { icon: '📋', text: 'Click any resource card to open its detail panel' },
            { icon: '✏️', text: 'Change a resource\'s status directly from the detail panel' }
        ],
        tips: ['Use zone filters to see resources near a specific area', 'Table view is better for scanning many resources quickly'],
        visual: 'resources'
    },
    {
        id: 'simulation',
        title: '3D Simulation',
        icon: '🏙️',
        color: '#dc2626',
        route: null,
        tagline: 'Watch incidents unfold in a realistic 3D city environment',
        description: 'Each incident has a 3D simulation that shows the emergency response in a virtual city. Watch fire trucks, ambulances, and police units respond in real-time. See fire spread, event markers pop up, and the full timeline of the response unfold.',
        steps: [
            { icon: '📋', text: 'Go to any incident detail page and click "3D Simulation"' },
            { icon: '▶️', text: 'Press Play to start the simulation timeline' },
            { icon: '🎮', text: 'Drag to rotate the camera, scroll to zoom in/out' },
            { icon: '👁️', text: 'Toggle vehicles, fire spread, and event markers on/off' }
        ],
        tips: ['Use 2× or 4× speed to watch faster', 'Click events in the Event Log to jump to that time'],
        visual: 'simulation'
    }
];

// ─── Interactive Demo Illustration ──────────────────────────────────────────
function FeatureVisual({ type, isActive }) {
    const visuals = {
        dashboard: (
            <div className="visual-demo">
                <div className="demo-map">
                    <div className="demo-map-grid">
                        {[...Array(12)].map((_, i) => <div key={i} className="grid-cell" />)}
                    </div>
                    <div className={`demo-marker m1 ${isActive ? 'animate' : ''}`} style={{ '--delay': '0s' }}>🔴</div>
                    <div className={`demo-marker m2 ${isActive ? 'animate' : ''}`} style={{ '--delay': '0.3s' }}>🟠</div>
                    <div className={`demo-marker m3 ${isActive ? 'animate' : ''}`} style={{ '--delay': '0.6s' }}>🔵</div>
                    <div className={`demo-truck ${isActive ? 'animate' : ''}`}>🚒</div>
                </div>
                <div className="demo-sidebar">
                    <div className={`demo-stat ${isActive ? 'animate' : ''}`} style={{ '--delay': '0.2s' }}>
                        <span className="ds-val">3</span><span className="ds-lbl">Active</span>
                    </div>
                    <div className={`demo-stat ${isActive ? 'animate' : ''}`} style={{ '--delay': '0.5s' }}>
                        <span className="ds-val">12</span><span className="ds-lbl">Resources</span>
                    </div>
                    <div className={`demo-stat ${isActive ? 'animate' : ''}`} style={{ '--delay': '0.8s' }}>
                        <span className="ds-val">78</span><span className="ds-lbl">Risk Score</span>
                    </div>
                </div>
            </div>
        ),
        orchestration: (
            <div className="visual-demo">
                <div className="demo-conflict">
                    <div className={`demo-conflict-card ${isActive ? 'animate' : ''}`} style={{ '--delay': '0s' }}>
                        <span className="dcc-type">⚡ Double Assignment</span>
                        <span className="dcc-sev">●●●●○</span>
                    </div>
                    <div className={`demo-actions ${isActive ? 'animate' : ''}`} style={{ '--delay': '0.5s' }}>
                        <span className="da-btn rerank">🔃 Re-rank</span>
                        <span className="da-btn alt">🔄 Alternative</span>
                        <span className="da-btn esc">🔺 Escalate</span>
                    </div>
                    <div className={`demo-result ${isActive ? 'animate' : ''}`} style={{ '--delay': '1s' }}>
                        ✅ Resolved — Alternative found
                    </div>
                </div>
            </div>
        ),
        whatif: (
            <div className="visual-demo">
                <div className="demo-whatif">
                    <div className={`demo-scenario sc-a ${isActive ? 'animate' : ''}`} style={{ '--delay': '0s' }}>
                        <span className="sc-label">Scenario A</span>
                        <div className="sc-bar" style={{ '--width': '65%', '--color': '#f59e0b' }} />
                        <span className="sc-value">65% success</span>
                    </div>
                    <div className={`demo-scenario sc-b ${isActive ? 'animate' : ''}`} style={{ '--delay': '0.4s' }}>
                        <span className="sc-label">Scenario B</span>
                        <div className="sc-bar" style={{ '--width': '88%', '--color': '#16a34a' }} />
                        <span className="sc-value">88% success</span>
                    </div>
                    <div className={`demo-winner ${isActive ? 'animate' : ''}`} style={{ '--delay': '0.9s' }}>
                        🏆 Scenario B wins
                    </div>
                </div>
            </div>
        ),
        intelligence: (
            <div className="visual-demo">
                <div className="demo-charts">
                    <div className="demo-bars">
                        {[70, 45, 85, 55, 30].map((h, i) => (
                            <div
                                key={i}
                                className={`demo-bar ${isActive ? 'animate' : ''}`}
                                style={{ '--height': `${h}%`, '--delay': `${i * 0.15}s`, '--color': ['#dc2626', '#f59e0b', '#3b82f6', '#16a34a', '#8b5cf6'][i] }}
                            />
                        ))}
                    </div>
                    <div className={`demo-pie ${isActive ? 'animate' : ''}`}>
                        <div className="pie-slice s1" />
                        <div className="pie-slice s2" />
                        <div className="pie-slice s3" />
                    </div>
                </div>
            </div>
        ),
        training: (
            <div className="visual-demo">
                <div className="demo-training">
                    {['Incidents', 'Analyses', 'Events', 'Assignments'].map((label, i) => (
                        <div key={label} className={`demo-coverage ${isActive ? 'animate' : ''}`} style={{ '--delay': `${i * 0.2}s` }}>
                            <span className="dc-label">{label}</span>
                            <div className="dc-track">
                                <div className="dc-fill" style={{ '--width': `${[92, 78, 95, 60][i]}%` }} />
                            </div>
                            <span className="dc-pct">{[92, 78, 95, 60][i]}%</span>
                        </div>
                    ))}
                </div>
            </div>
        ),
        resources: (
            <div className="visual-demo">
                <div className="demo-resources">
                    {[
                        { icon: '🚒', id: 'FT-N-07', status: 'assigned', zone: 'North' },
                        { icon: '🚑', id: 'AMB-S-02', status: 'available', zone: 'South' },
                        { icon: '🚔', id: 'PD-E-04', status: 'available', zone: 'East' },
                        { icon: '☣️', id: 'HZ-W-01', status: 'offline', zone: 'West' }
                    ].map((r, i) => (
                        <div key={r.id} className={`demo-resource-card ${isActive ? 'animate' : ''}`} style={{ '--delay': `${i * 0.15}s` }}>
                            <span className="drc-icon">{r.icon}</span>
                            <span className="drc-id">{r.id}</span>
                            <span className={`drc-status drc-${r.status}`}>●</span>
                        </div>
                    ))}
                </div>
            </div>
        ),
        simulation: (
            <div className="visual-demo">
                <div className="demo-sim">
                    <div className={`demo-city ${isActive ? 'animate' : ''}`}>
                        <div className="demo-building b1" />
                        <div className="demo-building b2" />
                        <div className="demo-building b3" />
                        <div className={`demo-fire ${isActive ? 'animate' : ''}`}>🔥</div>
                        <div className={`demo-vehicle v1 ${isActive ? 'animate' : ''}`} style={{ '--delay': '0.3s' }}>🚒</div>
                        <div className={`demo-vehicle v2 ${isActive ? 'animate' : ''}`} style={{ '--delay': '0.6s' }}>🚑</div>
                    </div>
                    <div className={`demo-timeline ${isActive ? 'animate' : ''}`}>
                        <div className="dtl-track">
                            <div className="dtl-progress" />
                            <div className="dtl-dot d1" />
                            <div className="dtl-dot d2" />
                            <div className="dtl-dot d3" />
                        </div>
                    </div>
                </div>
            </div>
        )
    };

    return visuals[type] || null;
}

// ─── Step Card Component ────────────────────────────────────────────────────
function StepCard({ step, index, isActive }) {
    return (
        <div className={`step-card ${isActive ? 'active' : ''}`} style={{ '--step-delay': `${index * 0.1}s` }}>
            <div className="step-number">{index + 1}</div>
            <div className="step-icon">{step.icon}</div>
            <p className="step-text">{step.text}</p>
        </div>
    );
}

// ─── Feature Section Component ──────────────────────────────────────────────
function FeatureSection({ feature, index, isExpanded, onToggle }) {
    const sectionRef = useRef(null);
    const [isVisible, setIsVisible] = useState(false);

    useEffect(() => {
        const observer = new IntersectionObserver(
            ([entry]) => {
                if (entry.isIntersecting) {
                    setIsVisible(true);
                }
            },
            { threshold: 0.2 }
        );

        if (sectionRef.current) {
            observer.observe(sectionRef.current);
        }

        return () => observer.disconnect();
    }, []);

    return (
        <div
            ref={sectionRef}
            className={`feature-section ${isVisible ? 'visible' : ''} ${isExpanded ? 'expanded' : ''}`}
            style={{ '--accent': feature.color, '--index': index }}
        >
            <div className="feature-header" onClick={onToggle}>
                <div className="feature-icon-wrap" style={{ background: `${feature.color}15`, borderColor: `${feature.color}30` }}>
                    <span className="feature-icon">{feature.icon}</span>
                </div>
                <div className="feature-title-area">
                    <h3 className="feature-title">{feature.title}</h3>
                    <p className="feature-tagline">{feature.tagline}</p>
                </div>
                <div className="feature-expand-btn">
                    <span className={`expand-arrow ${isExpanded ? 'rotated' : ''}`}>▼</span>
                </div>
            </div>

            {isExpanded && (
                <div className="feature-body">
                    <div className="feature-content-grid">
                        <div className="feature-info">
                            <p className="feature-description">{feature.description}</p>

                            <div className="steps-section">
                                <h4 className="steps-heading">📝 How to Use</h4>
                                <div className="steps-grid">
                                    {feature.steps.map((step, i) => (
                                        <StepCard key={i} step={step} index={i} isActive={isVisible} />
                                    ))}
                                </div>
                            </div>

                            {feature.tips && (
                                <div className="tips-section">
                                    <h4 className="tips-heading">💡 Pro Tips</h4>
                                    <ul className="tips-list">
                                        {feature.tips.map((tip, i) => (
                                            <li key={i} className="tip-item">{tip}</li>
                                        ))}
                                    </ul>
                                </div>
                            )}

                            {feature.route && (
                                <Link to={feature.route} className="feature-cta" style={{ background: feature.color }}>
                                    Open {feature.title} →
                                </Link>
                            )}
                        </div>

                        <div className="feature-visual-area">
                            <FeatureVisual type={feature.visual} isActive={isVisible && isExpanded} />
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

// ─── Quick Navigation ───────────────────────────────────────────────────────
function QuickNav({ features, activeId, onNavigate }) {
    return (
        <div className="quick-nav">
            {features.map((f) => (
                <button
                    key={f.id}
                    className={`qn-btn ${activeId === f.id ? 'active' : ''}`}
                    onClick={() => onNavigate(f.id)}
                    style={{ '--accent': f.color }}
                >
                    <span className="qn-icon">{f.icon}</span>
                    <span className="qn-label">{f.title}</span>
                </button>
            ))}
        </div>
    );
}

// ─── Main Guide Page ────────────────────────────────────────────────────────
const GuidePage = () => {
    const [expandedId, setExpandedId] = useState(FEATURES[0].id);

    const handleToggle = (id) => {
        setExpandedId(prev => prev === id ? null : id);
    };

    const handleNavigate = (id) => {
        setExpandedId(id);
        const el = document.getElementById(`feature-${id}`);
        if (el) {
            el.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
    };

    return (
        <div className="guide-page fade-in">
            {/* Hero */}
            <div className="guide-hero">
                <div className="hero-glow" />
                <div className="hero-content">
                    <span className="hero-badge">📖 Interactive Guide</span>
                    <h1 className="hero-title">
                        Welcome to <span className="hero-highlight">Emergency Orchestration</span>
                    </h1>
                    <p className="hero-subtitle">
                        Learn how every feature works — click any section below to explore step-by-step instructions, interactive demos, and pro tips.
                    </p>
                    <div className="hero-stats">
                        <div className="hero-stat">
                            <span className="hs-value">{FEATURES.length}</span>
                            <span className="hs-label">Features</span>
                        </div>
                        <div className="hero-stat">
                            <span className="hs-value">{FEATURES.reduce((s, f) => s + f.steps.length, 0)}</span>
                            <span className="hs-label">Steps</span>
                        </div>
                        <div className="hero-stat">
                            <span className="hs-value">∞</span>
                            <span className="hs-label">Possibilities</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Quick Navigation */}
            <QuickNav features={FEATURES} activeId={expandedId} onNavigate={handleNavigate} />

            {/* Feature Sections */}
            <div className="features-container">
                {FEATURES.map((feature, i) => (
                    <div key={feature.id} id={`feature-${feature.id}`}>
                        <FeatureSection
                            feature={feature}
                            index={i}
                            isExpanded={expandedId === feature.id}
                            onToggle={() => handleToggle(feature.id)}
                        />
                    </div>
                ))}
            </div>

            {/* Need Help? */}
            <div className="guide-footer-card">
                <div className="footer-icon">🎯</div>
                <h3>Ready to Start?</h3>
                <p>Head to the <Link to="/">City Overview</Link> to see the live dashboard, or explore any feature from the sidebar navigation.</p>
            </div>
        </div>
    );
};

export default GuidePage;
