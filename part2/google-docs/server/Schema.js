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
