import Dexie from 'dexie';

const STORAGE_KEY = "med_tracker_data";

const db = new Dexie('MedicineReminderDB');
db.version(1).stores({
  medicines: '++id, name',     // id автоинкремент + индекс по имени
  history:   '++id, date, medicine, time',  // удобно искать по дате/лекарству
  // patient: 'id'  ← если patient один, можно хранить как отдельный объект
});

let isMigrated = false;

// ────────────────────────────────────────────────
// Один разовая миграция из localStorage → Dexie
async function migrateFromLocalStorage() {
  if (isMigrated) return;

  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) {
    isMigrated = true;
    return; // ничего нет → чистый старт
  }

  try {
    const oldData = JSON.parse(raw);

    // Medicines — bulkPut сохранит/обновит по id
    if (oldData.medicines?.length > 0) {
      await db.medicines.bulkPut(oldData.medicines);
    }

    // History
    if (oldData.history?.length > 0) {
      await db.history.bulkPut(oldData.history);
    }

    // Patient — если хранишь как объект, можно сохранить отдельно
    // Например: await db.patient.put({ id: 1, ...oldData.patient });

    console.log('Миграция из localStorage в Dexie завершена успешно');

    // Опционально: очистить localStorage после успешной миграции
    // localStorage.removeItem(STORAGE_KEY);

  } catch (err) {
    console.error('Ошибка миграции:', err);
    // Не удаляем localStorage — пусть остаётся как бэкап
  }

  isMigrated = true;
}

// ────────────────────────────────────────────────
// Инициализация (вызывать один раз при старте приложения)
export async function initDB() {
  await db.open();           // открываем БД (создаёт если нет)
  await migrateFromLocalStorage();
}

// ────────────────────────────────────────────────
// Основные функции (теперь через Dexie)

export async function loadData() {
  await initDB(); // на всякий случай

  const medicines = await db.medicines.toArray();
  const history   = await db.history.toArray();
  // const patient   = await db.patient.get(1) || { name: "Пациент" };

  return {
    medicines,
    history,
    // patient,
  };
}

export async function saveData(data) {
  await initDB();

  if (data.medicines) {
    await db.medicines.bulkPut(data.medicines);
  }
  if (data.history) {
    await db.history.bulkPut(data.history);
  }
  // if (data.patient) await db.patient.put({ id: 1, ...data.patient });
}

// ────────────────────────────────────────────────
// Medicines
export async function addMedicine(medicine) {
  await initDB();
  const id = await db.medicines.add({
    ...medicine,
    id: Date.now(), // или можно убрать — Dexie сам даст ++id
  });
  return id;
}

export async function deleteMedicine(id) {
  await initDB();
  await db.medicines.delete(id);
}

// ────────────────────────────────────────────────
// History
export async function addHistoryEntry(entry) {
  await initDB();
  const id = await db.history.add({
    ...entry,
    id: Date.now(),
  });
  return id;
}

export async function getTodayHistory(date) {
  await initDB();
  return await db.history.where('date').equals(date).toArray();
}

// ────────────────────────────────────────────────
// Тестовые данные (если нужно)
export async function initTestData() {
  await initDB();

  const current = await loadData();
  if (current.medicines.length === 0) {
    await db.medicines.bulkAdd([
      { id: 1, name: "Aspirina", times: ["08:00"] },
      { id: 2, name: "Metformina", times: ["12:00", "20:00"] },
    ]);
    // history пустой по умолчанию
    console.log('Тестовые данные добавлены');
  }
}