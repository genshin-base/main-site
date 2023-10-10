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
Интеграция в мессенджер была бы не полной, если бы нельзя было делиться прямой ссылкой на страницу с персонажем с другими пользователями. Поэтому ТУДУ.
https://github.com/genshin-base/main-site/blob/miniapp/www/src/modules/builds/character-build-detailed.tsx#L415

## Кнопка сохранения сборки картинкой
Сейчас пользователям важно иметь возможность сохранить нужную информацию как картинку. Геншин База даёт и такую возможность. Используя Главную Кнопку (MainButton), пользователь может сохранить сборку как картинку. Инициализация кнопки в этом [файле](https://github.com/genshin-base/main-site/blob/miniapp/www/src/modules/builds/character-build-detailed.tsx#L78), а обработчик нажатия описан [здесь](https://github.com/genshin-base/main-site/blob/miniapp/www/src/modules/builds/character-build-detailed.tsx#L387)

## Пользовательское хранилище
Чтобы хранить предметы, которым пользователь поставил лайк, используется предоставленное Телеграмом хранилище. Подключение описано в этом [файле](https://github.com/genshin-base/main-site/blob/miniapp/www/src/utils/hooks.tsx#L128). Если возникнет ситуация, что пользователь давно не заходил в приложение, и формат хранимых данных поменялся, приложение сохраняет идентификатор текущего формата хранимых данных. Описано в (этом файле)[https://github.com/genshin-base/main-site/blob/miniapp/www/src/utils/hooks.tsx#L240]

## Нативный попап для быстрой настройки
У игры существует несколько серверов в разных временных зонах. Выбранный сервер определяет, что доступно для добычи сегодня. Чтобы удобно переключаться между серверами, приложение использует нативный попап Телеграма, пример использования в [этом файле](https://github.com/genshin-base/main-site/blob/miniapp/www/src/containers/time-until-day-reset.tsx#L37).

## Как запустить

`npm install`

### Генерация изображений билдов

Генерация изображений, которые будут использоваться при отправке билдов в чат.

Требуется `imagemagick`.

```bash
npm run build -- --env tg-web-app-url=t.me/mybot/myapp --env no-prerender
node scripts/render_build_images.js
```

### Фронтенд (HTML-страницы) мини-приложения

#### Дев-режим

```bash
npm run dev -- --client-web-socket-url ws://0.0.0.0:443/ws --allowed-hosts all --env tg-web-app-url=t.me/mybot/myapp
```

Параметры `--client-web-socket-url` и `--allowed-hosts` необязательны, но без них не работает HMR и автоперезагрузка страницы.

#### Прод-режим

```bash
npm run build -- --env tg-web-app-url=t.me/mybot/myapp --env no-prerender
cp -r www/public/. www/dist/browser/
```

Содержимое `www/dist/browser` может раздавать HTTP-сервер (`nginx` или `python3 -m http.server 8080 --directory www/dist/browser/`, или др.)

### Бекенд (бот)

```bash
TG_BOT_TOKEN=token WEBAPP_URL=t.me/mybot/myapp node tg_bot/index.js
```
