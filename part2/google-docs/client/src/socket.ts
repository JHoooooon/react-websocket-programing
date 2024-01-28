import { io } from "socket.io-client";

export const docsSocket = io("http://localhost:5000");
