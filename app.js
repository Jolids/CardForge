(() => {
  const CFG = window.CARDFORGE_CONFIG || {};
  const API = String(CFG.API_BASE_URL || "").replace(/\/$/, "");
  const TOKEN_KEY = "cardforge_session_v1";
  const $ = (id) => document.getElementById(id);

  const form = $("generatorForm");
  const fileInput = $("product");
  const dropzone = $("dropzone");
  const preview = $("uploadPreview");
  const uploadEmpty = $("uploadEmpty");
  const replacePhoto = $("replacePhoto");
  const resultImage = $("resultImage");
  const resultPlaceholder = $("resultPlaceholder");
  const loadingOverlay = $("loadingOverlay");
  const generateBtn = $("generateBtn");
  const errorBox = $("errorBox");
  const downloadBtn = $("downloadBtn");
  const againBtn = $("againBtn");
  const resultStage = $("resultStage");
  const apiState = $("apiState");
  const meta = $("meta");
  const authModal = $("authModal");
  const billingModal = $("billingModal");
  const loginBtn = $("loginBtn");
  const userActions = $("userActions");
  const creditsCount = $("creditsCount");
  const balanceBtn = $("balanceBtn");
  const buyCreditsBtn = $("buyCreditsBtn");
  const logoutBtn = $("logoutBtn");
  const paywallBuyBtn = $("paywallBuyBtn");
  const postGeneratePaywall = $("postGeneratePaywall");
  const siteToast = $("siteToast");

  let lastImage = "";
  let previewUrl = "";
  let sessionToken = localStorage.getItem(TOKEN_KEY) || "";
  let account = null;
  let toastTimer = null;
  let authMode = "login";

  const presets = {
    premium: "Создай премиальную рекламную карточку товара. Сделай выразительную предметную композицию, дорогой свет, глубину, аккуратный подиум и визуал уровня профессиональной рекламной съёмки. Товар должен оставаться главным объектом.",
    tech: "Сделай технологичную рекламную карточку товара. Используй глубокий тёмный фон, неоновое свечение, световые акценты и современную футуристичную композицию. Товар должен быть крупным и хорошо читаемым.",
    clean: "Сделай чистую минималистичную карточку маркетплейса. Светлый объёмный фон, мягкие тени, много воздуха, аккуратная композиция и премиальная студийная подача.",
    lifestyle: "Помести товар в реалистичную lifestyle-сцену, подходящую его назначению. Сохрани сам товар узнаваемым и сделай рекламный визуал естественным, современным и привлекательным."
  };

  function showError(message) {
    errorBox.textContent = message || "";
    errorBox.hidden = !message;
  }

  function showToast(message, type = "") {
    if (!siteToast) return;
    siteToast.textContent = message;
    siteToast.className = `site-toast ${type}`.trim();
    siteToast.hidden = false;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => { siteToast.hidden = true; }, 6500);
  }

  function setModal(modal, open) {
    if (!modal) return;
    modal.hidden = !open;
    document.body.style.overflow = open ? "hidden" : "";
  }

  function setAuthMode(mode) {
    authMode = mode === "register" ? "register" : "login";
    document.querySelectorAll("[data-auth-mode]").forEach((button) => {
      button.classList.toggle("active", button.dataset.authMode === authMode);
    });
    $("authTitle").textContent = authMode === "register" ? "Создать аккаунт" : "Войти в CardForge";
    $("authLead").textContent = authMode === "register"
      ? "Регистрация занимает несколько секунд. Новый аккаунт получает 1 бесплатную генерацию."
      : "Введите email и пароль. Письма и сторонние сервисы для входа не нужны.";
    $("authSubmitBtn").textContent = authMode === "register" ? "Создать аккаунт" : "Войти";
    $("confirmField").hidden = authMode !== "register";
    $("authMessage").hidden = true;
  }

  function openAuth(mode = "login") {
    setAuthMode(mode);
    setModal(authModal, true);
    setTimeout(() => $("authEmail")?.focus(), 50);
  }
  function closeAuth() { setModal(authModal, false); }
  function openBilling() {
    if (!sessionToken) return openAuth("login");
    setModal(billingModal, true);
    loadPackages();
  }
  function closeBilling() { setModal(billingModal, false); }

  document.querySelectorAll("[data-close-modal='auth']").forEach((el) => el.addEventListener("click", closeAuth));
  document.querySelectorAll("[data-close-modal='billing']").forEach((el) => el.addEventListener("click", closeBilling));
  document.querySelectorAll("[data-auth-mode]").forEach((el) => el.addEventListener("click", () => setAuthMode(el.dataset.authMode)));
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") { closeAuth(); closeBilling(); }
  });

  function setFile(file) {
    if (!file) return;
    if (!/^image\/(jpeg|png|webp)$/.test(file.type)) return showError("Поддерживаются JPG, PNG и WEBP.");
    if (file.size > 12 * 1024 * 1024) return showError("Максимальный размер файла — 12 МБ.");
    showError("");
    const dt = new DataTransfer();
    dt.items.add(file);
    fileInput.files = dt.files;
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    previewUrl = URL.createObjectURL(file);
    preview.src = previewUrl;
    preview.hidden = false;
    uploadEmpty.hidden = true;
    replacePhoto.hidden = false;
  }

  fileInput.addEventListener("change", () => setFile(fileInput.files?.[0]));
  replacePhoto.addEventListener("click", (e) => { e.preventDefault(); e.stopPropagation(); fileInput.click(); });
  dropzone.addEventListener("dragover", (e) => { e.preventDefault(); dropzone.classList.add("drag"); });
  dropzone.addEventListener("dragleave", () => dropzone.classList.remove("drag"));
  dropzone.addEventListener("drop", (e) => { e.preventDefault(); dropzone.classList.remove("drag"); setFile(e.dataTransfer.files?.[0]); });

  document.querySelectorAll("[data-preset]").forEach((button) => {
    button.addEventListener("click", () => {
      document.querySelectorAll("[data-preset]").forEach((b) => b.classList.remove("active"));
      button.classList.add("active");
      $("prompt").value = presets[button.dataset.preset] || "";
    });
  });

  $("size").addEventListener("change", () => {
    resultStage.classList.remove("portrait", "square", "story");
    resultStage.classList.add($("size").value);
  });

  async function checkApi() {
    if (!API) {
      apiState.classList.add("bad");
      apiState.querySelector("span").textContent = "Сервис не настроен";
      return;
    }
    try {
      const res = await fetch(`${API}/api/health`, { cache: "no-store" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      if (!data.generatorReady) throw new Error("generator not ready");
      apiState.classList.remove("bad");
      apiState.classList.add("ok");
      apiState.querySelector("span").textContent = "Сервис готов";
    } catch {
      apiState.classList.remove("ok");
      apiState.classList.add("bad");
      apiState.querySelector("span").textContent = "Сервис недоступен";
    }
  }

  function saveSession(token) {
    sessionToken = String(token || "");
    if (sessionToken) localStorage.setItem(TOKEN_KEY, sessionToken);
    else localStorage.removeItem(TOKEN_KEY);
  }

  async function apiFetch(path, options = {}, auth = false) {
    const headers = new Headers(options.headers || {});
    if (auth) {
      if (!sessionToken) throw Object.assign(new Error("Войдите в аккаунт"), { code: "AUTH_REQUIRED" });
      headers.set("Authorization", `Bearer ${sessionToken}`);
    }
    return fetch(`${API}${path}`, { ...options, headers });
  }

  function renderAccount() {
    if (sessionToken && account) {
      loginBtn.hidden = true;
      userActions.hidden = false;
      creditsCount.textContent = String(account.credits ?? 0);
    } else {
      loginBtn.hidden = false;
      userActions.hidden = true;
      creditsCount.textContent = "0";
      postGeneratePaywall.hidden = true;
    }
  }

  async function refreshAccount() {
    if (!sessionToken) {
      account = null;
      renderAccount();
      return null;
    }
    try {
      const res = await apiFetch("/api/me", { cache: "no-store" }, true);
      const data = await res.json().catch(() => ({}));
      if (res.status === 401) {
        saveSession("");
        account = null;
        renderAccount();
        return null;
      }
      if (!res.ok) throw new Error(data.error || "Не удалось загрузить аккаунт");
      account = data.user || null;
      renderAccount();
      return account;
    } catch (e) {
      console.warn(e);
      return null;
    }
  }

  async function submitAuth() {
    const email = $("authEmail").value.trim();
    const password = $("authPassword").value;
    const confirm = $("authPasswordConfirm").value;
    const msg = $("authMessage");
    const button = $("authSubmitBtn");
    msg.hidden = true;

    if (!/^\S+@\S+\.\S+$/.test(email)) {
      msg.textContent = "Введите корректный email.";
      msg.className = "auth-message error";
      msg.hidden = false;
      return;
    }
    if (password.length < 8) {
      msg.textContent = "Пароль должен содержать минимум 8 символов.";
      msg.className = "auth-message error";
      msg.hidden = false;
      return;
    }
    if (authMode === "register" && password !== confirm) {
      msg.textContent = "Пароли не совпадают.";
      msg.className = "auth-message error";
      msg.hidden = false;
      return;
    }

    button.disabled = true;
    button.textContent = authMode === "register" ? "Создаём аккаунт…" : "Входим…";
    try {
      const res = await fetch(`${API}/api/auth/${authMode === "register" ? "register" : "login"}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password })
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Ошибка авторизации");
      if (!data.token) throw new Error("Сервер не вернул сессию");
      saveSession(data.token);
      account = data.user || null;
      await refreshAccount();
      closeAuth();
      $("authPassword").value = "";
      $("authPasswordConfirm").value = "";
      showToast(authMode === "register" ? "Аккаунт создан. Вам начислена 1 бесплатная генерация." : "Вы вошли в аккаунт.", "good");
    } catch (e) {
      msg.textContent = e?.message || "Ошибка авторизации";
      msg.className = "auth-message error";
      msg.hidden = false;
    } finally {
      button.disabled = false;
      button.textContent = authMode === "register" ? "Создать аккаунт" : "Войти";
    }
  }

  function initAuth() {
    loginBtn.addEventListener("click", () => openAuth("login"));
    $("authSubmitBtn").addEventListener("click", submitAuth);
    [$("authEmail"), $("authPassword"), $("authPasswordConfirm")].forEach((el) => {
      el?.addEventListener("keydown", (e) => { if (e.key === "Enter") submitAuth(); });
    });
    logoutBtn.addEventListener("click", async () => {
      try { await apiFetch("/api/auth/logout", { method: "POST" }, true); } catch {}
      saveSession("");
      account = null;
      renderAccount();
      showToast("Вы вышли из аккаунта");
    });
    return refreshAccount();
  }

  balanceBtn.addEventListener("click", openBilling);
  buyCreditsBtn.addEventListener("click", openBilling);
  paywallBuyBtn.addEventListener("click", openBilling);

  function money(amount, currency) {
    try { return new Intl.NumberFormat("ru-RU", { style: "currency", currency, maximumFractionDigits: 0 }).format(amount); }
    catch { return `${amount} ${currency}`; }
  }

  async function loadPackages() {
    const grid = $("packageGrid");
    const msg = $("billingMessage");
    msg.hidden = true;
    grid.innerHTML = '<div class="packages-loading">Загружаем тарифы…</div>';
    try {
      const res = await fetch(`${API}/api/billing/packages`, { cache: "no-store" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Не удалось загрузить пакеты");
      grid.innerHTML = "";
      for (const pack of data.packages || []) {
        const card = document.createElement("article");
        card.className = `package-card${pack.popular ? " popular" : ""}`;
        card.innerHTML = `${pack.popular ? '<span class="package-badge">Популярный</span>' : ''}<h3>${pack.title}</h3><div class="package-credits">${pack.credits} <small>генераций</small></div><div class="package-price">${money(pack.amount, pack.currency)}</div><button type="button">Выбрать</button>`;
        card.querySelector("button").addEventListener("click", (e) => buyPackage(pack.id, e.currentTarget));
        grid.appendChild(card);
      }
    } catch (e) {
      grid.innerHTML = '<div class="packages-loading">Не удалось загрузить тарифы.</div>';
      msg.textContent = e?.message || "Ошибка тарифов";
      msg.className = "auth-message error";
      msg.hidden = false;
    }
  }

  async function buyPackage(packageId, button) {
    const msg = $("billingMessage");
    msg.hidden = true;
    button.disabled = true;
    button.textContent = "Создаём оплату…";
    try {
      const res = await apiFetch("/api/billing/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ packageId })
      }, true);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Не удалось создать оплату");
      if (!data.paymentUrl) throw new Error("Платёжная система не вернула ссылку");
      location.href = data.paymentUrl;
    } catch (e) {
      button.disabled = false;
      button.textContent = "Выбрать";
      msg.textContent = e?.message || "Ошибка оплаты";
      msg.className = "auth-message error";
      msg.hidden = false;
    }
  }

  async function generate() {
    showError("");
    if (!sessionToken) { openAuth("login"); return; }
    if (!account) await refreshAccount();
    if (!account || Number(account.credits) < 1) {
      showError("Для новой генерации пополните баланс.");
      openBilling();
      return;
    }

    const file = fileInput.files?.[0];
    if (!file) return showError("Сначала загрузите фотографию товара.");
    if (!API) return showError("Сервис генерации не настроен.");

    const body = new FormData();
    body.append("product", file);
    body.append("prompt", $("prompt").value.trim());
    body.append("title", $("title").value.trim());
    body.append("features", $("features").value.trim());
    body.append("size", $("size").value);

    generateBtn.disabled = true;
    generateBtn.innerHTML = "<span>✦</span> Генерация…";
    loadingOverlay.hidden = false;
    resultPlaceholder.hidden = true;
    resultImage.hidden = true;
    downloadBtn.disabled = true;
    againBtn.disabled = true;
    postGeneratePaywall.hidden = true;
    meta.textContent = "";

    try {
      const res = await fetch(`${API}/api/generate`, {
        method: "POST",
        headers: { Authorization: `Bearer ${sessionToken}` },
        body
      });
      const text = await res.text();
      let data;
      try { data = JSON.parse(text); } catch { data = { error: text || `HTTP ${res.status}` }; }
      if (res.status === 401) {
        saveSession(""); account = null; renderAccount(); openAuth("login");
        throw new Error(data.error || "Войдите снова");
      }
      if (res.status === 402 || data.code === "NO_CREDITS") {
        account = { ...(account || {}), credits: 0 };
        renderAccount(); openBilling(); throw new Error("Кредиты закончились");
      }
      if (!res.ok) throw new Error(data.error || `Ошибка API ${res.status}`);
      if (!data.image) throw new Error("Сервис не вернул изображение");

      lastImage = data.image;
      resultImage.src = data.image;
      resultImage.hidden = false;
      downloadBtn.disabled = false;
      againBtn.disabled = false;
      account = { ...(account || {}), credits: Number(data.credits ?? Math.max(0, Number(account?.credits || 1) - 1)) };
      renderAccount();
      if (data.elapsedMs) meta.textContent = `Готово за ${Math.max(1, Math.round(data.elapsedMs / 1000))} сек. · Осталось кредитов: ${account.credits}`;
      if (Number(account.credits) === 0) postGeneratePaywall.hidden = false;
    } catch (e) {
      resultPlaceholder.hidden = false;
      showError(e?.message || "Ошибка генерации");
      await refreshAccount();
    } finally {
      loadingOverlay.hidden = true;
      generateBtn.disabled = false;
      generateBtn.innerHTML = "<span>✦</span> Сгенерировать · 1 кредит";
    }
  }

  form.addEventListener("submit", (e) => { e.preventDefault(); generate(); });
  againBtn.addEventListener("click", generate);
  downloadBtn.addEventListener("click", () => {
    if (!lastImage) return;
    const a = document.createElement("a");
    a.href = lastImage;
    a.download = `cardforge-${Date.now()}.${lastImage.startsWith("data:image/jpeg") ? "jpg" : "png"}`;
    document.body.appendChild(a); a.click(); a.remove();
  });

  function initHeroCarousel() {
    const viewport = $("heroCarousel");
    const dotsBox = $("heroCarouselDots");
    const prev = document.querySelector(".carousel-prev");
    const next = document.querySelector(".carousel-next");
    if (!viewport || !dotsBox || !prev || !next) return;
    const cards = Array.from(viewport.querySelectorAll(".carousel-card"));
    if (!cards.length) return;
    let index = 0, timer = null, resumeTimer = null;
    const dots = cards.map((_, i) => {
      const dot = document.createElement("button");
      dot.type = "button"; dot.className = "carousel-dot" + (i === 0 ? " active" : "");
      dot.setAttribute("aria-label", `Показать пример ${i + 1}`);
      dot.addEventListener("click", () => goTo(i, true)); dotsBox.appendChild(dot); return dot;
    });
    function updateDots() { dots.forEach((dot, i) => dot.classList.toggle("active", i === index)); }
    function goTo(nextIndex, userAction = false) {
      index = (nextIndex + cards.length) % cards.length;
      const left = cards[index].offsetLeft - viewport.firstElementChild.offsetLeft;
      viewport.scrollTo({ left, behavior: "smooth" }); updateDots(); if (userAction) restartAutoplay();
    }
    function nearestIndex() {
      const x = viewport.scrollLeft; let best = 0, distance = Infinity;
      cards.forEach((card, i) => { const d = Math.abs(card.offsetLeft - viewport.firstElementChild.offsetLeft - x); if (d < distance) { distance = d; best = i; } });
      if (best !== index) { index = best; updateDots(); }
    }
    function stopAutoplay() { if (timer) clearInterval(timer); timer = null; if (resumeTimer) clearTimeout(resumeTimer); resumeTimer = null; }
    function startAutoplay() { stopAutoplay(); if (matchMedia("(prefers-reduced-motion: reduce)").matches) return; timer = setInterval(() => goTo(index + 1), 4200); }
    function restartAutoplay() { stopAutoplay(); resumeTimer = setTimeout(startAutoplay, 6500); }
    prev.addEventListener("click", () => goTo(index - 1, true)); next.addEventListener("click", () => goTo(index + 1, true));
    viewport.addEventListener("scroll", () => requestAnimationFrame(nearestIndex), { passive: true });
    viewport.addEventListener("pointerdown", stopAutoplay, { passive: true }); viewport.addEventListener("pointerup", restartAutoplay, { passive: true });
    viewport.addEventListener("mouseenter", stopAutoplay); viewport.addEventListener("mouseleave", startAutoplay); viewport.addEventListener("focusin", stopAutoplay); viewport.addEventListener("focusout", startAutoplay);
    window.addEventListener("resize", () => goTo(index)); startAutoplay();
  }

  async function handlePaymentReturn() {
    const params = new URLSearchParams(location.search);
    const payment = params.get("payment") || params.get("status");
    if (!payment) return;
    history.replaceState({}, "", `${location.pathname}${location.hash || ""}`);
    if (payment === "success") {
      showToast("Платёж завершён. Ждём подтверждение Lava.top и обновляем баланс…", "good");
      for (let i = 0; i < 12; i++) {
        if (!sessionToken) break;
        await new Promise((r) => setTimeout(r, i === 0 ? 400 : 2000));
        await refreshAccount();
      }
    } else if (payment === "cancelled") showToast("Оплата отменена.");
    else if (payment === "failed") showToast("Платёж не прошёл. Попробуйте другой способ оплаты.", "bad");
  }

  async function boot() {
    initHeroCarousel();
    await checkApi();
    await initAuth();
    await handlePaymentReturn();
  }

  boot();
})();
