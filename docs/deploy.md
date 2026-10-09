# Деплой на VPS

Схема: GitHub Actions собирает приложение и копирует его на сервер по SSH;
на сервере Node.js работает за Caddy, который сам получает HTTPS-сертификат.

```
браузер ──HTTPS──▶ Caddy :443 ──▶ Node 127.0.0.1:3000 (.output)
                                   └─ отзывы: /srv/music-machine/.data
```

Файлы — в папке `deploy/`:

| Файл | Что делает |
|---|---|
| `setup.sh` | один раз готовит чистый сервер: Node 22, Caddy, пользователь, firewall, swap, бэкап |
| `music-machine.service` | systemd-сервис: запуск, перезапуск при падении, защита файловой системы |
| `Caddyfile` | HTTPS и прокси на Node, `www` → без `www` |
| `music-machine.env.example` | настройки (переменные окружения) |
| `release.sh` | выкладка версии: распаковка, переключение, проверка, откат |

Деплой — `.github/workflows/deploy.yml`: после зелёного CI на `main`
(или вручную: Actions → Deploy → Run workflow).

## 1. Сервер и домен

1. VPS в России (Timeweb Cloud, Selectel, Beget, REG.RU…): **Ubuntu 24.04,
   1 vCPU, 1 ГБ RAM, 10+ ГБ диска** — этого хватает с запасом.
2. Домен (например, в REG.RU или nic.ru). В DNS две A-записи на IP сервера:
   `@` и `www`. Проверить: `ping ваш-домен` отвечает IP сервера.

## 2. Ключ для деплоя

На своём компьютере:

```bash
ssh-keygen -t ed25519 -f music-machine-deploy -N "" -C github-deploy
```

Получатся `music-machine-deploy` (закрытый — в GitHub) и
`music-machine-deploy.pub` (открытый — на сервер).

## 3. Настройка сервера (один раз)

```bash
# со своего компьютера: папка deploy и открытый ключ — на сервер
scp -r deploy music-machine-deploy.pub root@IP_СЕРВЕРА:/root/
ssh root@IP_СЕРВЕРА

# на сервере
bash /root/deploy/setup.sh ваш-домен.ru "$(cat /root/music-machine-deploy.pub)"
```

Скрипт можно запускать повторно — существующие настройки он не трогает.

## 4. GitHub

Settings → Secrets and variables → Actions:

| Тип | Имя | Значение |
|---|---|---|
| Secret | `DEPLOY_SSH_KEY` | содержимое закрытого ключа `music-machine-deploy` |
| Secret | `DEPLOY_KNOWN_HOSTS` | вывод `ssh-keyscan ваш-домен.ru` (защита от подмены сервера) |
| Variable | `DEPLOY_HOST` | `ваш-домен.ru` (или IP) |
| Variable | `DEPLOY_SSH_PORT` | только если SSH не на 22 |

Пока `DEPLOY_HOST` не задан, деплой не запускается.

Первая выкладка: Actions → Deploy → Run workflow (ветка `main`). Через
минуту-две сайт открывается на `https://ваш-домен.ru`.

## Настройки

`/etc/music-machine.env` на сервере; после правки —
`sudo systemctl restart music-machine`.

- `NUXT_PUBLIC_FEEDBACK_ENABLED=true` — включить «Отправить отзыв».
  Отзывы лежат в `/srv/music-machine/.data/feedback/`, по дате.
- `NUXT_FEEDBACK_WEBHOOK_URL` — дублировать отзывы на вебхук.
- `NUXT_PUBLIC_DONATE_URL` — ссылка на донат (Boosty и т. п.).

## Каждый день

| Задача | Команда на сервере |
|---|---|
| Логи приложения | `journalctl -u music-machine -f` |
| Статус | `systemctl status music-machine` |
| Логи Caddy / HTTPS | `journalctl -u caddy -f` |
| Версии на сервере | `ls -lt /srv/music-machine/releases` (хранятся 5 последних) |

**Откат.** Если новая версия не отвечает, `release.sh` сам возвращает
предыдущую, и деплой в GitHub краснеет. Откатиться вручную:

```bash
sudo -u musicmachine ln -sfn /srv/music-machine/releases/<sha> /srv/music-machine/current
sudo systemctl restart music-machine
```

или перезапустить Deploy в GitHub на нужном коммите (Actions → прошлый
запуск → Re-run).

**Бэкап.** Каждую ночь `.data` (отзывы) архивируется в
`/var/backups/music-machine/` и хранится 14 дней. Это защищает от ошибок,
но не от потери сервера: раз в месяц стоит забирать архив к себе
(`scp root@IP:/var/backups/music-machine/*.tar.gz .`) или включить снимки
диска у хостинга.

**Обновления.** Обновления безопасности Ubuntu ставятся сами
(unattended-upgrades). Раз в пару месяцев: `apt update && apt upgrade`
и перезагрузка.

## Безопасность

- Node слушает только `127.0.0.1`, снаружи открыты 22, 80 и 443 (ufw).
- Приложение работает от пользователя `musicmachine` и может писать только
  в `.data` (`ProtectSystem=strict`).
- Ключ деплоя даёт вход под `musicmachine` и право только на
  `systemctl restart music-machine`; root им не получить.
- Стоит отключить вход root по паролю: в `/etc/ssh/sshd_config`
  `PasswordAuthentication no` (сначала добавьте свой ключ!).
