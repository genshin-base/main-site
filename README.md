## Дев-режим

`npm install`

`npm run dev`

## Скрипты

### update.js

`./scripts/update.js --all --force`

Качает и генерит бОльшую часть данных. Всё скачанное кешируется, `--force` заставляет игнорировать этот кеш.

## prepare.js

`./scripts/prepare.js avatar --code amber --src path/to/amber.png`

Сжимает, оптимизурует и сохраняет в `public/media` аватарку персонажа (вроде [такой](https://genshin.honeyhunterworld.com/img/char/amber_face.png)). Исходник должен быть квадратным (скорее всего 256х256) и с центрированным лицом (т.е. каринки с honeyhunter'а надо фиксить руками).

В системе должны быть установлены `imagemagick`, `pngquant` и `optipng`.

`./scripts/prepare.js portrait --code amber --src path/to/amber.png`

Сжимает, оптимизурует и сохраняет в `public/media` портрет персонажа (вроде [такого](https://genshin-impact.fandom.com/wiki/Amber?file=Character+Amber+Portrait.png)) и его силуэт в svg.

В системе должны быть установлены `imagemagick`, `pngquant`, `optipng` и `potrace`.

## Очепятки

Посмотреть лог автоисправлений: `NODE_DEBUG=typo ./scripts/update.js`