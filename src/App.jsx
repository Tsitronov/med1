import { useEffect } from "react";
import { Routes, Route, Link } from "react-router-dom";
import Today from "./components/Today";
import Medicines from "./components/Medicines";
import History from "./components/History";
import Statistics from "./components/Statistics";
import "./components/Today.css";           // если стили только для Today — можно импортировать в Today
import { initDB } from './services/storage';

function App() {
useEffect(() => {
    initDB().then(async () => {
      const data = await loadData();
      console.log("После инициализации в БД:", {
        medicines: data.medicines?.length || 0,
        history: data.history?.length || 0
      });

      // Временно: посмотреть, что в localStorage
      console.log("localStorage сейчас:", localStorage.getItem("med_tracker_data"));
    }).catch(err => console.error(err));
  }, []);

  return (
    <div className="app-wrapper">          {/* ← лучше общий контейнер */}

      <nav className="nav-bar">            {/* ← отдельный класс для навбара */}
        <Link to="/">Today</Link>
        <Link to="/medicines">Medicines</Link>
        <Link to="/history">History</Link>
        <Link to="/statistics">Statistics</Link>
      </nav>

      <main className="content">
        <Routes>
          <Route path="/" element={<Today />} />
          <Route path="/medicines" element={<Medicines />} />
          <Route path="/history" element={<History />} />
          <Route path="/statistics" element={<Statistics />} />
        </Routes>
      </main>
    </div>
  );
}

export default App;