# План: аутентификация по JWT в `apps/api`

> Статус: согласован, **не реализован**. Документ описывает предстоящие работы.

## Context

Сейчас в API нет аутентификации. `userId` приходит явно в теле каждого Create-DTO
(`CreateAccountDto.userId`, `CreateTransactionDto.userId`, …) и в query-параметрах листингов —
временное решение, зафиксированное в `CLAUDE.md`. `JWT_SECRET` уже зарезервирован в `.env.example`,
но не используется.

`UsersModule` (`apps/api/src/users/`) уже существует: CRUD, `SafeUser = Omit<User, 'passwordHash'>`,
`safeUserSelect`, а также готовые статические `UsersService.hashPassword` / `UsersService.verifyPassword`
на scrypt из `node:crypto` (формат `<salt-hex>:<key-hex>`). Модель `User` в
`apps/api/prisma/schema.prisma` уже содержит `email @unique`, `passwordHash`, `name?`, `currency`,
`createdAt`, `updatedAt` — менять схему не нужно.

Цель: добавить `AuthModule` с регистрацией и логином по JWT, вынести работу с `prisma.user`
в `UsersRepository`, включить глобальный `JwtAuthGuard` и перевести все доменные модули на
`userId` из токена вместо тела запроса.

Согласованные решения:

- только access-токен (без refresh и без модели `RefreshToken`);
- глобальный guard + `userId` из токена, `userId` убирается из DTO и query;
- хеширование остаётся на scrypt (`UsersService.hashPassword`), bcrypt не добавляем;
- вводится `UsersRepository` — только для модуля users, остальные модули продолжают звать Prisma напрямую;
- `@nestjs/cqrs` применяется только на межмодульных границах; внутри модуля контроллер зовёт свой
  сервис напрямую.

## Шаг 1. Зависимости и окружение

- `apps/api/package.json`: добавить `@nestjs/jwt`, `@nestjs/passport`, `passport`, `passport-jwt`,
  `@nestjs/cqrs`; в devDependencies — `@types/passport-jwt`. Установить через
  `pnpm --filter @expense-tracker/api add ...`.
- `.env.example` и `.env`: заполнить `JWT_SECRET` реальным значением-заглушкой, добавить
  `JWT_EXPIRES_IN="15m"`. Убрать из `.env.example` комментарий «Зарезервировано для будущего модуля».

## Шаг 2. `UsersRepository`

Новый `apps/api/src/users/users.repository.ts` — единственное место, где вызывается `prisma.user`.
Из `users.service.ts` переносятся `safeUserSelect` и все обращения к Prisma.

```ts
@Injectable()
export class UsersRepository {
  constructor(private readonly prisma: PrismaService) {}

  createSafe(data: Prisma.UserCreateInput): Promise<SafeUser>;
  findMany(): Promise<SafeUser[]>;
  findById(id: string): Promise<SafeUser | null>;
  /** С passwordHash — только для AuthService. */
  findByEmailWithHash(email: string): Promise<User | null>;
  updateSafe(id: string, data: Prisma.UserUpdateInput): Promise<SafeUser>;
  deleteSafe(id: string): Promise<SafeUser>;
}
```

`SafeUser` и `safeUserSelect` переезжают в репозиторий; `users.service.ts` реэкспортирует
`SafeUser`, чтобы не ломать импорт в `users.controller.ts`.

`UsersService` становится тонким: валидация/404 (`NotFoundException` с текущими русскими
сообщениями) + `hashPassword`. Обе статические крипто-функции остаются в `UsersService`.
`users.module.ts`: `providers: [UsersService, UsersRepository]`, `exports: [UsersService]`.

## Шаг 3. CQRS как контракт между модулями

Пока модулей мало, но после включения guard появляются реальные межмодульные вызовы:
`auth` → `users` (найти по email, создать), `transactions` → `accounts`/`categories`
и `budgets` → `categories` (проверить, что чужой ресурс не подсовывают). Вместо того чтобы
экспортировать сервисы и инжектить их напрямую, эти вызовы идут через `CommandBus`/`QueryBus`
из `@nestjs/cqrs`. Внутри модуля контроллер по-прежнему зовёт свой сервис напрямую — CQRS
применяется только на границе.

