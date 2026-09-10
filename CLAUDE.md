# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

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

Prisma (все скрипты живут в `apps/api`, схема — `apps/api/prisma/schema.prisma`):

```bash
pnpm --filter @expense-tracker/api prisma:generate
pnpm --filter @expense-tracker/api prisma:migrate --name <имя>   # migrate dev
pnpm --filter @expense-tracker/api prisma:studio
pnpm --filter @expense-tracker/api db:seed
```

Тесты (Jest + ts-jest, `rootDir: src`, файлы `*.spec.ts`):

```bash
pnpm --filter @expense-tracker/api test
pnpm --filter @expense-tracker/api test -- transactions.service.spec.ts   # один файл
pnpm --filter @expense-tracker/api test -- -t "имя теста"                 # один тест
```

Локальная БД: `docker compose up -d postgres` (postgres:16, БД `expense_tracker`).
Контейнер проброшен на **порт 5433** хоста — 5432 занят нативным PostgreSQL 17, установленным в системе.
Переменные окружения — `.env` в корне репозитория, шаблон в `.env.example`.

## Архитектура

### Бэкенд

`AppModule` подключает `ConfigModule.forRoot({ isGlobal: true })` с `envFilePath: ['.env', '../../.env']`
— то есть `.env` берётся из корня монорепо, а не из `apps/api`.

`PrismaModule` помечен `@Global`, поэтому `PrismaService` инжектится в любой сервис без импорта модуля.
`PrismaService` наследует `PrismaClient` и подключается/отключается по хукам жизненного цикла Nest.

Пять доменных модулей построены по одному шаблону: `<domain>.module.ts` + `.controller.ts` + `.service.ts` + `dto/`.
Сервисы вызывают Prisma напрямую; репозиторный слой есть только у `users` (`UsersRepository` —
единственное место, где трогают `prisma.user`). Update/delete сначала зовут `findOne`,
который бросает `NotFoundException` — это единственный источник 404.

### Аутентификация

`AuthModule` (`apps/api/src/auth/`) выдаёт JWT: `POST /api/auth/register`, `POST /api/auth/login`,
`GET /api/auth/me`. Только access-токен, refresh нет. Секрет — `JWT_SECRET` (обязателен,
`getOrThrow`), время жизни — `JWT_EXPIRES_IN` (по умолчанию `15m`).

`JwtAuthGuard` зарегистрирован глобально через `APP_GUARD`, поэтому **токен нужен на всех
маршрутах**. Исключения помечаются `@Public()` (`auth/decorators/public.decorator.ts`) — сейчас это
только register и login. `JwtStrategy` кладёт в `request.user` объект `{ id, email }`, доставать его
следует декоратором `@CurrentUser('id')`, а не `@Req()`.

Пароли хешируются статическими `UsersService.hashPassword` / `verifyPassword` на scrypt из
`node:crypto` (формат `<salt-hex>:<key-hex>`), bcrypt не используется.

### Межмодульное взаимодействие (CQRS)

Вызовы **между** модулями идут только через `CommandBus`/`QueryBus` из `@nestjs/cqrs`; сервис
чужого модуля не инжектится напрямую. Внутри модуля контроллер зовёт свой сервис обычным вызовом.

Сообщения живут у модуля-владельца данных в `<domain>/cqrs/{commands,queries}/`, каждый файл
содержит класс сообщения и его handler, а `<domain>/cqrs/index.ts` экспортирует массив
`<Domain>CqrsHandlers` для регистрации в `providers`:

- `users` — `CreateUserCommand`, `GetUserByEmailQuery` (единственное место, где отдаётся
  `passwordHash`, только для `AuthService`), `GetUserByIdQuery`
- `accounts` — `AssertAccountOwnedQuery`, `categories` — `AssertCategoryOwnedQuery`;
  ими `TransactionsService` и `BudgetsService` проверяют, что привязываемый счёт/категория
  принадлежат тому же пользователю.

