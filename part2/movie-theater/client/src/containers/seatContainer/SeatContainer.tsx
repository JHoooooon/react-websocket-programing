import classNames from "classnames";
import styles from "./SeatContainer.module.css";
import { useParams } from "react-router-dom";
import { MouseEventHandler, useEffect, useState } from "react";
import { rsv_sock } from "../../socket";
import { SeatsData } from "./SeatContainer.type";

const cx = classNames.bind(styles);

const SeatContainer = () => {
  const { id, title } = useParams();
  const [booked, setBooked] = useState("");
  const [seats, setSeats] = useState<SeatsData[]>([]);
  const [isDisabled, setIsDisabled] = useState(false);

  useEffect(() => {
    if (rsv_sock.disconnected) {
      rsv_sock.connect();
    }
    rsv_sock.emit("join", id);
    return () => {
      console.log("컴포넌트 언마운트?");
      // 해당 컨테이너 unmount 시 삭제
      rsv_sock.disconnect();
    };
  }, [id]);

  useEffect(() => {
    // sSeatmessage 이벤트의 콜백함수
    const setSeat = (data: SeatsData[]) => {
      console.log(`data: `, data);
      // seatsData[] 을 받아서 state 에 할당
      setSeats(data);
    };
    // sSeatMessage 이벤트 생성
    rsv_sock.on("sSeatMessage", setSeat);

    return () => {
      // unmount 시 sSeatMessage 메모리 해제
      rsv_sock.off("sSeatMessage", setSeat);
    };
  }, []);

  const onClickHandler: MouseEventHandler<HTMLLIElement> = (e) => {
    // disabled 된 좌석인지 확인
    if (isDisabled) return;
    // 해당 좌석 요소의 dataset 에서 id, status 가져옴
    const { id, status } = e.currentTarget.dataset;
    // status 가 예약완료 및 노출x 인지 확인
    if (status === "3" || status === "0") return;
    // 위의 모든 조건이 아니라면, setBooked 에 id 할당
    setBooked(id as string);
    // tempSeats 함수를 사용해서 변경된 seats 구성
    const tempSeats = seats.map((s) => {
      return s.map((info) => {
        // tmp 변수 생성 및 info 객체 복사
        // 이는 아래의 조건문에 해당하지 않을때 반환하는 default 객체이다
        let tmp = { ...info };
        // info.seatNumber 와 id 값이 같은지 확인
        if (info.seatNumber === id) {
          // 같다면, 해당 tmp 에 info 복사후 status 를 임시선택으로 변경
          tmp = { ...info, status: 2 };
        } else {
          // 아니라면, 해당 tmp 에 info 복사후
          // info.status 가 임시선택이라면 미예매로 변경하고,
          // 임시선택이 아니라면 기존 info.status 로 유지
          tmp = { ...info, status: info.status === 2 ? 1 : info.status };
        }
        // 변경된 tmp 반환
        return tmp;
      });
    });

    // 변경된 seats 할당
    setSeats(tempSeats);
  };

  const onConfirmHandler = () => {
    // 좌석 선택했는지 확인하는 로직
    if (!booked) return;
    // addSet 이벤트 메시지
    rsv_sock.emit("addSeat", booked);
    setIsDisabled(true);
  };

  console.log(seats);

  return (
    <div className={cx(styles.seat_container)}>
      <h2 className={cx(styles.title)}>{title}</h2>
      <div className={cx(styles.screen)}>screen</div>
      <ul className={cx(styles.wrap_seats)}>
        {seats.map((v) =>
          v.map((info, idx) => (
            <li
              key={info.seatNumber}
              data-id={info.seatNumber}
              data-status={info.status}
              // 각 조건에 따라 적용되는 class 가 다르다
              // 0 == empty
              // 1 == default
              // 2 == active
              // 3 == soldout
              className={cx(
                styles.seat,
                info.status === 0 && styles.empty,
                info.status === 1 && styles.default,
                info.status === 2 && styles.active,
                info.status === 3 && styles.soldout
              )}
              onClick={onClickHandler}
            ></li>
          ))
        )}
      </ul>
      <div className={cx(styles.r_wrap)}>
        <h4 className={cx(styles.r_title)}>{booked}</h4>
        {!isDisabled && (
          <button className={cx(styles.r_confirm)} onClick={onConfirmHandler}>
            Confirm
          </button>
        )}
      </div>
    </div>
  );
};

export default SeatContainer;
