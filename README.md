# City-Scale Emergency Resource Orchestration Platform

A fully-functional prototype demonstrating real-time emergency resource coordination with intelligent decision engines, conflict resolution, dynamic risk scoring, and post-incident learning.

---

## 🎯 One-Line Mission

**Build a city-scale, event-driven emergency orchestration platform that coordinates multi-department resources in real time, detects conflicts, scores risk dynamically, simulates impact, and learns from past incidents to improve future decisions.**

---

## 🏗️ System Architecture

### **Event-Driven Foundation**
All system actions are recorded as immutable events in an append-only event store, enabling:
- Full auditability and traceability
- Event replay for analysis
- Historical pattern matching
- Counterfactual analysis

### **Four-Layer Architecture**

#### **Layer 1: Event & Data Ingestion**
- **Event Collector API** - Captures all system actions
- **Event Store** - Append-only immutable log (MongoDB)
- **Resource State Registry** - Derived real-time state

#### **Layer 2: Orchestration & Decision Intelligence**
- **Resource Orchestration Engine** - Multi-criteria scoring (distance, availability, capability, priority)
- **Conflict Resolution Engine** - Detects double-assignments, capacity overflows, department collisions
- **Dynamic Risk Scoring Engine** - Real-time risk calculation updated every 15 seconds

#### **Layer 3: Simulation, Analysis & Learning**
- **3D Incident Simulation** - Rule-based visualization of spatial complexity
- **Post-Incident Intelligence** - Automated failure classification and root cause analysis
- **Recommendation Engine** - Suggests actions based on similar past incidents

#### **Layer 4: Visualization & Control**
- **City Overview Dashboard** - 2D Leaflet map with real-time incidents/resources
- **Orchestration Control Panel** - Review and override automated decisions
- **Incident Detail View** - Deep dive with risk history and AI recommendations
- **3D Simulation View** - Three.js visualization for spatial awareness
- **Intelligence Dashboard** - Historical analysis with charts and metrics

---

## 🚀 Technology Stack

### Backend
- **Runtime**: Node.js + Express.js
- **Database**: MongoDB (event sourcing + derived state)
- **Real-time**: Socket.io
- **Decision Logic**: Rule-based algorithms (transparent, deterministic)

### Frontend
- **Framework**: React 18 with React Router
- **Maps**: Leaflet (2D city view)
- **3D Rendering**: Three.js with React Three Fiber
- **Charts**: Recharts
- **Styling**: CSS with custom government/emergency theme

---

## 📦 Installation & Setup

### Prerequisites
- Node.js 18+ and npm
- MongoDB 6+ running locally or remotely

### 1. Clone & Install

```bash
# Navigate to project directory
cd emergency-platform

# Install backend dependencies
cd backend
npm install

# Install frontend dependencies
cd ../frontend
npm install
```

### 2. Configure Environment

Edit `backend/.env`:
```
PORT=5000
MONGODB_URI=mongodb://localhost:27017/emergency-orchestration
NODE_ENV=development
```

### 3. Seed Database

```bash
cd backend
npm run seed
```

This creates:
- 50 resources (ambulances, fire trucks, police, hazmat, rescue)
- 100 historical incidents (with 20 analyzed)
- 8 active incidents (demonstrations for all severity levels)

### 4. Start Backend

```bash
cd backend
npm run dev
```

Server runs on `http://localhost:5000`

### 5. Start Frontend

```bash
cd frontend
npm start
```

App opens at `http://localhost:3000`

---

## 🎮 Demo Walkthrough

### **1. City Overview Dashboard** (`/`)
- **Real-time map** showing all active incidents and available resources
- **Stats cards** displaying active incidents, resource availability, and conflicts
- **Quick-assign button** to trigger automatic resource allocation
- **Risk distribution** visualization showing incident risk levels

**Try it:**
1. View the 2D map - red circles are critical incidents, green dots are available resources
2. Click "Quick Assign" on a reported incident
3. Watch resources get automatically assigned based on proximity and availability
4. Observe real-time risk score updates (refreshes every 15 seconds)

### **2. Orchestration Panel** (`/orchestration`)
- **Conflict detection** - System identifies double-assignments and capacity issues
- **Resolution strategies** - Auto-resolve, find alternatives, or escalate
- **Manual override** capability

**Try it:**
1. Navigate to Orchestration panel
2. If conflicts exist, you'll see them with resolution options
3. Click "Auto-Resolve (Re-rank)" to let the system handle it
4. Or click "Find Alternative" to assign a different resource