Версии зафиксированы под Nest 11: `@nestjs/cqrs@11`, `@nestjs/jwt@11`, `@nestjs/passport@11`.
Мажорные 12 требуют Nest 12, а `@nestjs/jwt@12` вдобавок ESM-only и ломает Jest/`tsc --module commonjs`.

### Изоляция данных по пользователю

`userId` **никогда** не приходит от клиента — только из токена. В Create-DTO его нет, и благодаря
`forbidNonWhitelisted` присланный в теле `userId` даёт 400.

Сигнатуры сервисов — `create(userId, dto)`, `findAll(userId, …)`, `findOne(id, userId)`,
`update(id, userId, dto)`, `remove(id, userId)`. `findOne` ищет через
`findFirst({ where: { id, userId } })` и на чужую запись отвечает 404 (не 403 — чтобы не
подтверждать её существование); `update`/`remove` наследуют эту проверку, так как зовут `findOne`.

`ValidationPipe` в `main.ts` включён с `whitelist`, `forbidNonWhitelisted` и `transform`: любое
неописанное в DTO поле в теле запроса приводит к 400, а `@Type(() => Number)` в query-DTO реально
преобразует строки.

Update-DTO строятся как `PartialType(OmitType(CreateDto, ['userId']))` из `@nestjs/mapped-types` —
`userId` намеренно неизменяем после создания.

### Типы и enum-ы (важно)

Enum-ы существуют в двух местах и должны меняться синхронно:

- `apps/api/prisma/schema.prisma` — источник истины; бэкенд импортирует их из `@prisma/client`
- `packages/shared-types/src/enums.ts` — ручная копия для фронтенда

`apps/api` **намеренно не зависит** от `@expense-tracker/shared-types`: пакет отдаётся как TS-исходник
(`main: ./src/index.ts`, без сборки), Next транспилирует его через `transpilePackages`, а Nest
компилируется `tsc` и не смог бы собрать файлы вне своего `rootDir`. Не добавляй эту зависимость в API,
не дав пакету шаг сборки.

По той же причине `apps/api/tsconfig.json` переопределяет `module: commonjs` / `moduleResolution: node`
и обнуляет `paths` из `tsconfig.base.json`.

### Денежные значения

В БД — `Decimal(14, 2)`. По HTTP передаются **строками** (`amount: string`), чтобы не терять точность:
DTO валидируют их через `@IsNumberString()`, типы в `shared-types/src/models.ts` объявляют `string`.
Не переводи суммы в `number`.

Суммы транзакций всегда положительные; направление задаёт поле `type` (`INCOME` / `EXPENSE` / `TRANSFER`).

### Даты

DTO принимают ISO-строки (`@IsDateString()`), сервисы конвертируют их в `Date` перед вызовом Prisma —
см. `TransactionsService.create` и `BudgetsService.update`. В `BudgetsService.update` `endDate`
различает `undefined` (не трогать) и явный `null` (сделать бессрочным).

### Фронтенд

App Router, все страницы внутри группы `(dashboard)` с общим сайдбаром; `/` редиректит на `/dashboard`.
Страницы сейчас — заглушки без фетчинга.

`src/lib/api-client.ts` — единственная точка обращения к API: базовый URL из `NEXT_PUBLIC_API_URL`,
ошибки заворачиваются в `ApiRequestError`. Новые запросы делай через `api.get/post/patch/delete`.

## Состояние проекта

- Аутентификация по JWT работает; ролей и refresh-токенов нет.
- `UsersController` умеет только операции над собой (`GET/PATCH/DELETE /api/users/me`);
  листинга всех пользователей нет, регистрация — в `POST /api/auth/register`.
- Миграций пока нет: первую нужно создать через `prisma:migrate --name init`.
- `db:seed` создаёт `demo@example.com` с паролем `password123`.
- `GET /api/transactions` — единственный листинг с пагинацией, возвращает `{ data, meta }`;
  остальные листинги возвращают голый массив.
- Фронтенд токен пока нигде не сохраняет: `api-client.ts` держит его в памяти
  (`setAuthToken`), страницы остаются заглушками без фетчинга.
