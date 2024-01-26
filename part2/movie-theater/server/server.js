import { Server } from "socket.io";
import { seats } from "./data.js";

// io 서버 생성
const io = new Server("5000", {
  cors: {
    origin: "http://localhost:3000",
  },
});

// avatar 좌석배열
let avatar = [...seats];
// antman 좌석배열
let antman = [...seats];
// cats 좌석배열
let cats = [...seats];

// 좌석 예매 함수
// roomNumber: 영화 room
// seat: 좌석번호
const setSeats = (roomNumber, seat) => {
  // 임시 배열 생성
  let temp = [];
  // 해당 seats 예매 완료 처리 함수
  const setStatus = (seats) => {
    return seats.map((i) => {
      // seats 배열에서 각 좌석( == i ) 을 가져온후,
      // 각 좌석의 seatNumber 와 setSeats 에서 받은 seat 를 비교
      let temp = { ...i };
      if (i.seatNumber === seat) {
        // 같다면, 기존의 좌석에서 status 만 3 으로 덮어씌움
        temp = { ...i, status: 3 };
      }
      // 임시 배열 반환
      return temp;
    });
  };
  // roomNumber 가 1 이라면 avatar
  if (roomNumber === "1") {
    // setSeats 의 temp 에  setStatus 한 결과의 seats 를 할당
    temp = [...avatar].map((s) => setStatus(s));
    // avatar 에 생성된 temp 배열 할당
    avatar = [...temp];
  }
  // roomNumber 가 2 이라면 antman
  if (roomNumber === "2") {
    // setSeats 의 temp 에  setStatus 한 결과의 seats 를 할당
    temp = [...antman].map((s) => setStatus(s));
    // antman 에 생성된 temp 배열 할당
    antman = [...temp];
  }
  // roomNumber 가 3 이라면 cats
  if (roomNumber === "3") {
    // setSeats 의 temp 에  setStatus 한 결과의 seats 를 할당
    temp = [...cats].map((s) => setStatus(s));
    // cats 에 생성된 temp 배열 할당
    cats = [...temp];
  }

  // 임시배열 반환
  return temp;
};

// io 서버 연결
io.on("connection", (socket) => {
  // join 이벤트 생성
  socket.on("join", (movie) => {
    // movie 인자의 room 생성
    socket.join(movie);
    // 임시 배열 생성
    let tempSeat = [];
    // movie 가 1 이면 임시배열은 avatar
    if (movie === "1") {
      tempSeat = avatar;
    }
    // movie 가 2 이면 임시배열은 antman
    if (movie === "2") {
      tempSeat = antman;
    }
    // movie 가 3 이면 임시배열은 cats
    if (movie === "3") {
      tempSeat = cats;
    }
    // movie 룸에 속한 모든 socket 유저에게
    // 임시테이블을 담은 sSeatMessage 메시지 보냄
    console.log(tempSeat);
    io.sockets.in(movie).emit("sSeatMessage", tempSeat);
  });

  // addSeat 이벤트 생성
  socket.on("addSeat", (seat) => {
    // 현재 socket 유저의 rooms 배열변환
    // rooms 는 Set 이므로, 쉽게 사용하기 위해 Array 로 변환
    const myRooms = Array.from(socket.rooms);
    // myRooms[1] 의 rooms 에 속한 모든 socket 유저에게
    // seat 가 설정된 배열을 sSeatMessage 메시지로 보냄
    io.sockets.in(myRooms[1]).emit("sSeatMessage", setSeats(myRooms[1], seat));
  });

  // socket 닫힘
  socket.on("disconnect", () => {
    // 로그아웃 로그 출력
    console.log("logout");
  });
});
