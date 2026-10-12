# Telegram Mini App

Mini App — это тот же сайт, открытый внутри Telegram. Отдельной версии и
отдельного деплоя нет: бот просто открывает `https://latinbeatmachine.ru`.

Когда страница открыта из Telegram, сайт это замечает (Telegram добавляет к
адресу `#tgWebAppData=…`), подгружает SDK Telegram и:

- разворачивается на всю высоту;
- красит шапку и фон Telegram в цвет сайта;
- отключает закрытие свайпом вниз, чтобы оно не срабатывало при работе с сеткой битов;
- показывает кнопку «Назад» Telegram на странице жанра, она ведёт на главную;
- при первом запуске переключается на язык Telegram;
- хранит собранный бит каждого жанра в облаке Telegram (см. ниже);
- отвечает лёгкой вибрацией на нажатия: кнопки и клетки сетки — слабо,
  «Играть»/«Стоп» — сильнее, выбор в списке — щелчок;
- открывает жанр или присланный бит из ссылки `t.me/latinbeatmachine_bot?startapp=…`;
- «Поделиться» открывает выбор чата Telegram (см. «Ссылки» ниже).

Обычные посетители сайта SDK не скачивают. Код: `TELEGRAM_LOADER` в
`nuxt.config.ts`, `app/plugins/telegram.client.ts` и `app/core/telegram.ts`.

## Настройка бота (один раз)

В Telegram откройте [@BotFather](https://t.me/BotFather).

1. `/newbot` — имя (например, `Latin Beat Machine`) и username,
   оканчивающийся на `bot` (у нас — `latinbeatmachine_bot`).
2. `/mybots` → ваш бот → **Bot Settings** → **Configure Mini App** →
   **Enable Mini App** → адрес `https://latinbeatmachine.ru`.
   В профиле бота появится кнопка «Открыть» (её Telegram переводит сам),
   а ссылка `https://t.me/latinbeatmachine_bot?startapp` открывает приложение сразу.
3. `/mybots` → бот → **Bot Settings** → **Menu Button** → подпись `▶ Play`
   → тот же адрес. Это кнопка в чате с ботом, слева от поля ввода. Без
   своей подписи её нет (`/empty` её убирает), а своя подпись одна на все
   языки, поэтому — понятная без перевода. Проверить, что задано:
   `curl -s "https://api.telegram.org/bot$TOKEN/getChatMenuButton"`
   (про токен — ниже).
4. Описание и аватарка: см. ниже.

Язык при первом запуске берётся из настроек Telegram (если сайт его знает:
русский или английский, иначе — по языку телефона, как на сайте). Дальше
его меняет переключатель, и выбор запоминается.

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

Жми на кнопку внизу 👇
```

**Краткое описание** (`/setabouttext`, до 120 символов) видно в профиле
бота и в пересланной ссылке:

```
Тренажёр ритмов сальсы и бачаты: собери бит, слушай счёт и танцуй в своём темпе. latinbeatmachine.ru
```

Описания ссылаются на «кнопку внизу», а не на её подпись, чтобы не
расходиться с ней, если подпись поменяется.

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

Tap the button below 👇'

curl -s "https://api.telegram.org/bot$TOKEN/setMyShortDescription" \
  --data-urlencode 'language_code=en' \
  --data-urlencode 'short_description=Salsa & Bachata rhythm trainer: build a beat, hear the count and dance at your own tempo. latinbeatmachine.ru'
```

Каждая команда отвечает `{"ok":true,"result":true}`.

## Ссылки

**На жанр:** `https://t.me/latinbeatmachine_bot?startapp=salsa` или `?startapp=bachata`
открывает Mini App сразу на странице жанра, на языке пользователя. Удобно
для постов и чатов танцевальных школ.

**На бит.** Внутри Mini App кнопка «Поделиться» открывает выбор чата
Telegram с сообщением «Вот мой бит — открой в Latin Beat Machine 🥁» и
ссылкой `t.me/latinbeatmachine_bot?startapp=salsa_…`. Получатель нажимает — и бит
открывается у него в Mini App, со всем: темп, длина, выключенные
инструменты. Бит в ссылке сжат: Telegram пропускает не больше 512
символов, а код бита сальсы — около 790, сжатый — около 350. Если бит всё
равно не влезает (длинная песня) или телефон слишком старый (iOS до 16.4),
в чат уходит обычная ссылка на сайт с этим битом.

Для этого сайту нужен username бота (без `@`): строка
`NUXT_PUBLIC_TELEGRAM_BOT=…` в `/etc/music-machine.env` на сервере. Если
её там ещё нет (файл создан до этой настройки):

```bash
echo 'NUXT_PUBLIC_TELEGRAM_BOT=latinbeatmachine_bot' | sudo tee -a /etc/music-machine.env
sudo systemctl restart music-machine
```

Если есть — поправить её (`sudo nano /etc/music-machine.env`) и тоже
перезапустить. Пока username не задан, «Поделиться» в Telegram ведёт себя
как в браузере, а ссылки на жанр работают и так.

## Биты в облаке Telegram

На сайте последний изменённый бит каждого жанра хранится в браузере. В
Mini App он ещё и сохраняется в облаке Telegram (CloudStorage) — в
аккаунте пользователя, без нашего сервера. Собрал бит на телефоне —
открыл бота на компьютере, и он там.

- Сохраняется через секунду после последнего изменения (правки идут
  пачками нажатий).
- При открытии облачная копия важнее копии на устройстве, если человек не
  успел начать править раньше, чем она пришла.
- Нетронутый пресет не хранится: «Сбросить» убирает бит и из облака.
- Значение в облаке — до 4096 символов; бит сжимается так же, как в
  ссылках. Не влезает (очень длинная песня) или телефон не умеет сжимать
  (iOS до 16.4) — бит остаётся только на этом устройстве, как раньше.

## Проверка

Откройте бота в Telegram на телефоне и нажмите кнопку. Если Mini App не
открывается в Telegram Web (web.telegram.org), проверьте, что на сервере
стоит версия с этим изменением: заголовок `Content-Security-Policy` должен
разрешать `frame-ancestors https://web.telegram.org`.