### **3. Incident Detail View** (`/incident/:id`)
- **Comprehensive incident information**
- **Risk score history chart** - visualize how risk evolved over time
- **AI recommendations** - based on similar past incidents
- **Event timeline** - chronological log of all incident events
- **Assigned resources** list

**Try it:**
1. Click any incident from the main dashboard
2. View detailed information and assigned resources
3. Check AI recommendations derived from historical patterns
4. Click "View 3D Simulation" for spatial visualization

### **4. 3D Incident Simulation** (`/simulation/:id`)
- **Three.js rendered city** with simplified building blocks
- **Incident location marker** (red glowing cylinder)
- **Impact zone visualization** (semi-transparent circle)
- **Interactive controls** - rotate, pan, zoom

**Try it:**
1. From an incident detail page, click "View 3D Simulation"
2. Use mouse to rotate view (left-click + drag)
3. Zoom with scroll wheel
4. Observe spatial context - useful for high-rise fires or large-scale events

### **5. Intelligence Dashboard** (`/intelligence`)
- **Historical incident table** with filters
- **Charts**: Incidents by type, failure analysis
- **Performance metrics**: avg response time, resolution time
- **Date range filtering**

**Try it:**
1. Navigate to Intelligence Dashboard
2. Filter by date range (default: last 30 days)
3. View breakdown of historical incidents by type
4. Analyze failure distribution (detection, allocation, coordination, capacity)

---

## 🧠 Decision Engine Details

### **Resource Orchestration Algorithm**

```
For each incident:
1. Determine required resources based on type and severity
2. Find all candidates matching resource type
3. Score each candidate:
   - Distance score (40%): Closer = better
   - Availability score (30%): Available > Assigned > Offline
   - Capability match (20%): Exact match preferred
   - Department preference (10%): Same zone preferred
4. Rank by total score
5. Assign top-ranked resources
6. Check for conflicts
```

### **Conflict Detection Rules**

**Double Assignment**:
```javascript
if (resource.currentAssignment && newAssignment.incidentId !== resource.currentAssignment) {
  if (newIncident.severity > oldIncident.severity) {
    RESOLVE: Reassign to higher priority
  } else {
    RESOLVE: Find alternative resource
  }
}
```

**Department Collision**:
```
if (hazmat team + police in same 500m radius) {
  DETECT: Coordination required
  RESOLVE: Flag for manual coordination
}
```

### **Dynamic Risk Scoring**

```
riskScore = (
  (severity × 30) +              // Base severity (0-150)
  (responseDelayMinutes × 2) +   // Time pressure
  (resourceStressIndex × 20) +   // System load
  (environmentalFactors × 10)    // Weather, traffic
) / 2.1                          // Normalize to 0-100

Updated every 15 seconds for active incidents
```

---

## 📊 API Endpoints

### **Incidents**
- `POST /api/incidents` - Create new incident
- `GET /api/incidents` - List incidents with filters
- `GET /api/incidents/:id` - Get incident details
- `POST /api/incidents/:id/close` - Close and analyze incident

### **Resources**
- `GET /api/resources` - List resources with filters
- `POST /api/resources/update` - Update resource status/location

### **Orchestration**
- `POST /api/orchestration/assign` - Trigger auto-assignment
- `POST /api/orchestration/override` - Manual override
- `GET /api/orchestration/pending` - Get pending conflicts
- `POST /api/orchestration/resolve-conflict` - Resolve conflict
- `GET /api/orchestration/recommendations/:incidentId` - Get AI recommendations

### **Dashboard**
- `GET /api/dashboard/live` - Real-time dashboard data
- `GET /api/dashboard/map-data` - Simplified map data
- `GET /api/dashboard/metrics` - System metrics

### **Analysis**
- `GET /api/analysis/incidents` - Historical incidents
- `GET /api/analysis/incident/:id` - Post-incident analysis
- `GET /api/analysis/summary` - Analytics summary

---

## 🎯 Demonstration Scenarios

### **Scenario 1: Automatic Resource Assignment**
1. Open City Dashboard
2. Find an incident with status="reported"
3. Click "Quick Assign"
4. System automatically:
   - Calculates best resources
   - Assigns them to incident
   - Updates map in real-time
   - Detects any conflicts

### **Scenario 2: Conflict Resolution**
The seed data creates scenarios where two high-severity incidents compete for resources:
1. Navigate to Orchestration Panel
2. If conflicts exist, review details
3. Choose resolution strategy:
   - **Re-rank**: System prioritizes by severity
   - **Alternative**: Finds next-best resource
   - **Escalate**: Flags for manual review

