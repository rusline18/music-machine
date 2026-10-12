# Telegram Mini App

Mini App — это тот же сайт, открытый внутри Telegram. Отдельной версии и
отдельного деплоя нет: бот просто открывает `https://latinbeatmachine.ru`.

Когда страница открыта из Telegram, сайт это замечает (Telegram добавляет к
адресу `#tgWebAppData=…`), подгружает SDK Telegram и:

- разворачивается на всю высоту;
- красит шапку и фон Telegram в цвет сайта;
- отключает закрытие свайпом вниз, чтобы оно не срабатывало при работе с сеткой битов;
- показывает кнопку «Назад» Telegram на странице жанра, она ведёт на главную.

Обычные посетители сайта SDK не скачивают. Код: `TELEGRAM_LOADER` в
`nuxt.config.ts` и `app/plugins/telegram.client.ts`.

## Настройка бота (один раз)

В Telegram откройте [@BotFather](https://t.me/BotFather).

1. `/newbot` — имя (например, `Latin Beat Machine`) и username,
   оканчивающийся на `bot` (например, `latinbeatmachine_bot`).
2. `/mybots` → ваш бот → **Bot Settings** → **Configure Mini App** →
   **Enable Mini App** → адрес `https://latinbeatmachine.ru`.
   В профиле бота появится кнопка «Открыть», а ссылка
   `https://t.me/<username>?startapp` открывает приложение сразу.
3. `/mybots` → бот → **Bot Settings** → **Menu Button** → тот же адрес и
   подпись кнопки (например, `Играть`). Кнопка появится в чате с ботом
   слева от поля ввода.
4. По желанию: `/setdescription`, `/setabouttext`, `/setuserpic` —
   описание и аватарка бота.

Язык выбирается так же, как на сайте: по языку телефона, дальше
переключателем.

## Проверка

Откройте бота в Telegram на телефоне и нажмите кнопку. Если Mini App не
открывается в Telegram Web (web.telegram.org), проверьте, что на сервере
стоит версия с этим изменением: заголовок `Content-Security-Policy` должен
разрешать `frame-ancestors https://web.telegram.org`.
