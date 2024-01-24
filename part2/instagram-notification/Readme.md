# 인스타그램 `Notification`

인스타그램의 알림 기능을 구현한다

`server/server.js`

```ts
import { Server } from "socket.io";
import posts from "./data";

// `io` 서버 생성
const io = new Server("5000", {
  cors: {
    origin: "http://localhost:3000",
  },
});

// user 배열
let users = [];

// 새로운 유저 입력
const addNewUser = (userName, socketId) => {
  // users 안에 userName 이 없다면,
  // users 에 unshift
  !users.some((user) => user.userName === userName) &&
    users.unshift({
      // random 한 post data 선택
      ...posts[Math.floor(Math.random() * 5)],
      // 유저네임
      userName,
      // 소켓 아이디
      socketId,
    });
};

// 유저 얻기
const getUser = (userName) => {
  // userName 을 찾음
  return users.find((user) => user.userName === userName);
};

// socket.io 가 제공하는 미들웨어
// 클라이언트 사이드에서 넘어온 사용자 이름을 확인한다
io.use((socket, next) => {
  // 클라이언트 사이드의 userName 확인
  const userName = socket.handshake.auth.userName;
  // 이름이 없다면 에러
  if (!userName) {
    console.log(`err`);
    return next(new Error("invalid userName"));
  }
  // 있다면, socket.userName 에 userName 할당
  socket.userName = userName;
  // 통과
  next();
});

// connection 이벤트
io.on("connection", (socket) => {
  // 새로운 유저 입력
  addNewUser(socket.username, socket.id);
  // userList 이벤트 생성
  socket.on("userList", () => {
    // user-list 이벤트에 메시지 전달
    io.sockets.emit("user-list", users);
  });

  // sendNotification 이벤트 생성
  // senderName: 보내는 유저 이름
  // receiverName: 받는 유저 이름
  // type: 메시지 유형
  socket.on("sendNotification", ({ senderName, receiverName, type }) => {
    // 받는 유저 검색
    const receiver = getUser(receiverName);
    // 받는 유저의 socketId 를 사용하여 getNotification 이벤트 메시지 보냄
    io.to(receiver.socketId).emit("getNotification", {
      // 보내는 유저
      senderName,
      // 메시지 유형
      type,
    });
  });

  // 연결 닫힘
  socket.on("disconnection", () => {
    console.log("logout");
  });
});
```

이후 클라이언트에서 내용을 구현한다

`client/src/context/action.ts`

```ts
// action type 생성
export const AUTH_INFO = "AUTH_INFO";
```

`client/src/context/index.tsx`

```ts
import { createContext, useReducer, ReactNode } from "react";
import { AUTH_INFO } from "./action";

// Action 인터페이스 생성
interface Action {
  // type 은 `AUTH_INFO`
  type: typeof AUTH_INFO;
  // payload string
  payload: string;
}

// state 객체
const initialState = {
  userName: "",
};

// reducer 생성
//
// useReducer 에서 사용될 reducer 함수
// 첫번째 인자는 state
// 두번째 인자는 action 값을 받는다.
// 받은 action.type 에 따라 state 값을 변경한다.
// 변경할 값은 action.payload 에 저장하여 내보낸다
const reducer = (state = initialState, action: Action) => {
  switch (action.type) {
    case AUTH_INFO:
      return {
        ...state,
        userName: action.payload,
      };
    default:
      return state;
  }
};

// Context 생성
//
// 여기에 들어가는 객체는 `default value` 를 지정한다
// `default value` 는 적절한 `Provider` 를 찾지 못할때
// 반환하는 값이다.
// 여기서는 빈 객체로 한다
export const Context = createContext({});

// StoreProvider 컴포넌트 생성
// props 로 children 을 받아서 처리한다
export const StoreProvider = ({ children }: { children: ReactNode }) => {
  // useReducer 를 사용하여 reducer, initialState 를 전달
  // 반환값으로 `state`, `dispatch` 를 전달받는다
  const [state, dispatch] = useReducer(reducer, initialState);
  // Context.Provider 에 전달할 store 객체
  const value = { state, dispatch };
  // Context.Provider 에서 사용할 store 를 사용
  // props 로 받은 children 컴포넌트들은 이 store 값 사용가능
  return <Context.Provider value={value}>{children}</Context.Provider>;
};
```

