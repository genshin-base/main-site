[версия руководства на русском языке](https://github.com/genshin-base/main-site/blob/miniapp/README_ru.md)

## About App
Genshin Base — an application where Genshin Impact players can find up-to-date character builds and view recommended owners for weapons and artifacts. Convenient search, no unnecessary information, the ability to like a character or item, as well as plan resource farming in a special widget.

As the future lies with super-apps and visual information, the application leverages the maximum capabilities provided by Telegram for mini-apps. It also has the ability to share a character's page with other messenger users and save a character build as an image.

## About Styling
Currently, there are two themes for mini-apps in Telegram — light and dark. The provided color options are not sufficient for a complete application styling, so some colors have to be generated. An example of color generation, as well as an example of overriding default application styles for Telegram, can be found in [this file](https://github.com/genshin-base/main-site/blob/miniapp/www/src/miniapp-theme.scss).

There are colors that are not available in earlier versions of the bot. To generate them, JavaScript needs to be used, as demonstrated in [this file](https://github.com/genshin-base/main-site/blob/miniapp/www/src/miniapp-styling.tsx).

## About File Type Generation
TODO

## Share Build Button
Integration with the messenger would not be complete without the ability to share a direct link to a character's page with other users. Therefore, TODO.
https://github.com/genshin-base/main-site/blob/miniapp/www/src/modules/builds/character-build-detailed.tsx#L415

## Save Build as an Image Button
Currently, users find it important to have the option to save necessary information as an image. Genshin Base provides this capability. By using the Main Button, the user can save a build as an image. The button's initialization can be found in [this file](https://github.com/genshin-base/main-site/blob/miniapp/www/src/modules/builds/character-build-detailed.tsx#L78), and the click handler is described [here](https://github.com/genshin-base/main-site/blob/miniapp/www/src/modules/builds/character-build-detailed.tsx#L387).

## User Storage
To store items that a user has liked, Telegram's provided storage is used. The connection is described in [this file](https://github.com/genshin-base/main-site/blob/miniapp/www/src/utils/hooks.tsx#L128). If a situation arises where the user hasn't visited the application for a while and the data format for stored data has changed, the application retains the identifier of the current data format, as described in [this file](https://github.com/genshin-base/main-site/blob/miniapp/www/src/utils/hooks.tsx#L240).

## Native Popup for Quick Setup
The game has several servers in different time zones. The selected server determines what is available for farming today. To easily switch between servers, the application uses Telegram's native popup, with an example of usage in [this file](https://github.com/genshin-base/main-site/blob/miniapp/www/src/containers/time-until-day-reset.tsx#L37).

## Automatic Language Selection
TODO.


==============================

## Дев-режим

`npm install`

`./scripts/update.js www`

`npm run dev`


## Переводы

`./scripts/update.js builds --ignore-cache`

`./scripts/builds_translation.js changes --langs en,ru`

Дальше — по инструкции из выхлопа последнего скрипта.


## Скрипты

### update.js

`./scripts/update.js --ignore-cache`

Качает и генерит бОльшую часть данных. Всё скачанное кешируется, `--ignore-cache` заставляет игнорировать этот кеш.

`./scripts/update.js builds`

Качает и парсит данные билдов.

`./scripts/update.js data`

Качает и парсит данные предметов.

`./scripts/update.js www`

Генерит клиентские JSON'ы и скрипты из скачанных ранее данных.

`./scripts/update.js images`

Качает и обрабатывает картинки (какие может, для остальных есть `prepare.js`).


## prepare.js

`./scripts/prepare.js avatar --code amber --src path/to/amber.png`

Сжимает, оптимизурует и сохраняет в `public/media` аватарку персонажа (вроде [такой](https://genshin.honeyhunterworld.com/img/char/amber_face.png)). Исходник должен быть квадратным (скорее всего 256х256) и с центрированным лицом (т.е. каринки с honeyhunter'а надо фиксить руками).

В системе должны быть установлены `imagemagick`, `pngquant` и `optipng`.

`./scripts/prepare.js portrait --code amber --src path/to/amber.png`

Сжимает, оптимизурует и сохраняет в `public/media` портрет персонажа (вроде [такого](https://genshin-impact.fandom.com/wiki/Amber?file=Character+Amber+Portrait.png)) и его силуэт в svg.

В системе должны быть установлены `imagemagick`, `pngquant`, `optipng` и `potrace`.


## builds_translation.js

`./scripts/builds_translation.js changes --langs en,ru`

Помогает найти изменения в тексте билдов, чтоб обновить переводы. Экспортирует тексты из файлов билдов. Подробнее он напишет в консоли.

`./scripts/builds_translation.js verify`

Ищет ошибки в файлах с переводами билдов (в заголовках `# ===`, в ссылках на предметы).

`./scripts/builds_translation.js autofill-links`

Вписывает коды предметов в ссылки типа `[...](#weapon)`. **Изменяет файлы с переводами!** Очень рекомендуется сделать этим файлам `git add data/translated/builds/*.md` перед вызовом скрипта, а после убедиться, что ничего не сломалось.

`./scripts/builds_translation.js add-new-blocks`

Добавляет новые разделы из `data/translated/builds/reference.yaml` во все `data/translated/builds/*.md` (т.е. вставялет английский текст). Сортирует разделы.

## Очепятки

Посмотреть лог автоисправлений опечаток: `env NODE_DEBUG=typo ./scripts/update.js`

Посмотреть лог автоисправлений стилей: `env NODE_DEBUG=style ./scripts/update.js` (выравнивание ссылок по словам и т.д.)

## Гугл и его АПИ

 * создать новый проект в Google Cloud Platform'е ([console.cloud.google.com](https://console.cloud.google.com));
 * включить проекту АПИ гуглотаблиц (APIs & Services → найти "sheets" → включить);
 * создать в проекте виртуальный акк, от имени коротого будут ходить запросы (настройки Google Sheets API, вкладка "CREDENTIALS");
 * создать акку ключ, с которым он будет ходить по запросам;
 * положить ключ в `google.private_key.json` в корне проекта.

## Сторонние сайты

Показывают скопированную версию сайта из-под своего домена, в большинстве случаев ломая путь страниц и роутер.

Но есть исключения. Для них в `webpack.config`'е задаётся `BUNDLE_ENV.SUPPORTED_DOMAINS`: на этих доменах сайт работает как обычно. На других — отключается рендер, и отображается только статичная пререндеренная версия с предупреждением вверху страницы (см. `insertUnsupportedLocationWarning`).

Предупреждение может не появиться, если страница в кеше ссылается на бандл, которого уже нет.

### Гуглопереводчик

https://genshin--base-com.translate.goog/builds/amber/?_x_tr_sl=en&_x_tr_tl=ru&_x_tr_hl=ru&_x_tr_pto=wapp

Показывает сайт из-под под специального домена, пути остаются правильные, роутер нормально работает.

### Яндексопереводчик

https://z5h64q92x9.net/proxy_u/en-ru.ru.74851a8f-62666f09-d0d2964b-74722d776562/https/genshin-base.com/builds/amber/

### Кеш Гугла

http://webcache.googleusercontent.com/search?q=cache:Tu5HUpB7I9gJ:genshin-base.com/+&cd=1&hl=ru&ct=clnk&gl=ru

### Кеш Яндекса

https://yandexwebcache.net/yandbtm?fmode=inject&tm=1650880741&tld=ru&lang=en&la=1649023232&text=site%3Agenshin-base.com+Zhongli&url=https%3A//genshin-base.com/builds/zhongli/&l10n=ru&mime=html&sign=7e113f7bd7be7de7514a4c92f4254e44&keyno=0

### Вебархив

https://web.archive.org/web/20220416214432/http://genshin-base.com/

Подменяет браузерные АПИ (в том числе `location`), сайт видит правильные пути, роутер работает нормально.
