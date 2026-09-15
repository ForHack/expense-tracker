# CLAUDE.md — `apps/api`

Бэкенд трекера расходов: Nest.js 11 + Prisma, порт 4000, глобальный префикс `/api`.
Общие для монорепо правила (git, коммиты, PR, контракт API) — в корневом `CLAUDE.md`.

## Команды

```bash
pnpm --filter @expense-tracker/api dev
pnpm --filter @expense-tracker/api build
```

Prisma (все скрипты живут здесь, схема — `prisma/schema.prisma`):

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

## Архитектура

`AppModule` подключает `ConfigModule.forRoot({ isGlobal: true })` с `envFilePath: ['.env', '../../.env']`
— то есть `.env` берётся из корня монорепо, а не из `apps/api`.

`PrismaModule` помечен `@Global`, поэтому `PrismaService` инжектится в любой сервис без импорта модуля.
`PrismaService` наследует `PrismaClient` и подключается/отключается по хукам жизненного цикла Nest.

Пять доменных модулей построены по одному шаблону: `<domain>.module.ts` + `.controller.ts` + `.service.ts` + `dto/`.
Сервисы вызывают Prisma напрямую; репозиторный слой есть только у `users` (`UsersRepository` —
единственное место, где трогают `prisma.user`). Update/delete сначала зовут `findOne`,
который бросает `NotFoundException` — это единственный источник 404.

## Аутентификация

`AuthModule` (`src/auth/`) выдаёт JWT: `POST /api/auth/register`, `POST /api/auth/login`,
`GET /api/auth/me`. Только access-токен, refresh нет. Секрет — `JWT_SECRET` (обязателен,
`getOrThrow`), время жизни — `JWT_EXPIRES_IN` (по умолчанию `15m`).

`JwtAuthGuard` зарегистрирован глобально через `APP_GUARD`, поэтому **токен нужен на всех
маршрутах**. Исключения помечаются `@Public()` (`auth/decorators/public.decorator.ts`) — сейчас это
только register и login. `JwtStrategy` кладёт в `request.user` объект `{ id, email }`, доставать его
следует декоратором `@CurrentUser('id')`, а не `@Req()`.

Пароли хешируются статическими `UsersService.hashPassword` / `verifyPassword` на scrypt из
`node:crypto` (формат `<salt-hex>:<key-hex>`), bcrypt не используется.

## Межмодульное взаимодействие (CQRS)

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

## Изоляция данных по пользователю

`userId` **никогда** не приходит от клиента — только из токена. В Create-DTO его нет, и благодаря
`forbidNonWhitelisted` присланный в теле `userId` даёт 400.

Сигнатуры сервисов — `create(userId, dto)`, `findAll(userId, …)`, `findOne(id, userId)`,
`update(id, userId, dto)`, `remove(id, userId)`. `findOne` ищет через
`findFirst({ where: { id, userId } })` и на чужую запись отвечает 404 (не 403 — чтобы не
подтверждать её существование); `update`/`remove` наследуют эту проверку, так как зовут `findOne`.

Ссылки на другие записи проверяются тем же способом. В `CategoriesService.assertParentUsable`
`parentId` прогоняется через собственный `findOne`, поэтому чужая категория в роли родителя даёт
404; дополнительно запрещены родитель-сам-себе и родитель из собственного поддерева
(подъём по цепочке `parentId`, глубина ограничена `MAX_PARENT_DEPTH`) — оба случая 400.

Нарушение `@@unique([userId, name, type])` в категориях переводится в 409 (`toDuplicateError`,
P2002 → `ConflictException`) — как в `AuthService.register` для дублирующегося email.

## Валидация и DTO

`ValidationPipe` в `main.ts` включён с `whitelist`, `forbidNonWhitelisted` и `transform`: любое
неописанное в DTO поле в теле запроса приводит к 400, а `@Type(() => Number)` в query-DTO реально
преобразует строки.

Update-DTO строятся как `PartialType(OmitType(CreateDto, ['userId']))` из `@nestjs/mapped-types` —
`userId` намеренно неизменяем после создания.

Суммы валидируются `@IsNumberString()`, даты — `@IsDateString()`; сервисы конвертируют ISO-строки
в `Date` перед вызовом Prisma (см. `TransactionsService.create` и `BudgetsService.update`).
В `BudgetsService.update` `endDate` различает `undefined` (не трогать) и явный `null`
(сделать бессрочным). Правила контракта — в корневом `CLAUDE.md`, раздел «Контракт API».

## Зависимости и tsconfig

`apps/api` **намеренно не зависит** от `@expense-tracker/shared-types`: пакет отдаётся как TS-исходник
(`main: ./src/index.ts`, без сборки), а Nest компилируется `tsc` и не смог бы собрать файлы вне своего
`rootDir`. Не добавляй эту зависимость в API, не дав пакету шаг сборки. Enum-ы бэкенд берёт из
`@prisma/client`.

По той же причине `tsconfig.json` переопределяет `module: commonjs` / `moduleResolution: node`
и обнуляет `paths` из `tsconfig.base.json`.

## Состояние

- Аутентификация по JWT работает; ролей и refresh-токенов нет.
- `UsersController` умеет только операции над собой (`GET/PATCH/DELETE /api/users/me`);
  листинга всех пользователей нет, регистрация — в `POST /api/auth/register`.
- Начальная миграция есть (`prisma/migrations/20260910143122_init`).
- `db:seed` создаёт `demo@example.com` с паролем `password123`.
- `GET /api/transactions` — единственный листинг с пагинацией, возвращает `{ data, meta }`;
  фильтры дат называются `dateFrom`/`dateTo`. Остальные листинги возвращают голый массив.
- `GET /api/transactions/summary` с обязательными `month`/`year`: итоги за месяц (UTC) +
  разбивка `byCategory`; `TRANSFER` в `income`/`expense`/`balance` не входит. Маршрут объявлен
  выше `@Get(':id')` — иначе 404.
- У категорий есть фильтры `?type=` и `?parentId=` (`QueryCategoriesDto`); значения вне
  `TransactionType` дают 400.
