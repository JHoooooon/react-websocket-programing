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
