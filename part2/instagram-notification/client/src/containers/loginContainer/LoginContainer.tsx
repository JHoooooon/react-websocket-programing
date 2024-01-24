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
    socket.auth = { userName: user };
    // socket 연결
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
