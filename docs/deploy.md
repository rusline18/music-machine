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

1. VPS в России (Timeweb Cloud, Selectel, Beget, REG.RU…): **Ubuntu 24.04
   или Debian 13, 1 vCPU, 1 ГБ RAM, 10+ ГБ диска**: этого хватает с запасом.
2. Домен (например, в REG.RU или nic.ru) и в его DNS две A-записи на IP
   сервера: `@` и `www`. Подробности ниже, в «DNS в REG.RU».

Домена пока нет? Можно начать с бесплатного адреса `IP.sslip.io`
(например, `91.197.99.147.sslip.io`): он сам указывает на этот IP, и Caddy
получит на него сертификат. Домен подключается потом, см. «Сменить домен».

### DNS в REG.RU

- Записи правятся там, куда указывают DNS-серверы домена (видно в карточке
  домена). `ns1/ns2.hosting.reg.ru`: в панели хостинга (ISPmanager, таблица
  записей). `ns1/ns2.reg.ru`: в карточке домена → «DNS-серверы и управление
  зоной» → «Ресурсные записи».
- A-записи `@` и `www` поменять на IP сервера.
- **AAAA-записи `@` и `www` удалить.** Иначе там остаётся IPv6-адрес
  хостинга REG.RU: Let's Encrypt проверит домен по нему и не выдаст
  сертификат, а часть посетителей попадёт не на сайт. Остальное (MX, `mail`,
  `ftp`, TXT…) не трогать.
- Новый домен `.ru` появляется в DNS за 1–6 часов (до суток). Проверка:
  ```bash
  dig +short @ns1.hosting.reg.ru ваш-домен.ru A   # что настроено у REG.RU
  dig +short @8.8.8.8 ваш-домен.ru A              # что видит интернет
  dig +short @8.8.8.8 ваш-домен.ru AAAA           # должно быть пусто
  ```
  Нет `dig`: `sudo apt-get install -y dnsutils` или сайт dnschecker.org.
  `ping` у себя может ещё долго отвечать «домена нет»: это кэш провайдера.

## 2. Ключ для деплоя

На своём компьютере, сразу в `~/.ssh`, чтобы ключ не попал в репозиторий:

```bash
ssh-keygen -t ed25519 -f ~/.ssh/music-machine-deploy -N "" -C github-deploy
```

Получатся `music-machine-deploy` (закрытый, пойдёт в GitHub) и
`music-machine-deploy.pub` (открытый, пойдёт на сервер). Ключ отдельный от
вашего личного: с ним можно только выложить версию и перезапустить сайт, а
при утечке достаточно удалить его строку из
`/srv/music-machine/.ssh/authorized_keys`.

## 3. Настройка сервера (один раз)

Со своего компьютера, из папки репозитория:

```bash
scp -r deploy ~/.ssh/music-machine-deploy.pub ПОЛЬЗОВАТЕЛЬ@IP_СЕРВЕРА:~/
ssh ПОЛЬЗОВАТЕЛЬ@IP_СЕРВЕРА
```

На сервере (домен или `IP.sslip.io`):

```bash
sudo bash ~/deploy/setup.sh ваш-домен.ru "$(cat ~/music-machine-deploy.pub)"
```

В конце скрипт пишет `Done.` Его можно запускать повторно: существующие
настройки (в том числе `/etc/music-machine.env`) он не трогает, а новый
ключ просто добавляет.

`sudo` спрашивает пароль **вашего пользователя**, не root. Если пароль не
подходит или пользователя нет в sudo, под root: `passwd ПОЛЬЗОВАТЕЛЬ`,
`usermod -aG sudo ПОЛЬЗОВАТЕЛЬ`. Или запустить скрипт прямо под root, без
`sudo`, с полными путями к файлам.

### Если скрипт упал

| Сообщение | Что сделать |
|---|---|
| `sudo: unable to resolve host …` | Не ошибка. Убрать: `echo "127.0.1.1 $(hostname)" \| sudo tee -a /etc/hosts` |
| `bad domain: …` | Вместо домена осталась заглушка; подставить настоящий домен или `IP.sslip.io` |
| `grub-pc … does not exist, so cannot grub-install` | Образ хостинга не донастроил загрузчик. Имя диска: `lsblk -d -o NAME,TYPE` (строка `disk`, например `sda`), затем `echo "grub-pc grub-pc/install_devices multiselect /dev/sda" \| sudo debconf-set-selections` и `sudo dpkg --configure -a`. Нужен весь диск (`/dev/sda`), не раздел. Перед этим стоит сделать снимок сервера в панели хостинга |

