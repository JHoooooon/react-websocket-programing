import "./App.css";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { StoreProvider } from "./context";
import { LoginContainer, PostingContainer } from "./containers";

function App() {
  return (
    // StoreProvider 로 인해
    // 모든 child 들은 store 사용이 가능
    <StoreProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<LoginContainer />} />
          <Route path="/post" element={<PostingContainer />} />
        </Routes>
      </BrowserRouter>
    </StoreProvider>
  );
}

export default App;
