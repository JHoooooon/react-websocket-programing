import { BrowserRouter, Navigate, Route } from "react-router-dom";
import "./App.css";
import GoodsPage from "./GoodsPage";
import UserPage from "./UserPage";

function App() {
  return (
    <BrowserRouter>
      <Route path="/" element={<Navigate replace to="/goods" />} />
      <Route path="/goods" element={<GoodsPage />} />
      <Route path="/goods" element={<UserPage />} />
    </BrowserRouter>
  );
}

export default App;
