# slack 클론

슬랙클론을 위해 `docker-compose` 를 사용하여 구현한다.
이후 `server` 를 만들고 `server.js` 를 만든다

`slack/server/server.js`

```ts
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
```

이렇게 만든이후, 사용할 `table` 쿼리문을 생성한다

`./server/schema/common.js`

```ts
export const Users = `CREATE TABLE IF NOT EXISTS Users (
      id CHAR(36), // primary key
      userId CHAR(36), // 유저 아이디
      socketId CHAR(255), // socket 아이디
      status BOOLEAN, // 접송 상태
      constraint Pk_User PRIMARY KEY (id) // 제약조건 생성
    ) `;
```

`./server/schema/private.js`

```ts
export const Msgs = `CREATE TABLE IF NOT EXISTS Msgs (
  roomNumber: VARCHAR(), // room 이름
  msg: VARCHAR(), // 메시지
  toUserId: CHAR(36), // 보낼 userId
  fromUserId: CHAR(36) // 보낸 userId
  time: DATETIME, // 시간
)`;

export const Rooms = `CREATE TABLE IF NOT EXISTS Rooms (
  id: VARCHAR() // 룸 아이디
)`;
```

`./server/router/common.js`

```ts

import { query } from "../repository/repository";
import { Users } from "../schema/common";

const common = (io) => {
  io.use(async (socket, next) => {
    // handshake.auth 에서 userId 구조분해할당
    const { userId } = socket.handshake.auth;
    // userId 가 없다면 에러
    if (!userId) {
      console.log("err");
      return next(new Error(`invalid userId`));
    }

    // Users 테이블이 없다면 생성
    await query(Users);

    // userId 에 맞는 user 있는지 쿼리
    const res = await query(`SELECT * FROM Users WHERE id = ?`, [userId]);

    // res 객체가 배열이므로, length 가 0 이면
    // 새로운 유저 생성
    if (res.length === 0) {
      // insert into 를 사용하여 user 생성하는 쿼리
      await query(`INSERT INTO Users VALUES (?, ?, ?, ?)`, [
        userId, // id
        userId, // userId
        socket.id, // socketId
        true, // status
      ]);
    }
    // res 는 배열이므로, 쿼리된 결과에서 0 번째 user 를 찾음
    // 찾은 유저인 res[0].status 값이 false 일때,
    if (res[0].status === false) {
      // state 를 true 로 update 하는 쿼리
      await query(`UPDATE Users SET status = ? WHERE id = ?`, [
        true,
        res[0].id,
      ]);
    }
    // socket.userId 의 값으로 userId 할당
    socket.userId = userId;
    // 미들웨어이므로 next() 호출
    next();
  });

  // io 커넥션
  io.on("connection", async (socket) => {
    // user 의 리스트 쿼리
    const userList = await query(`select * from Users`);
    // user 의 리스트를 user-list 이벤트로 emit
    io.sockets.emit("user-list", userList);

    // socket 커넥션 종료 이벤트 생성
    socket.on("disconnect", async () => {
      // state 값을 flase 로 하는 query
      await query(`UPDATE Users u SET status = ? WHERE u.userId = ?`, [
        false,
        socket.userId,
      ]);
      // user 의 리스트 쿼리
      const userList = await query(`select * from Users`);
      // user-list 이벤트에 변경된 user 리스트 emit
      io.sockets.emit("user-list", userList);
      // disconnect 를 로그 출력
      console.log(`disconnect...`);
    });
  });
};

export default common;

```

`./server/router/privateMsg.js`

