import { Suspense } from "react";
import { connection } from "next/server";
import { revalidatePath } from "next/cache";
import { getPrisma } from "@/lib/prisma";
import styles from "./page.module.css";

// Server Action: функция, которая выполняется на сервере при отправке формы.
async function addNote(formData: FormData) {
  "use server";
  const title = String(formData.get("title") ?? "").trim();
  if (!title) return;

  await getPrisma().note.create({ data: { title: title.slice(0, 200) } });
  revalidatePath("/"); // обновить список на странице
}

// Этот компонент читает данные из базы при каждом запросе.
// Благодаря <Suspense> ниже остальная страница показывается сразу.
async function NoteList() {
  await connection(); // сообщаем Next.js: данные динамические, не кэшировать при сборке

  let titles: { id: number; title: string }[] = [];
  let failed = false;
  try {
    titles = await getPrisma().note.findMany({
      orderBy: { createdAt: "desc" },
      take: 20,
      select: { id: true, title: true },
    });
  } catch (error) {
    console.error("Не удалось прочитать заметки:", error);
    failed = true;
  }

  if (failed) {
    return (
      <p className={styles.error}>
        Нет связи с базой. Проверьте, что запущен <code>npm run db:up</code> и
        выполнена миграция <code>npm run db:migrate</code>.
      </p>
    );
  }
  if (titles.length === 0) {
    return <p className={styles.muted}>Заметок пока нет — добавьте первую.</p>;
  }
  return (
    <ul className={styles.list}>
      {titles.map((note) => (
        <li key={note.id}>{note.title}</li>
      ))}
    </ul>
  );
}

export default function Home() {
  return (
    <main className={styles.main}>
      <h1>Next.js + Prisma + PostgreSQL</h1>
      <p className={styles.muted}>
        Если вы видите добавленные заметки ниже, база данных подключена верно.
      </p>

      <form action={addNote} className={styles.form}>
        <input
          name="title"
          placeholder="Текст заметки"
          maxLength={200}
          required
        />
        <button type="submit">Добавить</button>
      </form>

      <Suspense fallback={<p className={styles.muted}>Загрузка…</p>}>
        <NoteList />
      </Suspense>
    </main>
  );
}
