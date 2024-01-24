import { io } from "socket.io-client";

// socket 생성
export const socket = io("http://localhost:5000", {
  // 자동 연결 하지 않음
  autoConnect: false,
});
