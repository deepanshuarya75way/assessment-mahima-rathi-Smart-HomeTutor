/**
 * ==========================================
 * SOCKET.IO CLIENT SINGLETON
 * ==========================================
 * Provides a unified Socket.IO client instance for real-time signaling,
 * notifications, and WebRTC video call management across the React client.
 */

import { io } from 'socket.io-client';

let socketInstance = null;

export const getSocket = () => {
  if (typeof window === 'undefined') return null;

  if (!socketInstance) {
    // If window.socket was already instantiated or external io available
    if (window.socket && window.socket.connected) {
      socketInstance = window.socket;
      return socketInstance;
    }

    const socketUrl = window.location.origin;
    socketInstance = io(socketUrl, {
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
      autoConnect: true,
    });

    window.socket = socketInstance;
    window.io = () => socketInstance;

    socketInstance.on('connect', () => {
      console.log('🟢 [SocketClient] Connected to server, socket ID:', socketInstance.id);
    });

    socketInstance.on('disconnect', (reason) => {
      console.log('🔴 [SocketClient] Disconnected from server:', reason);
    });

    socketInstance.on('connect_error', (err) => {
      console.warn('⚠️ [SocketClient] Connection error:', err.message);
    });
  }

  return socketInstance;
};

export const socket = (typeof window !== 'undefined') ? getSocket() : null;

export default getSocket;
