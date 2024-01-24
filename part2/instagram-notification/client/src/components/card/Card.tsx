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