```ts

import { query } from "../repository/repository";
import { PrivateMsgs, Rooms } from "../schema/private";

const getRoomNumber = async (fromId, toId) => {
  // 책에서 다음과 같이 설명한다.
  // a 유저가 b 유저로 private을 생성할수 있고
  // b 유저가 a 유저로 생성할 수 도 있다.
  // 그러므로 둘중 하나의 경우의 수를 사용하여 결과값을 리턴한다
  const fromIdRoom = await query(`SELECT * FROM Rooms WHERE id = ?`, [
    `${fromId}-${toId}`,
  ]);
  if (fromIdRoom.length !== 0) {
    return fromIdRoom[0];
  } else {
    const toIdRoom = await query(`SELECT * FROM Rooms WHERE id = ?`, [
      `${toId}-${fromId}`,
    ]);
    return toIdRoom[0];
  }
};

const privateMsg = (io) => {
  // /private 네임스페이스에서 사용할 middleware
  io.of("/private").use(async (socket, next) => {
    // handshake 의 userId 구조분해할당
    const { userId } = socket.handshake;
    // Msgs 테이블 생성
    await query(PrivateMsgs);
    // Roons 테이블 생성
    await query(Rooms);

    // userId 없다면 error
    if (!userId) {
      console.log("err");
      return next(new Error("invalid userId"));
    }
    // socket.userId 에 userId 할당
    socket.userId = userId;
    // 다음으로 넘김
    next();
  });

  io.of("/private").on("connection", (socket) => {
    // message 초기화
    // 과거 채팅 이력을 가져오는 역할을 한다
    socket.on("msgInit", async (res) => {
      // res 에서 targetId 구조분해할당
      // res 는 client 의 context api 의 state 에서
      // currentChat.targetId 배열이다.
      const { targetId } = res;
      // targetId 에서 userId 를 가져온다
      // targetId 의 배열에서 첫번째 userId 는 toUserId 일것이다.
      const userId = targetId[0];
      // getRoomNumber 를 사용하여 roomNumber 를 가져온다.
      const privateRoom = await getRoomNumber(userId, socket.userId);

      // privateRoom 이 없다면 빈 return
      if (!privateRoom) return;

      // 메시지 리스트를 쿼리
      const msgList = await query(`SELECT * FROM PrivateMsgs WHERE roomNumber = ?`, [
        privateRoom.id,
      ]);

      // '/private' 네임스페이스의
      // privateRoom.id 룸에서
      // private-msg-init 메시지 emit
      io.of("/private")
        .to(privateRoom.id)
        .emit("private-msg-init", { msg: msgList });
    });

    // privateMsg 이벤트 생성
    // 메시지 전송하는 이벤트
    socket.on("privateMsg", async (res) => {
      // msg: 메시지
      // toUsreId: 보낼 user id
      // time: 시간
      const { msg, toUserId, time } = res;
      // privateRoom 을 가져온다
      const privateRoom = await getRoomNumber(toUserId, socket.userId);
      // privateRoom 이 없다면 return
      if (!privateRoom) return;
      // privateRoom.id 방에서 자신을 제외한 나머지 유저에게 emit
      // 1:1 방이니 해당 하는 user 한사람에게 보낸다
      socket.broadcast.in(privateRoom.id).emit("private-msg", {
        msg,
        toUserId,
        fromUserId: socket.id,
        time,
      });
      // 새로운 메시지 생성
      await query(`INSERT INTO PrivateMsgs values (?, ?, ?, ?)`, [
        privateRoom,
        msg,
        toUserId,
        time,
      ]);
    });

    // 상대방에게 방에 들어오라는 요청
    socket.on("reqJoinRoom", async (res) => {
      // targetId 와 targetSocketId 를 가져온다
      const { targetId, targetSocketId } = res;
      // privateRoom 을 가져온다
      let privateRoom = await getRoomNumber(targetId, socket.userId);
      // privateRoom 이 없다면
      if (!privateRoom) {
        // privateRoom 의 id 를 생성한다
        privateRoom = `${targetId}-${socket.userId}`;
        // Rooms 에 id 를 insert query
        await query(`insert into Rooms values (?)`, [privateRoom]);
      } else {
        // 만약 있다면, privateRoom.id 를 할당
        privateRoom = privateRoom.id;
      }
      // socket room join
      socket.join(privateRoom);
      // targetSocketId 에게 msg-alert 이벤트 emit
      // roomNumber 를 전달한다
      io.of("/private")
        .to(targetSocketId)
        .emit("msg-alert", { roomNumber: privateRoom });
    });
  });

  // 방에 대한 요청 응답
  // 응답을 하면 해당 방으로 join 된다
  socket.on(`resJoinRoom`, (res) => {
    socket.join(res);
  });
};


```

`./server/router/groupMsg.js`

