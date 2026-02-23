import React, { useState, useEffect, useRef } from "react";
import { loadData, addHistoryEntry } from "../services/storage";  // ← добавили addHistoryEntry

function Today() {
  const [medicines, setMedicines] = useState([]);
  const [history, setHistory] = useState([]);
  const [today, setToday] = useState(new Date().toISOString().split("T")[0]);
  const triggeredRef = useRef({});

  const REMINDER_WINDOW_MINUTES = 15;

  // Загрузка данных один раз
  useEffect(() => {
    let mounted = true;

    loadData()
      .then((data) => {
        if (mounted) {
          setMedicines(data.medicines || []);
          setHistory(data.history || []);
        }
      })
      .catch((err) => {
        console.error("Ошибка загрузки данных:", err);
        // Можно добавить состояние ошибки и показать сообщение
      });

    return () => {
      mounted = false;
    };
  }, []);

  // Таймер на смену дня (00:00)
  useEffect(() => {
    const updateDay = () => {
      const newDay = new Date().toISOString().split("T")[0];
      setToday(newDay);
      triggeredRef.current = {}; // сброс уведомлений
    };

    const scheduleNextMidnight = () => {
      const now = new Date();
      const tomorrow = new Date(now);
      tomorrow.setDate(tomorrow.getDate() + 1);
      tomorrow.setHours(0, 0, 0, 0);

      const msToMidnight = tomorrow.getTime() - now.getTime();

      const timer = setTimeout(() => {
        updateDay();
        scheduleNextMidnight();
      }, msToMidnight);

      return timer;
    };

    const timer = scheduleNextMidnight();
    updateDay();

    return () => clearTimeout(timer);
  }, []);

  // Запрос разрешения на уведомления
  useEffect(() => {
    if ("Notification" in window) {
      Notification.requestPermission();
    }
  }, []);

  // Периодическая проверка + видимость вкладки
  useEffect(() => {
    const check = () => checkMedicineTime();

    const interval = setInterval(check, 20000);
    check();

    const onVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        check();
      }
    };

    document.addEventListener("visibilitychange", onVisibilityChange);

    return () => {
      clearInterval(interval);
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
  }, [medicines, history, today]);

  // ────────────────────────────────────────────────
  // Вспомогательные функции

  const getTimeStatus = (timeStr) => {
    const [targetH, targetM] = timeStr.split(":").map(Number);
    const targetDate = new Date();
    targetDate.setHours(targetH, targetM, 0, 0);

    const now = new Date();
    const diffMs = now - targetDate;
    const diffMinutes = diffMs / (1000 * 60);

    if (diffMinutes < -REMINDER_WINDOW_MINUTES) return "future";
    if (diffMinutes <= REMINDER_WINDOW_MINUTES) return "active";
    return "overdue";
  };

  const isOverdue = (timeStr) => getTimeStatus(timeStr) === "overdue";

  const isTaken = (medicineName, time) =>
    history.some(
      (h) => h.date === today && h.medicine === medicineName && h.time === time
    );

  const getUpcomingReminders = () => {
    const upcoming = [];
    medicines.forEach((med) => {
      med.times.forEach((time) => {
        if (!isTaken(med.name, time) && getTimeStatus(time) === "active") {
          upcoming.push({ name: med.name, time });
        }
      });
    });
    upcoming.sort((a, b) => a.time.localeCompare(b.time));
    return upcoming;
  };

  const getOverdueReminders = () => {
    const overdue = [];
    medicines.forEach((med) => {
      med.times.forEach((time) => {
        if (!isTaken(med.name, time) && isOverdue(time)) {
          overdue.push({ name: med.name, time });
        }
      });
    });
    overdue.sort((a, b) => a.time.localeCompare(b.time));
    return overdue;
  };

  // ────────────────────────────────────────────────
  // Уведомления

  const checkMedicineTime = () => {
    const now = new Date();
    const currentTime =
      now.getHours().toString().padStart(2, "0") +
      ":" +
      now.getMinutes().toString().padStart(2, "0");

    medicines.forEach((med) => {
      med.times.forEach((time) => {
        const key = `${today}-${med.name}-${time}`;

        if (
          time === currentTime &&
          !isTaken(med.name, time) &&
          !triggeredRef.current[key]
        ) {
          triggeredRef.current[key] = true;
          triggerNotification(med.name, time);
        }
      });
    });
  };

  const triggerNotification = (medicineName, time) => {
    const key = `${today}-${medicineName}-${time}`;
    if (triggeredRef.current[key] !== true) return;

    if ("Notification" in window && Notification.permission === "granted") {
      new Notification("💊 Пора принять лекарство", {
        body: `${medicineName} — ${time}`,
        requireInteraction: true,
        icon: "/icon-192.png",
      });
    }

    const audio = new Audio("/notification.mp3");
    audio.play().catch(() => {});

    if (navigator.vibrate) {
      navigator.vibrate([400, 200, 400]);
    }
  };

  const markAsTaken = async (medicineName, time) => {
    const newEntry = {
      id: Date.now(),
      date: today,
      medicine: medicineName,
      time,
    };

    // Оптимистическое обновление UI
    const updatedHistory = [...history, newEntry];
    setHistory(updatedHistory);

    try {
      await addHistoryEntry(newEntry);
    } catch (err) {
      console.error("Ошибка сохранения приёма:", err);
      // Можно откатить UI, если критично:
      // setHistory(history);
      // или показать тост "Не удалось сохранить — попробуйте позже"
    }
  };

  // ────────────────────────────────────────────────
  // Вычисления для рендера
  const overdue = getOverdueReminders();
  const upcoming = getUpcomingReminders();

  return (
    <div className="today-container">
      <h4 className="today-title">Сегодня</h4>

      {overdue.length > 0 ? (
        <div className="reminder-banner overdue-banner">
          <strong>‼️ Просрочено! Примите срочно:</strong>
          {overdue.map((r) => (
            <div key={`${r.name}-${r.time}`} className="reminder-item">
              <strong>{r.name}</strong> (было в {r.time})
            </div>
          ))}
        </div>
      ) : upcoming.length > 0 ? (
        <div className="reminder-banner">
          💊 Пора / скоро принимать:
          {upcoming.map((r) => (
            <div key={`${r.name}-${r.time}`} className="reminder-item">
              <strong>{r.name}</strong> в {r.time}
            </div>
          ))}
        </div>
      ) : (
        <div className="all-done-banner">
          🎉 Всё принято или ещё впереди на сегодня!
        </div>
      )}

      {medicines.length === 0 ? (
        <div className="empty-state">Лекарства не добавлены</div>
      ) : (
        medicines.map((med) => {
          const sortedTimes = [...med.times].sort();

          return (
            <div key={med.id} className="medicine-card">
              <h3 className="medicine-name">{med.name}</h3>

              {sortedTimes.map((time) => {
                const taken = isTaken(med.name, time);
                const status = getTimeStatus(time);

                let statusText = "⭕ Ожидает";
                let rowClass = "";

                if (taken) {
                  statusText = "✅ Принято";
                  rowClass = "taken";
                } else if (status === "overdue") {
                  statusText = "‼️ Просрочено";
                  rowClass = "overdue";
                } else if (status === "active") {
                  statusText = "💊 Пора / скоро";
                  rowClass = "active";
                }

                return (
                  <div
                    key={time}
                    className={`time-row ${taken ? "taken" : ""} ${rowClass}`}
                  >
                    <span className="time">{time}</span>
                    <span className="status">{statusText}</span>

                    {!taken && (
                      <button
                        className="take-button"
                        onClick={() => markAsTaken(med.name, time)}
                      >
                        Принял
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          );
        })
      )}
    </div>
  );
}

export default Today;