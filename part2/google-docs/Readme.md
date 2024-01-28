# Google docs

구글에서 제공하는 온라인 편집기능을가진 문서이다.
이를 간단한게 구현해본다.

이는 여러 작업자가 동시에 문서 편집이 가능하며 일정 시간이 지나면 자동으로  
저장되는 기능을 가진다.

이를 구현하는것이 이번 챕터의 목표다.

## docker setting

책에서는 `mongodb atlas` 로 `db` 생성하는듯 하다.
그냥 `docker` 로 설정한다

`docker` 설정을 위해 `dockerFiles` 폴더를 생성한다
그리고 `server` 와 `client` 용 폴더를 생성하고 안에 `docerFile.dev` 를 생성한다.

`dockerFiles/client/Dockerfile.dev`

```dockerFile

FROM node:21-alpine

WORKDIR /usr/src/app

COPY ./client/package*.json ./

RUN npm ci

COPY ./client ./

EXPOSE 3000

CMD ["npm", "start"]

```

`dockerFiles/server/Dockerfile.dev`

```dockerFile

FROM node:21-alpine

WORKDIR /usr/src/app

COPY ./server/package*.json ./

RUN npm ci

COPY ./server ./

EXPOSE 5000

CMD ["npm", "start"]

```

> `docker-compose` 는 `context` 상대경로가 갑자기 조금 헷갈려서 내용을
> 정리해둔다.

`dockerFiles/docker-compose.yaml`

```yaml
version: "3.1"

services:
  frontend:
    build:
      # docker-compose 파일 기준으로 기준이될 상대경로를 지정한다.
      # 현재 google-docs/ 로 지정했다
      context: ../
      # context 로 지정한 경로기준으로 dockerFile 의 상대경로를 지정한다
      # 아래는 다음과 같다. google-docs/dockerFiles/client/Dockerfile.dev
      dockerfile: ./dockerFiles/client/Dockerfile.dev
    container_name: frontend
    volumes:
      # 현재 docker-compose 파일 기준 bind volumes 할 상대경로를 지정한다.
      # 아래는 google-docs/client 를 /usr/src/app 에 바인드한다
      - ../client:/usr/src/app
    ports:
      - 3000:3000
  backend:
    build:
      # docker-compose 파일 기준으로 기준이될 경로를 지정한다.
      # 현재 google-docs/ 로 지정했다
      context: ../
      # context 로 지정한 경로기준으로 dockerFile 의 위치경로를 지정한ㄷ
      # 아래는 다음과 같다. google-docs/dockerFiles/server/Dockerfile.dev
      dockerfile: ./dockerFiles/server/Dockerfile.dev
    container_name: backend
    volumes:
      # 현재 docker-compose 파일 기준 bind volumes 할 상대경로를 지정한다.
      # 아래는 google-docs/server 를 /usr/src/app 에 바인드한다
      - ../server:/usr/src/app
    ports:
      # port 지정
      - 5000:5000
    depends_on:
      # 의존성 설정
      # db 실행이후 server 가 생성된다.
      - db
  db:
    image: mongo
    # 매번 재실행하도록 설정한다.
    # 이는 dockerhub 의 mongo 에서 이렇게 하라고 지시되어있다.
    restart: always
    environment:
      # test 용이므로 root 로 작성한다.
      # 원래는 .env 생성이후 처리해야 한다.
      MONGO_INITDB_ROOT_USERNAME: root
      MONGO_INITDB_ROOT_PASSWORD: root
```

이렇게 하면 `mongodb`, `server`, `client` 전부 생성되었다.
서버 설정을 위해 다음의 패키지를 설치한다

`server/`

```sh

npm i mongoose nodemon socket.io;

```

`mongoose` 사용을 위해 `Schema.js` 를 생성한다.

`server/schema.js`

```ts
import { Schema, model } from "mongoose";

// Schema 생성
// `mongodb` 특성상 `type` 지정이 까다로워 이를 지원하기 위해
// `mongoose` 에서 제공하는 api 이다
const googleDocsSchema = new Schema({
  // id field
  _id: String,
  // data field
  data: Object,
});

// GoogleDocs 모델 생성
// 모델은 `document` 를 구성하는 클래스를 생성한다.
// 첫번째 인자는 `collection` 이름을 지정한다.
// 두번째 인자는 모델에서 사용할 `schema` 객체를 지정한다.
export const GoogleDocsModel = model("GoogleDocs", googleDocsSchema);
```

`server/server.js`

```ts
import mongoose from "mongoose";
import { Server } from "socket.io";
import { GoogleDocsModel } from "./Schema.js";

const uri = `mongodb://root:root@db:27017`;

mongoose.set("strictQuery", false);
mongoose
  .connect(uri)
  .then(() => console.log("MongoDB connected..."))
  .catch((err) => console.log(err));

