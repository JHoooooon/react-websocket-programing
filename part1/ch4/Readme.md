# Socket.io

`Socket.io` 는 서버, 클라이언트 및 하위 브라우저까지 지원가능하다
이는 여러 장점을 갖는데 다음과 같다

- `client` 도 같이 지원한다.

- `ws` 는 `IE9` 이상부터 사용가능하며 이전 하위 브라우저는 지원하지 않는다.
  반면 `Socket.io` 는 `long polling` 방식으로 전환하여 실시간 통신을 지원한다

- `automatic reconnection` 을 지원하여 연결이 끊기면 자동으로 재연결한다.

- `Socket.io` 는 `API` 추상화를 통해 복잡한 로직을 숨기고 간편하게 데이터를
  전송하는 함수를 제공한다.

- `chennal`, `rooms` 지원

- `Socket.io` 는 다양한 `API` 의 집합체이며, `websocket` 역시 하나의 부속품중  
  하나이다.

> 저자는 `websocket` 의 구현체를 `Socket.io` 라고 착각하는 사람이 많다며 이부분을  
> 강조한다.

`Socket.io` 는 실시간 서비스를 위해 구현된 다양한 `API` 의 추상화 라이브러리라 한다.
이는 `Websocket` 만으로는 불가능한 기능을 제공하며, 간편하게 실시간 서비스를  
만들수 있다는 장점을 가진다.

## Socket.io 의 소켓 이벤트

`socket.io` 에서 주로 사용하는 이벤트 함수이다.

| 기능                       | 설명                                                                    |
| :------------------------- | :---------------------------------------------------------------------- |
| `connection`               | 클라이언트 연결시 동작                                                  |
| `disconnection`            | 클라이이너트 연결 해제 시 동작                                          |
| `on()`                     | 소켓 이벤트 생성                                                        |
| `emit()`                   | 소켓 이벤트 메시지 전달                                                 |
| `socket.braodcast.emit()`  | 송신자를 제외한 모든 `socket` 연결된 <br/> 모든 `client` 에 메시지 전달 |
| `socket.join()`            | 클라이언트에게 방을 할당                                                |
| `socket.in()/sockets.io()` | 특정 방에 속한 클라이언트 선택                                          |

## `Connection Channel`(통신 채널)

`socket.io` 가 지원하는 통신 종류는 3 가지이며, 이 방식을 기반으로 웹 서비스를  
설계한다.

| 기능        | 설명                                                                          |
| :---------- | :---------------------------------------------------------------------------- |
| `private`   | 1:1 통신을 말한다<br/>`io.sockets.to(사용자 id).emit()`                       |
| `public`    | 전송자를 포함한 모두에게 메시지를 보낸다<br/>`io.sockets.emit()`              |
| `broadcast` | 전송자를 제외한 모든 사용자에게 메시지를 보낸다<br/>`socket.broadcast.emit()` |

`server/server.js`

```js
import { Server } from "socket.io";

//  socket server 생성
//  cors 설정
const io = new Server("5000", { cors: "http://localhost:3000" });

// connection 이벤트
io.sockets.on("connection", (socket) => {
  // `socket message` 이벤트
  socket.on("message", (data) => {
    // 모든 sockets 의 `sMessage` 이벤트에 `data` 전달
    socket.broadcast.emit(`sMessage`, data);
  });

  // `socket login` 이벤트
  socket.on("login", (data) => {
    // 모든 sockets 의 `sMessage` 이벤트에 `data` 전달
    socket.broadcast.emit("sLogin", data);
  });

  // `socket disconnect` 이벤트
  socket.on("disconnect", () => {
    // 연결이 닫힐시 log
    console.log(`user disconnected`);
  });
});
```

서버의 `api` 설정이다.
`socket server` 를 생성하며, `CORS` 설정을 통해 `http://localhost:3000` 주소는  
접근 가능하도록 한다.

