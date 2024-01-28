import mongoose from "mongoose";
import { Server } from "socket.io";
import { GoogleDocsModel } from "./Schema.js";

const uri = `mongodb://root:root@db:27017`;

mongoose.set("strictQuery", false);
mongoose
  .connect(uri)
  .then(() => console.log("MongoDB connected...!!"))
  .catch((err) => console.log(err));

const io = new Server(5000, {
  cors: {
    origin: "http://localhost:3000",
  },
});

const userMap = new Map();
// userMap 설정하는 함수
// documentId: 룸 아이디
// myId: 현재 유저 socket id
const setUserMap = (documentId, myId) => {
  // documentId 의 room 에 있는 모든 유저 get
  const tempUserList = userMap.get(documentId);
  // tempUserList 가 없다면
  if (!tempUserList) {
    // 현재 유저의 socket id 를 셋
    userMap.set(documentId, [myId]);
  } else {
    // 있다면, 배열에 spread 를 사용하여 tempUserList 를 나열하고,
    // 현재 유저의 아이디를 셋
    userMap.set(documentId, [...tempUserList, myId]);
  }
};

// documentId 가 db 상에 있다면 찾아서 반환하고,
// 아니면 생성해서 반환하는 함수생성
const findOrCreateDocument = async (documentId) => {
  // documentId 가 null 이면 리턴
  if (documentId == null) return;

  // GoogleDocsModel 에서 findById 를 사용하여 documentId 를 찾음
  const document = await GoogleDocsModel.findById(documentId);
  // document 가 있다면 해당 document 리턴
  if (document) return document;
  // document 가 없다면 새롭게 생성하여 리턴
  return await GoogleDocsModel.create({ _id: documentId, data: "" });
};

io.on("connection", (socket) => {
  console.log("connect!!!");
  // socket 상에서 사용할 _documentId 선언
  let _documentId = "";
  // join 이벤트 생성
  socket.on("join", async (documentId) => {
    console.log({ documentId });
    // documentId 를 _documentId 에 할당
    _documentId = documentId;
    // document 객체를 db 에서 만환
    const document = await findOrCreateDocument(documentId);
    // documentId 를 사용하여 room 생성
    socket.join(documentId);
    // document 초기화 이벤트 메시지 보냄
    socket.emit("initDocument", {
      // document.data
      _document: document.data,
      // userMap.get 을 사용하여 documentId 에 속한 모든 유저리스트 get
      userList: userMap.get(documentId) || [],
    });
    // Array.from 을 사용하여 socket.rooms 를 배열화
    // 이를 사용하여 socket.rooms[0] 의 값을 반환
    // 이는 socket.id 이다.
    const myId = Array.from(socket.rooms)[0];
    // setUserMap 을 사용하여 _documentId 와 myId 인자 할당
    setUserMap(_documentId, myId);
    // _documentId 에 속한 모든 `user` 에게 `newUser` 메시지를 보냄
    // 보낼 메시지는 myId 이다
    socket.broadcast.to(_documentId).emit("newUser", myId);
  });

  // 해당 document 의 data 를 save 하는 이벤트 생성
  socket.on("save-document", async (data) => {
    // _documentId 로 찾고 data update 하는 메서드
    await GoogleDocsModel.findByIdAndUpdate(_documentId, { data });
  });

  // 변화되었음을 알려주는 이벤트 생성
  socket.on("send-changes", async (delta) => {
    console.log({ delta: JSON.stringify(delta) });
    // _documentId 에 속한 나를 제외한 모든 유저에게 reseive-changes 메시지 전달
    socket.broadcast.to(_documentId).emit("receive-changes", delta);
  });

  // cursor-changes 이벤트를 사용하여 실시간으로 다른 사용자의 커서 클릭을 감지
  // 만약 나의 커서가 클릭을 했다면 나를 제외한 모든 사람들에게 커서의 위치 정보와
  // 나의 사용자 아이디 전송
  socket.on("cursor-changes", (range) => {
    // 현재 나의 rooms 를 반환
    const myRooms = Array.from(socket.rooms);
    // documentId 룸에 있는 나를 제외한 모든 사람들에게 range 전송
    socket.broadcast
      .to(_documentId)
      .emit("receive-cursor", { range, id: myRooms[0] });
  });

  // 소켓 연결 해제 이벤트 생성
  socket.on("disconnect", () => {
    console.log("disconnect....");
  });
});
