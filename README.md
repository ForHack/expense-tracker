# Expense Tracker

Монорепозиторий трекера личных расходов: Next.js на фронтенде, Nest.js на бэкенде, PostgreSQL + Prisma.

## Структура

```
apps/
  web/               Next.js 15 (App Router, Tailwind 4) — порт 3000
  api/               Nest.js 11 + Prisma — порт 4000, префикс /api
    prisma/          schema.prisma и seed.ts
packages/
  shared-types/      Общие TS-типы API-контракта (потребляется как исходник)
```

Инструменты: pnpm workspaces + Turborepo.

## Запуск

```bash
pnpm install
cp .env.example .env

# PostgreSQL в Docker (порт 5433 на хосте)
docker compose up -d postgres

# Схема БД
pnpm --filter @expense-tracker/api prisma:generate
pnpm --filter @expense-tracker/api prisma:migrate --name init
pnpm --filter @expense-tracker/api db:seed   # опционально: демо-данные

pnpm dev
```

- Фронтенд: http://localhost:3000
- API: http://localhost:4000/api

## Скрипты в корне

| Команда          | Описание                      |
| ---------------- | ----------------------------- |
| `pnpm dev`       | Параллельный запуск web и api |
| `pnpm build`     | Сборка всех пакетов           |
| `pnpm lint`      | ESLint по всем пакетам        |
| `pnpm typecheck` | Проверка типов                |
| `pnpm format`    | Prettier                      |

## API

CRUD-ресурсы под префиксом `/api`: `users`, `accounts`, `categories`, `transactions`, `budgets`.
`GET /api/transactions` поддерживает фильтры `accountId`, `categoryId`, `type`, `dateFrom`, `dateTo`
и пагинацию `page`/`perPage`, возвращая `{ data, meta }`. Владелец берётся из токена, поэтому
`userId` в query нет, а неизвестные параметры (включая прежние `from`/`to`) дают 400 —
это `forbidNonWhitelisted` в `ValidationPipe`.

`GET /api/transactions/summary?month=&year=` — агрегация за календарный месяц (UTC):
`{ month, year, income, expense, balance, byCategory }`, суммы строками. Оба параметра обязательны,
иначе 400. `TRANSFER` не входит в `income`/`expense`/`balance` (это перемещение между своими
счетами), но встречается в `byCategory`; там же строка с `categoryId: null` — транзакции без категории.

## Соглашения

- Денежные суммы — `Decimal(14,2)` в БД и **строки** в JSON, чтобы не терять точность.
- Enum-ы продублированы: бэкенд берёт их из `@prisma/client`, фронтенд — из
  `packages/shared-types/src/enums.ts`. При изменении `schema.prisma` обновлять оба места.
- Модуль аутентификации ещё не реализован: `userId` передаётся явно в DTO и query-параметрах,
  `JWT_SECRET` зарезервирован в `.env.example`. Хеширование паролей временно на `node:crypto` scrypt
  (`UsersService.hashPassword`).