> `CORS`(`Cross Origin Resource Sharing`) 은 등록된 출처의 도메인에서 데이터를  
> 주고 받을 수 있도록 하는 정책이다.
>
> 웹 브라우저는 `CSRF`(`Cross-Site Request Forgery`) 라는 보안 위협으로  
> `SOP`(`Sam Origin Policy`) 을 사용하여 제한한다.
> 이는 출처가 **_프로토콜, 도메인, 포트번호_** 로 구성되면 이 세가지 요소가  
> 동일해야만 `resource` 공유가 가능해진다.
>
> 이는 **_같은 이름을 가진 도메인만 허용하는 정책_** 이므로, 다른 도메인이름을  
> 가진 주소에서는 접근하지 못하도록 막는다.
>
> 이는 `OPEN APIs` 가 발전함에 따라, **_다른 도메인에서 접근_** 해야 하는 상황이  
> 발생하는데 큰 제약이 되었다고 한다.
>
> 이를 개선하기 위해, `CORS` 정책을 만들어 **_서버가 허가한 도메인_** 은  
> 접근하도록 해준다.

### private 구현

`server/server.js`

```js
import { Server } from "socket.io";

//  socket server 생성
//  cors 설정
const io = new Server("5000", { cors: "http://localhost:3000" });
const clients = new Map();

// connection 이벤트
io.sockets.on("connection", (socket) => {
  // `socket message` 이벤트
  socket.on("message", (data) => {
    // data 에 target 을 구조분해할당
    const { target } = data;

    // clients 에서 등록된 target id 를 get
    const toUser = clients.get(target);
    // toUser 가 있다면, 해당 target 에게만 `data` 전달
    // 아니면 모든 sockets 의 `sMessage` 이벤트에 `data` 전달
    toUser
      ? socket.to(toUser).emit(`sMessage`, data)
      : socket.broadcast.emit(`sMessage`, data);
  });

  // `socket login` 이벤트
  socket.on("login", (data) => {
    // 모든 sockets 의 `sMessage` 이벤트에 `data` 전달
    // data 는 `onSubmitHandler` 에서 전달해준 `userId` 이다.
    // 여기서는 `clients.set` 으로 `userId` 식별자를 가진,
    // socket.id 값을 할당한다.
    //
    // `socket.id` 는 `socket.io` 에서 기본적으로 연결된 소켓의 고유한 번호이다.
    // 이를 통해 각 `socket` 을 구분하는 식별자로서 사용된다.
    //
    clients.set(data, socket.id);
    // sLogin 이벤트에 `data` 를 보내준다.
    socket.broadcast.emit("sLogin", data);
  });

  // `socket disconnect` 이벤트
  socket.on("disconnect", () => {
    // 연결이 닫힐시 log
    console.log(`user disconnected`);
  });
});
```

`client/src/App.tsx`

