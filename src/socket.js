// // socket.js
// import { io } from "socket.io-client";

// const URL = "https://pairpro-backend.onrender.com"; // Or localhost during dev

// const socket = io(URL, {
//   transports: ["websocket"],
//   autoConnect: false,
//   reconnectionAttempts: 5,
//   reconnectionDelay: 1000,
// });

// export default socket;

// socket.js
import { io } from "socket.io-client";

const socket = io("https://pairpro-backend.onrender.com", {
  transports: ["websocket"],
  autoConnect: true, // Auto connect once globally
  reconnectionAttempts: 5,
  timeout: 10000,
});

export { socket };
