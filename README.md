# My App — Next.js + Prisma + PostgreSQL

Каркас приложения: **Next.js** (TypeScript, App Router) для сайта, **PostgreSQL** в Docker как база данных и **Prisma** как «переводчик» между кодом на TypeScript и базой.

## Что нужно установить заранее

| Программа | Зачем | Проверка |
|---|---|---|
| [Node.js](https://nodejs.org) 20.9+ (лучше 22 LTS) | запускает Next.js и Prisma | `node -v` |
| [Docker Desktop](https://www.docker.com/products/docker-desktop/) | запускает базу PostgreSQL | `docker --version` |

Перед шагами 3–5 Docker Desktop должен быть **запущен**.

## Запуск с нуля (5 шагов)

Все команды выполняются в папке проекта.

### 1. Установите зависимости
```bash
npm install
```
Скачивает все библиотеки из `package.json` в папку `node_modules`.

### 2. Создайте файл с настройками
```bash
cp .env.example .env
```
(Windows PowerShell: `Copy-Item .env.example .env`)

Откройте `.env` и замените `change_me_to_a_long_random_password` на свой пароль **в двух местах**: в `POSTGRES_PASSWORD` и внутри `DATABASE_URL`. Они должны совпадать. Файл `.env` не попадает в git — туда можно писать настоящие значения. В `.env.example` оставляйте только заглушки.

### 3. Запустите базу данных
```bash
npm run db:up
```
Docker скачает образ PostgreSQL и запустит базу в фоне. Проверить: `docker compose ps` — у сервиса `db` должен быть статус `healthy` (подождите несколько секунд).

### 4. Создайте клиент Prisma и таблицы
```bash
npm run db:generate
npm run db:migrate -- --name init
```
- `db:generate` создаёт в `src/generated/prisma` типизированный код для работы с базой по описанию из `prisma/schema.prisma`.
- `db:migrate` создаёт в базе таблицы (сейчас одну — `Note`) и сохраняет «историю изменений» в `prisma/migrations`. Эту папку нужно коммитить в git.

### 5. Запустите приложение
```bash
npm run dev
```
Откройте http://localhost:3000, добавьте заметку — она сохранится в PostgreSQL. Если заметка появилась в списке, всё работает.

## Команды

| Команда | Что делает |
|---|---|
| `npm run dev` | сайт в режиме разработки (http://localhost:3000) |
| `npm run build` / `npm start` | сборка и запуск «боевой» версии |
| `npm run lint` | проверка кода линтером |
| `npm run db:up` / `npm run db:down` | запустить / остановить базу (данные сохраняются) |
| `npm run db:generate` | пересоздать клиент Prisma (после изменения схемы или `npm install` на новом компьютере) |
| `npm run db:migrate -- --name <имя>` | применить изменения схемы к базе |
| `npm run db:studio` | веб-интерфейс для просмотра данных в базе |

## Как менять данные в базе

1. Измените `prisma/schema.prisma` (например, добавьте поле или модель).
2. Выполните `npm run db:migrate -- --name что_изменили`.
3. Используйте новые поля в коде через `getPrisma()` из `src/lib/prisma.ts`.

## Структура проекта

```
├── docker-compose.yml        # локальная база PostgreSQL
├── .env.example              # шаблон настроек (заглушки, коммитится)
├── .env                      # ваши настройки (создаёте сами, НЕ коммитится)
├── prisma.config.ts          # настройки Prisma CLI, берёт DATABASE_URL из .env
├── prisma/
│   ├── schema.prisma         # описание таблиц
│   └── migrations/           # история изменений базы (появится после шага 4)
└── src/
    ├── app/page.tsx          # главная страница с примером чтения/записи заметок
    ├── lib/prisma.ts         # общий клиент Prisma
    └── generated/prisma/     # сгенерированный клиент (не коммитится)
```

## Частые проблемы

- **`Cannot find module '@/generated/prisma/client'`** — не выполнен `npm run db:generate`.
- **`docker compose` ругается «Скопируйте .env.example в .env»** — нет файла `.env` (шаг 2).
- **Порт 5432 уже занят** (на компьютере стоит другой PostgreSQL) — поставьте в `.env` другой `POSTGRES_PORT`, например `5433`, и тот же порт в `DATABASE_URL`, затем `npm run db:down && npm run db:up`.
- **`P1000: Authentication failed`** после смены пароля — PostgreSQL запоминает пароль при первом создании базы. Если данных не жалко: `docker compose down -v` (удалит и данные), затем снова шаги 3–4.
- **Страница пишет «Нет связи с базой»** — проверьте `docker compose ps` и что выполнена миграция (шаг 4).

## Заметки о версиях

- Prisma закреплена на **7.10.1** (клиент и CLI одной версии). Тег `latest` для пакета `prisma` на момент создания проекта указывал на предварительную версию 8.0 RC, которая несовместима с клиентом 7.x. Обновляйте оба пакета вместе.
- В этой версии Next.js включён `cacheComponents`: данные из базы читаются внутри `<Suspense>` (см. `src/app/page.tsx`). Подробности — в `node_modules/next/dist/docs/`.
- Для работы с PostgreSQL Prisma использует драйвер `pg` через `@prisma/adapter-pg`.

## Для продакшена

`docker-compose.yml` рассчитан на локальную разработку. В продакшене используйте управляемую базу, храните `DATABASE_URL` в секретах хостинга и применяйте миграции командой `npx prisma migrate deploy`.
