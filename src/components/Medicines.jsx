import React, { useState, useEffect } from "react";
import { loadData, addMedicine, deleteMedicine } from "../services/storage";  // ← добавь нужные функции

function Medicines() {
  const [medicines, setMedicines] = useState([]);           // начальное значение — пустой массив
  const [name, setName] = useState("");
  const [timesInput, setTimesInput] = useState("");
  const [loading, setLoading] = useState(true);             // опционально — для UX

  // Загрузка данных (асинхронно!)
  useEffect(() => {
    loadData()
      .then((data) => {
        setMedicines(data.medicines || []);
        setLoading(false);
      })
      .catch((err) => {
        console.error("Ошибка загрузки лекарств:", err);
        setLoading(false);
        // можно добавить состояние ошибки
      });
  }, []);

  const handleAddMedicine = async () => {
    if (!name || !timesInput) return;

    const timesArray = timesInput
      .split(",")
      .map((t) => t.trim())
      .filter((t) => t !== "");

    const newMedicine = {
      id: Date.now(),
      name,
      times: timesArray,
    };

    try {
      // Оптимистическое обновление UI
      const updated = [...medicines, newMedicine];
      setMedicines(updated);

      // Реальное сохранение в БД
      await addMedicine(newMedicine);  // ← используем функцию из storage.js

      setName("");
      setTimesInput("");
    } catch (err) {
      console.error("Ошибка добавления лекарства:", err);
      // откат UI если нужно: setMedicines(medicines);
    }
  };

  const handleDeleteMedicine = async (id) => {
    try {
      // Оптимистическое удаление
      const updated = medicines.filter((m) => m.id !== id);
      setMedicines(updated);

      await deleteMedicine(id);  // ← из storage.js
    } catch (err) {
      console.error("Ошибка удаления:", err);
      // откат если критично
    }
  };

  if (loading) {
    return <div>Загрузка лекарств...</div>;
  }

  return (
    <div>
      <h2>Medicines</h2>

      <div style={{ marginBottom: "16px" }}>
        <input
          type="text"
          placeholder="Название"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />

        <input
          type="text"
          placeholder="Время (08:00, 14:00, 20:00)"
          value={timesInput}
          onChange={(e) => setTimesInput(e.target.value)}
        />

        <button onClick={handleAddMedicine}>Добавить</button>
      </div>

      {medicines.length === 0 ? (
        <p>Список пуст</p>
      ) : (
        <ul>
          {medicines.map((m) => (
            <li key={m.id}>
              <strong>{m.name}</strong> — {m.times.join(", ")}
              <button
                onClick={() => handleDeleteMedicine(m.id)}
                style={{ marginLeft: "10px" }}
              >
                Удалить
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default Medicines;