`app.module.ts`: `CqrsModule` в `imports`, чтобы шины были доступны глобально; каждый
модуль-обработчик регистрирует свои handler'ы у себя в `providers`.

Структура внутри владеющего модуля — `<domain>/cqrs/commands/` и `<domain>/cqrs/queries/`,
каждый файл содержит класс сообщения и его `@CommandHandler` / `@QueryHandler`.

**Users (владелец `prisma.user`)** — `apps/api/src/users/cqrs/`:

- `CreateUserCommand { email, password, name?, currency? }` → `SafeUser`.
  Handler зовёт `UsersService.create`.
- `GetUserByEmailQuery { email }` → `User | null` (**с** `passwordHash`, только для auth) —
  handler зовёт `UsersRepository.findByEmailWithHash`.
- `GetUserByIdQuery { id }` → `SafeUser` (бросает `NotFoundException`).

**Accounts** — `apps/api/src/accounts/cqrs/`:

- `AssertAccountOwnedQuery { accountId, userId }` → `Account`, бросает
  `NotFoundException`. Внутри переиспользует `AccountsService.findOne(id, userId)` из шага 5.

**Categories** — `apps/api/src/categories/cqrs/`:

- `AssertCategoryOwnedQuery { categoryId, userId }` — аналогично, поверх
  `CategoriesService.findOne`.

Соответственно:

- `AuthService` инжектит `CommandBus`/`QueryBus` вместо `UsersService`/`UsersRepository`
  (криптографию — `UsersService.hashPassword`/`verifyPassword` — по-прежнему зовёт статически,
  это чистые функции без состояния).
- `AuthModule` больше **не** импортирует `UsersModule`; `UsersModule` может перестать
  экспортировать `UsersService`.
- Проверки владения из шага 5 (`TransactionsService.create`, `BudgetsService.create`)
  делаются через `QueryBus.execute(new AssertAccountOwnedQuery(...))`, а не прямым
  обращением к `prisma.account` — так каждая таблица остаётся за своим модулем.

Типы сообщений — обычные классы с `readonly` полями в конструкторе, без декораторов
(`export class GetUserByEmailQuery { constructor(public readonly email: string) {} }`).

## Шаг 4. `AuthModule`

Новая папка `apps/api/src/auth/`:

- `dto/register.dto.ts` — `extends CreateUserDto` из `../../users/dto/create-user.dto`
  (email/password/name/currency уже описаны там с нужными валидаторами).
- `dto/login.dto.ts` — `@IsEmail() email`, `@IsString() password`.
- `auth.service.ts`:
  - `register(dto)` → `commandBus.execute(new CreateUserCommand(...))`; ловит
    `Prisma.PrismaClientKnownRequestError` c кодом `P2002` на `email` и бросает
    `ConflictException('Пользователь с таким email уже существует')`; при успехе сразу выдаёт токен.
  - `validateUser(email, password)` → `queryBus.execute(new GetUserByEmailQuery(email))`, затем
    `UsersService.verifyPassword`; при любой неудаче — `UnauthorizedException('Неверный email или пароль')`
    (одинаковое сообщение, чтобы не раскрывать существование email).
  - `login(dto)` → `validateUser` + `signToken`.
  - `signToken(user)` → payload `{ sub: user.id, email: user.email }`.
  - Возвращаемый тип `AuthResponse { accessToken: string; user: SafeUser }`.
- `auth.controller.ts` — `@Controller('auth')`:
  - `POST /api/auth/register` — `@Public()`
  - `POST /api/auth/login` — `@Public()`, `@HttpCode(HttpStatus.OK)`
  - `GET /api/auth/me` — **без** `@Public()`, отдаёт `GetUserByIdQuery(user.id)` через `QueryBus`.
