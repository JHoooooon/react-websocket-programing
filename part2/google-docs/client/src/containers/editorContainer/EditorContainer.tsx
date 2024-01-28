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
