# Liniti Node + EJS + PostgreSQL

Простой сервер на **Node.js + Express + EJS**, который читает данные из таблиц, перечисленных в `linistok.sql`, и показывает их в браузере.

## 1) Установка

```bash
npm install
```

## 2) Подготовка PostgreSQL

1. Создайте базу данных (если нужно).
2. Выполните SQL-схему из `linistok.sql`.

Пример:

```bash
psql -U postgres -d postgres -f linistok.sql
```

## 3) Настройка ENV

Скопируйте пример:

```bash
cp .env.example .env
```

И заполните параметры подключения к PostgreSQL.

## 4) Запуск

```bash
npm run dev
```
или
```bash
npm start
```

После запуска откройте:
- `http://localhost:3000/` — HTML страница с данными по всем таблицам из `linistok.sql`
- `http://localhost:3000/table/users` — JSON конкретной таблицы
- `http://localhost:3000/health` — проверка соединения с БД

## Лимит строк

По умолчанию выводится 10 строк из каждой таблицы.
Можно изменить через query-параметр:

`http://localhost:3000/?limit=25`
