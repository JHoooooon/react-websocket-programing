# 영화 좌석 예약 어플리케이션

영화 좌석 예약을 위해서는 실시간으로 확인되어야 한다.
누군가가 예매를 하고 예약을 했다면, 해당 위치는 즉각적으로 변한다면,  
`UX` 상 많은 이점을 있을 것이다.

```ts

export const seats = [
    [
      { status: 1, seatNumber: "A-0" },
      { status: 1, seatNumber: "A-1" },
      { status: 0, seatNumber: "A-2" },
      { status: 0, seatNumber: "A-3" },
      { status: 0, seatNumber: "A-4" },
      { status: 0, seatNumber: "A-5" },
      { status: 0, seatNumber: "A-6" },
      { status: 0, seatNumber: "A-7" },
      { status: 0, seatNumber: "A-8" },
      { status: 0, seatNumber: "A-9" },
      { status: 1, seatNumber: "A-10" },
      { status: 1, seatNumber: "A-11" },
    ],
    ...
  ]

```

책에서는 이차원 배열을 사용하여, 각 `seats` 의 위치를 지정하고 만든다.
각 값은 다음과 같다

- **status**:
  0: 노출X<br/> 1: 미예매 <br/> 2: 임시 선택 <br/> 3: 예매완료
- **seatNumber**:
  좌석 번호(좌석의 식별자 역할을 한다.)

`server/server.js`

```js
import { Server } from "socket.io";
import { seats } from "./data.js";

// io 서버 생성
const io = new Server({
  cors: {
    origin: "http://localhost:3000",
  },
});

// avatar 좌석배열
let avatar = [...seats];
// antman 좌석배열
let antman = [...seats];
// cats 좌석배열
let cats = [...seats];

// 좌석 예매 함수
// roomNumber: 영화 room
// seat: 좌석번호
const setSeats = (roomNumber, seat) => {
  // 임시 배열 생성
  let temp = [];
  // 해당 seats 예매 완료 처리 함수
  const setStatus = (seats) => {
    return seats.map((i) => {
      // seats 배열에서 각 좌석( == i ) 을 가져온후,
      // 각 좌석의 seatNumber 와 setSeats 에서 받은 seat 를 비교
      let temp = { ...i };
      if (i.seatNumber === seat) {
        // 같다면, 기존의 좌석에서 status 만 3 으로 덮어씌움
        temp = { ...i, status: 3 };
      }
      // 임시 배열 반환
      return temp;
    });
  };
  // roomNumber 가 1 이라면 avatar
  if (roomNumber === "1") {
    // setSeats 의 temp 에  setStatus 한 결과의 seats 를 할당
    temp = [...avatar].map((s) => setStatus(s));
    // avatar 에 생성된 temp 배열 할당
    avatar = [...temp];
  }
  // roomNumber 가 2 이라면 antman
  if (roomNumber === "2") {
    // setSeats 의 temp 에  setStatus 한 결과의 seats 를 할당
    temp = [...antman].map((s) => setStatus(s));
    // antman 에 생성된 temp 배열 할당
    antman = [...temp];
  }
  // roomNumber 가 3 이라면 cats
  if (roomNumber === "3") {
    // setSeats 의 temp 에  setStatus 한 결과의 seats 를 할당
    temp = [...cats].map((s) => setStatus(s));
    // cats 에 생성된 temp 배열 할당
    cats = [...temp];
  }

  // 임시배열 반환
  return temp;
};

// io 서버 연결
io.on("connection", (socket) => {
  // join 이벤트 생성
  socket.on("join", (movie) => {
    // movie 인자의 room 생성
    socket.join(movie);
    // 임시 배열 생성
    let tempSeat = [];
    // movie 가 1 이면 임시배열은 avatar
    if (movie === "1") {
      tempSeat = avatar;
    }
    // movie 가 2 이면 임시배열은 antman
    if (movie === "2") {
      tempSeat = antman;
    }
    // movie 가 3 이면 임시배열은 cats
    if (movie === "3") {
      tempSeat = cats;
    }
    // movie 룸에 속한 모든 socket 유저에게
    // 임시테이블을 담은 sSeatMessage 메시지 보냄
    io.sockets.in(movie).emit("sSeatMessage", tempSeat);
  });

  // addSeat 이벤트 생성
  socket.on("addSeat", (seat) => {
    // 현재 socket 유저의 rooms 배열변환
    // rooms 는 Set 이므로, 쉽게 사용하기 위해 Array 로 변환
    const myRooms = Array.from(socket.rooms);
    // myRooms[1] 의 rooms 에 속한 모든 socket 유저에게
    // seat 가 설정된 배열을 sSeatMessage 메시지로 보냄
    io.sockets.in(myRooms[1]).emit("sSeatMessage", setSeats(myRooms[1], seat));
  });

  // socket 닫힘
  socket.on("disconnect", () => {
    // 로그아웃 로그 출력
    console.log("logout");
  });
});
```