- `auth.module.ts` — `JwtModule.registerAsync` с `ConfigService`
  (`secret: config.getOrThrow('JWT_SECRET')`, `expiresIn: config.get('JWT_EXPIRES_IN', '15m')`),
  `imports: [PassportModule, CqrsModule]`, провайдеры `AuthService`, `JwtStrategy`.
  Здесь же регистрируется глобальный guard:
  `{ provide: APP_GUARD, useClass: JwtAuthGuard }`.

Вспомогательные файлы:

- `auth/strategies/jwt.strategy.ts` — `PassportStrategy(Strategy, 'jwt')`,
  `jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken()`, `validate(payload)` возвращает
  `{ id: payload.sub, email: payload.email }` → это и попадает в `req.user`.
- `auth/guards/jwt-auth.guard.ts` — `AuthGuard('jwt')`, переопределяет `canActivate`:
  читает метаданные `IS_PUBLIC_KEY` через `Reflector` (`getAllAndOverride` по handler + class)
  и пропускает публичные маршруты.
- `auth/decorators/public.decorator.ts` — `IS_PUBLIC_KEY` + `Public()`.
- `auth/decorators/current-user.decorator.ts` — `CurrentUser()`, параметрический декоратор,
  достаёт `request.user`; поддерживает `CurrentUser('id')`.
- `auth/types/jwt-payload.ts` — `JwtPayload { sub: string; email: string }` и
  `AuthenticatedUser { id: string; email: string }`.

`app.module.ts`: добавить `AuthModule` и `CqrsModule` в `imports`.

## Шаг 5. Перевод доменных модулей на userId из токена

Единый паттерн, применяемый к `accounts`, `categories`, `transactions`, `budgets`
(файлы `<domain>/dto/create-*.dto.ts`, `<domain>/<domain>.controller.ts`, `<domain>/<domain>.service.ts`):

1. **DTO**: удалить поле `userId` из всех `Create*Dto`. Из-за `forbidNonWhitelisted` в
   `main.ts` присланный клиентом `userId` теперь даст 400 — это желаемое поведение.
   Соответственно `Update*Dto` упрощаются до `PartialType(CreateDto)` без `OmitType`
   (например `apps/api/src/transactions/dto/update-transaction.dto.ts`).
   В `QueryTransactionsDto` убрать поле `userId`.
2. **Контроллер**: `create(@CurrentUser('id') userId: string, @Body() dto)`; из листингов
   убрать `@Query('userId')` и брать userId из токена; методы `findOne/update/remove`
   тоже получают `userId` и прокидывают его в сервис.
3. **Сервис**: сигнатуры становятся `create(userId, dto)`, `findAll(userId, …)`,
   `findOne(id, userId)`, `update(id, userId, dto)`, `remove(id, userId)`.
   `create` пишет `data: { ...dto, userId }`.

**Ключевой момент — проверка владения.** Сейчас `findOne(id)` во всех сервисах делает
`findUnique({ where: { id } })` и не смотрит на владельца; после включения guard это стало бы
дырой: авторизованный пользователь читал бы чужие записи по id. Поэтому во всех четырёх сервисах
`findOne` переписывается на

```ts
const account = await this.prisma.account.findFirst({ where: { id, userId } });
if (!account) throw new NotFoundException(`Счёт ${id} не найден`);
```

(404, а не 403 — чтобы не подтверждать существование чужой записи). Так как `update`/`remove`
уже зовут `findOne` первым делом, они получают проверку владения автоматически.

Дополнительно в `TransactionsService.create` и `BudgetsService.create` нужно проверить, что
`accountId` / `categoryId` принадлежат тому же `userId` — иначе можно привязать свою транзакцию
к чужому счёту. Проверка идёт через `QueryBus` (шаг 3):
`AssertAccountOwnedQuery`, `AssertCategoryOwnedQuery`; при чужом id — `NotFoundException`.
`TransactionsModule` и `BudgetsModule` для этого импортируют `CqrsModule`.

`UsersController` (`apps/api/src/users/users.controller.ts`): CRUD над произвольными
пользователями без ролей теперь опасен. Оставляем только операции над собой —
`GET/PATCH/DELETE /api/users/me` через `@CurrentUser`, а `POST /users` и `GET /users`
(листинг всех) удаляем: регистрация переехала в `/auth/register`.

