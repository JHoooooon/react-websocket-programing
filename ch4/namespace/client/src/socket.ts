import { io } from "socket.io-client";

// goods 네임스페이스 socket 생성
export const socketGoods = io(`http://localhost:5000/goods`, {
  // autoConnect: false 시
  // 컴포넌트 마운트될때 마다 자동으로 소켓이 연결되지 않고,
  // 수동으로 socket.connect() 함수를 이용해서 연결해야 한다
  autoConnect: false,
});

// user 네임스페이스 socket 생성
export const socketUser = io(`http://localhost:5000/user`, {
  // autoConnect: false 시
  // 컴포넌트 마운트될때 마다 자동으로 소켓이 연결되지 않고,
  // 수동으로 socket.connect() 함수를 이용해서 연결해야 한다
  autoConnect: false,
});
