---
name: test
description: Написать Jest-тест на переданный файл — по реальному коду файла, в стиле существующих `*.spec.ts` из apps/api. Используй при просьбах вида «напиши тест на <файл>», «покрой тестами <файл>», «добавь спеку для <файл>». Принимает аргументы — путь к файлу и, опционально, что именно покрыть.
allowed-tools: Bash(pnpm *), Bash(git *), Bash(ls *), Bash(find *), Read, Write, Edit, Glob, Grep
argument-hint: [path/to/file.ts] [что покрыть]
---

# Тест на файл

Тест пишется **по реальному коду файла**, а не по его имени и не по тому, как «обычно
устроен сервис». Не прочитал файл целиком — не пишешь тест. Тест, который не прогнан
и не прошёл, не считается написанным.

## Аргументы

Скилл принимает до двух аргументов:

```
/test apps/api/src/budgets/budgets.service.ts
/test apps/api/src/categories/categories.service.ts проверку циклов в parentId
/test budgets.service.ts
```

- Аргумент, похожий на путь или имя файла, — **цель**. Путь неполный или файл найден
  в нескольких местах (`Glob`) — покажи найденное и спроси, какой файл имелся в виду.
  Файла нет — скажи об этом и остановись, не придумывай цель сам.
- Остальной текст — **что именно покрыть**. Тогда эти сценарии обязаны попасть в тест;
  остальное добавляй по разделу «Что покрывать», если оно того стоит.
- Аргументов нет — спроси, на какой файл писать тест. Не выбирай файл за пользователя.

Цель вне `apps/api` (например, файл из `apps/web`) — остановись и скажи: Jest в `apps/web`
настроен, но правила и скелет ниже описывают спеки Nest-сервисов, а не React-компонентов;
тест на web — отдельная задача, а не часть этого скилла.

## Порядок действий

1. **Прочитай целевой файл целиком** — обязательный шаг. По нему собери список:
   публичные методы, их сигнатуры, внешние зависимости из конструктора
   (`PrismaService`, `CommandBus`/`QueryBus`, `ConfigService`, …), все ветки, где
   бросается исключение, и все места, где данные конвертируются (ISO-строка → `Date`,
   `Decimal`, `undefined` vs `null`).

2. Прочитай соседей, чтобы не выдумывать контракт:

   ```bash
   ls apps/api/src/<domain>/
   ```

   - DTO из `dto/` — какие поля реально существуют;
   - `cqrs/` целевого и чужих модулей — какие команды/запросы вызываются;
   - `apps/api/prisma/schema.prisma` — enum-ы и обязательные поля модели.

3. Посмотри существующую спеку рядом (`accounts.service.spec.ts`,
   `transactions.service.spec.ts`) и **повтори её стиль**: `Test.createTestingModule`,
   зависимости подменяются объектом с `jest.fn()`, описания `describe`/`it` — по-русски.

4. Есть ли уже тест на этот файл (`<имя>.spec.ts` рядом)? Если да — **дописывай
   недостающие кейсы в него**, а не создавай второй файл и не переписывай чужие тесты.

5. Напиши тест в `<путь к файлу>.spec.ts` — рядом с целевым файлом, `rootDir` у Jest — `src`.

6. Прогони его и добейся зелёного:

   ```bash
   pnpm --filter @expense-tracker/api test -- <имя файла>.spec.ts
   ```

   Тест упал — разберись, кто неправ. Ошибка в тесте — чини тест. Похоже на реальный
   баг в коде — **не правь код молча**: покажи пользователю падение и что именно
   считаешь багом, и дождись решения.

7. Прогони весь пакет и типы, чтобы не сломать соседей:

   ```bash
   pnpm --filter @expense-tracker/api test
   pnpm --filter @expense-tracker/api typecheck
   ```

8. Отчитайся: какой файл создан/дополнен, какие сценарии покрыты и что сознательно
   оставлено непокрытым.

## Что покрывать

Приоритет — инварианты репозитория, а не проценты покрытия. По порядку:

- **Изоляция по пользователю** — главное. `findOne` фильтрует `{ id, userId }`;
  чужая запись даёт `NotFoundException` (404, не 403); `update`/`remove` на чужой записи
  не доходят до записи в БД (`expect(prisma.<model>.update).not.toHaveBeenCalled()`);
  `create` подставляет `userId` из аргумента, а не из DTO.
- **Ошибочные ветки** — каждый `throw` в файле: 404 из `findOne`, 409 из P2002
  (`toDuplicateError`), 400 из доменных проверок (родитель-сам-себе, цикл в `parentId`,
  превышение `MAX_PARENT_DEPTH`).
- **Конвертация данных** — ISO-строка превращается в `Date` перед вызовом Prisma;
  суммы остаются строками и не проходят через `number`; в update-DTO `undefined`
  не трогает поле, а явный `null` его обнуляет.
- **Межмодульные вызовы** — что в `QueryBus.execute` уходит нужный запрос
  (`AssertAccountOwnedQuery` и т. п.) с правильным `userId`, и что при его отказе
  запись не создаётся.
- **Логика подсчётов** — если в файле есть агрегация (например, `summary`): границы
  месяца в UTC, исключение `TRANSFER` из `income`/`expense`/`balance`.

Не покрывай тривиальные проброски в Prisma без единой ветки — такой тест проверяет мок,
а не код.

## Стиль теста

- Файл — `*.spec.ts` рядом с целевым, Jest + ts-jest, `testEnvironment: node`.
- Зависимости подменяются вручную через `{ provide: PrismaService, useValue: prisma }`;
  моки — плоский объект с `jest.fn()` только на реально используемых методах.
  Никакого поднятия настоящего `PrismaModule` и обращения к БД.
- `beforeEach` пересобирает модуль и моки — тесты не делят состояние.
- Имена `describe`/`it` — по-русски и по смыслу инварианта («чужой счёт даёт 404,
  а не чужие данные»), а не «should return null».
- Один `it` — один инвариант. Проверяй аргументы вызова (`toHaveBeenCalledWith`),
  а не только факт вызова.
- Фикстуры — минимальные и говорящие: `'user-1'`, `'другой-user'`, `'acc-1'`.
- Enum-ы импортируй из `@prisma/client` (`AccountType`, `TransactionType`), не строками
  и не из `shared-types` — этой зависимости у API намеренно нет.

Скелет:

```ts
import { NotFoundException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { PrismaService } from '../prisma/prisma.service';
import { BudgetsService } from './budgets.service';

describe('BudgetsService: изоляция по пользователю', () => {
  let service: BudgetsService;
  let prisma: { budget: { findFirst: jest.Mock; update: jest.Mock } };

  beforeEach(async () => {
    prisma = { budget: { findFirst: jest.fn(), update: jest.fn() } };

    const moduleRef = await Test.createTestingModule({
      providers: [BudgetsService, { provide: PrismaService, useValue: prisma }],
    }).compile();

    service = moduleRef.get(BudgetsService);
  });

  it('чужой бюджет даёт 404, а не чужие данные', async () => {
    prisma.budget.findFirst.mockResolvedValue(null);

    await expect(service.findOne('b-1', 'другой-user')).rejects.toThrow(NotFoundException);
  });
});
```
