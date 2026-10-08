# Аудит безопасности и производительности

Дата: 2026-10-08 · Коммит: `494f627` · Стек: Nuxt 4.5.2 (SSR), Vue 3.5, Web Audio API

Как проверялось: чтение всего кода в `app/`, `scripts/`, конфигов; `npm audit`;
`nuxt build` + запуск собранного сервера и проверка HTTP-заголовков через `curl`;
замеры размеров бандла и аудио; `npm test` (145/145 зелёные).

## Итог

Поверхность атаки маленькая: бэкенда, API, хранилища, авторизации и
пользовательского HTML нет, весь вывод идёт через экранирование Vue (`v-html`
не используется). Серьёзных уязвимостей в рантайме нет. Основные риски — в
будущих фичах (шаринг паттерна по ссылке) и в отсутствии HTTP-заголовков.
По производительности главное — первый запуск: на Bachata до звука качается
≈1,8 МБ несжатых WAV.

| # | Находка | Тип | Серьёзность |
|---|---------|-----|-------------|
| S1 | `deserializePattern` без валидации: отрицательный BPM → бесконечный цикл | Безопасность | Высокая (когда появится шаринг) — **исправлено** |
| S2 | Нет security-заголовков, есть `x-powered-by: Nuxt` | Безопасность | Средняя — **исправлено** |
| S3 | 20 уязвимостей в `npm audit` — все только в dev/build-зависимостях | Безопасность | Низкая |
| P1 | Аудио — несжатые WAV, грузятся все сразу при первом Play | Производительность | Высокая |
| P2 | Аудио отдаётся без `Cache-Control`; буферы теряются при смене страницы | Производительность | Средняя |
| P3 | На каждом шаге перерисовывается вся сетка (до ~770 кнопок) | Производительность | Средняя |
| P4 | Нет сжатия gzip/brotli у Node-сервера | Производительность | Средняя |
| P5 | Мелочи: дубли загрузок, «запоздалые» `setTimeout` после Stop, дубликаты файлов | Производительность | Низкая |

---

## Безопасность

### S1. Десериализация паттерна без валидации — высокая (латентная)

> **Исправлено.** `deserializePattern` перенесён в `app/data/sharedPattern.ts`
> и проверяет всё по конфигу жанра (`validatePattern`), собирая паттерн заново
> только из известных полей; диапазоны BPM теперь в `genreConfig` и общие со
> слайдерами. Планировщик останавливается, если шаг не конечен или ≤ 0.
> Тесты: `tests/sharedPattern.test.ts`, `tests/useBeatScheduler.test.ts`.

`app/composables/usePattern.ts:126` — `JSON.parse(decodeURIComponent(atob(encoded)))`
возвращается как `Pattern` без проверки. Сейчас функция используется только в
тестах, но описание приложения обещает «share patterns» — как только паттерн
начнёт приходить из URL, это станет вектором атаки через ссылку:

- **Зависание вкладки.** `bpm <= 0` (или `stepsPerCount < 0`) делает
  `stepDuration()` отрицательным/`Infinity`, и `while` в `tick()`
  (`useBeatScheduler.ts:115`) никогда не заканчивается. `stepsPerCount: 0`
  даёт `% 0 → NaN`.
- **Исчерпание памяти.** `counts: 1e9` → `Array.from` гигантской длины в
  `setCounts`/`resizeSteps` и рендер миллионов кнопок.
- **Ключи прототипа.** `instrument: "constructor"` или step `"toString"`:
  `samples[track.instrument]?.[name]` достанет функцию из `Object.prototype`,
  она попадёт в ветку «массив дублей» и даст `url: undefined`.
- `atob`/`decodeURIComponent`/`JSON.parse` бросают исключения — нужно ловить.

**Рекомендация:** до внедрения шаринга добавить строгую валидацию
(zod/valibot или ручную): `genre ∈ {salsa, bachata}`; `counts ∈ COUNT_OPTIONS`;
`stepsPerCount ∈ {2, 4}`; `bpm` в диапазоне слайдера; `instrument` из
`genreConfig[genre].instruments`; каждый step — `null` или ключ из
`stepNames(...)`; `chords` — из `CHORD_NAMES`; `volume ∈ [0,1]`;
длина `steps` = `patternLength`. Доступ к картам сэмплов — через `Object.hasOwn`.
Плюс ограничить длину входной строки и обернуть всё в `try/catch`.
Дополнительно защитить сам планировщик: `if (!(stepDuration() > 0)) return`.

### S2. HTTP-заголовки — средняя

> **Исправлено.** Заголовки заданы в `nuxt.config.ts` под `$production`
> (в dev мешали бы HMR); `x-powered-by` убирает `server/plugins/hide-powered-by.ts`.
> Заодно `/audio/**` получил `Cache-Control` на неделю (часть P2).
> Проверено на собранном сервере в Chromium: гидратация и звук работают,
> нарушений CSP нет.

