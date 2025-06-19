import { io } from "socket.io-client";
export const socket = io("https://pairpro-backend.onrender.com",{
  transports: ["websocket"],
  autoConnect: false, // important: connect manually
});