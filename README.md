## Дев-режим

`npm install`

`./scripts/update.js www`

`npm run dev`


## Переводы

Можно сначала скопировать/переименовать папку `cache` на случай, если какой-то из сайтов с данными временно приляжет.

`./scripts/update.js data --ignore-cache`

`./scripts/builds_translation.js changes --langs en,ru`

Дальше — по инструкции из выхлопа последнего скрипта.


## Скрипты

### update.js

`./scripts/update.js --ignore-cache`

Качает и генерит бОльшую часть данных. Всё скачанное кешируется, `--ignore-cache` заставляет игнорировать этот кеш.

`./scripts/update.js data`

Качает и парсит данные.

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
