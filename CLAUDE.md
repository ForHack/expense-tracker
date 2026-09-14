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

Ссылки на другие записи проверяются тем же способом. В `CategoriesService.assertParentUsable`
`parentId` прогоняется через собственный `findOne`, поэтому чужая категория в роли родителя даёт
404; дополнительно запрещены родитель-сам-себе и родитель из собственного поддерева
(подъём по цепочке `parentId`, глубина ограничена `MAX_PARENT_DEPTH`) — оба случая 400.

Нарушение `@@unique([userId, name, type])` в категориях переводится в 409 (`toDuplicateError`,
P2002 → `ConflictException`) — как в `AuthService.register` для дублирующегося email.

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

### Фронтенд: Feature-Sliced Design

`apps/web/src` организован по FSD. Слои снизу вверх — **импорт разрешён только вниз**,
слой не может импортировать сам себя через соседний слайс:

| Слой        | Что лежит                                                                   |
| ----------- | --------------------------------------------------------------------------- |
| `shared/`   | `api/` (клиенты fetch), `config/` (`ROUTES`), `lib/` (`cn`), `ui/` (shadcn) |
| `entities/` | предметные сущности: `session/` — cookie, разбор JWT, `getCurrentUser()`    |
| `features/` | пользовательские сценарии: `auth/` — формы входа/регистрации, выход         |
| `widgets/`  | составные блоки страниц: `app-sidebar/`                                     |
| `views/`    | слой страниц FSD (вместо `pages`, чтобы не путать с Next)                   |
| `app/`      | **только** роутинг Next: `page.tsx`, `layout.tsx`, Route Handlers           |

Внутри слайса — сегменты `ui/`, `model/`, `api/`, `lib/` и `index.ts` с публичным API.
**Импортируй слайс через его `index.ts`** (`@/features/auth`, `@/entities/session`), а не файлом внутри.
Путь к файлу допустим только там, где баррель тянет несовместимый рантайм — таких мест три,
все с комментарием: `middleware.ts` → `@/entities/session/model/token` (баррель тянет `next/headers`,
запрещённый в edge), Route Handlers → `@/features/auth/model/schemas` (баррель тянет `'use client'`-формы)
и `@/shared/api/route-error` (тянет `next/server`). Барель `@/shared/ui` shadcn не создаёт —
компоненты импортируются поштучно (`@/shared/ui/button`), как в апстриме.

Файлы в `src/app/` держи тонкими: `page.tsx` экспортирует компонент из `views` и свою `metadata`.
Новый экран — это новый слайс в `views/`, а не разметка в `app/`.

#### UI-кит

shadcn/ui (style `new-york`, base color `neutral`, Tailwind 4, CSS-переменные).
Настройки — `apps/web/components.json`, алиасы переопределены под FSD (`ui` и `components` →
`@/shared/ui`, `utils` → `@/shared/lib/utils`). Добавление компонента:

```bash
cd apps/web && pnpm dlx shadcn@latest add <component>
```

CLI кладёт файл в `src/shared/ui/`, но **ломает импорт `cn`** — пишет `from "cn"` вместо
`@/shared/lib/utils`; после `add` проверь это и не дай поставить мусорный npm-пакет `cn`.
Токены темы (`--primary`, `--sidebar`, …) живут в `src/app/globals.css` — правь цвета там,
а не классами в компонентах. Иконки — `lucide-react`.

#### Работа с API

Два клиента, оба в `shared/api`:

- `api`/`apiFetch` — обращение к **Nest** (`NEXT_PUBLIC_API_URL`). Токен передаётся явной
  опцией `{ token }`; модульного состояния больше нет. Используется серверным кодом.
- `routeFetch` — обращение к **своим Route Handlers** Next из браузера. Токен подставлять
  не нужно: httpOnly-cookie уходит сама.

Ошибки обоих заворачиваются в `ApiRequestError` (`status` + `payload: ApiError`).
В Route Handlers разворачивай её через `toErrorResponse` из `@/shared/api/route-error` —
статус и текст от Nest доходят до формы как есть (401 «неверный пароль», 409 «email занят»).

#### Сессия

Access-токен лежит в **httpOnly-cookie `access_token`**, поэтому клиентский JS его не видит.
Вход идёт не напрямую в Nest, а через прокси-Route Handlers Next
(`src/app/api/auth/{login,register,logout}/route.ts`): они зовут Nest, ставят cookie и отдают
браузеру только профиль (`User`), без токена. Срок жизни cookie берётся из `exp` самого JWT
(`readTokenExpiry`), то есть автоматически совпадает с `JWT_EXPIRES_IN`.

Защита маршрутов двухуровневая:

1. `src/middleware.ts` — до рендера: нет cookie или она просрочена по `exp` → редирект на
   `/login?from=<путь>`; есть сессия, а запрошен `/login`/`/register` → редирект на `/dashboard`.
   Подпись токена здесь **не** проверяется (edge, без секрета) — это только дешёвый фильтр.
2. `app/(dashboard)/layout.tsx` — подтверждает сессию реальным `GET /auth/me`
   (`getCurrentUser()`), потому что между проверками токен мог истечь. `null` → `redirect('/login')`.

