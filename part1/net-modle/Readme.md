# net 모듈을 이용한 TCP 서버

`nodejs` 에서는 `net` 모듈을 제공한다.

> `net` 모듈은 `TCP` 스트림 기반의 비동기 네트워크 통신을 제공하는 모듈이다
>
> `net` 모듈은 저수준의 `TCP` 통신을 제공하기 때문에 브라우저와 통신은 지원  
> 하지 않는다

`net-module/server.js`

```js
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
```

`net-module/client.js`

```js
const net = require("net");

// 5000 번 포트 접속
const socket = net.connect({ port: 5000 });

// `connect` 이벤트 발생시 콜백 실행
socket.on("connect", () => {
  console.log("connected to server");

  // 1 초 마다 `Hello` 메시지 요청
  setInterval(() => {
    socket.write("Hello.");
  }, 1000);
});

// `data` 이벤트 발생시 콜백 실행
socket.on("data", (chunk) => {
  console.log(`From server: ${chunk}`);
});

// `end` 이벤트 발생시 콜백 실행
socket.on("end", () => {
  console.log("disconnected");
});

// `error` 이벤트 발생시 콜백 실행
socket.on("error", (err) => {
  console.log(err);
});

// `timeout` 이벤트 발생시 콜백실행
// 연결 지연시 실행
socket.on("timeout", () => {
  console.log(`connection timeout.`);
});
```