`client/src/seatContainer`

```ts
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
    // join 이벤트에 메시지 전달
    rsv_sock.emit("join", id);
    return () => {
      // 해당 컨테이너 unmount 시 삭제
      rsv_sock.disconnect();
    };
  }, [id]);

  useEffect(() => {
    // sSeatmessage 이벤트의 콜백함수
    const setSeat = (data: SeatsData[]) => {
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
    rsv_sock.emit("addSet", booked);
    setIsDisabled(true);
  };

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
```

`client/src/containers/homeContainer`

```tsx
import classNames from "classnames";
import styles from "./HomeContainer.module.css";
import { Link } from "react-router-dom";
import { Fragment, useEffect } from "react";
import { rsv_sock } from "../../socket";
import { images } from "./images";
const cx = classNames.bind(styles);

const HomeContainer = () => {
  useEffect(() => {
    // 해당 페이지 진입시 rsv_sock 연결
    rsv_sock.connect();
  }, []);

  return (
    <div className={cx(styles.home_container)}>
      <div className={cx(styles.title)}>Movie Chart</div>
      <ul className={cx(styles.wrap_movies)}>
        <li className={cx(styles.movie)}>
          {images.map((image, idx) => (
            <Fragment key={`${image.title}_${idx}`}>
              <Link
                to={`/seat/${idx + 1}/${image.title}`}
                style={{ textDecoration: `none` }}
              >
                <div className={cx(styles.img_wrap)}>
                  <img
                    src={image.img}
                    width="250px"
                    height="300px"
                    alt="avatar_movie_poster"
                    className={cx(styles.img)}
                  />
                  <h3 className={cx(styles.number)}>1</h3>
                </div>
              </Link>
              <div className={cx(styles.movie_title)}>{image.title}</div>
            </Fragment>
          ))}
        </li>
      </ul>
    </div>
  );
};

export default HomeContainer;
```

이렇게 각 컨테이너 환경을 만든다.
만든 컨테이너를 `APP.tsx` 에 할당한다

```tsx
import HomeContainer from "./containers/homeContainer/HomeContainer";
import SeatContainer from "./containers/seatContainer/SeatContainer";
import "./App.css";
import { BrowserRouter, Route, Routes } from "react-router-dom";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<HomeContainer />} />
        <Route path="/seat/:id/:title" element={<SeatContainer />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
```

이렇게 해서 만들어본다.
그런데 문제가 생겼다. 동작이 이상하다.

`SeatContainer` 에 진입하면, `server` 에서 `logout` 콘솔이 찍힌다.
그래서 `HomeConatiner` 의 `useEffect` 와 `SeatContainer` 의 `useEffect` 를  
다시 살펴봤다...

```ts
// HomeContainer
useEffect(() => {
  // 해당 페이지 진입시 rsv_sock 연결
  rsv_sock.connect();
}, []);

// SeatContainer
useEffect(() => {
  // join 이벤트에 메시지 전달
  rsv_sock.emit("join", id);
  return () => {
    // 해당 컨테이너 unmount 시 삭제
    rsv_sock.disconnect();
  };
}, [id]);
```