`client/src/App.tsx`

```tsx
import "./App.css";
import IndexContainer from "./IndexContainer";
import MainContainer from "./MainContainer";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { StoreProvider } from "./context";

function App() {
  return (
    // StoreProvider 로 인해
    // 모든 child 컴포넌트 들은 store 사용이 가능
    <StoreProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<IndexContainer />} />
          <Route path="/main" element={<MainContainer />} />
        </Routes>
      </BrowserRouter>
    </StoreProvider>
  );
}

export default App;
```

이후에 각 컴포넌트들을 생성한다

`client/src/components/Card.tsx`

```tsx

import { MouseEventHandler, useState } from "react";
import { AiOutlineHeart, AiFillHeart } from "react-icons/ai";
import { HiOutlinePaperAirplane } from "react-icons/hi";
import { BiMessageRounded } from "react-icons/bi";
import { FiMoreVertical } from "react-icons/fi";
import styles from "./Card.module.css";
import { socket } from "../../socket";
import CardProps from "./type";

// 부모 컴포넌트로 부터
// key, post, loginUser props 를 받아서 처리
const Card = ({ key, post, loginUser }: CardProps) => {
  // liked 되었는지 확인하는 state
  const [liked, setLiked] = useState(false);

  // like 핸들러
  const onLikeHandler: MouseEventHandler<SVGAElement> = (e) => {
    // 현재 타겟중 'svg' 를 가진 가장 가까운 타겟을 찾음
    // 해당 타겟의 dataset 으로 설정된 type 값을 가져온다
    const { type } = e.currentTarget.closest("svg")!.dataset;
    // type 이 0 과 같으면 true
    setLiked(type === "0");
    // server 의 sendNotification 이벤트로 해당 내용의 객체를 보낸다
    socket.emit("sendNotification", {
      senderName: loginUser,
      receiverName: post.userName,
      type,
    });
  };

  return (
    <div className={styles.card} key={key}>
      <div className={styles.info}>
        <div className={styles.userInfo}>
          <img src={post.userImg} alt="user_image" className={styles.userImg} />
          <div className={styles.userName}>
            <div>{post.userName}</div>
            <div className={styles.loc}>{post.location}</div>
          </div>
        </div>
        <FiMoreVertical size="20" />
      </div>
      <img src={post.postImg} alt="" className={styles.postImg} />
      <div className={styles.icons}>
        {liked ? (
          <AiFillHeart
            className={styles.fillHeart}
            size="20"
            onClick={onLikeHandler}
            data-type="1"
          />
        ) : (
          <AiOutlineHeart
            className={styles.heart}
            size="20"
            onClick={onLikeHandler}
            data-type="0"
          />
        )}
        <BiMessageRounded className={styles.msg} size="20" />
        <HiOutlinePaperAirplane className={styles.airplane} size="20" />
      </div>
    </div>
  );
};

export default Card;

```

이후에, `Navbar` 를 생성한다

```tsx

import { useEffect, useState } from "react";
import styles from "./Navbar.module.css";
import { NotificationType } from "./type";
import { socket } from "../../socket";
import { AiFillHeart, AiOutlineHeart } from "react-icons/ai";

const Navbar = () => {
  // notifications 를 담은 배열 스테이트
  const [notifications, setNotifications] = useState<NotificationType[]>([]);
  // notificationType.type 값을 비교하여 add 할지 pop 할지 확인하는 type guard 함수
  const isAddNotification = (type: NotificationType["type"]) => {
    return type === "0";
  };

  // useEffect 로 client 렌더링 이후 실행
  useEffect(() => {
    // getNotification 이벤트 콜백 함수
    // data: NotificationType 인자
    function getNofi(data: NotificationType) {
      // data 의 type 구조분해할당
      const { type } = data;
      // temp 를 사용하여
      let temp: NotificationType[] = [];

      // isAddNotification 을 사용하여, add 할지 pop 할지 분기처리
      if (isAddNotification(type)) {
        temp = [...notifications, data];
      } else {
        notifications.pop();
      }

      // temp.length 가 0 보다 크면 temp 를,
      // 아니면 [] 빈배열을  설정
      setNotifications(temp.length > 0 ? temp : []);
    }

    // getNotification 이벤트 생성
    socket.on("getNotification", getNofi);

    return () => {
      // getNotification 이벤트 삭제
      socket.off("getNotification", getNofi);
    };
  }, [notifications]);

  return (
    <div className={styles.navbar}>
      <span className={styles.logo}>Instagram</span>
      <div className={styles.icons}>
        <div className={styles.heartContainer}>
          {notifications.length > 0 && <span className={styles.noti}></span>}
          <AiOutlineHeart size="20" className={styles.heart} />
          {notifications.length > 0 && (
            <div className={styles.likeBubble}>
              <AiFillHeart size="15" color="#fff" />
              <div className={styles.count}>{notifications.length}</div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Navbar;


```

