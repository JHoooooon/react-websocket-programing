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