지금 이 코드에서 문제가 생긴다.
일단 `/` 경로로 진입하면 `HomeConatiner` 에 진입한다.
그럼 `socket` 이 `connection` 되는것을 볼 수있다.

이후, `SeatContainer` 에 진입하는순간 `logout` 이 찍힌다.
그러면서, `sSeatMessage` 이벤트가 작동하여 `setSeats` 하지 않는다.

배열로 `seat` 를 찍어보아도, `[]` 이라는 결과값이 나온다.

내 생각을 적어보면, 원래 **_해당 페이지에 진입시 소켓이 연결되게끔_** 하기  
위해서라면, `SeatContainer` 에서 `connection` 및 `disConnect` 를 해주는것이  
맞기는하다.

하지만, 그렇다고해서, 따로 `useEffect` 의 `cleanup 함수` 를 지정해주지 않았으므로,  
`HomeContainer` 에서 지정한 `socket` 이 유지되는것이 맞다는 생각이 든다.

하지만 `SeatContainer` 로 페이지 전환시 바로 `logout` 되는 상황이 발생했다.
혹시 `page` 전환시에 `socket` 이 유지 되지 않는가?

**_문제점 분석_**

1. `HomeContainer` 진입시 소켓연결 되는가 ? `Y`
2. `SeatContainer` 진입시 소켓연결이 유지 되는가 ? `Y`
3. `SeatContainer` 에서 `data` 를 제대로 가져오는가 ? `N`
4. `SeatContainer` 진입시 `Server` 에서 `logout` 콘솔이 찍히는가 ? `Y`
5. `SeatContainer` 에서 `HomeContainer` 진입이후 `data` 를 가져오는가 ? `Y`

처음에 `5` 번의 상황이 발생함을 느꼈다

`5` 에서 처럼 `SeatContainer` 이후 뒤로가기로 `HomContainer` 로 페이지를 전환  
한다. 이후 `Network` 탭에서 다음과 같은 응답을 준다.

```sh
42["sSeatMessage",[[{"status":1,"seatNumber":"A-0"},{"status":1,"seatNumber":"A-1"},{"status":0,"seatNumber":"A-2"},{"status":0,"seatNumber":"A-3"},{"status":0,"seatNumber":"A-4"},{"status":0,"seatNumber":"A-5"},{"status":0,"seatNumber":"A-6"},{"status":0,"seatNumber":"A-7"},{"status":0,"seatNumber":"A-8"},{"status":0,"seatNumber":"A-9"},{"status":1,"seatNumber":"A-10"},{"status":1,"seatNumber":"A-11"}],[{"status":1,"seatNumber":"B-0"},{"status":1,"seatNumber":"B-1"},{"status":0,"seatNumber":"B-2"},{"status":1,"seatNumber":"B-3"},{"status":1,"seatNumber":"B-4"},{"status":1,"seatNumber":"B-5"},{"status":1,"seatNumber":"B-6"},{"status":1,"seatNumber":"B-7"},{"status":1,"seatNumber":"B-8"},{"status":0,"seatNumber":"B-9"},{"status":1,"seatNumber":"B-10"},{"status":1,"seatNumber":"B-11"}],[{"status":1,"seatNumber":"C-0"},{"status":1,"seatNumber":"C-1"},{"status":0,"seatNumber":"C-2"},{"status":1,"seatNumber":"C-3"},{"status":1,"seatNumber":"C-4"},{"status":1,"seatNumber":"C-5"},{"status":1,"seatNumber":"C-6"},{"status":1,"seatNumber":"C-7"},{"status":1,"seatNumber":"C-8"},{"status":0,"seatNumber":"C-9"},{"status":1,"seatNumber":"C-10"},{"status":1,"seatNumber":"C-11"}],[{"status":1,"seatNumber":"D-0"},{"status":1,"seatNumber":"D-1"},{"status":0,"seatNumber":"D-2"},{"status":1,"seatNumber":"D-3"},{"status":1,"seatNumber":"D-4"},{"status":1,"seatNumber":"D-5"},{"status":1,"seatNumber":"D-6"},{"status":1,"seatNumber":"D-7"},{"status":1,"seatNumber":"D-8"},{"status":0,"seatNumber":"D-9"},{"status":1,"seatNumber":"D-10"},{"status":1,"seatNumber":"D-11"}],[{"status":1,"seatNumber":"E-0"},{"status":1,"seatNumber":"E-1"},{"status":0,"seatNumber":"E-2"},{"status":1,"seatNumber":"E-3"},{"status":1,"seatNumber":"E-4"},{"status":1,"seatNumber":"E-5"},{"status":1,"seatNumber":"E-6"},{"status":1,"seatNumber":"E-7"},{"status":1,"seatNumber":"E-8"},{"status":0,"seatNumber":"E-9"},{"status":1,"seatNumber":"E-10"},{"status":1,"seatNumber":"E-11"}],[{"status":1,"seatNumber":"F-0"},{"status":1,"seatNumber":"F-1"},{"status":0,"seatNumber":"F-2"},{"status":1,"seatNumber":"F-3"},{"status":1,"seatNumber":"F-4"},{"status":1,"seatNumber":"F-5"},{"status":1,"seatNumber":"F-6"},{"status":1,"seatNumber":"F-7"},{"status":1,"seatNumber":"F-8"},{"status":0,"seatNumber":"F-9"},{"status":1,"seatNumber":"F-10"},{"status":1,"seatNumber":"F-11"}],[{"status":1,"seatNumber":"G-0"},{"status":1,"seatNumber":"G-1"},{"status":0,"seatNumber":"G-2"},{"status":1,"seatNumber":"G-3"},{"status":1,"seatNumber":"G-4"},{"status":1,"seatNumber":"G-5"},{"status":1,"seatNumber":"G-6"},{"status":1,"seatNumber":"G-7"},{"status":1,"seatNumber":"G-8"},{"status":0,"seatNumber":"G-9"},{"status":1,"seatNumber":"G-10"},{"status":1,"seatNumber":"G-11"}]]]
```