로그인을 위한 컨테이너 박스를 만든다.

`container/loginContainer.tsx`

```tsx


import { ChangeEvent, FormEvent, useContext, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import styles from "./LoginContainer.module.css";
import logo from "../../images/logo.png";
import { Context } from "../../context";
import { socket } from "../../socket";
import { AUTH_INFO } from "../../context/action";

const LoginContainer = () => {
  // navigate 객체 불러옴
  const navigate = useNavigate();

  // Context.Provider 에서 dispatch 가져옴
  const { dispatch } = useContext(Context);
  // user state 생성
  const [user, setUser] = useState("");

  // connect_error
  // 유효하지 않은 유저네임이면
  // err 콘솔로그
  useEffect(() => {
    socket.on("connect_error", (err) => {
      if (err.message === "invalid username") {
        console.log(err);
      }
    });
  }, []);

  // userName input 핸들러
  const setUserNameHandler = (e: ChangeEvent<HTMLInputElement>) => {
    setUser(e.target.value);
  };

  // userName form submit 핸들러
  const onLoginHandler = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    // dispatch 로 모든 컴포넌트에서
    // 로그인 유저 공유
    dispatch({
      type: AUTH_INFO,
      payload: user,
    });
    // socket.auth 에 userName 객체 생성하여 할당
    // 이는 socket.handshake 의 프로퍼티로 할당된다
    socket.auth = { userName: user };
    // 로그인 처리 되면 socket 연결
    socket.connect();
    // /post 경로로 이동
    navigate("/post");
  };

  return (
    <div className={styles.login_container}>
      <div className={styles.login}>
        <img src={logo} alt="logo" width="200px" />
        <form className={styles.loginForm} onSubmit={onLoginHandler}>
          <input
            type="text"
            value={user}
            placeholder="Enter your name"
            onChange={setUserNameHandler}
            className={styles.input}
          />
          <button type="submit">Login</button>
        </form>
      </div>
    </div>
  );
};

export default LoginContainer;


```

포스팅 목록을 노출하는 `PostingContainer` 를 생성한다

`containers/PostingContainer.tsx`

```tsx

import { useContext, useEffect, useState } from "react";
import { Context } from "../../context";
import { socket } from "../../socket";
import Post from "../../types/post";
import Navbar from "../../components/navBar/Navbar";
import Card from "../../components/card/Card";

const PostingContainer = () => {
  const {
    state: { userName },
  } = useContext(Context);
  // post state 생성
  const [post, setPost] = useState<Post[]>([]);

  // 사용자 리스트 보냄
  useEffect(() => {
    // 서버에서 다음과 같이 되어 있다.
    //
    // socket.on("userList", () => {
    //   // user-list 이벤트에 메시지 전달
    //   io.sockets.emit("user-list", users);
    // });
    //
    // 보면 알겠지만, `userList` 는 `user-list` 를 실행시키는 trigger 역할을
    // 한다
    socket.emit("userList", {});
  }, []);

  useEffect(() => {
    // user-list 에서 사용할 콜백
    // post[] 를 받아 post 스테이트에 할당
    const setPosting = (data: Post[]) => {
      setPost(data);
    };
    // user-list 이벤트 생성
    // 위의 userList 이벤트를 emit 한후, 반환되는 `users` 배열을
    // 콜백의 data 인자로 보낸다.
    socket.on("user-list", setPosting);
    return () => {
      socket.off("user-list", setPosting);
    };
  }, [setPost]);

  return <div>
    <h2>{`Login as a ${userName}`}</h2>
    <div>
      <Navbar />
      {post.map(p => <Card key={p.id} loginUser={userName} post={p}/>)}
    </div>
  </div>;
};

export default PostingContainer;


```

