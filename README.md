# Subscription Tracker MVP (SaaS)

MVP трекера подписок с личным кабинетом, уведомлениями и Pro-версией.

## Технологический стек
- **Backend**: Node.js + Express + TypeScript
- **DB**: SQLite через Prisma
- **Auth**: JWT (httpOnly cookie) + bcrypt
- **Frontend**: SSR (EJS) + Vanilla CSS

## Функционал
- Регистрация/Вход
- Добавление/Удаление подписок (Netflix, Spotify и др.)
- Расчет ежемесячных и ежегодных затрат
- Уведомления на сайте о скорых списаниях (за 3 дня и в день оплаты)
- Лимит Free-версии: максимум 10 подписок
- Pro-версия: безлимит и скрытие рекламы (демо-активация в настройках)

## Новые "Крутые" Фичи
- **Мультивалютность**: Поддержка USD, EUR, RUB, GBP с автоматической конвертацией в USD для общей статистики.
- **Аналитика**: Наглядное распределение расходов по категориям на дашборде.
- **Темная тема**: Полноценный ночной режим с переключателем в шапке и сохранением выбора.
- **Быстрый поиск**: Фильтрация подписок по названию в реальном времени.

## Как запустить

1. **Установка зависимостей**:
   ```bash
   npm install
   ```

2. **Настройка базы данных (SQLite)**:
   ```bash
   npx prisma migrate dev --name init
   ```

3. **Запуск сервера**:
   ```bash
   npm run dev
   ```

4. **Доступ**:
   Открыть [http://localhost:3000](http://localhost:3000)

## Deploying the UI to GitHub Pages

This repository includes a Vite React demo under `ui/` and a GitHub Actions workflow that builds `ui/` and deploys it to GitHub Pages (branch `gh-pages`).

1. Create a feature branch, add all changes and push:

```bash
# from repo root
git checkout -b feature/ui-first-deploy
git add .
git commit -m "feat(ui): initial UI demo + layout + pages"
# set remote origin if not set
git remote add origin git@github.com:YOUR_USERNAME/YOUR_REPO.git
git push -u origin feature/ui-first-deploy
```

2. Open a Pull Request on GitHub from `feature/ui-first-deploy` → `master` (you can do this via web or the GitHub CLI `gh`).

3. Once PR is merged to `master`, the GitHub Actions workflow `.github/workflows/deploy-ui.yml` will:
   - install dependencies
   - build the `ui/` app
   - publish `ui/dist` to the `gh-pages` branch

4. Enable GitHub Pages (if not already):
   - In repository Settings → Pages, set the source to `gh-pages` branch (root).
   - Optionally set a custom domain.

Notes
- The workflow uses `GITHUB_TOKEN` and `peaceiris/actions-gh-pages` to publish the site. No extra secrets required for default workflow.
- If you prefer using a deploy SSH key, adjust the workflow to use `deploy_key` and store it in repository secrets.

## Структура проекта
- `src/server.ts` - Точка входа
- `src/controllers/` - Обработка запросов (Auth, App)
- `src/services/` - Бизнес-логика (Billing, Notifications)
- `src/views/` - Шаблоны страниц (EJS)
- `src/public/` - Статические файлы (CSS)
- `prisma/` - Схема БД и миграции
