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

This repository includes a Vite React demo under `ui/` and a GitHub Actions workflow that automatically builds and deploys it to GitHub Pages.

### Quick Start

The UI is now configured and ready to deploy! When you merge changes to the `master` branch:

1. **Automatic Deployment**: The GitHub Actions workflow (`.github/workflows/deploy-ui.yml`) will automatically:
   - Install dependencies
   - Build the `ui/` app with production optimizations
   - Deploy `ui/dist` to the `gh-pages` branch

2. **Enable GitHub Pages** (first time setup):
   - Go to your repository Settings → Pages
   - Under "Build and deployment":
     - Source: Deploy from a branch
     - Branch: `gh-pages` / `(root)`
   - Click Save

3. **Access your site**:
   - After the workflow completes, your site will be available at:
   - `https://alexgazin.github.io/subtracker/`

### Local Development

To work on the UI locally:

```bash
# Navigate to UI directory
cd ui

# Install dependencies
npm install

# Start development server
npm run dev

# Open http://localhost:5173 in your browser
```

### Manual Deployment (if needed)

If you need to deploy manually:

```bash
# Build the UI
cd ui
npm install
npm run build

# The build output will be in ui/dist/
```

### Notes

- The workflow uses `GITHUB_TOKEN` - no extra secrets needed
- The UI is configured with base path `/subtracker/` for GitHub Pages
- Build artifacts (`ui/dist/`) are automatically excluded from version control

## Как сделать сайт доступным (GitHub Pages)

Интерфейс в папке `ui/` настроен для автоматического развертывания на GitHub Pages.

### Быстрый старт

1. **Автоматическое развертывание**: При слиянии изменений в ветку `master`, GitHub Actions автоматически:
   - Установит зависимости
   - Соберет приложение в production режиме
   - Развернет его на ветке `gh-pages`

2. **Включить GitHub Pages** (первый раз):
   - Перейдите в Settings → Pages вашего репозитория
   - В разделе "Build and deployment":
     - Source: Deploy from a branch
     - Branch: `gh-pages` / `(root)`
   - Нажмите Save

3. **Доступ к сайту**:
   - После завершения workflow, ваш сайт будет доступен по адресу:
   - `https://alexgazin.github.io/subtracker/`

### Локальная разработка UI

```bash
# Перейти в папку UI
cd ui

# Установить зависимости
npm install

# Запустить dev-сервер
npm run dev

# Открыть http://localhost:5173 в браузере
```

### Ручное развертывание (если требуется)

```bash
# Собрать UI
cd ui
npm install
npm run build

# Результат сборки будет в ui/dist/
```

## Структура проекта
- `src/server.ts` - Точка входа
- `src/controllers/` - Обработка запросов (Auth, App)
- `src/services/` - Бизнес-логика (Billing, Notifications)
- `src/views/` - Шаблоны страниц (EJS)
- `src/public/` - Статические файлы (CSS)
- `prisma/` - Схема БД и миграции
