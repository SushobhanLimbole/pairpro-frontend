import socket from '../socket';

export function connectSocketIfNeeded(roomId) {
  if (!socket.connected) {
    console.log('[SOCKET] Connecting...');
    socket.connect();
  }

  socket.emit("join-room", { roomId });
}