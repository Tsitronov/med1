import React, { useState, useEffect } from "react";
import { loadData } from "../services/storage";

function History() {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData()
      .then((data) => {
        setHistory(data.history || []);
        setLoading(false);
      })
      .catch((err) => {
        console.error("Ошибка загрузки истории:", err);
        setLoading(false);
      });
  }, []);

  if (loading) {
    return (
      <div>
        <h2>История</h2>
        <p>Загрузка...</p>
      </div>
    );
  }

  if (history.length === 0) {
    return (
      <div>
        <h2>История</h2>
        <p>Нет записей о приёме лекарств</p>
      </div>
    );
  }

  // Группировка по дате
  const groupedByDate = history.reduce((acc, item) => {
    if (!acc[item.date]) {
      acc[item.date] = [];
    }
    acc[item.date].push(item);
    return acc;
  }, {});

  return (
    <div>
      <h2>История приёмов</h2>

      {Object.keys(groupedByDate)
        .sort()
        .reverse()
        .map((date) => (
          <div key={date} style={{ marginBottom: "20px" }}>
            <h3>{date}</h3>
            <ul style={{ listStyle: "none", padding: 0 }}>
              {groupedByDate[date].map((entry) => (
                <li
                  key={entry.id}
                  style={{
                    marginBottom: "8px",
                    padding: "8px",
                    background: "#f9f9f9",
                    borderRadius: "4px",
                  }}
                >
                  <strong>{entry.medicine}</strong> — {entry.time}
                </li>
              ))}
            </ul>
          </div>
        ))}
    </div>
  );
}

export default History;