```tsx
import {
  ChangeEvent,
  FormEvent,
  MouseEventHandler,
  useEffect,
  useRef,
  useState,
} from "react";
import { io } from "socket.io-client";
import "./App.css";

// `nativie WebSocket` 을 사용하여 모듈을 추가
// websocket 은 스킴이 `ws`
const webSocket = io("http://localhost:5000");

// Msg 인터페이스 생성
interface Msg {
  // 메시지 내용
  msg: string;
  // user id
  id: string;
  // 메시지 타입
  // welcome: 최초 진입 메시지
  // other: 자신이 아닌 다른사람의 메시지
  // private: 특정 사람에게 보내는 메시지
  type: `welcome` | `other` | `private` | `me`;
}

// MsgData 인터페이스

interface MsgData {
  data: string;
  // private 타겟 추가
  target: `welcome` | `other` | `private`;
  id: string;
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
  const [msgList, setMsgList] = useState<Msg[]>([]);
  // private 타겟
  const [privateTarget, setPrivateTarget] = useState<string>("");

  // sMessage 이벤트 등록
  useEffect(() => {
    if (!webSocket) return;
    // sMessage 이벤트에서 실행될 콜백함수
    const sMessageCallback = (msg: MsgData) => {
      const { data, id, target } = msg;
      setMsgList((prev) => [
        ...prev,
        {
          msg: data,
          // target 이 있으면 `other` 이고,
          // 아니면 `private` 로 설정
          type: target ? "other" : "private",
          id,
        },
      ]);
    };
    // `sMessage` 이벤트 설정
    webSocket.on("sMessage", sMessageCallback);
    return () => {
      // `sMessage` 이벤트 제거
      webSocket.off("sMessage", sMessageCallback);
    };
  }, []);

  // sLogin 이벤트 등록
  useEffect(() => {
    if (!webSocket) return;
    // sLogin 이벤트 콜백함수
    const sLoginCallback = (msg: MsgData) => {
      setMsgList((prev) => [
        ...prev,
        {
          msg: `${msg} joins the chat`,
          // login 시 welcome 타입 할당
          type: "welcome",
          id: "",
        },
      ]);
    };
    // `sLogin` 이벤트 설정
    webSocket.on("sLogin", sLoginCallback);
    return () => {
      // `sLogin` 이벤트 제거
      webSocket.off("sLogin", sLoginCallback);
    };
  }, []);

  // msgList 상태 변화시 리렌더링
  useEffect(() => {
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
    // login 메시지 전달
    webSocket.emit("login", userId);
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
      data: msg,
      id: userId,
      // `privateTaget` 을 할당.
      // "" 이거나 "userId" 값일 것이다.
      target: privateTarget,
    };
    // message 메시지 전달
    webSocket.emit("message", sendData);
    setMsgList((prev) => [...prev, { msg, type: "me", id: userId }]);
    setMsg("");
  };

  // msg 처리 핸들러
  const onChangeMessageHandler = (e: ChangeEvent<HTMLInputElement>) => {
    setMsg(e.target.value);
  };

  // private 타겟 설정 핸들러
  const onSetPrivatetarget: MouseEventHandler<HTMLLIElement> = (e) => {
    // HTMLLIElement 임을 어설션 처리
    const targetElem = e.currentTarget as HTMLLIElement;
    // id 구조분해 할당
    const { id } = targetElem.dataset;
    console.log(targetElem);

    setPrivateTarget((prev) => (prev === id ? "" : String(id)));
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
                  <li
                    className={v.type}
                    key={`${i}_li`}
                    data-id={v.id}
                    onClick={onSetPrivatetarget}
                  >
                    <div className="userId">{v.id}</div>
                    <div className={v.type}>{v.msg}</div>
                  </li>
                )
              )}
              <li ref={messageEndRef} />
            </ul>
            <form className="send-form" onSubmit={onSendSubmitHandler}>
              {privateTarget && (
                <div className="private-target">{privateTarget}</div>
              )}
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

`map` 인 `clients` 에 등록된 `client` 의 아이디를 찾고,  
`client` 에 저장된 `socketId` 로 `message` 를 보내는 로직이다.

이를 위해 `react` 상에서는, 특정 유저에게만 `message` 를 보내고 싶다면,  
해당 하는 유저를 `onclick` 시에 `privateTarget` 값으로 넣고,  
`message` 를 보낼때, `target` 값으로 할당한다.

이를 통해 `server` 에서는 `target` 값을 읽고, `target` 이 있다면,
해당 하는 `target` 에게만 `sMessage` 이벤트를 `emit` 하여 `message` 를 받을 수  
있도록 한다.

이렇게 하면 해당 `target` 만 `message` 를 받고, 나머지 유저들은 `message` 를 받지  
못한다.

### 룸 생성

`socket.io` 는 `room` 이라는 개념이 있다.
이는 채팅에서 대화방을 말하는것과 같은 개념이다.

> `private` 통신역시 개인의 방이 생성되어 가능한 매커니즘이라고 한다.

`client/App.tsx`

```tsx
...
  // roomNumber 처리 핸들러
  const onRoomChangeHandler = (e: ChangeEvent<HTMLSelectElement>) => {
    setRoomNumber(e.target.value);
  };

