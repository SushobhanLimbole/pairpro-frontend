import { io } from "socket.io-client";
export const socket = io("https://pairpro-backend-czfq.onrender.com", {
  transports: ["websocket"],
  autoConnect: false, // important: connect manually
});