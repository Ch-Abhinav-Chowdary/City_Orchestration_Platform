require('dotenv').config();
const express = require('express');
const http = require('http');
const socketio = require('socket.io');
const cors = require('cors');
const connectDB = require('./config/database');
const riskEngine = require('./services/riskEngine');

// Initialize Express app
const app = express();
const server = http.createServer(app);
const io = socketio(server, {
    cors: {
        origin: '*',
        methods: ['GET', 'POST']
    }
});

// Middleware
app.use(cors());
app.use(express.json());

// Connect to MongoDB
connectDB();

// Import routes
const incidentRoutes = require('./routes/incidents');
const resourceRoutes = require('./routes/resources');
const orchestrationRoutes = require('./routes/orchestration');
const dashboardRoutes = require('./routes/dashboard');
const analysisRoutes = require('./routes/analysis');
const eventRoutes = require('./routes/events');
const counterfactualRoutes = require('./routes/counterfactual');

// Mount routes
app.use('/api/incidents', incidentRoutes);
app.use('/api/resources', resourceRoutes);
app.use('/api/orchestration', orchestrationRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/analysis', analysisRoutes);
app.use('/api/events', eventRoutes);
app.use('/api/counterfactual', counterfactualRoutes);

// Health check
app.get('/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date() });
});

// Root endpoint
app.get('/', (req, res) => {
    res.json({
        name: 'Emergency Orchestration Platform API',
        version: '1.0.0',
        endpoints: {
            incidents: '/api/incidents',
            resources: '/api/resources',
            orchestration: '/api/orchestration',
            dashboard: '/api/dashboard',
            analysis: '/api/analysis',
            events: '/api/events',
            counterfactual: '/api/counterfactual'
        }
    });
});

// Socket.io for real-time updates
io.on('connection', (socket) => {
    console.log('📱 Client connected:', socket.id);

    socket.on('disconnect', () => {
        console.log('📱 Client disconnected:', socket.id);
    });

    socket.on('subscribe:dashboard', () => {
        socket.join('dashboard');
        console.log('📊 Client subscribed to dashboard updates');
    });
});

// Make io accessible to routes (for real-time updates)
app.set('io', io);

// Start risk scoring auto-update
riskEngine.startAutoUpdate(15); // Update every 15 seconds

// Start server
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
    console.log('');
    console.log('╔══════════════════════════════════════════════════════════╗');
    console.log('║  Emergency Resource Orchestration Platform - Backend    ║');
    console.log('╚══════════════════════════════════════════════════════════╝');
    console.log('');
    console.log(`🚀 Server running on port ${PORT}`);
    console.log(`📊 Risk engine updating every 15 seconds`);
    console.log(`🌐 API endpoint: http://localhost:${PORT}`);
    console.log('');
    console.log('Available endpoints:');
    console.log('  • POST   /api/incidents           Create incident');
    console.log('  • GET    /api/incidents           List incidents');
    console.log('  • POST   /api/orchestration/assign         Auto-assign resources');
    console.log('  • POST   /api/orchestration/override       Manual override');
    console.log('  • GET    /api/dashboard/live              Live dashboard data');
    console.log('  • GET    /api/analysis/incidents          Historical analysis');
    console.log('');
    console.log('💡 Run "npm run seed" to populate demo data');
    console.log('');
});

// Graceful shutdown
process.on('SIGINT', () => {
    console.log('\n⏳ Shutting down gracefully...');
    riskEngine.stopAutoUpdate();
    server.close(() => {
        console.log('✅ Server closed');
        process.exit(0);
    });
});

module.exports = { app, io };