...

  <form className="login-form" onSubmit={onSubmitHandler}>
    // select 를 사용하여 roomNumber 설정
    <select onChange={onRoomChangeHandler}>
      <option value="1">Room 1</option>
      <option value="2">Room 2</option>
    </select>
    <input
      type="text"
      placeholder="Enter your ID"
      onChange={onChangeUserIdHandler}
      value={userId}
    />
    <button type="submit">Login</button>
  </form>

```

이렇게 `App.tsx` 를 추가하고, 이제 `server side` 를 수정한다

```js
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
    socket.broadcast.emit("sLogin", data);
  });

  // `socket disconnect` 이벤트
  socket.on("disconnect", () => {
    // 연결이 닫힐시 log
    console.log(`user disconnected`);
  });
});
```

> 책에서 여러방에 소속될수 있음을 알려준다
>
> `socket.broadcast.in('1').in('2').in('3').emit('sMessage', res)`
>
> 위치럼 여러방에 소속될 수 있다
> 만약 소속 되고 싶지 않다면 `expect` 를 이용할수 있다고 한다.
>
> `socket.broadcast.in('1').in('2').expect('3').emit('sMessage', res)`

이제 각 `room` 에 입장되는것을 볼 수 있다.

> 방을 떠나기 위해서는 `socket.leave([roomId])` 를 사용하여 나갈수도 있다

### 네임스페이스

`namespace` 는 서비스를 내부적으로 구분할 수 있는 공간을 의미한다
이는 서버 통신을 논리적으로 분리하는데 사용된다

마치 `express` 에서 `route` 를 나누는것과 비슷하다.

이는 다음과 같은 이점을 같는다

- **클라이언의 그룹화**:
  `namespace` 를 사용하는 클라이언트는 서로 통신할 수 있다
- **로직의 분리**:
  `namespace` 를 사용하여 애플리케이션의 로직을 논리적으로 분리할 수 있다
- **보안**:
  `namespace` 를 사용하여 애플리케이션의 보안을 강화한다

기본적으로 `socketio` 는 `/` 네임스페이스를 사용한다
이 `namespace` 는 모든 클라이언트가 사용가능하다

> `room` 은 `namespace` 내에서 클라이언트를 그룹화 하는데 사용된다.
> `room` 은 클라이언트가 서로 통신할 수 있는 범위를 제한하는데 사용한다

이를 간단하게 구현해본다

`namespace/client/src/socket.ts`

```ts
import { io } from "socket.io-client";

// goods 네임스페이스 socket 생성
export const socketGoods = io(`http://localhost:5000/goods`, {
  // autoConnect: false 시
  // 컴포넌트 마운트될때 마다 자동으로 소켓이 연결되지 않고,
  // 수동으로 socket.connect() 함수를 이용해서 연결해야 한다
  autoConnect: false,
});

// user 네임스페이스 socket 생성
export const socketUser = io(`http://localhost:5000/user`, {
  // autoConnect: false 시
  // 컴포넌트 마운트될때 마다 자동으로 소켓이 연결되지 않고,
  // 수동으로 socket.connect() 함수를 이용해서 연결해야 한다
  autoConnect: false,
});
```

`namespace/client/src/GoodsPage.tsx`

```tsx
import { useEffect, useState } from "react";
import { socketGoods } from "./socket";