## Шаг 6. Синхронизация shared-types и фронтенда

- `packages/shared-types/src/dto.ts`: убрать `userId` из `CreateAccountDto`, `CreateCategoryDto`,
  `CreateTransactionDto`, `CreateBudgetDto`; `Update*` становятся `Partial<CreateDto>`.
  Добавить `RegisterDto`, `LoginDto` и `AuthResponse { accessToken: string; user: User }`.
- `apps/web/src/lib/api-client.ts`: `apiFetch` дополняется подстановкой
  `Authorization: Bearer <token>` — токен берётся из модульной переменной с сеттером
  (`setAuthToken`), чтобы не тянуть в клиент зависимость от хранилища. Страницы сейчас заглушки
  без фетчинга, так что дальше по фронтенду ничего править не нужно.

## Шаг 7. Prisma seed и документация

- `apps/api/prisma/seed.ts`: если создаёт пользователя через сервис/DTO — поправить под новые
  сигнатуры (проверить при реализации).
- `CLAUDE.md`: обновить раздел «Состояние проекта» — аутентификация появилась, `userId` больше
  не передаётся в DTO, scrypt перестал быть заглушкой; в «Бэкенд» добавить описание
  `AuthModule`, глобального `JwtAuthGuard`, `@Public()` и правило «межмодульные вызовы —
  только через CommandBus/QueryBus, внутри модуля — прямой вызов сервиса», а также поправить
  утверждение «репозиторного слоя нет» (теперь он есть у users).

## Тесты

- `apps/api/src/auth/auth.service.spec.ts` — с мокнутыми `CommandBus`, `QueryBus`, `JwtService`:
  успешный login; неверный пароль → `UnauthorizedException`; несуществующий email →
  тот же `UnauthorizedException`; register при дубликате email → `ConflictException`.
- `apps/api/src/users/users.service.spec.ts` — round-trip `hashPassword` → `verifyPassword` (true),
  неверный пароль (false), битый формат хеша без `:` (false).
- `apps/api/src/accounts/accounts.service.spec.ts` — `findOne` чужого id → `NotFoundException`
  (проверка scoping'а по userId).
- `apps/api/src/transactions/transactions.service.spec.ts` — `create` с чужим `accountId`:
  `QueryBus` мокается так, что `AssertAccountOwnedQuery` бросает `NotFoundException`,
  и `prisma.transaction.create` не вызывается.

## Verification

```bash
pnpm --filter @expense-tracker/api test
pnpm typecheck && pnpm lint

docker compose up -d postgres
pnpm --filter @expense-tracker/api prisma:generate
pnpm --filter @expense-tracker/api dev
```

Ручная проверка (схема БД не менялась, новая миграция не нужна — но первой миграции `init`
в репозитории всё ещё нет, её надо создать до запуска: `prisma:migrate --name init`):

```bash
# 401 без токена
curl -i localhost:4000/api/accounts

# регистрация → accessToken
curl -s -X POST localhost:4000/api/auth/register \
  -H 'Content-Type: application/json' \
  -d '{"email":"a@b.c","password":"password123","name":"Тест"}'

# логин
TOKEN=$(curl -s -X POST localhost:4000/api/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"email":"a@b.c","password":"password123"}' | jq -r .accessToken)

curl -s localhost:4000/api/auth/me -H "Authorization: Bearer $TOKEN"

# создание счёта без userId в теле
curl -s -X POST localhost:4000/api/accounts -H "Authorization: Bearer $TOKEN" \
  -H 'Content-Type: application/json' -d '{"name":"Кошелёк","type":"CASH"}'

# 400: userId в теле отвергается whitelist'ом
curl -i -X POST localhost:4000/api/accounts -H "Authorization: Bearer $TOKEN" \
  -H 'Content-Type: application/json' -d '{"name":"X","type":"CASH","userId":"hack"}'
```

Отдельно: зарегистрировать второго пользователя и убедиться, что
`GET /api/accounts/<id-чужого-счёта>` отдаёт 404, а `GET /api/accounts` — пустой список.
