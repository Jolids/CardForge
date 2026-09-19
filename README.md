# Frontend — GitHub Pages

1. Заполните `config.js` (API URL + Supabase URL + publishable key).
2. Загрузите содержимое этой папки в корень `Jolids/CardForge`.
3. В Supabase Auth добавьте `https://jolids.github.io/CardForge/` как Site URL и Redirect URL.

Frontend не содержит Lava/AI секретов. Авторизация хранится в Supabase session, а VPS получает access token в `Authorization: Bearer ...`.
