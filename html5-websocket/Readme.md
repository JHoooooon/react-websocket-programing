# HTML5 웹 소켓 채팅

이 책에서는 `WebChat` 이라는 채팅 서비스를 생성한다.

`html5-websocket`

```sh

mkdir server;
npx create-react-app --template typescript client;

```

이렇게 `server` 와 `client` 를 각자 만든다.

`client/App.tsx`

```ts
import { ChangeEvent, FormEvent, useEffect, useRef, useState } from "react";
import "./App.css";

// `nativie WebSocket` 을 사용하여 모듈을 추가
// websocket 은 스킴이 `ws`
const webSocket = new WebSocket("ws://localhost:5000");

// Msg 인터페이스 생성
interface MsgData {
  // 메시지 내용
  msg: string;
  // user id
  id: string;
  // 메시지 타입
  // welcome: 최초 진입 메시지
  // other: 자신이 아닌 다른사람의 메시지
  type: `welcome` | `other` | `me`;
}

function App() {
  // messageEndRef 로 `Element` 참조
  const messageEndRef = useRef<HTMLLIElement>(null);
  // userId 스테이트
  const [userId, setUserId] = useState("");
  // 로그인 유저 스테이트
  const [isLogin, setIsLogin] = useState(false);
  // msg 입력
  const [msg, setMsg] = useState("");
  // msg 리스트 스테이트
  const [msgList, setMsgList] = useState<MsgData[]>([]);

  useEffect(() => {
    if (!webSocket) return;
    // websocket open 이벤트
    // 처음 소켓 연결시 실행
    webSocket.onopen = () => {
      console.log(`open ${webSocket.protocol}`);
    };
    // websocket 메시지 이벤트
    // 서버에서 온 메시지를 받음
    webSocket.onmessage = (e) => {
      // e.data 가 JSON 형태로 오기때문에,
      // JSON.parse 로 Object 화 시킨다.
      const { data, id, type } = JSON.parse(e.data);
      // MsgList 설정
      setMsgList((prev) => [
        // 기존의 값들 spread
        ...prev,
        // 새로운 Msg
        {
          // type 은 `welcome` 과 `other` 가 있다.
          // `welcome` 일때 join 메시지를,
          // `other` 일때 message data 를 할당한다
          msg: type === "welcome" ? `${data} joins the chat` : data,
          // type 값
          type,
          // userId 값
          id,
        },
      ]);
    };
    // websocket close 이벤트
    // 소켓 연결 종료
    webSocket.onclose = () => {
      console.log(`close`);
    };
  }, []);

  // msgList 상태 변화시 리렌더링
  useEffect(() => {
    // scrollToBottom 메서드 실행
    scrollToBottom();
  }, [msgList]);

  const scrollToBottom = () => {
    // 현재 ref 는 `message` 리스트의 최하위 `li` 이다.
    // 이는 메시지들을 담은 `li` 가장 아래에 위치 시킴으로써
    // `li` 의 가장 아래로 `scroll` 하기 위해 사용되는 `HTMLLIElement` 이다.
    //
    // 이 `HTMLLIElement` 를 참조하므로써 `scrollIntoView` 를 사용
    // 하여 `scroll` 위치 이동 시킨다
    // behavior: "smooth" 는 한번에 이동하지 않고 자연스럽게 스크롤링되어
    // 내려간다.
    messageEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  // 로그인 submit handler
  const onSubmitHandler = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const sendData = {
      type: "id",
      data: userId,
    };
    webSocket.send(JSON.stringify(sendData));
    setIsLogin(true);
  };

  // userid 처리 핸들러
  const onChangeUserIdHandler = (e: ChangeEvent<HTMLInputElement>) => {
    setUserId(e.target.value);
  };

  // msg submit 핸들러
  const onSendSubmitHandler = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const sendData = {
      type: "msg",
      data: msg,
      id: userId,
    };
    // webSocket 서버에 send
    webSocket.send(JSON.stringify(sendData));

    // 현재 MsgList 에 이전 `type: me` 인 msg 추가
    // 이는 현재 내가 보낸 메시지로 처리한다
    setMsgList((prev) => [...prev, { msg, type: "me", id: userId }]);
    // message input 초기화
    setMsg("");
  };

  // msg 처리 핸들러
  const onChangeMessageHandler = (e: ChangeEvent<HTMLInputElement>) => {
    setMsg(e.target.value);
  };

  return (
    <div className="app-container">
      <div className="wrap">
        {isLogin ? (
          <div className="chat-box">
            <h3>Login as a "{userId}"</h3>
            <ul className="chat">
              {msgList.map((v, i) =>
                v.type === "welcome" ? (
                  <li className="welcome">
                    <div className="line" />
                    <div>{v.msg}</div>
                    <div className="line" />
                  </li>
                ) : (
                  // 타입에 따라 변경됨
                  // other 타입은 오른쪽에 표시
                  // me 타입은 왼쪽에 표시
                  <li className={v.type} key={`${i}_li`}>
                    <div className="userId">{v.id}</div>
                    <div className={v.type}>{v.msg}</div>
                  </li>
                )
              )}
              <li ref={messageEndRef} />
            </ul>
            <form className="send-form" onSubmit={onSendSubmitHandler}>
              <input
                type="text"
                placeholder="Enter your message"
                onChange={onChangeMessageHandler}
                value={msg}
              />
              <button type="submit">send</button>
            </form>
          </div>
        ) : (
          <div className="login-box">
            <div className="login-title">
              {/* <img src={logo} width="40px" height="40px" alt="logo" /> */}
              <div>webChat</div>
            </div>
            <form className="login-form" onSubmit={onSubmitHandler}>
              <input
                type="text"
                placeholder="Enter your ID"
                onChange={onChangeUserIdHandler}
                value={userId}
              />
              <button type="submit">Login</button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}

export default App;
```

이후에 `ws` 패키지를 설치한다.

```sh

npm i ws;

```

`ws` 패키지를 설치하는 이유는 `net` 모듈에서 직접 설정하기에 수작업이 많이  
동반되기 때문이다. 이미 잘 만들어진 `ws` 모듈을 쓰는것이 편하고 사용이 좋다고  
한다.

`server/server.js`

```js
import { WebSocket } from "ws";

// websocket server 생성
const wss = new WebSocket.Server({ port: 5000 });

// connection 이벤트
wss.on("connection", (ws) => {
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
```

제대로 동작함을 볼 수있다.
`localhost` 부분을 보면 소켓 연결시 `upgrade: websocket` 부분을 확인할 수 있으며
`Connection: Upgrade` 도 볼 수 있다.

이는 `localhost` 가 `GET` 요청으로 `3 way handshake` 의 과정이 이루어지고,  
통신이 가능하다면 `upgrade: websocket` 의 구문을 보고 프로토콜을 `websocket` 으로  
업그레이드 한다고 보면 된다.

실제로 이에대한 상태코드를 보면 `101` 이며 이는 `Switching Protocols` 의 상태  
정보를 가진다.

`Protocol` 이 변경되었다는 응답이다.
이후 부터는 `http` 가 아닌 `ws` 로 요청을 보내게 된다.