const io = Server(5000, {
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
  return await GoogleDocsModel.create({ _id: documentId, data: defaultValue });
};

io.on("conenction", (socket) => {
  // socket 상에서 사용할 _documentId 선언
  let _documentId = "";
  // join 이벤트 생성
  socket.on("join", async (documentId) => {
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
```

이제 `client` 를 구현한다.
구하기전에 `TextEditor.type.ts` 의 `TextEditorProps` 인터페이스를 본다.

`client/src/components/textEditor/TextEdtor.type.ts`

```ts
import { Ref } from "react";
import ReactQuill, { Range, UnprivilegedEditor } from "react-quill";
import { Sources, DeltaStatic } from "quill";

// OnChangeTextHandler
//
// content: 변경된 컨텐츠 내용
//
// delta: 편집기 내용을 표현하고 조작하는데 사용되는 구조를 delta 라고 한다.
//        여기서 delta 는 delta 객체를 나타내며, 텍스트 삽입, 삭제 등등 편집기
//        컨텐츠에 적용할 변경사항을 나타낸다
//
// source: 'user' | 'api' | 'silence' 를 구분하는 union 타입이다.
//         이벤트처리시 컨텐츠 변경사항을 적용하는 다양한 방법을 나타낸다
//
//         - 'user': 사용자가 편집기와 상호 작용하여 변경한 내용을 뜻한다
//         - 'api': QuillAPi 를 사용하여 프로그래밍 방식으로 변경된 내용을 뜻한다
//         - 'silence': handleChange 이벤트를 트리거 하지 않고 변경 사항이 자동적용
//                  됨을 뜻한다.
//
// editor: UnprivilegedEditor 타입을 가진다.
//         이는 해석하자면 특권이 없는 편집기를 이야기 하는데,
//         수정권한이 없는 읽기전용 메서드만을 가진 editor 를 뜻한다
//         실제 제공되는 메서드들이 전부 읽기 전용이다.
//
export type OnChangeTextHandler = (
  content: string,
  delta: DeltaStatic,
  source: Sources,
  editor: UnprivilegedEditor
) => void;

// OnChangeSelection
//
// selection: Range 타입을 가진다. Range 타입은 RangeStatic | null  타입을
//            가지며, null 이 아니면, index 와 length 값을 가진 객체를
//            반환한다.
//            Range 는 RangeStatic | null 타입이다.
//
//            export interface RangeStatic {
//                index: number; -> 컨텐츠 range 의 시작 index
//                length: number; -> index 부터 선택된 범위 길이
//            }
//
// 나머지는 위의 OnChangeTextHandler 와 동일하다
//
export type OnChangeSelection = (
  selection: Range,
  source: Sources,
  editor: UnprivilegedEditor
) => void;

export interface TextEditorProps {
  // text 값
  text: string;
  // text 핸들러
  onChangeTextHandler: OnChangeTextHandler;
  // reactQuillRef 로 ReactQuill 에대한 ref 값
  reactQuillRef: Ref<ReactQuill>;
  // 선택 핸들러
  onChangeSelection: OnChangeSelection;
}
```

이제 위의 타입을 사용하여 `TextEditor.tsx` 를 만든다

`client/src/component/textEditor/TextEditor.tsx`

```tsx
import QuillCursors from "quill-cursors";
import ReactQuill, { Quill } from "react-quill";
import "react-quill/dist/quill.snow.css";
import { TextEditorProps } from "./TextEdtor.type";
import { container } from "./TextEditor.style";

// Quill editor 에서 사용할 module 설정
const modules = {
  // cursors 사용
  cursors: true,
  // toolbar 설정
  toolbar: [
    [{ header: [1, 2, 3, 4, 5, 6, false] }],
    [{ font: [] }],
    [{ list: "ordered" }, { list: "bullet" }],
    ["bold", "italic", "underline", "strike"],
    [{ color: [] }, { background: [] }],
    [{ script: "sub" }, { script: "super" }],
    [{ align: [] }],
    ["images", "blockquote", "code-block"],
    ["clean"],
  ],
};

// Quill class 의 static method 인 register 를
// 사용하여 QuillCursors 등록
// register 는 quilll editor 에 `module`, `format`, `theme` 을
// 추가해 사용할수 있도록 만든다
// 추가사항으로, 등록시 prefix 로 `modules/`, `format/`, `theme/` 을
// 사용하여 추가한다.
// 아래는 `modules/cursors` 로 QuillCursors 를 추가한 것이다
Quill.register("modules/cursors", QuillCursors);

// TextEditor component
const TextEditor = ({
  text,
  onChangeTextHandler,
  reactQuillRef,
  onChangeSelection,
}: TextEditorProps) => {
  return (
    <div css={container}>
      <ReactQuill
        theme="snow"
        modules={modules}
        value={text}
        onChange={onChangeTextHandler}
        onChangeSelection={onChangeSelection}
        ref={reactQuillRef}
      />
    </div>
  );
};

export default TextEditor;
```

`EditorContainer` 를 만들어서 `Quill` 이벤트를 관장하는 역할을 하는
컴포넌트를 만든다

`client/src/containers/editorContainer/EditorContainer.tsx`

```ts
import { useEffect, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import { docsSocket } from "../../socket";
import { InitDocumentRes, UserType } from "./EditorContainer.type";
import ReactQuill, { Range } from "react-quill";
// react-quill 2.0.0 은 @types/quill ^1.3.10 을 사용한다.
// @types/quill 최신버전은 DeltaStatic 이 없고, quill-delta 패키지를 따로
// 제공한다. 현재 DeltaStatic 과 quill-dleta 에서 제공하는 Delta 는
// 호환되지 않아 타입참조를 위해 @types/quill ^1.3.10 을 사용한다
//
//  https://www.npmjs.com/package/react-quill?activeTab=code 에서
// devDependancy 에서 설치된 @types/quill 확인 가능하다.
import { DeltaStatic } from "quill";
import QuillCursors from "quill-cursors";
import { debounce } from "lodash";
import TextEditor from "../../components/textEditor/TextEditor";
import {
  OnChangeSelection,
  OnChangeTextHandler,
} from "../../components/textEditor/TextEdtor.type";

// cursor 의 map
const cursorMap = new Map();
// cursor 색상모음
const cursorColor = [
  "#FF0000",
  "#FF5E00",
  "#FFBB00",
  "#FFE400",
  "#ABF200",
  "#1DDB16",
  "#00D8FF",
  "#0054FF",
];

const EditorContainer = () => {
  // 시간 ref
  // setTimeout 함수가 반환하는 NodeJS.Timeout 을 담을 ref
  const timerRef = useRef<NodeJS.Timeout>();
  // cursor ref
  // reactQuillRef.currnt.getEditor().getModule('cursors') 로 나온 결과값이다
  // 이는 Cursors 모듈의 인스턴스이다.
  const cursorRef = useRef<QuillCursors>();
  // reactQuill ref
  const reactQuillRef = useRef<ReactQuill>(null);
  // url 의 params 에서 id 추출
  const { id: documentId } = useParams();
  // text state 생성
  const [text, setText] = useState("");

  // cursor 설정
  const setCursor = (id: string) => {
    // cursorMap 에 id 가 없고, cursorRef.current 가 존재한다면
    if (!cursorMap.get(id) && cursorRef.current) {
      // cursorRef.current.createCursor 를 사용하여
      // cursor 인스턴스 생성
      // 존재한다면 생성하지 않고, 존재하지 않는다면 생성하고 add 한다
      //
      // id: unique ID
      // name: cursor 에 표시될 이름
      // color: cursor 에서 사용될 css color
      //
      // return 값은 다음와 같다
      // {
      //   id: string;
      //   name: string;
      //   color: string;
      //   range: Range; // See https://quilljs.com/docs/api/#selection-change
      // }
      //
      // 이는 cursorRef.current 값에 새로운 cursor 를 add 한다고 보면 된다.
      cursorRef.current.createCursor(
        id, // id
        id, // name
        cursorColor[Math.floor(Math.random() * 8)] // css color
      );
      // id 값을 key 로 하고, cursorRef.current 를 값으로써 할당한다
      cursorMap.set(id, cursorRef.current);
    }
  };

  // cursor 위치 업데이트 debounce 함수
  // 1 초안에 입력이 발생하면, 초기화 하고 최신의 값으로 함수를 실행시킨다
  const debouncedUpdate = debounce((range: Range, id: string) => {
    cursorMap.get(id).moveCursor(id, range);
  }, 1000);

  // onChangeTextHandler 생성
  // content 변경시, save-document 메시지를 보낸다
  // 이는 1초마다 실행되도록 setTimeout 을 통해 내용을 저장한다.
  //
  const onChangeTextHandler: OnChangeTextHandler = (
    content,
    delta,
    source,
    editor
  ) => {
    // timerRef 가 존재한다면, clearTimeout 을 한다
    if (timerRef.current !== null) {
      clearTimeout(timerRef.current);
    }
    // 1 초 마다 save-document 메시지를 보낸다
    // 변경된 내용을 1초 이후로 실행한다.
    timerRef.current = setTimeout(() => {
      docsSocket.emit(
        "save-document",
        // 사실 밑에는 reactQuillRef 를 참조해서 getContents 하는데,
        // editor.getContents() 해도 될것 같다..
        reactQuillRef.current?.getEditor().getContents()
      );
    }, 1000);
    if (source !== "user") return;
    docsSocket.emit("send-changes", delta);
  };

  // onChangeSelection 함수 생성
  // 편집기에서 커서위치 변경시, 해당 range 값을 cursor-changes 로 emit 한다.
  //
  const onChangeSelection: OnChangeSelection = (selection, source, editor) => {
    // source 가 user 가 아니면 return
    if (source !== "user") return;
    // cursor-change 로 cursor 의 range 값을 보냄
    console.log({ selection });
    docsSocket.emit("cursor-changes", selection);
  };

  // socket 연결 및 disconnect
  useEffect(() => {
    // // docsSocket 이 disconnected 되었는지 확인
    console.log(documentId);
    // }
    // join 이벤트 메시지 emit
    docsSocket.emit("join", documentId);
    // unmount 시 실행할 cleanup 함수
    return () => {
      // docsSocket.disconnect 실행
      docsSocket.disconnect();
    };
  }, [documentId]);

  // cursorRef 를 할당
  useEffect(() => {
    // reactQuilRef.current 가 없다면 리턴
    if (!reactQuillRef.current) return;
    // reactQuillRef 에서 getModule 을 사용하여 `cursors` 모듈 인스턴스 할당
    cursorRef.current = reactQuillRef.current.getEditor().getModule("cursors");
  }, []);

  // initDocument 이벤트를 한번만 emit 한다
  //
  // 이는 현재 user 를 제외한 모든 유저를 가져오고,
  // cursor 를 등록한다
  useEffect(() => {
    // once 는 소켓 연결 이후 한번만 실행되는 함수이다
    docsSocket.once("initDocument", (res: InitDocumentRes) => {
      // res 값에서 _document, userList 를 구조분해
      const { _document, userList } = res;
      // _document 를 text 할당
      setText(_document);
      // userList 에서 각 user 를 받아 setCursor 함수 실행
      userList.forEach((user) => {
        setCursor(user);
      });
    });
  }, []);

  // newUser 이벤트 생성
  // 현재 유저를 등록했다고 알리는 이벤트
  useEffect(() => {
    // cursorHandler 콜백 함수 생성
    const setCursorHandler = (user: UserType) => {
      // setCursor 를 사용하여 cursor 추가
      setCursor(user);
    };
    // newUser 이벤트 생성
    docsSocket.on("newUser", setCursorHandler);
    return () => {
      // newUser 이벤트 메모리해제
      docsSocket.off("newUser", setCursorHandler);
    };
  }, []);

  // receive-changes 이벤트 생성
  // server 로 부터 send-changes 이벤트 에서 recevie-changes 에
  // delta 를 보낸다
  // 받은 delta 를 사용하여 editor 의 contents 를 update 한다
  useEffect(() => {
    // receive-changes 콜백함수
    const updateContentHandler = (delta: DeltaStatic) => {
      console.log({ delta });
      reactQuillRef.current?.getEditor().updateContents(delta);
    };
    // receive-changes 이벤트 생성
    docsSocket.on("receive-changes", updateContentHandler);

    // cleanup 함수
    return () => {
      docsSocket.off("recevie-changes", updateContentHandler);
    };
  }, []);

  // recive-cursor 이벤트 생성
  // cursor-change emit 시 range 값을 받아서,
  // room 에서 자신을 제외한 모든 유저에게 res 값 전달
  useEffect(() => {
    const updateHandler = (res: { range: Range; id: string }) => {
      // Range 는 RangeStatic | null 타입이다.
      //
      // export interface RangeStatic {
      //     index: number;
      //     length: number;
      // }
      //
      // index 는 범위의 시작 인덱스를 나타낸다
      // 이는 전체 텍스트내용내에서 범위의 첫번째 문자 위치값이다.
      // length 는 범위의 문자수를 나타낸다
      // 시작 인덱스에서부터 해당 범위까지의 길이를 나타낸다
      //
      // id 값은 socket.id 이다.
      const { range, id } = res;
      console.log({ res });
      // debouncedUpdate 를 사용하여 cursor 의 위치값을
      // 갱신한다.
      debouncedUpdate(range, id);
    };
    // receive-cursor 이벤트 생성
    docsSocket.on("receive-cursor", updateHandler);
    return () => {
      // receive-cursor 이벤트 메모리 해제
      docsSocket.off("receive-cursor", updateHandler);
    };
  }, [debouncedUpdate]);

  return (
    <TextEditor
      text={text}
      onChangeTextHandler={onChangeTextHandler}
      onChangeSelection={onChangeSelection}
      reactQuillRef={reactQuillRef}
    />
  );
};

export default EditorContainer;
```

이제 실행하면 잘 되는것을 볼 수 있다.
