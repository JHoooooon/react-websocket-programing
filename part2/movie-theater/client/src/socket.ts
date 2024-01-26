import { io } from "socket.io-client";

// reservation ticket socket 생성
export const rsv_sock = io("http://localhost:5000", {
  // 사용자가 영화예약 페이지에 접근할시 연결되도록
  // 자동 연결을 false
  autoConnect: false,
});
