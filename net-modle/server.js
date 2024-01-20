const net = require("net");
// TCP 서버 생성
const server = net.createServer((socket) => {
  // socket 의 data 이벤트 실행
  socket.on("data", (data) => {
    console.log(`Form client: ${data.toString()}`);
  });
  // socket 의 close 이벤트 실행
  socket.on("close", () => {
    console.log(`client disconnected.`);
  });
  // socket 의 wirte 로 메시지 전달
  socket.write(`welcome to server.`);
});

// socket 의 error 이벤트 실행
server.on("error", (err) => {
  console.log(`err: ${err}`);
});

// socket 의 5000 포트 오픈
server.listen(5000, () => {
  console.log(`listening on 5000`);
});