이상하다. 왜 `HomeContainer` 로 페이지 전환시 뒤 늦게 보내주지?

비동기 문제인가?

그래서 `Asnyc` 로 감싸고 처리해본다.

`client/src/container/seatContainer`

```tsx
useEffect(() => {
  (async () => {
    // join 이벤트에 메시지 전달
    // rsv_sock.connect();
    await rsv_sock.emit("join", id);
    return () => {
      // 해당 컨테이너 unmount 시 삭제
      rsv_sock.disconnect();
    };
  })();
}, [id]);
```

제대로 작동은 한다.
그런데 다음과 같은 `wranning` 이 나온다.

```sh
'await'는 이 식의 형식에 영향을 주지 않습니다.

```

이 에러는 비동기가 아니라는건데?
그런데 제대로 작동한다.

그럼 `async` 를 제외하고 `IIFE` 로 실행해 본다.

`client/src/container/seatContainer`

```tsx
useEffect(() =>
  // join 이벤트에 메시지 전달
  // rsv_sock.connect();
  rsv_sock.emit("join", id);
  return () => {
    // 해당 컨테이너 unmount 시 삭제
    rsv_sock.disconnect();
  };
, [id])

```

제대로 동작한다...
뭐지? 뭐가 문제지? 혹시나 싶어서 `id` 값을 출력해보았지만 제대로 출력된다

이거 뭔가 이상하다.
그래서 `IIFE` 제외하고 `Build` 이후 실행해보니 제대로 동작한다.

그럼 `DEV` 상에서 발생한 문제이다.
살펴보니 `DEV` 상에서는 2번 렌더링되는것을 이전부터 알고 있었다.

이전에는 굳이 생각 안했는데, 책에서 나온것과 같이 `connect` 하는 컴포넌트와  
`disconnect` 하는 컴포넌트를 따로 나눈다면 충분히 문제가 될만하다.

일단 내가 생각한 동작원리는 다음과 같다

