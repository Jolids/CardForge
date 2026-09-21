# CardForge frontend v6

Статический frontend для GitHub Pages. Supabase больше не нужен.

`config.js`:

```js
window.CARDFORGE_CONFIG = {
  API_BASE_URL: "https://31.76.56.162"
};
```

Загрузите содержимое этой папки в корень репозитория `Jolids/CardForge`.

Авторизация идёт напрямую на VPS:

```text
POST /api/auth/register
POST /api/auth/login
POST /api/auth/logout
```

Frontend не содержит Lava/AI секретов и не содержит password hash.
