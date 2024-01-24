import { Server } from "socket.io";
import posts from "./data.js";

// `io` 서버 생성
const io = new Server("5000", {
  cors: {
    origin: "http://localhost:3000",
  },
});

// user 배열
let users = [];

// 새로운 유저 입력
const addNewUser = (userName, socketId) => {
  // users 안에 userName 이 없다면,
  // users 에 unshift
  !users.some((user) => user.userName === userName) &&
    users.unshift({
      // random 한 post data 선택
      ...posts[Math.floor(Math.random() * 5)],
      // 유저네임
      userName,
      // 소켓 아이디
      socketId,
    });
};

// 유저 얻기
const getUser = (userName) => {
  // userName 을 찾음
  return users.find((user) => user.userName === userName);
};

// socket.io 가 제공하는 미들웨어
// 클라이언트 사이드에서 넘어온 사용자 이름을 확인한다
io.use((socket, next) => {
  // 클라이언트 사이드의 userName 확인
  const userName = socket.handshake.auth.userName;
  // 이름이 없다면 에러
  if (!userName) {
    console.log(`err`);
    return next(new Error("invalid userName"));
  }
  // 있다면, socket.userName 에 userName 할당
  socket.userName = userName;
  // 통과
  next();
});

// connection 이벤트
io.on("connection", (socket) => {
  // 새로운 유저 입력
  addNewUser(socket.userName, socket.id);
  // userList 이벤트 생성
  socket.on("userList", () => {
    // user-list 이벤트에 메시지 전달
    console.log(users);
    io.sockets.emit("user-list", users);
  });

  // sendNotification 이벤트 생성
  // senderName: 보내는 유저 이름
  // receiverName: 받는 유저 이름
  // type: 메시지 유형
  socket.on("sendNotification", ({ senderName, receiverName, type }) => {
    // 받는 유저 검색
    const receiver = getUser(receiverName);
    // 받는 유저의 socketId 를 사용하여 getNotification 이벤트 메시지 보냄
    io.to(receiver.socketId).emit("getNotification", {
      // 보내는 유저
      senderName,
      // 메시지 유형
      type,
    });
  });

  // 연결 닫힘
  socket.on("disconnection", () => {
    console.log("logout");
  });
});
