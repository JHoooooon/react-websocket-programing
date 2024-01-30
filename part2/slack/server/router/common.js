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