Список публичных страниц — `PUBLIC_ROUTES` в `shared/config/routes.ts`; добавляя страницу без
авторизации, правь именно его. Параметр `from` перед редиректом проверяется на относительность
(`//evil.com` тоже начинается со слеша) — см. `views/login`.

Выхода на сервере нет: refresh-токенов и серверных сессий API не держит, поэтому `logout`
просто гасит cookie, а сам JWT доживает свой срок.

#### Формы

`react-hook-form` + `zod` + `Form`-обвязка shadcn. Схемы лежат в `model/schemas.ts` слайса и
**повторяют class-validator бэкенда** (пароль ≥ 8, `currency` ровно 3 символа) — при изменении DTO
в API правь и схему. Одна и та же схема работает на клиенте (inline-ошибки полей) и в Route
Handler (`safeParse` → 400 в формате `ValidationPipe`). Ошибка уровня формы (401/409/сеть)
показывается через `FormError`, а не в поле.

## Git-ветки (GitHub Flow)

Базовая ветка — **`master`**: всегда рабочая и деплоимая, коммитить в неё напрямую нельзя.
Любая работа начинается с новой ветки от актуального `master`:

```bash
git checkout master && git pull
git checkout -b feature/<краткое-описание>
```

Именование: `<тип>/<kebab-case-описание>` на английском, до ~40 символов.

- **тип** — тот же набор, что и в Conventional Commits: `feature` (вместо `feat`), `fix`,
  `refactor`, `docs`, `chore`, `test`, `build`, `ci`, `perf`, `style`.
- Если фича относится к одному пакету, начинай описание с его имени:
  `feature/web-dashboard-overview`, `fix/api-transactions-summary-tz`.
- Точку входа для срочного багфикса отдельно не заводим — `fix/*` от `master` и есть hotfix.

Жизненный цикл ветки:

1. Мелкие атомарные коммиты по правилам ниже.
2. Перед PR — `pnpm lint`, `pnpm typecheck`, `pnpm build` и тесты затронутого пакета.
3. `git push -u origin <ветка>` → PR в `master`; заголовок PR оформляется как заголовок коммита
   (`feat(web): add dashboard overview`), в описании — что и зачем.
4. Ветка обновляется от `master` через **rebase**, а не merge-коммитом:
   `git fetch origin && git rebase origin/master`.
5. После мерджа PR ветка удаляется (локально и на remote).

Одна ветка = одна фича. Не тащи в неё несвязанные правки — для них новая ветка от `master`.

## Git-коммиты

Сообщения — по [Conventional Commits](https://www.conventionalcommits.org/ru/v1.0.0/):

```
<type>(<scope>): <краткое описание>

<тело — зачем, а не что; опционально>
```

- **type**: `feat`, `fix`, `docs`, `refactor`, `test`, `chore`, `build`, `ci`, `perf`, `style`.
- **scope** — пакет или домен, откуда изменение: `api`, `web`, `shared-types`, `deps`
  либо конкретный модуль (`transactions`, `auth`, `categories`). Затронуто несколько —
  скоуп опускается.
- Заголовок: в повелительном наклонении и на английском, до 72 символов, со строчной буквы,
  без точки в конце (`feat(api): add monthly transactions summary`). Тело — по-русски, если так проще.
- Ломающее изменение API-контракта — `!` после скоупа (`feat(api)!: …`) и абзац
  `BREAKING CHANGE: …` в теле.
- Коммит атомарный: одна логическая правка. Изменения в `apps/api` и `apps/web`,
  не связанные общей фичей, разносятся по разным коммитам. Правки в `packages/shared-types`
  идут вместе с кодом, который их использует.
- Сгенерированные файлы (`pnpm-lock.yaml`, миграции Prisma) коммитятся вместе с изменением,
  которое их породило, а не отдельно.

## Состояние проекта

- Аутентификация по JWT работает; ролей и refresh-токенов нет.
- `UsersController` умеет только операции над собой (`GET/PATCH/DELETE /api/users/me`);
  листинга всех пользователей нет, регистрация — в `POST /api/auth/register`.
- Начальная миграция есть (`prisma/migrations/20260910143122_init`).
- `db:seed` создаёт `demo@example.com` с паролем `password123`.
- `GET /api/transactions` — единственный листинг с пагинацией, возвращает `{ data, meta }`;
  фильтры дат называются `dateFrom`/`dateTo`. Есть агрегация `GET /api/transactions/summary`
  с обязательными `month`/`year`: итоги за месяц (UTC) + разбивка `byCategory`; `TRANSFER`
  в `income`/`expense`/`balance` не входит. Маршрут объявлен выше `@Get(':id')` — иначе 404.
  остальные листинги возвращают голый массив. У категорий есть фильтры `?type=` и `?parentId=`
  (`QueryCategoriesDto`); значения вне `TransactionType` дают 400.
- Фронтенд: вход, регистрация и выход работают на httpOnly-cookie, маршруты защищены
  middleware + проверкой в layout дашборда. Страницы самого дашборда (обзор, транзакции,
  счета, категории, бюджеты) — всё ещё заглушки без фетчинга, слайсов `views/` для них нет.
