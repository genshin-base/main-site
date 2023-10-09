[english version of the guide](https://github.com/genshin-base/main-site/blob/miniapp/README.md)

## О приложении
Геншин База — приложение, где игроки в Геншин Импакт могут найти актуальные сборки персонажей, а так же посмотреть рекомендованных владельцев для оружия и артефактов. Удобный поиск, никакой лишней информации, возможность лайкнуть персонажа или предмет, а так же планировать добычу ресурсов в специальном виджете.

Так как будущее за супер-приложениями и визуальной информацией, в приложение использует максимум возможностей, которые даёт Телеграм для мини приложений. А так же имеет возможность поделиться страницей персонажа с другими пользователями мессенджера и сохранить сборку персонажа себе как картинку.

## О стилизации
На данный момент в Телеграме есть две темы для мини приложений — дневная и ночная. Предоставленного количества цветов недостаточно для полноценной стилизации приложения, поэтому часть цветов приходится генерировать. Пример генерации цветов, а так же пример переопределения дефолтных стилей приложения под Телеграм в [этом файле](https://github.com/genshin-base/main-site/blob/miniapp/www/src/miniapp-theme.scss).

Есть цвета, которые отсутствуют в более ранних версиях бота. Для их генерации нужно использовать ЯваСкрипт, пример в [этом файле](https://github.com/genshin-base/main-site/blob/miniapp/www/src/miniapp-styling.tsx).

## О генерации типов файлов
ТУДУ

## Кнопка «поделиться сборкой»
Интеграция в мессенджер была бы не полной, если бы нельзя было делиться прямой ссылкой на страницу с персонажем с другими пользователями. Поэтому ТУДУ.
https://github.com/genshin-base/main-site/blob/miniapp/www/src/modules/builds/character-build-detailed.tsx#L415

## Кнопка сохранения сборки картинкой
Сейчас пользователям важно иметь возможность сохранить нужную информацию как картинку. Геншин База даёт и такую возможность. Используя Главную Кнопку (MainButton), пользователь может сохранить сборку как картинку. Инициализация кнопки в этом [файле](https://github.com/genshin-base/main-site/blob/miniapp/www/src/modules/builds/character-build-detailed.tsx#L78), а обработчик нажатия описан [здесь](https://github.com/genshin-base/main-site/blob/miniapp/www/src/modules/builds/character-build-detailed.tsx#L387)

## Пользовательское хранилище
Чтобы хранить предметы, которым пользователь поставил лайк, используется предоставленное Телеграмом хранилище. Подключение описано в этом [файле](https://github.com/genshin-base/main-site/blob/miniapp/www/src/utils/hooks.tsx#L128). Если возникнет ситуация, что пользователь давно не заходил в приложение, и формат хранимых данных поменялся, приложение сохраняет идентификатор текущего формата хранимых данных. Описано в (этом файле)[https://github.com/genshin-base/main-site/blob/miniapp/www/src/utils/hooks.tsx#L240]

## Нативный попап для быстрой настройки
У игры существует несколько серверов в разных временных зонах. Выбранный сервер определяет, что доступно для добычи сегодня. Чтобы удобно переключаться между серверами, приложение использует нативный попап Телеграма, пример использования в [этом файле](https://github.com/genshin-base/main-site/blob/miniapp/www/src/containers/time-until-day-reset.tsx#L37).

## Автоматический выбор языка
ТУДУ



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