### **Scenario 3: Learning from History**
1. Navigate to any active incident detail
2. Scroll to "AI Recommendations" section
3. System shows:
   - Similar past incidents (based on type, location, severity)
   - What worked in the past
   - Suggested actions with confidence scores

---

## 🔍 Key Design Decisions

### **Why Event-Driven Architecture?**
- ✓ Full auditability - every action is traceable
- ✓ Replayability - re-run scenarios with different rules
- ✓ Scalability - event sourcing enables horizontal scaling
- ✓ Learning - historical events become training data

### **Why Rule-Based Intelligence?**
- ✓ Transparency - decisions are explainable
- ✓ Deterministic - same inputs = same outputs (testable)
- ✓ No AI washing - we don't claim "AI" when it's heuristics
- ✓ Sufficient - most coordination logic is rule-expressible

### **Why MongoDB?**
- ✓ Flexible schema for varying event payloads
- ✓ Geospatial queries for distance calculations
- ✓ Document model fits incident/resource entities

### **Why Separate 3D View?**
- ✓ Performance - 2D map is faster for overview
- ✓ Complexity - 3D only useful when vertical/spatial factors matter
- ✓ User choice - operators decide when detail is needed

---

## 🏆 What Makes This Different

### ❌ **What This Is NOT**
- Not a landing page or mock UI
- Not fake AI or blockchain buzzwords
- Not a feature dump without depth
- Not using full physics simulation

### ✅ **What This IS**
- **Real data flow** - events → engines → state → UI
- **Real decision logic** - working orchestration and conflict resolution
- **Real learning** - pattern matching from historical incidents
- **System depth** - traceable decisions, replayable events
- **Operational focus** - built for system architects, not marketing

---

## 📁 Project Structure

```
emergency-platform/
├── backend/
│   ├── server.js                  # Express + Socket.io server
│   ├── config/database.js         # MongoDB connection
│   ├── models/                    # 7 Mongoose models
│   │   ├── Event.js              # Immutable event log
│   │   ├── Incident.js           # Incident state
│   │   ├── Resource.js           # Resource state
│   │   ├── Assignment.js         # Resource allocations
│   │   ├── Conflict.js           # Detected conflicts
│   │   ├── RiskScore.js          # Risk calculations
│   │   └── PostIncidentAnalysis.js
│   ├── services/                  # Decision engines
│   │   ├── eventStore.js         # Event persistence
│   │   ├── orchestrationEngine.js # Resource assignment
│   │   ├── conflictEngine.js     # Conflict detection/resolution
│   │   ├── riskEngine.js         # Dynamic risk scoring
│   │   ├── analysisEngine.js     # Post-incident analysis
│   │   └── recommendationEngine.js # AI recommendations
│   ├── routes/                    # 6 API route sets
│   └── seed/seedData.js          # Demo data generator
│
├── frontend/
│   ├── src/
│   │   ├── App.js                # Main app with routing
│   │   ├── services/
│   │   │   ├── api.js           # Axios API calls
│   │   │   └── socket.js        # Socket.io client
│   │   ├── pages/                # 5 dashboard pages
│   │   │   ├── CityDashboard.js # 2D map + stats
│   │   │   ├── OrchestrationPanel.js
│   │   │   ├── IncidentDetail.js
│   │   │   ├── Simulation3D.js   # Three.js scene
│   │   │   └── IntelligenceDashboard.js
│   │   ├── index.css             # Global styles
│   │   └── App.css               # Layout styles
│   └── public/
│
└── README.md
```

---

## 🎬 Next Steps / Extensions

1. **Counterfactual Analysis**: Implement "what-if" scenario replays
2. **Machine Learning**: Add actual ML for resource allocation (currently rule-based)
3. **Mobile App**: Build operator mobile interface
4. **Authentication**: Add role-based access control
5. **Deployment**: Containerize with Docker, deploy to cloud
6. **Advanced 3D**: Add resource movement animation, fire spread simulation
7. **Multi-Tenancy**: Support multiple cities/departments

---

## 📜 License

MIT License - Built as a demonstration prototype

---

## 👤 Author

Built by a principal full-stack systems engineer + product architect

**Contact**: For questions about architecture decisions or implementation details

---

## 🙏 Acknowledgments

- Event sourcing patterns inspired by CQRS architecture
- Rule-based decision logic drawn from emergency management best practices
- 3D visualization kept intentionally simple per system requirements

---

**Remember**: This is a working prototype with real orchestration logic, not a cosmetic demo. Every decision is traceable, every conflict is resolvable, and every incident contributes to system learning.