```ts

import { query } from "../repository/repository";
import { GroupMsgs, GroupRooms, GroupUserList } from "../schema/group";

const groupMsg = (io) => {
  // group 미들웨어 생성
  io.of("/group").use(async (socket, next) => {
    // 테이블 생성로직
    await query(GroupUserList);
    await query(GroupMsgs);
    await query(GroupRooms);

    // userId 구조분해 할당
    const { userId } = socket.handshake.auth;

    // userId 가 없다면 error
    if (!userId) {
      console.log("err");
      return next(new Error("invalid userId"));
    }

    // socket.userId 에 userId 할당
    socket.userId = userId;

    // userId 를 가지고 있는지 query
    const user = await query(
      `select * from GroupUserList where userId = ?`,
      [userId]
    );

    // user 를 배열로 받아서 해당 userId 가 있는지 확인하기
    // 위해 첫번째 요소 선택
    // user[0] 가 있다면 user[0] 에 socketId 업데이트
    if (user[0]) {
      await query(`UPDATE GroupUserList SET socketId = ? WHERE userId = ?`, [
        socket.id,
        userId,
      ]);
    } else {
      // user[0] 이 존재하지 않다면 새로운 유저 생성
      await query(`INSERT INTO GroupUserList VALUES (?, ?, ?)`, [
        userId,
        socket.id,
        true,
      ]);
    }
  });

  io.of("/group").on("connection", async (socket) => {
    // 처음 로그인한 유저가 해당 방을 소유한다
    // loginUserId 를 사용하여 groupRoom 을 쿼리
    const groupRoom = await query(
      `SELECT * FROM GroupRooms WHERE loginUserId = ?`,
      [socket.userId]
    );

    // group-list 이벤트 emit
    socket.emit(`group-list`, groupRoom);

    // message 초기화
    // message 이전 목록을 가져와 client 로 전송
    socket.on("msgInit", async (res) => {
      // targetId 를 구조분해 할당
      const { targetId } = res;
      let roomName = null;
      // targetId 배열을 ',' 으로 join
      // 이는 해당 채팅사용자들의 이름을 ',' 으로 연결한 문자열이다.
      // 이 문자열은 room 의 이름으로 사용된다
      roomName = targetId.join(",");
      // roomName 인 메시지 목록 쿼리
      const groupMsg = await query(
        `SELECT * FROM GroupMsgs WHERE roomNumber = ?`,
        [roomName]
      );

      // group 네임스페이스의 roomName 으로
      // group-msg-init 이벤트 emit
      // 이 이벤트는 모든 메시지 목록을 가진다.
      // 없으면 빈배열
      io.of("group")
        .to(roomName)
        .emit("group-msg-init", { msg: groupMsg || [] });
    });

    // reqGroupJoinRoom 이벤트 생성
    socket.on("reqGroupJoinRoom", async (res) => {
      // socketId 구조분해할당
      const { socketId } = res;
      // gruopUserList 테이블에서 socketId 메 포함된 모든 유저 쿼리
      // 내 개인적인 생각이지만, 책이 않읽힌다.
      // 뭔가 변수명이 헷갈린다.
      //
      //  const socketId = [...groupChatUsers, loginInfo.userId].join(",");
      // 왜 굳이 이렇게 하지? 명칭을 socketId 로 한 이유가 있나?
      // 
      // 게다가 userId 가 socketId 로 사용된다...
      // 이거 이상한데?
      // 
      // const user = {
      //     socketId: socketId,
      //     status: true,
      //     userId: socketId,
      //     type: "group",
      // };
      // 
      // 왜 socketId 가 ',' 로 이루어진 문자열이 되고, 
      // 이를 userId 에서 포함되었는지 찾는다고?
      // 뭔가 코드를 보면서 혼란만 가중된다.
      // 대체 클라이언트에서 어떠한 식으로 구성되어있길래
      // 변수명이 통일이 안되는거지?
      // 차라리 socketId 가 아니라 
      // roomNumber 가 userId 를 ',' 로 join 한 형태이니
      // roomNumber 로 하던가...
      //
      // socketId 가 ',' 로 이루어진 문자열이라고?
      // 코드가 이상한건가?
      // 왜 명칭을 저따구로...?
      // 
      const groupUser = await query(
        `SELECT * FROM GroupUserList WHERE userId FIND_IN_SET(?)`,
        [socketId]
      );
      // 탐색된 groupUser 들에게 참여메시지 emit
      //
      // 심지어 병칭이 이상하니 갑자기 socketId 가 roomNumber 가 된다고?
      // 게다가 client 내용을 살펴보면, userId 가 socketId 가 된다...
      // 뭐야 이거 명칭이 진짜 중요하구나..
      // 
      groupUser.forEach(u => {
        io.of("/group").to(u.socketId).emit('group-chat-req', {
          roomNumber: socketId,
          socketId: u.socketId,
        })
      })

    });
  });
};

export default groupMsg;


```

구현하면서, 이상함을 많이 느꼈다.
`client` 와 `server` 간의 연동되는 것이라. `client` 에서 `state` 값을
만들고, 처리하는 로직이 당연히 존재해야 한다.

하지만, 내 개인적인 생각으로는 굳이 더이상 파고 들지 않는것이 좋다는 판단이  
들었다.

코드 분석하고 확인하는 과정이 너무 오래 걸릴것 같다.
심지어, 코드의 변수 명칭이 서로 헷갈리게 되어있어서 직관적이지 않다.

똑같이 따라하는 코드라면 상관없는데, 굳이 그렇게 하고 싶지 않다
일단 코드를 전체적으로 훑어보는 정도로 마무리 짓고자 한다.
