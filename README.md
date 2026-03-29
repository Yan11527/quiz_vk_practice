# Квиз Комната

Работоспособный прототип платформы для проведения квизов в реальном времени.

## Что реализовано

- Регистрация и авторизация пользователей (`participant`, `organizer`)
- Личный кабинет участника и организатора
- Создание квизов и настройка правил/времени
- Добавление вопросов:
  - текстовые и с изображением
  - с одиночным и множественным выбором
  - загрузка изображения с компьютера (файл хранится на сервере)
- Запуск комнаты квиза по коду
- Подключение участников по room code
- Real-time проведение квиза через WebSocket (Socket.IO)
- Ограничение ответа только во время показа вопроса
- Подсчет баллов и финальный лидерборд
- История участия и история проведенных сессий
- Сохранение всех данных в SQLite

## Архитектура

- `client/` — React + Vite
- `server/` — Node.js + Express + Socket.IO + SQLite

## Быстрый старт

```bash
npm install
npm run setup
cp server/.env.example server/.env
cp client/.env.example client/.env
npm run dev
```

Приложения поднимутся по умолчанию:
- клиент: `http://localhost:5173`
- сервер: `http://localhost:4000`

## Отдельный запуск

```bash
npm run dev:server
npm run dev:client
```

## Переменные окружения

### Сервер (`server/.env`)

- `NODE_ENV=development`
- `PORT=4000`
- `JWT_SECRET=replace-with-a-long-random-secret`
- `CLIENT_ORIGIN=http://localhost:5173`

Для production `JWT_SECRET` и `CLIENT_ORIGIN` обязательны.

### Клиент (`client/.env`)

- `VITE_API_URL=http://localhost:4000/api`
- `VITE_SERVER_URL=http://localhost:4000`

## Проверка перед релизом

```bash
npm run check
```

## Ключевые API endpoints

- `GET /api/health`
- `POST /api/auth/register`
- `POST /api/auth/login`
- `GET /api/me`
- `POST /api/quizzes`
- `PUT /api/quizzes/:quizId`
- `DELETE /api/quizzes/:quizId`
- `POST /api/uploads/image`
- `GET /api/quizzes/mine`
- `GET /api/quizzes/:quizId`
- `POST /api/quizzes/:quizId/questions`
- `PUT /api/quizzes/:quizId/questions/:questionId`
- `DELETE /api/quizzes/:quizId/questions/:questionId`
- `POST /api/sessions/start`
- `POST /api/sessions/join`
- `GET /api/sessions/:roomCode/state`
- `GET /api/history/me`

## Socket.IO события

- `room:join`
- `quiz:start`
- `quiz:next-question`
- `question:answer`
- `quiz:finish`
- `question:show`
- `question:closed`
- `leaderboard:update`
- `quiz:finished`