Ответ собранного сервера на `/bachata`:

```
content-type: text/html;charset=utf-8
x-powered-by: Nuxt
```

Нет `Content-Security-Policy`, `X-Frame-Options`/`frame-ancestors`,
`X-Content-Type-Options`, `Referrer-Policy`, `Strict-Transport-Security`,
`Permissions-Policy`. Приложение можно встроить в чужой iframe (clickjacking),
а при появлении XSS ничто его не ограничит.

**Рекомендация:** модуль `nuxt-security` либо `routeRules` в `nuxt.config.ts`:

```ts
routeRules: {
  '/**': {
    headers: {
      'Content-Security-Policy': "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; media-src 'self'; connect-src 'self'; frame-ancestors 'none'; base-uri 'self'; object-src 'none'",
      'X-Content-Type-Options': 'nosniff',
      'Referrer-Policy': 'strict-origin-when-cross-origin',
      'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
      'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
    },
  },
},
```

(`'unsafe-inline'` для скриптов нужен из-за инлайн-payload Nuxt; с
`nuxt-security` можно перейти на nonce.) `x-powered-by` убирается тем же модулем
или `nitro.hooks`/middleware.

Когда добавится микрофон (анализ треков, `docs/track-analysis-plan.md`) —
разрешить `microphone=(self)`, а не `*`.

### S3. Зависимости — низкая

`npm audit`: 20 записей (6 critical, 10 high, 4 moderate). Корни:

| Пакет | Откуда | Где работает |
|-------|--------|--------------|
| `simple-git@3.36.0` (выполнение команд через git config) | `@nuxt/devtools` | только `nuxt dev` |
| `node-forge@1.4.0` (проверка подписи RSA) | `listhen` (dev-HTTPS) | только `nuxt dev` |
| `braces`/`micromatch`/`chokidar` (ReDoS/stack exhaustion) | `tailwindcss@3` | сборка/dev |
| `postcss-selector-parser@6` (квадратичная сложность) | `tailwindcss@3`, `postcss-nested` | сборка |

В `.output/server/node_modules` (прод-рантайм) ни одного из этих пакетов нет —
там только `vue`, `vue-router`, `unhead`, `devalue`, `ufo` и т. п. Предложение
`npm audit fix --force` (откат на `nuxt@3.7.4`) применять **нельзя**.

**Рекомендация:**
- обновить `nuxt` до 4.6.0 и проверить audit заново;
- `devtools: { enabled: process.env.NODE_ENV !== 'production' }` — или вообще
  выключить, раз `simple-git` тянется именно через devtools;
- при необходимости `overrides` в `package.json` на `simple-git@^4`;
- tailwind-цепочка закроется только переходом на Tailwind 4
  (`@tailwindcss/vite`), это отдельная задача;
- включить Dependabot/Renovate.

### Что проверено и в порядке

- XSS: `v-html`/`innerHTML` не используются, имена инструментов и шагов
  выводятся через `{{ }}`.
- Нет секретов в репозитории, `.env*` в `.gitignore`.
- `scripts/generate-samples.mjs` не запускает внешних команд, читает только
  локальные файлы из `audio-sources/`.
- `AudioContext` создаётся только по жесту пользователя (`play()`), SSR-безопасно.

---

## Производительность

### P1. Размер аудио и стратегия загрузки — высокая

- Все сэмплы — 16-bit mono WAV 44.1 кГц: Salsa ≈ 0,69 МБ, Bachata ≈ 1,84 МБ
  (из них 13 гитарных нот по 106 КБ ≈ 1,38 МБ).
- `ensureSamplesLoaded()` (`useBeatMachine.ts:58`) грузит **все** сэмплы жанра
  перед первым звуком, поэтому первый Play на медленном мобильном
  интернете ждёт несколько секунд.

**Рекомендация:**
1. Генерировать в `generate-samples.mjs` Opus (`.webm`/`.ogg`) или AAC (`.m4a`,
   для Safari) ~96 кбит/с — в 8–10 раз меньше. WAV оставить как fallback.
2. Начинать загрузку заранее: по `onMounted` / `requestIdleCallback` или при
   наведении на Play (fetch можно без `AudioContext`, декодировать — позже).
3. Сначала грузить сэмплы, нужные текущему паттерну, остальное — в фоне.
4. Показывать состояние загрузки на кнопке Play.

### P2. Кэширование — средняя

- `/audio/**` отдаётся с `ETag`, но без `Cache-Control`, — браузер
  ревалидирует при каждом заходе. `/_nuxt/**` уже `immutable` — это хорошо.
