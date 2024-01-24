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
