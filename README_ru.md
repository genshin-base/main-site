[english version of the guide](https://github.com/genshin-base/main-site/blob/miniapp/README.md)

## О приложении
Геншин База — приложение, где игроки в Геншин Импакт могут найти актуальные сборки персонажей, а так же посмотреть рекомендованных владельцев для оружия и артефактов. Удобный поиск, никакой лишней информации, возможность лайкнуть персонажа или предмет, а так же планировать добычу ресурсов в специальном виджете.

Так как будущее за супер-приложениями и визуальной информацией, приложение использует максимум возможностей, которые даёт Телеграм для мини-приложений. А так же имеет возможность поделиться страницей персонажа с другими пользователями мессенджера и сохранить сборку персонажа себе как картинку.

## О стилизации
На данный момент в Телеграме есть две темы для мини приложений — дневная и ночная. Предоставленного количества цветов недостаточно для полноценной стилизации приложения, поэтому часть цветов приходится генерировать. Пример генерации цветов, а так же пример переопределения дефолтных стилей приложения под Телеграм в [этом файле](https://github.com/genshin-base/main-site/blob/miniapp/www/src/miniapp-theme.scss).

Есть цвета, которые отсутствуют в более ранних версиях бота. Для их генерации нужно использовать ЯваСкрипт, пример в [этом файле](https://github.com/genshin-base/main-site/blob/miniapp/www/src/miniapp-styling.tsx).

## О генерации типов АПИ
Типы для АПИ мини приложений (`Telegram.WebApp` и др.) генерятся скриптом `node scripts/tg/update_webapp_types.js` по [странице с документацией](https://core.telegram.org/bots/webapps).
Результат сохраняется в [lib/telegram/webapp_types.d.ts](https://github.com/genshin-base/main-site/blob/miniapp/lib/telegram/webapp_types.d.ts).

## Кнопка «поделиться сборкой»
Интеграция в мессенджер была бы не полной, если бы нельзя было делиться прямой ссылкой на страницу персонажа с другими пользователями. Поэтому кнопкой «Поделиться» можно отправить ссылку, которая будет открывать приложение сразу на нужной странице. Ссылка формируется и применяется [здесь](https://github.com/genshin-base/main-site/blob/miniapp/www/src/modules/builds/character-build-detailed.tsx#L388).

## Кнопка сохранения сборки картинкой
Сейчас пользователям важно иметь возможность сохранить нужную информацию как картинку. Геншин База даёт и такую возможность. Используя Главную Кнопку (MainButton), пользователь может сохранить сборку как картинку. Инициализация кнопки в этом [файле](https://github.com/genshin-base/main-site/blob/miniapp/www/src/modules/builds/character-build-detailed.tsx#L78), а обработчик нажатия описан [здесь](https://github.com/genshin-base/main-site/blob/miniapp/www/src/modules/builds/character-build-detailed.tsx#L387)

## Пользовательское хранилище
Чтобы хранить предметы, которым пользователь поставил лайк, используется предоставленное Телеграмом хранилище. Подключение описано в этом [файле](https://github.com/genshin-base/main-site/blob/miniapp/www/src/utils/hooks.tsx#L128). Если возникнет ситуация, что пользователь давно не заходил в приложение, и формат хранимых данных поменялся, приложение сохраняет идентификатор текущего формата хранимых данных. Описано в (этом файле)[https://github.com/genshin-base/main-site/blob/miniapp/www/src/utils/hooks.tsx#L240]

## Нативный попап для быстрой настройки
У игры существует несколько серверов в разных временных зонах. Выбранный сервер определяет, что доступно для добычи сегодня. Чтобы удобно переключаться между серверами, приложение использует нативный попап Телеграма, пример использования в [этом файле](https://github.com/genshin-base/main-site/blob/miniapp/www/src/containers/time-until-day-reset.tsx#L37).

## Как запустить

Установить зависимости:

`npm install`

Сгенерить JSON'ки с данными по персонажам и предметам:

`node scripts/update.js www`

Сгенерить изображения, которые будут использоваться при отправке билдов в чат:

```bash
npm run build -- --env no-prerender
node scripts/render_build_images.js
```

### Фронтенд (HTML-страницы) мини-приложения

#### Дев-режим

Можно просто запустить дев-сервер в режиме `https`, а в качестве адреса веб-приложения указать `https://127.0.0.1:8080`.
Так можно отлаживать приложение через [веб-версию](https://web.telegram.org/) Телеграма.
Но нужно сначала открыть приложение в браузере по ссылке напрямую и согласиться использовать самоподписанный сертификат.

```bash
npm run dev -- --env tg-web-app-url=t.me/mybot/myapp --https
```

Можно проксировать запросы со своего домена с настроенным TLS, но в этом случае стоит добавить параметры
`--client-web-socket-url` и `--allowed-hosts`, чтобы работал HMR и автоперезагрузка страницы.

```bash
npm run dev -- --client-web-socket-url ws://0.0.0.0:443/ws --allowed-hosts all --env tg-web-app-url=t.me/mybot/myapp
```

Запросы к `/api` дев-сервер проксирует серверу бота на `127.0.0.1:8088`, достаточно запустить его рядом.

#### Прод-режим

```bash
npm run build -- --env tg-web-app-url=t.me/mybot/myapp --env no-prerender
cp -r www/public/. www/dist/browser/
```

Содержимое `www/dist/browser` может просто раздавать HTTPS-сервер (`nginx` например).

### Бекенд (бот)

```bash
TG_BOT_TOKEN=token WEBAPP_URL=t.me/mybot/myapp node tg_bot/index.js
```