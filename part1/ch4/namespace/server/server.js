import { Server } from "socket.io";

// io 서버 생성
const io = new Server("5000", {
  cors: {
    origin: "http://localhost:3000",
  },
});

// /goods 네임스페이스 및 커넥션 이벤트 생성
io.of("/goods").on("connection", (socket) => {
  console.log("goods connected");
  socket.on("shoes", (res) => {});
  socket.on("pants", (res) => {});
});

// /user 네임스페이스 및 커넥션 이벤트 생성
io.of("/user").on("connection", (socket) => {
  console.log("user connected");
  socket.on("admin", (res) => {});
});
