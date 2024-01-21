import { Server } from "socket.io";

//  socket server 생성
//  cors 설정
const io = new Server("5000", { cors: "http://localhost:3000" });
const clients = new Map();

// connection 이벤트
io.sockets.on("connection", (socket) => {
  // `socket message` 이벤트
  socket.on("message", (res) => {
    // data 에 target 을 구조분해할당
    const { target } = res;

    // private 유저에 대한 message
    if (target) {
      const toUser = clients.get(target);
      io.sockets.to(toUser).emit("sMessage", res);
      return;
    }
    // socket.rooms 를 배열로 변환
    // socket.rooms 는 Set 이다.
    // Set 을 좀더 다루기 쉽도록 Array 로 변경한다
    const myRooms = Array.from(socket.rooms);
    // myRooms 의 length 가 1보다 크다면 rooms 이 있다는것이다.
    if (myRooms.length > 1) {
      // myRooms[1] 로 접근한 이유는 기존의 socket.rooms 를 보면 알수 있다
      // Set(2) [socketId, '1']
      // roomNumber 가 필요하니, `Array` 로 변경하고
      // myRooms[1] 로 2번째 배열의 원소를 참조한다
      //
      // in method 는 특정 `room` 에 연결된 클라언트 목록을 반환한다.
      // 이를 통해 반환된 클라이언트 목록에서 emit 메서드를 사용하여
      // res 값을 메시지로 보낸다.
      socket.broadcast.in(myRooms[1]).emit("sMessage", res);
      return;
    }
    socket.broadcast.emit("sMessage", res);
  });

  // `socket login` 이벤트
  socket.on("login", (data) => {
    const { userId, roomNumber } = data;
    // join 을 통해 방 번호를 넘긴다.
    // 그럼 socket.rooms 를 통해 접근 가능한데, 다음의 구조를 가진다
    // Set(2) [socketId, '1']
    socket.join(roomNumber);
    clients.set(data, socket.id);
    socket.broadcast.emit(
      "sLogin",
      `${userId} 가 ${roomNumber} 에 입장하였습니다.`
    );
  });

  // `socket disconnect` 이벤트
  socket.on("disconnect", () => {
    // 연결이 닫힐시 log
    console.log(`user disconnected`);
  });
});
