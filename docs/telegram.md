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
4. Описание и аватарка: см. ниже.

Язык выбирается так же, как на сайте: по языку телефона, дальше
переключателем.

## Описание и аватарка

**Аватарка:** `/setuserpic` → бот → картинка, отправленная как фото (не
файлом). Подойдёт иконка сайта `public/icon-512.png`: та же картинка, что
и аватарка сейчас.

**Описание** (`/setdescription`, до 512 символов) видно в пустом чате с
ботом, в блоке «Что умеет этот бот?»:

```
🥁 Тренажёр ритмов сальсы и бачаты.

Собери бит из живой перкуссии — клаве, конги, бонго, гуира, бас — и послушай, как звучит каждый инструмент. Убирай лишнее, меняй темп и тренируйся под счёт.

Помогает услышать «раз», попадать в музыку и понимать, что играет оркестр.

Нажми «Играть» 👇
```

**Краткое описание** (`/setabouttext`, до 120 символов) видно в профиле
бота и в пересланной ссылке:

```
Тренажёр ритмов сальсы и бачаты: собери бит, слушай счёт и танцуй в своём темпе. latinbeatmachine.ru
```

«Играть» — подпись кнопки меню из шага 3; если она другая, поправьте текст.

### По-английски

BotFather задаёт один текст для всех. Отдельный текст для тех, у кого
Telegram на английском, задаётся через Bot API. Токен бота: `/mybots` → бот
→ **API Token**. Это как пароль: не публиковать и не коммитить; если утёк,
там же **Revoke**.

```bash
TOKEN='токен бота'

curl -s "https://api.telegram.org/bot$TOKEN/setMyDescription" \
  --data-urlencode 'language_code=en' \
  --data-urlencode 'description=🥁 A Salsa & Bachata rhythm trainer.

Build a beat from real percussion — clave, congas, bongos, güira, bass — and hear what each instrument plays. Strip it back, change the tempo and practice to the count.

Learn to hear the "one", stay on the beat and understand what the band is doing.

Tap "Play" 👇'

curl -s "https://api.telegram.org/bot$TOKEN/setMyShortDescription" \
  --data-urlencode 'language_code=en' \
  --data-urlencode 'short_description=Salsa & Bachata rhythm trainer: build a beat, hear the count and dance at your own tempo. latinbeatmachine.ru'
```

Каждая команда отвечает `{"ok":true,"result":true}`.

## Проверка

Откройте бота в Telegram на телефоне и нажмите кнопку. Если Mini App не
открывается в Telegram Web (web.telegram.org), проверьте, что на сервере
стоит версия с этим изменением: заголовок `Content-Security-Policy` должен
разрешать `frame-ancestors https://web.telegram.org`.