## 4. GitHub

Settings → Secrets and variables → Actions. Всё заводится на уровне
**репозитория** (Repository secrets / Repository variables), не в
Environments: `DEPLOY_HOST` проверяется до того, как подключается
environment, и оттуда его не видно.

| Тип | Имя | Значение |
|---|---|---|
| Secret | `DEPLOY_SSH_KEY` | весь вывод `cat ~/.ssh/music-machine-deploy`, со строками BEGIN и END |
| Secret | `DEPLOY_KNOWN_HOSTS` | вывод `ssh-keyscan IP_СЕРВЕРА` (защита от подмены сервера) |
| Variable | `DEPLOY_HOST` | `IP_СЕРВЕРА`; по IP деплой не зависит от DNS и смены домена |
| Variable | `DEPLOY_SSH_PORT` | только если SSH не на 22 |

Пока `DEPLOY_HOST` не задан, деплой не запускается.

Первая выкладка: Actions → Deploy → Run workflow (ветка `main`). Через
минуту-две сайт открывается на `https://ваш-домен.ru`.

**`Permission denied (publickey,password)` на шаге Upload:** сервер не
пускает ключ из `DEPLOY_SSH_KEY`. Проверить со своего компьютера тем же
способом, что и GitHub:

```bash
ssh -i ~/.ssh/music-machine-deploy musicmachine@IP_СЕРВЕРА echo ok
```

`ok`: сервер в порядке, в секрет вставлен не тот ключ или не целиком.
Отказ: на сервере нет пользователя `musicmachine` (`id musicmachine`) или в
`/srv/music-machine/.ssh/authorized_keys` другой ключ; перезапустить
`setup.sh` с нужным `.pub`.

## 5. После запуска

- **Закрыть вход по паролю и под root.** Сначала свой ключ:
  `ssh-copy-id ПОЛЬЗОВАТЕЛЬ@IP_СЕРВЕРА`, проверить, что пускает без пароля.
  Затем на сервере:
  ```bash
  sudo sed -i 's/^#\?PasswordAuthentication.*/PasswordAuthentication no/; s/^#\?PermitRootLogin.*/PermitRootLogin no/' /etc/ssh/sshd_config
  sudo systemctl restart ssh
  ```
  Текущую сессию не закрывать, пока вход не проверен в новом окне. Деплою
  это не мешает: он заходит как `musicmachine` по ключу.
- Снимок сервера в панели хостинга.

## Сменить домен

Например, с `IP.sslip.io` на купленный. Сначала DNS (раздел 1); когда
`dig +short @8.8.8.8 новый-домен.ru A` отвечает IP сервера:

```bash
sudo bash ~/deploy/setup.sh новый-домен.ru "$(cat ~/music-machine-deploy.pub)"
sudo sed -i 's|^NUXT_PUBLIC_I18N_BASE_URL=.*|NUXT_PUBLIC_I18N_BASE_URL=https://новый-домен.ru|' /etc/music-machine.env
sudo systemctl restart music-machine
```

Caddy сам получит сертификат; в логе `sudo journalctl -u caddy -n 30
--no-pager` появится `certificate obtained successfully`. В GitHub ничего
менять не нужно, если `DEPLOY_HOST` — это IP. Старый адрес перестаёт
работать.

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
(`scp ПОЛЬЗОВАТЕЛЬ@IP:/var/backups/music-machine/*.tar.gz .`) или включить снимки
диска у хостинга.

**Обновления.** Обновления безопасности системы ставятся сами
(unattended-upgrades). Раз в пару месяцев: `apt update && apt upgrade`
и перезагрузка.

## Безопасность

- Node слушает только `127.0.0.1`, снаружи открыты 22, 80 и 443 (ufw).
- Приложение работает от пользователя `musicmachine` и может писать только
  в `.data` (`ProtectSystem=strict`).
- Ключ деплоя даёт вход под `musicmachine` и право только на
  `systemctl restart music-machine`; root им не получить.
- Вход по паролю и под root стоит закрыть (раздел 5).
