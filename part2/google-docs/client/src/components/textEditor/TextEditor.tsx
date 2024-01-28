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