1. `strict` 모드에 의해 2번 렌더링 된다
2. `첫번째 렌더링시` 에 `emit` 이후 `cleanup` 함수가 실행되면  
   `socket.disconnect` 가 된다
3. `두번째 렌더링시` 에 `disconnection 된 socket` 에서 `emit` 을 하므로 동작하지  
   않는다.
4. `HomeComponent` 로 페이지 전환시, 다시 `socket.connect` 가 이루어지므로,  
   `SeatContainer` 에서 `emit` 한 `data` 를 이때 받는다.

> 이러한 이유로인해 `HomeComponent` 상의 네트워크 탭에서 `sSeatmessage` 의  
> 결과를 받아볼 수 있는것 같다
>
> `socket.io` 에서는 재연결시 기존의 `socket.id` 를 유지하고 있기 때문에 식별하고  
> 데이터를 보내주는듯 하다.
>
> 이는 `reconnectionDelay` 옵션을 사용하여, 해당 `delay` 동안 `socket.id` 를  
> 유지한다.

자.. 이 모든 잘못은 내가 `strictMode` 를 유지하고있었기 때문에 생긴 혼란이다.
그런데, 나는 `strictMode` 는 그냥 쓰고싶다.

`Dev` 모드에서는 `strictMode` 가 기본적으로 활성화 되므로, 다른 방법을 사용해야  
한다.

- `IIFE` 를 사용하여 처리한다
  이 부분은, 아직도 동작원리가 이해가 안간다. 동작되는 로직은 동일할거 같은데,  
  `IIFE` 로 처리하면 된다... 심지어 비동기로직도 아니고 동기로직인데 된다...
  왜 되지? 일단 코드로 남겨둔다.

```tsx
useEffect(() => {
  (() => {
    // join 이벤트에 메시지 전달
    // rsv_sock.connect();
    rsv_sock.emit("join", id);
    return () => {
      // 해당 컨테이너 unmount 시 삭제
      rsv_sock.disconnect();
    };
  })();
}, [id]);
```

> 이게 왜 되지? `IIFE` 로 감싸지 않으면 안된다...
> 아무리봐도 동작상으로는 같은 동작인데? 심지어 비동기 로직이라고도 보기 어렵고..
> 물론 `useEffect` 자체가 비동기지만, `callback` 자체는 동기적이다.
>
> 뭔가 콜백을 호출하는 타이밍과 연관이 있나 추축할 뿐이다...
> 해당 문제에 대해서 알려주는 내용을 아직은 찾지 못했다
> <br/>

- 책에서처럼 `StrictMode` 를 제거하는것이다  
  처음에 왜 제거하나 싶었는데.. 이것 때문인듯 하다..
  이건 별로 하고싶지는 않다..
  <br/>

- 다른 방법은 `socket.io` 의 [use-with-react disconnection](https://socket.io/how-to/use-with-react#disconnection) 내용이다
  이는 `react` 사용시 현재 발생한 문제에 대해서 다루고 있다.
  대략적으로 정리하면 `StrictMode` 는 개발하는동안 `bugs` 를 잡기위해 `2번` 실행  
  한다는 내용이다.  
  그러므로, 어플리케이션의 각 부분마다 `connection` 이 필요하다면 다음처럼 하라고  
  설명한다.

```tsx
useEffect(() => {
  // no-op if the socket is already connected
  socket.connect();

  return () => {
    socket.disconnect();
  };
}, []);
```

> 책과는 약간 다르게 알려준다.
> 사실 나도 보면서 왜 책에서는 `connection` 을 다른 컴포넌트에서 할까?  
> 싶은 생각도 들었다....
>
> 뭐.. 어떻게 개발하느냐에 따라 다르겠지...

일단 코드를 `docs` 에 나온대로 처리한다.
단, 책에서 나온대로 `HomeContainer` 에서 `socket` 연결하고,  
`sockets.disconnected` 를 사용하여 `connect` 되지 않았으면,  
`socket` 을 재연결하는 로직만 넣는다.

```tsx
useEffect(() => {
  // disconnected 되면 재연결
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
```

제대로 동작한다.
