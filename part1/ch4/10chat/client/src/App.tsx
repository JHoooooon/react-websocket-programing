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
  type: `welcome` | `other` | `private` | `me`;
}

// MsgData 인터페이스

interface MsgData {
  data: string;
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
  // room 번호
  const [roomNumber, setRoomNumber] = useState("1");

  // sMessage 이벤트 등록
  useEffect(() => {
    if (!webSocket) return;
    // websocket open 이벤트
    // 처음 소켓 연결시 실행
    const sMessageCallback = (msg: MsgData) => {
      const { data, id, target } = msg;
      setMsgList((prev) => [
        ...prev,
        {
          msg: data,
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

  // sMessage 이벤트 등록
  useEffect(() => {
    if (!webSocket) return;
    const sLoginCallback = (msg: MsgData) => {
      setMsgList((prev) => [
        ...prev,
        {
          msg: `${msg} joins the chat`,
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
    webSocket.emit("login", { userId, roomNumber });
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

  // roomNumber 처리 핸들러
  const onRoomChangeHandler = (e: ChangeEvent<HTMLSelectElement>) => {
    setRoomNumber(e.target.value);
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
          </div>
        )}
      </div>
    </div>
  );
}

export default App;
