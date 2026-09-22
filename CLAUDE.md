Здесь — только то, что общее для всего монорепо. Специфика пакетов живёт рядом с кодом:

- `apps/api/CLAUDE.md` — Nest, Prisma, CQRS, авторизация, изоляция данных, тесты
- `apps/web/CLAUDE.md` — Next, FSD, shadcn, сессия на cookie, формы

Работая внутри `apps/api` или `apps/web`, читай соответствующий файл — правила из него
дополняют этот и в своей зоне имеют приоритет.

## Обзор

Монорепозиторий трекера личных расходов на pnpm workspaces + Turborepo:

- `apps/api` — Nest.js 11 + Prisma, порт 4000, глобальный префикс `/api`
- `apps/web` — Next.js 15 (App Router, Tailwind 4), порт 3000
- `packages/shared-types` — общие TS-типы API-контракта

## Команды

Из корня (Turborepo прогоняет задачу по всем пакетам):

```bash
pnpm dev            # web + api параллельно
pnpm build
pnpm lint
pnpm typecheck
pnpm format         # prettier
```

Для одного пакета — через `--filter`:

```bash
pnpm --filter @expense-tracker/api dev
pnpm --filter @expense-tracker/web build
```

Команды Prisma и Jest — в `apps/api/CLAUDE.md`.

Локальная БД: `docker compose up -d postgres` (postgres:16, БД `expense_tracker`).
Контейнер проброшен на **порт 5433** хоста — 5432 занят нативным PostgreSQL 17, установленным в системе.
Переменные окружения — `.env` в корне репозитория, шаблон в `.env.example`.

## Контракт API

Правила ниже обязаны соблюдать обе стороны — меняя что-то из этого, правь и API, и web.

### Типы и enum-ы (важно)

Enum-ы существуют в двух местах и должны меняться синхронно:

- `apps/api/prisma/schema.prisma` — источник истины; бэкенд импортирует их из `@prisma/client`
- `packages/shared-types/src/enums.ts` — ручная копия для фронтенда

`apps/api` **намеренно не зависит** от `@expense-tracker/shared-types`: пакет отдаётся как TS-исходник
(`main: ./src/index.ts`, без сборки), Next транспилирует его через `transpilePackages`, а Nest
компилируется `tsc` и не смог бы собрать файлы вне своего `rootDir`. Не добавляй эту зависимость в API,
не дав пакету шаг сборки.

### Денежные значения

В БД — `Decimal(14, 2)`. По HTTP передаются **строками** (`amount: string`), чтобы не терять точность:
DTO валидируют их через `@IsNumberString()`, типы в `shared-types/src/models.ts` объявляют `string`.
Не переводи суммы в `number`.

Суммы транзакций всегда положительные; направление задаёт поле `type` (`INCOME` / `EXPENSE` / `TRANSFER`).

### Даты

По HTTP передаются ISO-строками; бэкенд валидирует их `@IsDateString()` и сам конвертирует в `Date`
перед Prisma. В update-DTO `null` и `undefined` различимы: `undefined` — «не трогать поле»,
явный `null` — «обнулить» (например, `endDate` бюджета делает его бессрочным).

### Валидация

`ValidationPipe` включён с `whitelist` и `forbidNonWhitelisted`, поэтому любое лишнее поле в теле
запроса даёт 400. Zod-схемы форм на фронте повторяют class-validator бэкенда — изменил DTO,
поправь схему.

## Git-ветки и коммиты

Правила GitHub Flow (базовая ветка `master`, именование и жизненный цикл фиче-веток)
и формат сообщений по Conventional Commits вынесены в скилл `.claude/skills/commit/SKILL.md` —
читай его перед любым коммитом.

## Pull request

Правила создания PR (заголовок по Conventional Commits, скелет русского описания,
обязательное чтение `git diff master...HEAD` и проверки перед пушем) вынесены в скилл
`.claude/skills/pr/SKILL.md` — читай его перед созданием любого PR.

## Состояние проекта

- Аутентификация по JWT работает; ролей и refresh-токенов нет.
- Бэкенд закрывает пять доменов (users, accounts, categories, transactions, budgets);
  подробности эндпоинтов — в `apps/api/CLAUDE.md`.
- Фронтенд: вход, регистрация и выход работают; страницы дашборда — заглушки без фетчинга.
  Подробности — в `apps/web/CLAUDE.md`.
