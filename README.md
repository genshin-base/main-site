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

## How to run 

### Frontend (HTML pages) of Mini App

#### Dev mode

```bash
npm run dev -- --client-web-socket-url ws://0.0.0.0:443/ws --allowed-hosts all --env tg-web-app-url=t.me/mybot/myapp
```

Parameters `--client-web-socket-url` and `--allowed-hosts` are not required but they fix HMR and page autoreload.

#### Prod mode

```bash
npm run build -- --env tg-web-app-url=t.me/mybot/myapp --env no-prerender
cp -r www/public/. www/dist/browser/
```

And serve `www/dist/browser` folder content (with `nginx` or `python3 -m http.server 8080 --directory www/dist/browser/` or etc.)

### Backend (bot)

```bash
TG_BOT_TOKEN=token MEDIA_URL=https://mydomain.com/media WEBAPP_URL=t.me/mybot/myapp node tg_bot/index.js
```

`mydomain.com` is currently used to send build images to Telegram so it must be publicly accessible.