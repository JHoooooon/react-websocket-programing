const net = require('net');

// 5000 번 포트 접속
const socket = net.connect({ port: 5000 })

// `connect` 이벤트 발생시 콜백 실행
socket.on('connect', () => {
  console.log('connected to server')

  // 1 초 마다 `Hello` 메시지 요청
  setInterval(() => {
    socket.write('Hello.');
  }, 1000)
});

// `data` 이벤트 발생시 콜백 실행
socket.on('data', (chunk) => {
  console.log(`From server: ${chunk}`);
})

// `end` 이벤트 발생시 콜백 실행
socket.on('end', () => {
  console.log('disconnected');
})

// `error` 이벤트 발생시 콜백 실행
socket.on('error', (err) => {
  console.log(err);
})

// `timeout` 이벤트 발생시 콜백실행
// 연결 지연시 실행
socket.on('timeout', () => {
  console.log(`connection timeout.`);
})