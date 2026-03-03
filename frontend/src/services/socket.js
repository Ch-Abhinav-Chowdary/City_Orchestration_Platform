import { io } from 'socket.io-client';

const SOCKET_URL = process.env.REACT_APP_SOCKET_URL || 'http://localhost:5000';

class SocketService {
    constructor() {
        this.socket = null;
        this.listeners = new Map();
    }

    connect() {
        if (!this.socket) {
            this.socket = io(SOCKET_URL, {
                transports: ['websocket', 'polling'],
                reconnection: true,
                reconnectionDelay: 1000,
                reconnectionAttempts: 5
            });

            this.socket.on('connect', () => {
                console.log('🔌 Connected to Socket.IO server');
            });

            this.socket.on('disconnect', () => {
                console.log('🔌 Disconnected from Socket.IO server');
            });

            this.socket.on('connect_error', (error) => {
                console.error('Socket connection error:', error);
            });
        }

        return this.socket;
    }

    disconnect() {
        if (this.socket) {
            this.socket.disconnect();
            this.socket = null;
            this.listeners.clear();
        }
    }

    subscribe(event, callback) {
        if (!this.socket) {
            this.connect();
        }

        this.socket.on(event, callback);
        this.listeners.set(event, callback);
    }

    unsubscribe(event) {
        if (this.socket && this.listeners.has(event)) {
            const callback = this.listeners.get(event);
            this.socket.off(event, callback);
            this.listeners.delete(event);
        }
    }

    emit(event, data) {
        if (this.socket) {
            this.socket.emit(event, data);
        }
    }

    subscribeToDashboard() {
        this.emit('subscribe:dashboard');
    }
}

export default new SocketService();
