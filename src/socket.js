import { io } from "socket.io-client";
export const socket = io("https://pairpro-backend-fd0j.onrender.com", {
  transports: ["websocket"],
  autoConnect: false, // important: connect manually
});