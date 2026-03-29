# Квиз Комната

MVP-платформа для проведения квизов в реальном времени.

## Стек

- `client/`: React + Vite
- `server/`: Node.js + Express + Socket.IO + SQLite

## Реализовано

- Регистрация и авторизация (`participant`, `organizer`)
- Создание квизов, редактирование и удаление
- Добавление, редактирование и удаление вопросов
- Вопросы текстом и с изображением (загрузка файла на сервер)
- Запуск сессии и вход участников по коду комнаты
- Проведение квиза в реальном времени через Socket.IO
- Подсчет баллов и финальный лидерборд
- История участия (participant) и проведенных сессий (organizer)

## Локальный запуск

```bash
npm install
npm run setup
cp server/.env.example server/.env
cp client/.env.example client/.env
npm run dev
```

По умолчанию:

- client: `http://localhost:5173`
- server: `http://localhost:4000`

## Отдельный запуск

```bash
npm run dev:server
npm run dev:client
```

## Переменные окружения

### `server/.env`

- `NODE_ENV=development`
- `PORT=4000`
- `JWT_SECRET=replace-with-a-long-random-secret`
- `CLIENT_ORIGIN=http://localhost:5173`
- `DATA_DIR` (опционально)
- `UPLOADS_DIR` (опционально)

### `client/.env`

- `VITE_API_URL=http://localhost:4000/api`
- `VITE_SERVER_URL=http://localhost:4000`

## Проверки

```bash
npm run test
npm run build --prefix client
```

## Деплой

### Полный стек (frontend + backend) на Fly.io

Проект подготовлен для деплоя одним приложением:

- [Dockerfile](./Dockerfile)
- [fly.toml](./fly.toml)

Шаги:

```bash
fly auth login
fly apps create <app-name>
fly volumes create kviz_data --size 3 --region fra --app <app-name>
fly secrets set JWT_SECRET="<long-random-secret>" CLIENT_ORIGIN="https://<app-name>.fly.dev" --app <app-name>
fly deploy --no-cache --app <app-name>
```

Примечание:

- SQLite и загрузки изображений хранятся на volume `/data`.

### Frontend на Vercel

Vercel-конфиг для клиента: [vercel.json](./vercel.json).  
Backend и Socket.IO на Vercel в текущей архитектуре не размещаются.

## API

- `GET /api/health`
- `POST /api/auth/register`
- `POST /api/auth/login`
- `GET /api/me`
- `POST /api/uploads/image`
- `POST /api/quizzes`
- `GET /api/quizzes/mine`
- `GET /api/quizzes/:quizId`
- `PUT /api/quizzes/:quizId`
- `DELETE /api/quizzes/:quizId`
- `POST /api/quizzes/:quizId/questions`
- `PUT /api/quizzes/:quizId/questions/:questionId`
- `DELETE /api/quizzes/:quizId/questions/:questionId`
- `POST /api/sessions/start`
- `POST /api/sessions/join`
- `GET /api/sessions/:roomCode/state`
- `GET /api/sessions/:roomCode/leaderboard`
- `GET /api/history/me`

## Socket.IO события

- `room:join`
- `quiz:start`
- `quiz:next-question`
- `quiz:finish`
- `question:answer`
- `question:show`
- `question:closed`
- `participants:update`
- `leaderboard:update`
- `quiz:finished`
