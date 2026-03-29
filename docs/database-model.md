# Database Model

Этот файл закрывает шаг 2 из алгоритма: проектирование модели данных.

## Основные сущности

- `users`: участники и организаторы
- `quizzes`: квизы, созданные организаторами
- `questions`: вопросы квиза
- `question_options`: варианты ответов
- `quiz_sessions`: запуски квизов (комнаты)
- `session_participants`: участники конкретной сессии и их суммарные баллы
- `answers`: ответы участников по каждому вопросу

## ER-диаграмма

```mermaid
erDiagram
    users ||--o{ quizzes : creates
    quizzes ||--o{ questions : contains
    questions ||--o{ question_options : has
    quizzes ||--o{ quiz_sessions : starts
    quiz_sessions ||--o{ session_participants : includes
    users ||--o{ session_participants : joins
    quiz_sessions ||--o{ answers : stores
    users ||--o{ answers : submits
    questions ||--o{ answers : answers
```

## Ключевые ограничения

- `users.email` уникален
- `quiz_sessions.room_code` уникален
- `questions(quiz_id, position)` уникален
- `session_participants(session_id, user_id)` уникален
- `answers(session_id, user_id, question_id)` уникален
- все внешние ключи включены (`PRAGMA foreign_keys = ON`)

## Реализация

Схема создается автоматически при запуске сервера:
- `server/src/db.js`