const GoodsPage = () => {
  // connect 되었는지 확인하는 state
  const [isConnect, setIsConnect] = useState(false);

  useEffect(() => {
    // connect 이벤트 콜백함수
    const onConnect = () => {
      setIsConnect(true);
    };
    // disconnect 이벤트 콜백함수
    const onDisConnect = () => {
      setIsConnect(false);
    };

    // connect 이벤트 생성
    socketGoods.on("connect", onConnect);
    // disconnect 이벤트 생성
    socketGoods.on("disconnect", onDisConnect);

    // connect 이벤트, disconnect 이벤트 제거
    return () => {
      socketGoods.off("connect", onConnect);
      socketGoods.off("disconnect", onDisConnect);
    };
  });

  // connect 버튼의 onclick 이벤트
  const onConnectHandler = () => {
    socketGoods.connect();
  };

  // disconnect 버튼의 onclick 이벤트
  const onDisConnectHandler = () => {
    socketGoods.disconnect();
  };

  return (
    <div className="text-wrap">
      <h1>
        GoodsNameSpace is{" "}
        {isConnect ? (
          <em className="active">Connected!</em>
        ) : (
          <em className="deactive">Not Connected!</em>
        )}
      </h1>
      <div className="btn-box">
        <button onClick={onConnectHandler} className="active-btn">
          Connected
        </button>
        <button onClick={onDisConnectHandler} className="deactive-btn">
          Disconnected
        </button>
      </div>
    </div>
  );
};

export default GoodsPage;
```

`namespace/client/src/Userpage.tsx`

```tsx
import { useEffect, useState } from "react";
import { socketUser } from "./socket";

const UserPage = () => {
  const [isConnect, setIsConnect] = useState(false);
  useEffect(() => {
    const onConnect = () => {
      setIsConnect(true);
    };
    const onDisConnect = () => {
      setIsConnect(false);
    };

    socketUser.on("connect", onConnect);
    socketUser.on("disconnect", onDisConnect);

    return () => {
      socketUser.off("connect", onConnect);
      socketUser.off("disconnect", onDisConnect);
    };
  });

  const onConnectHandler = () => {
    socketUser.connect();
  };

  const onDisConnectHandler = () => {
    socketUser.disconnect();
  };

  return (
    <div className="text-wrap">
      <h1>
        UserNameSpace is{" "}
        {isConnect ? (
          <em className="active">Connected!</em>
        ) : (
          <em className="deactive">Not Connected!</em>
        )}
      </h1>
      <div className="btn-box">
        <button onClick={onConnectHandler} className="active-btn">
          Connected
        </button>
        <button onClick={onDisConnectHandler} className="deactive-btn">
          Disconnected
        </button>
      </div>
    </div>
  );
};

export default UserPage;
```

> p144
> 네임스페이스를 여러개 연결할 경우 소켓이 여러번 연결되나요?
>
> 결론부터 말하면 `아니요` 입니다. 동일한 메인 도메인의 하위 경로를 추가해서
> 네임스페이스를 만들었습니다.
> 이럴경우 `socket.io` 에서는 하나의 웹 소켓 연결만을 생성한 후에  
> 알맞는 목적지에 전송하도록 분산 처리합니다.
>
> 만약 접속의 메인도베인 주소가 달라진다면 웹 소켓 연결은 두번 생기게 됩니다.

`namespace/server/server.js`

```js
import { Server } from "socket.io";

// io 서버 생성
const io = new Server("5000", {
  cors: {
    origin: "http://localhost:3000",
  },
});

// /goods 네임스페이스 및 커넥션 이벤트 생성
io.of("/goods").on("connection", (socket) => {
  console.log("goods connected");
  socket.on("shoes", (res) => {});
  socket.on("pants", (res) => {});
});

// /user 네임스페이스 및 커넥션 이벤트 생성
io.of("/user").on("connection", (socket) => {
  console.log("user connected");
  socket.on("admin", (res) => {});
});
```

> `io.of('namespace')` 를 해주면, 해당 `namespace` 가 생성된다
> 이는 `url` 로 설정할 수 있다

이를 통해 `public`, `private`, `broadcast` 라는 대표적인 3가지 통신방식과  
`room`, `namespace` 를 이용하여 도메인을 분리하는 것도 알게 되었다.
