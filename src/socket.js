// socket.js
import { io } from "socket.io-client";

let socket;

if (!socket) {
  socket = io("https://pairpro-backend.onrender.com", {
    transports: ["websocket"],
    autoConnect: true, // enable autoconnect
  });
}

export { socket };
