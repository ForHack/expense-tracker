---
name: ui-check
description: Проверить вёрстку изменённых страниц `apps/web` в реальном браузере на desktop и mobile через Playwright MCP — скриншоты, горизонтальный скролл, перекрытия, ошибки консоли. Запускай сам сразу после того, как внёс изменения в код фронтенда (`apps/web/**`: `views/`, `widgets/`, `features/`, `shared/ui/`, `globals.css`, `layout.tsx`, `page.tsx`), а также по просьбам «проверь вёрстку», «посмотри, как выглядит», «проверь мобильную версию», «сделай скриншоты страницы». Принимает аргументы — маршруты для проверки.
allowed-tools: Bash(pnpm *), Bash(lsof *), Bash(curl *), Bash(git *), Bash(ls *), Bash(.claude/skills/ui-check/scripts/*), Read, Glob, Grep, mcp__playwright__browser_navigate, mcp__playwright__browser_resize, mcp__playwright__browser_take_screenshot, mcp__playwright__browser_snapshot, mcp__playwright__browser_evaluate, mcp__playwright__browser_console_messages, mcp__playwright__browser_fill_form, mcp__playwright__browser_click, mcp__playwright__browser_wait_for, mcp__playwright__browser_close
argument-hint: [/dashboard /login ...]
---

# Проверка вёрстки в браузере

Вёрстка проверяется **в реальном браузере**, а не чтением JSX. Скриншот, который не
сделан, ничего не доказывает. Скилл не правит дизайн по своему вкусу — он находит
поломки и показывает их пользователю.

Проверка обязательна для **двух вьюпортов**: desktop `1440×900` и mobile `390×844`
(iPhone 14). Проверил только один — работа не сделана.

## Когда запускать сам

Сразу после того, как изменения в `apps/web` дописаны и `pnpm --filter @expense-tracker/web typecheck`
проходит — до отчёта пользователю и до коммита. Триггеры: правки в `views/`, `widgets/`,
`features/*/ui/`, `shared/ui/`, `src/app/**/{page,layout}.tsx`, `globals.css`,
`tailwind`-конфиге, `components.json`.

Не запускай, если изменения не влияют на вёрстку: правки в `apps/api`, `shared-types`,
`model/schemas.ts`, Route Handlers, тесты, документация.

## Что проверять

Маршруты берутся так, по порядку:

1. Переданы аргументом (`/ui-check /dashboard /transactions`) — проверяй ровно их.
2. Аргументов нет — выведи изменённые файлы и сопоставь их с маршрутами:

    ```bash
    git status --porcelain apps/web
    git diff --name-only master...HEAD -- apps/web
    ```

    Слайс `views/login` → `/login`; `widgets/app-sidebar` и `(dashboard)/layout.tsx` →
    затрагивают **все** страницы дашборда, возьми `/dashboard` и ещё одну;
    `shared/ui/<component>` или `globals.css` → найди страницы, где компонент реально
    используется (`Grep`), и проверь их, а не весь список.

3. Понять не удалось — спроси, какие страницы проверять. Не проверяй весь сайт наугад.

Список путей — `apps/web/src/shared/config/routes.ts` (`ROUTES`). Страницы дашборда
закрыты сессией — см. «Авторизация».

## Порядок действий

1. **Поднять web.** Dev-сервер нужен живой:

    ```bash
    .claude/skills/ui-check/scripts/ensure-web.sh
    ```

    Скрипт проверяет `http://localhost:3000` и, если сервера нет, сам стартует его
    в фоне и ждёт готовности. Для страниц дашборда нужен ещё API на `:4000` и БД
    (`docker compose up -d postgres`) — скрипт сообщит, чего не хватает.

2. **Для каждого маршрута — оба вьюпорта.** Сначала desktop, затем mobile:

    ```
    browser_navigate <url> → browser_resize 1440 900 → диагностика → скриншот
                           → browser_resize 390 844  → диагностика → скриншот
    ```

    `browser_resize` вызывай **после** навигации: размер, выставленный на `about:blank`,
    не переживает переход — страница откроется в дефолтном вьюпорте (1200px), и ты
    проверишь не то, что думаешь. Первая же диагностика (шаг 3) возвращает `viewport` —
    сверься, что он равен запрошенному, прежде чем делать выводы о вёрстке.

3. **Диагностика на каждом вьюпорте** — три обязательные проверки.

    Горизонтальный скролл и элементы, вылезающие за вьюпорт (`browser_evaluate`):

    ```js
    () => {
    	const w = document.documentElement.clientWidth;
    	const overflowing = [...document.querySelectorAll('body *')]
    		.filter((el) => {
    			const r = el.getBoundingClientRect();
    			return r.width > 0 && (r.right > w + 1 || r.left < -1);
    		})
    		.slice(0, 10)
    		.map((el) => ({
    			tag: el.tagName.toLowerCase(),
    			cls: el.className?.toString().slice(0, 80),
    			right: Math.round(el.getBoundingClientRect().right),
    		}));
    	return { viewport: w, scrollWidth: document.documentElement.scrollWidth, overflowing };
    }
    ```

    `scrollWidth > viewport` или непустой `overflowing` — это находка, а не шум.

    Ошибки консоли — `browser_console_messages` (только `error`; предупреждения
    Next о dev-режиме игнорируй).

    Структура — `browser_snapshot`: проверь, что контент действительно отрендерился
    (нет пустой страницы, нет текста ошибки Next), и что на mobile доступна навигация.

4. **Скриншоты** — `fullPage: true`, в `.playwright-mcp/ui-check/` с внятным именем:

    ```
    .playwright-mcp/ui-check/dashboard-desktop.png
    .playwright-mcp/ui-check/dashboard-mobile.png
    ```

    Сделав скриншот, **посмотри его** (`Read`) — Playwright не судит о вёрстке за тебя.
    Ищи: обрезанный или наезжающий текст, схлопнувшиеся карточки, уехавшую рейку
    `AppSidebar`, таблицы шире экрана на mobile, потерянный контраст (лаймовый `--accent`
    всегда с тёмным текстом), нулевую высоту блоков.

5. **Отчёт.** По каждому маршруту и вьюпорту: `ок` или список находок с конкретикой —
   какой элемент, на каком вьюпорте, что именно не так, путь к скриншоту.
   Нашёл поломку вёрстки — предложи правку и её причину, но **не переделывай дизайн
   молча**: правь только то, что сам же и сломал в этой задаче; всё остальное — вопрос
   пользователю.

6. **Закончил** — закрой браузер (`browser_close`), чтобы не оставлять сессию висеть.

## Авторизация

`/dashboard`, `/transactions`, `/accounts`, `/categories`, `/budgets` закрыты middleware:
без cookie `access_token` будет редирект на `/login?from=…`. Попал на `/login` вместо
целевой страницы — это не находка про вёрстку, а незалогиненный браузер.

Логин демо-пользователем (данные из `apps/api/prisma/seed.ts`):

`/login` → `browser_fill_form`: email `demo@example.com`, пароль `password123` →
кнопка входа → `browser_wait_for` до `/dashboard`.

Сессия живёт в профиле браузера MCP, поэтому логиниться нужно один раз за прогон —
делай это до цикла по маршрутам. Пользователя в БД нет (`401`) — прогони сид
(`pnpm --filter @expense-tracker/api prisma:seed`) и скажи об этом в отчёте.

## Границы

- Чиним вёрстку, а не тесты: скилл не пишет Playwright-спеки и не трогает Jest.
- Не «улучшай» тему на глаз. Цвета и приёмы заданы токенами в `src/app/globals.css`
  и описаны в `apps/web/CLAUDE.md` — расхождение с ними это находка, а не повод
  выдумать свой стиль.
- Скриншоты — артефакты прогона, `.playwright-mcp/` в `.gitignore`; в коммит они не идут.
