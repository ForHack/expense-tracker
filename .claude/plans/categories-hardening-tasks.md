# Задачи: доработка модуля категорий

Источник: [categories-hardening-plan.md](./categories-hardening-plan.md) — **реализовано полностью**.

- [x] 0. Сохранить план и чеклист в `.claude/plans/`
- [x] 1. `dto/query-categories.dto.ts`: `type` (`@IsEnum(TransactionType)`) + `parentId`, оба `@IsOptional`
- [x] 2. `categories.controller.ts`: `@Query() query: QueryCategoriesDto` вместо сырого `@Query('type')`
- [x] 3. `categories.service.ts`: `findAll` принимает `QueryCategoriesDto`, фильтрует по `type` и `parentId`
- [x] 4. `categories.service.ts`: `assertParentUsable` — владелец родителя через `findOne`,
      запрет self-parent и цикла по цепочке `parentId`; вызвать в `create` и `update`
- [x] 5. `categories.service.ts`: P2002 → `ConflictException` в `create`/`update`
      (по образцу `auth.service.ts:46-55`)
- [x] 6. `categories.service.ts`: комментарий у `remove` про каскады (дети → корень,
      транзакции → `SetNull`, бюджеты → удаляются)
- [x] 7. `categories.service.spec.ts`: 11 тестов (8 запланированных + 3 дополнительных)
- [x] 8. `CLAUDE.md`: дописать про проверку `parentId` и 409 на дубликат имени
- [x] 9. Верификация: 29 тестов / typecheck / lint / build зелёные + все 8 ручных сценариев пройдены

## Отклонения от плана

- Хелпер P2002 назван `toDuplicateError` и **возвращает** ошибку (`throw this.toDuplicateError(...)`),
  а не бросает её изнутри — иначе пришлось бы полагаться на вывод типа `never` для метода класса.
- В спеку добавлены три кейса сверх плана: `remove` на чужой записи, позитивный сценарий
  корректного родителя и проверка, что `update` не пишет в БД при отказе.
- Для E2E собранный API поднимался на `PORT=4100`: порт 4000 был занят уже работающим
  dev-сервером, а проверять нужно было именно свежую сборку.
- Дополнительно проверен фильтр `?parentId=` и удаление родителя с ребёнком (каскад `SetNull`).
