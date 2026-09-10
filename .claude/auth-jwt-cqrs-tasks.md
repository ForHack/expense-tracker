# Задачи: JWT-аутентификация + CQRS

Источник: [auth-jwt-cqrs-plan.md](./auth-jwt-cqrs-plan.md) — **реализовано полностью**.

- [x] 1. Зависимости и окружение (`@nestjs/jwt`, `passport-jwt`, `@nestjs/cqrs`, `JWT_SECRET`, `JWT_EXPIRES_IN`)
- [x] 2. `UsersRepository` + тонкий `UsersService`
- [x] 3. CQRS-контракты (`users/cqrs`, `accounts/cqrs`, `categories/cqrs`)
- [x] 4. `AuthModule`: стратегия, guard, декораторы, register/login/me
- [x] 5. Перевод accounts/categories/transactions/budgets на userId из токена + scoping
- [x] 6. `UsersController` → операции только над собой
- [x] 7. shared-types и `api-client.ts`
- [x] 8. Тесты (auth, users, accounts, transactions) — 18 проходят
- [x] 9. seed и `CLAUDE.md`
- [x] 10. Верификация: test + typecheck + lint + build + ручные curl-сценарии

## Отклонения от плана

- `@nestjs/jwt` и `@nestjs/passport` зафиксированы на `^11`, а не на последних `^12`:
  12-е мажорные требуют Nest 12, а `@nestjs/jwt@12` вдобавок ESM-only и падает под
  Jest/`tsc --module commonjs`. `@nestjs/cqrs` — по той же причине `^11`.
- `seed.ts` теперь хеширует реальный пароль (`password123`) вместо строки-заглушки,
  иначе демо-пользователем нельзя было бы залогиниться.
- Проверка владения связями добавлена не только в `create`, но и в `update`
  (`TransactionsService`, `BudgetsService`) — иначе счёт можно было бы переставить на чужой
  через PATCH.
- Prisma CLI не видит корневой `.env` (ищет только в `apps/api`), поэтому миграция и seed
  запускались с явным `DATABASE_URL=...`.
