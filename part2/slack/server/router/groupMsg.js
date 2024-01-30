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