- `engine.dispose()` при уходе со страницы очищает `bufferCache`, поэтому
  переход Salsa → главная → Salsa заново скачивает и декодирует всё.

**Рекомендация:** `routeRules: { '/audio/**': { headers: { 'cache-control': 'public, max-age=604800, stale-while-revalidate=86400' } } }`
(или хэш в имени файла + `immutable`). Вынести кэш декодированных буферов
(или хотя бы `ArrayBuffer`) в модульный синглтон, переживающий размонтирование.

### P3. Перерисовка сетки на каждом шаге — средняя

`activeStep` меняется ~7 раз в секунду (220 BPM × 2 шага). Он передаётся
пропсом в `BeatGrid` и во **все** `InstrumentTrack`, поэтому на 48 счётов
(6 блоков × 7–8 дорожек × 16 кнопок ≈ 770 кнопок) каждую смену шага
пересчитывается вся сетка. Дополнительно:

- `:sample-names="stepNames(track.instrument)"` (`BeatGrid.vue:103`) на каждом
  рендере создаёт новый массив, поэтому дорожки перерисовываются, даже если
  их ничего не касалось;
- `:title="sampleNames.join(', ')"` вычисляется для каждой кнопки.

**Рекомендация:** мемоизировать `stepNames` (вычислить один раз на инструмент
в `computed`); передавать в дорожку `activeStep` только если он попадает в её
диапазон `start..start+length` (иначе `-1`), чтобы перерисовывался один блок;
`title` считать один раз на дорожку; при желании — `v-memo` на кнопках.
Альтернатива — подсвечивать плейхед через CSS-переменную / один класс на
контейнере, вообще не трогая кнопки.

### P4. Сжатие ответов — средняя

Самый большой JS-чанк — 189 КБ (≈ 60 КБ gzip), но Node-сервер Nitro отдаёт его
без `Content-Encoding`. За CDN/nginx это обычно решается там же; иначе включить
`nitro: { compressPublicAssets: true }` — Nitro заранее создаст `.gz`/`.br`.

### P5. Мелочи — низкая

- **Параллельные Play.** `ensureSamplesLoaded` не запоминает промис в процессе
  загрузки: два быстрых клика (или смена паттерна во время загрузки)
  запускают повторные `fetch` + `decodeAudioData` тех же файлов. Кэшировать
  `Promise<AudioBuffer>`, а не результат.
- **`setTimeout` после Stop.** `tick()` планирует обновления `activeStep` на
  до 100 мс вперёд; `stop()` их не отменяет, поэтому плейхед «прыгает» после
  остановки, а при уходе со страницы колбэки пишут в уже ненужный ref. Хранить
  id таймеров и чистить в `stop()`, либо проверять `isPlaying`. Плюс
  `InstrumentTrack` рисует кольцо на `activeStep === stepIndex` и в остановленном
  состоянии (шаг 0 всегда подсвечен).
- **`fetch` без `response.ok`.** На 404 ошибка всплывает только из
  `decodeAudioData` с невнятным сообщением.
- **Дубли файлов.** 7 пар байт-в-байт одинаковых WAV (бонги Salsa и Bachata):
  можно ссылаться на один путь, чтобы браузер кэшировал их один раз.
- **Горячий цикл через reactive proxy.** Планировщик читает `pattern.value`
  (глубоко реактивный) каждые 25 мс; на текущих объёмах некритично, но
  `toRaw` в `scheduleStep` уберёт лишние трекинговые вызовы.
- `createRoomImpulse` генерирует 1,6 с стерео шума на главном потоке при первом
  включении реверба (~150 тыс. отсчётов) — единичные миллисекунды, можно
  оставить.

### Что в порядке

- Планировщик с lookahead по `AudioContext.currentTime` — правильный подход,
  таймингу джиттер event loop не мешает.
- Озвученные голоса с `group` удаляются по `onended`, утечки узлов не видно;
  `AudioContext` закрывается при размонтировании.
- Клиентский JS небольшой (≈ 220 КБ несжатого суммарно), чанки `/_nuxt/`
  кэшируются как `immutable`.

---

## План по приоритетам

1. **До шаринга по ссылке:** валидация в `deserializePattern` + защита
   планировщика от `stepDuration() <= 0` (S1).
2. Security-заголовки и `Cache-Control` для `/audio/**` в `nuxt.config.ts`
   (S2, P2) — одна правка конфига.
3. Сжатое аудио + ранняя/приоритетная загрузка (P1) — самый заметный выигрыш
   для пользователя.
4. Локализовать перерисовку сетки (P3), `compressPublicAssets` (P4).
5. Обновить Nuxt, выключить devtools в проде, настроить Dependabot (S3).
6. Мелочи из P5.
