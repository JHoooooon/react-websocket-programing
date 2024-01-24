import WebSocket, { WebSocketServer } from "ws";

// websocket server 생성
const wss = new WebSocketServer({ port: 5000 });

// connection 이벤트
wss.on("connection", (ws) => {
  console.log("connectined");
  // boradCast 핸들러
  const broadCastHandler = (msg) => {
    wss.clients.forEach((client, idx) => {
      // 자신이 보낸 메시지를 자신이 받지 않도록 하기 위해
      // 조건문에 `client != ws`를 추가
      //
      // client.readState 가 `communication` 하기 위해 `open` 된 유저인지도
      // 확인한다
      if (client !== ws && client.readyState === WebSocket.OPEN) {
        client.send(msg);
      }
    });
  };

  // 클라이언트에서 오는 메시지를 수신
  ws.on("message", (res) => {
    const { type, data, id } = JSON.parse(res);
    switch (type) {
      case "id":
        broadCastHandler(JSON.stringify({ type: "welcome", data }));
        break;
      case "msg":
        broadCastHandler(JSON.stringify({ type: "other", data, id }));
        break;
      default:
        break;
    }
  });

  // close 이벤트
  ws.on("close", () => {
    console.log("client has disconnected");
  });
});
