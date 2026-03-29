# UI Design Blueprint (Miro/Figma)

Этот файл закрывает шаг 1 из алгоритма: проектирование интерфейса перед реализацией.

## Карта экранов (для Miro)

1. Гостевой контур
- `Login`
- `Register`

2. Контур организатора
- `Dashboard (organizer)`
- `Quiz Editor`
- `Live Room (organizer controls)`
- `History of conducted quizzes`

3. Контур участника
- `Dashboard (participant)`
- `Join by room code`
- `Live Room (participant mode)`
- `Participation history`

4. Общие состояния
- `Waiting room`
- `Question active`
- `Question closed`
- `Quiz finished + leaderboard`

## Компоненты (для Figma)

- `Topbar` (бренд, роль пользователя, кнопка выхода)
- `Card` (контейнер контента)
- `Table` (история/лидерборд)
- `Primary / Outline / Danger buttons`
- `Form controls` (input/select/textarea)
- `Answer Option` (normal/selected/disabled)
- `Status messages` (info/error)

## Пользовательские потоки

1. Организатор
- Регистрация/вход
- Создание квиза
- Добавление вопросов и вариантов
- Запуск сессии -> получение кода комнаты
- Старт квиза -> показ вопросов -> переключение на следующий
- Завершение -> просмотр победителя и таблицы

2. Участник
- Регистрация/вход
- Ввод кода комнаты
- Получение вопросов в real-time
- Ответы в отведенное время
- Просмотр итогового лидерборда
- Просмотр результата в истории

## Файлы, где реализованы интерфейсы

- `client/src/pages/LoginPage.jsx`
- `client/src/pages/RegisterPage.jsx`
- `client/src/pages/DashboardPage.jsx`
- `client/src/pages/QuizEditorPage.jsx`
- `client/src/pages/LiveQuizPage.jsx`
- `client/src/index.css`
