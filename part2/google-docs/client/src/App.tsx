import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { v4 as uuid } from "uuid";
import EditorContainer from "./containers/editorContainer/EditorContainer";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* / 경로 진입시 /documents/uuid 로 redirect */}
        <Route
          path="/"
          element={<Navigate replace to={`/documents/${uuid()}`} />}
        />
        {/* /documents/:id 형식의 주소는 EditorContainer  */}
        <Route path="/documents/:id" element={<EditorContainer />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
