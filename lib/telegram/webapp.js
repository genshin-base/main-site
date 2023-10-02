/** @type {import('./webapp_types').WebApp} */
// При неиспользуемой WebApp оптимизатор оставляет полное обращение `window.Telegram.WebApp`, которое ломает бандл.
// При `?.` оптимизатор осталяет только `window`.
export const WebApp = window?.Telegram?.WebApp
