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


## Очепятки

Посмотреть лог автоисправлений опечаток: `env NODE_DEBUG=typo ./scripts/update.js`

Посмотреть лог автоисправлений стилей: `env NODE_DEBUG=style ./scripts/update.js` (выравнивание ссылок по словам и т.д.)

## Гугл и его АПИ

 * создать новый проект в Google Cloud Platform'е ([console.cloud.google.com](https://console.cloud.google.com));
 * включить проекту АПИ гуглотаблиц (APIs & Services → найти "sheets" → включить);
 * создать в проекте виртуальный акк, от имени коротого будут ходить запросы (настройки Google Sheets API, вкладка "CREDENTIALS");
 * создать акку ключ, с которым он будет ходить по запросам;
 * положить ключ в `google.private_key.json` в корне проекта.

## Расширение для подсветки Маркдауна в Ямле

Суть в `.vscode/yaml_ext/injection.json`.

После редактирования исходников экстеншен надо запаковать:

```bash
npm install -g vsce  # если ещё не стоит
cd .vscode/yaml_ext
vsce package -o ../yaml_ext.vsix
cd -
```

И установить. Через "Install Extensions -> три точки -> Install from VSIX" или через консоль: `code --install-extension .vscode/yaml_ext.vsix`

Полезности:
 * [гайд](https://code.visualstudio.com/api/language-extensions/semantic-highlight-guide);
 * `/usr/lib/code/extensions/yaml/syntaxes/yaml.tmLanguage.json`;
 * [syntaxes/yaml.json](https://github.com/microsoft/vscode-textmate/blob/main/test-cases/themes/syntaxes/yaml.json), не совсем совпадает с редактором;
 * [syntaxes/markdown.tmLanguage](https://github.com/microsoft/vscode-textmate/blob/main/test-cases/themes/syntaxes/markdown.tmLanguage), местами совсем не совпадает с редактором.