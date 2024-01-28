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
