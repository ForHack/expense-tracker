# План: доработка модуля категорий трат

## Контекст

Задача была сформулирована как «добавить сущность категории, сервис CRUD и защищённый контроллер».
При разборе кода выяснилось, что всё это **уже реализовано**:

- `apps/api/prisma/schema.prisma` — модель `Category` (id, name, type, icon, color, parentId, userId,
  createdAt/updatedAt), связи с `User`, `Transaction`, `Budget`, самоссылка `CategoryTree`,
  `@@unique([userId, name, type])`. Миграция `20260910143122_init` применена.
- `apps/api/src/categories/categories.service.ts` — `create` / `findAll` / `findOne` / `update` / `remove`
  с изоляцией по `userId` (`findFirst({ where: { id, userId } })` → 404 на чужую запись).
- `apps/api/src/categories/categories.controller.ts` — `POST/GET/GET :id/PATCH :id/DELETE :id`,
  закрыт глобальным `JwtAuthGuard` (`APP_GUARD`), `userId` берётся `@CurrentUser('id')`.
- `apps/api/src/categories/dto/*` — class-validator, `UpdateCategoryDto = PartialType(CreateCategoryDto)`.
- `packages/shared-types/src/{models,dto}.ts` — `Category`, `CreateCategoryDto`, `UpdateCategoryDto` уже описаны.

Поэтому работа — не «написать с нуля», а закрыть четыре реальных пробела, из-за которых модуль
нарушает изоляцию данных и отдаёт 500 там, где должен отдавать 400/409.

**Найденные дефекты:**

1. **Утечка через `parentId`.** `create`/`update` кладут `dto.parentId` в Prisma без проверки владельца —
   пользователь может назначить родителем чужую категорию.
   Плюс `update` позволяет сделать категорию родителем самой себе или своего потомка → цикл в дереве.
2. **Невалидируемый query-параметр `type`.** Контроллер берёт сырую строку и передаёт в Prisma:
   `?type=мусор` → 500 вместо 400. В `transactions` для этого уже есть паттерн — `QueryTransactionsDto`.
3. **Дубликат имени → 500.** Нарушение `@@unique([userId, name, type])` всплывает как Internal Server Error.
   Готовый образец обработки — `auth.service.ts:46-55` (P2002 → `ConflictException`).
4. **Нет тестов.** У `accounts`, `transactions`, `users`, `auth` есть `*.service.spec.ts`, у `categories` — нет.

Итог: тот же публичный контракт, но без дыры в изоляции, с корректными кодами ответов и с тестами.

## Реализация

### 1. `apps/api/src/categories/dto/query-categories.dto.ts` (новый)

По образцу `apps/api/src/transactions/dto/query-transactions.dto.ts`:

```ts
export class QueryCategoriesDto {
  @IsOptional() @IsEnum(TransactionType) type?: TransactionType;
  @IsOptional() @IsString() parentId?: string;
}
```

`ValidationPipe` в `main.ts` уже с `whitelist` + `forbidNonWhitelisted`, так что неизвестный
query-параметр даст 400 автоматически.

### 2. `categories.controller.ts`

Заменить `@Query('type') type?: TransactionType` на `@Query() query: QueryCategoriesDto`
и передать `query` в сервис — ровно как в `transactions.controller.ts:21-26`.

### 3. `categories.service.ts` — основная правка

- `findAll(userId, filters: QueryCategoriesDto = {})` — добавить фильтр по `parentId` в `where`.
- Приватный `assertParentUsable(userId, parentId, selfId?)`:
  - `parentId === selfId` → `BadRequestException('Категория не может быть родителем самой себе')`;
  - `await this.findOne(parentId, userId)` — переиспользуем существующий метод, чужой родитель даёт 404;
  - защита от цикла: подняться по цепочке `parentId` вверх
    (`prisma.category.findFirst({ where: { id, userId }, select: { id: true, parentId: true } })`),
    если встретили `selfId` → `BadRequestException('Нельзя сделать родителем собственного потомка')`.
    Ограничить обход счётчиком глубины на случай уже испорченных данных.
- Вызвать его в `create` (без `selfId`) и в `update` (с `selfId = id`, только когда `dto.parentId` задан).
- Приватный хелпер / try-catch вокруг `prisma.category.create` и `.update`:
  `Prisma.PrismaClientKnownRequestError` + `code === 'P2002'` → `ConflictException`.
  Копировать структуру из `auth.service.ts:46-55`.
- Комментарием у `remove` зафиксировать каскады из схемы: дети всплывают в корень (`SetNull`),
  транзакции теряют категорию (`SetNull`), **бюджеты удаляются** (`Cascade`).

### 4. `apps/api/src/categories/categories.service.spec.ts` (новый)

Структура и мок Prisma — как в `apps/api/src/accounts/accounts.service.spec.ts`
(`Test.createTestingModule` + `{ provide: PrismaService, useValue: prismaMock }`). Кейсы:

- `findOne` фильтрует по `userId`; чужая категория → `NotFoundException`;
- `update`/`remove` не трогают БД, если категория чужая;
- `create` подставляет `userId` из токена;
- `create` с чужим `parentId` → `NotFoundException`, `prisma.category.create` не вызван;
- `update` с `parentId === id` → `BadRequestException`;
- `update` с `parentId`, который является потомком, → `BadRequestException`;
- P2002 из `create` → `ConflictException`;
- `findAll` прокидывает фильтр `type` в `where`.

### 5. `CLAUDE.md`

В раздел «Изоляция данных по пользователю» дописать, что `parentId` категории проверяется
через `findOne` того же пользователя, а конфликт уникальности имени отдаёт 409.

Файлы `categories.module.ts`, `cqrs/`, `schema.prisma`, `packages/shared-types` **не меняются** —
контракт остаётся прежним, миграция не нужна.

## Проверка

```bash
pnpm --filter @expense-tracker/api test -- categories.service.spec.ts
pnpm --filter @expense-tracker/api test          # регрессия по остальным
pnpm typecheck && pnpm lint
```

E2E вручную (`docker compose up -d postgres`, `pnpm --filter @expense-tracker/api dev`,
токен из `POST /api/auth/login` с `demo@example.com` / `password123`):

1. `GET /api/categories` без токена → 401.
2. `POST /api/categories` `{ "name": "Еда", "type": "EXPENSE", "color": "#FF0000", "icon": "🍔" }` → 201.
3. Тот же POST повторно → **409** (было 500).
4. `POST` с `{ "userId": "..." }` в теле → 400 (`forbidNonWhitelisted`).
5. `GET /api/categories?type=мусор` → **400** (было 500); `?type=EXPENSE` → отфильтрованный список.
6. `PATCH /api/categories/:id` `{ "parentId": "<тот же id>" }` → **400**.
7. Вторым пользователем: `PATCH` с `parentId` категории первого → **404** (было бы успешное связывание).
8. `DELETE /api/categories/:id` чужой категории → 404; своей → 200.
