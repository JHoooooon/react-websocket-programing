import { Server } from "socket.io";
import dotenv from "dotenv";
import common from "./common";
import privateMsg from "./privateMsg";
// db 연결및 query 를 하는 Repository 인스턴스
import repository from "./repository/repository";

// config 설정
dotenv.config();

// DB 설정을 위한 설정
const dbConfig = {
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  connectionLimit: 5,
};

// repository.connection  실행
await repository.connection(dbConfig);

// io 서버 생성
const io = new Server(5000, {
  cors: {
    origin: "http://localhost:3000",
  },
});

// --- io 서버를 받아 각 로직을 실행 ---

// 공통적인 로직
// 사용자 등록과 기존에 등록된 사용자 리스트를 클라이언트로 전송
common(io);
// room 을 만들어 그룹채팅하는 로직
groupMsg(io);
// 1:1 채팅하는 로직
privateMsg(io);
