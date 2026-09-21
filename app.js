(() => {
  const cfg = window.CARDFORGE_CONFIG || {};
  const API = String(cfg.API_BASE_URL || "").replace(/\/$/, "");
  const TOKEN_KEY = "cardforge_local_token";

  const $ = (id) => document.getElementById(id);
  const form = $("generatorForm");
  const fileInput = $("product");
  const dropzone = $("dropzone");
  const preview = $("uploadPreview");
  const uploadEmpty = $("uploadEmpty");
  const replacePhoto = $("replacePhoto");
  const errorBox = $("errorBox");
  const apiState = $("apiState");
  const generateBtn = $("generateBtn");
  const resultStage = $("resultStage");
  const resultPlaceholder = $("resultPlaceholder");
  const resultImage = $("resultImage");
  const loadingOverlay = $("loadingOverlay");
  const downloadBtn = $("downloadBtn");
  const againBtn = $("againBtn");
  const meta = $("meta");
  const postGeneratePaywall = $("postGeneratePaywall");
  const sceneHint = $("sceneHint");

  const loginBtn = $("loginBtn");
  const userActions = $("userActions");
  const creditsCount = $("creditsCount");
  const logoutBtn = $("logoutBtn");
  const buyCreditsBtn = $("buyCreditsBtn");
  const balanceBtn = $("balanceBtn");
  const paywallBuyBtn = $("paywallBuyBtn");
  const authModal = $("authModal");
  const billingModal = $("billingModal");
  const siteToast = $("siteToast");

  const categoryGrid = $("categoryGrid");
  const sceneGrid = $("sceneGrid");

  let previewUrl = "";
  let lastImage = "";
  let sessionToken = localStorage.getItem(TOKEN_KEY) || "";
  let account = null;
  let authMode = "login";
  let toastTimer = null;
  let selectedCategory = "electronics";
  let selectedScene = "auto";

  const categories = [
    { id: "electronics", label: "Электроника", icon: "⚡", hint: "гаджеты, наушники, часы" },
    { id: "beauty", label: "Косметика", icon: "✨", hint: "духи, кремы, beauty" },
    { id: "fashion", label: "Одежда", icon: "👟", hint: "обувь, аксессуары" },
    { id: "home", label: "Дом", icon: "🏠", hint: "техника, кухня, интерьер" },
    { id: "food", label: "Еда", icon: "🍽", hint: "напитки, упаковка, снеки" },
    { id: "other", label: "Другое", icon: "◌", hint: "универсальная категория" }
  ];

  const scenes = {
    auto: {
      label: "Авто",
      subtitle: "CardForge подберёт лучший стиль сам",
      image: "./assets/example-watch.jpg",
      hint: "Сервис сам выберет наиболее подходящую сцену под категорию товара.",
      categories: ["electronics", "beauty", "fashion", "home", "food", "other"]
    },
    light_studio: {
      label: "Светлая студия",
      subtitle: "чистый фон, воздух, мягкий свет",
      image: "./assets/example-perfume.jpg",
      hint: "Подходит для чистой, понятной и аккуратной карточки товара без перегруза.",
      categories: ["electronics", "beauty", "home", "food", "other"]
    },
    premium_podium: {
      label: "Премиум-подиум",
      subtitle: "дорогая рекламная подача",
      image: "./assets/example-watch.jpg",
      hint: "Добавляет ощущение премиальности: подиум, объём, акцентный свет, красивый фон.",
      categories: ["electronics", "beauty", "fashion", "other"]
    },
    tech_glow: {
      label: "Технологичный",
      subtitle: "неон, глубина, современный tech look",
      image: "./assets/example-headphones.jpg",
      hint: "Лучше всего для электроники, гаджетов и премиальных устройств.",
      categories: ["electronics", "other"]
    },
    lifestyle: {
      label: "Lifestyle",
      subtitle: "реальная живая сцена",
      image: "./assets/example-sneakers.jpg",
      hint: "Подходит, когда нужно показать товар в использовании или в реалистичной среде.",
      categories: ["fashion", "home", "beauty", "other"]
    },
    natural_eco: {
      label: "Натуральная",
      subtitle: "эко, freshness, спокойные материалы",
      image: "./assets/example-perfume.jpg",
      hint: "Идеальна для косметики, ухода, eco-брендов и натуральных продуктов.",
      categories: ["beauty", "food", "home", "other"]
    },
    warm_kitchen: {
      label: "Тёплая кухня",
      subtitle: "уютный food / home стиль",
      image: "./assets/example-airfryer.jpg",
      hint: "Подходит для кухни, дома, бытовой техники, посуды и продуктов питания.",
      categories: ["home", "food", "other"]
    },
    sales_infographic: {
      label: "Инфографика",
      subtitle: "чистые блоки под преимущества",
      image: "./assets/example-headphones.jpg",
      hint: "Хороша для маркетплейсов, когда важно подчеркнуть свойства и преимущества товара.",
      categories: ["electronics", "beauty", "home", "food", "other"]
    }
  };

  function availableScenes(categoryId) {
    return Object.entries(scenes)
      .filter(([, scene]) => scene.categories.includes(categoryId))
      .map(([id, scene]) => ({ id, ...scene }));
  }

  function renderCategories() {
    categoryGrid.innerHTML = "";
    categories.forEach((item) => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = `category-chip${item.id === selectedCategory ? " active" : ""}`;
      button.setAttribute("role", "radio");
      button.setAttribute("aria-checked", item.id === selectedCategory ? "true" : "false");
      button.innerHTML = `<span class="category-icon">${item.icon}</span><span><b>${item.label}</b><small>${item.hint}</small></span>`;
      button.addEventListener("click", () => {
        selectedCategory = item.id;
        const scenesForCategory = availableScenes(selectedCategory);
        if (!scenesForCategory.some((scene) => scene.id === selectedScene)) selectedScene = "auto";
        renderCategories();
        renderScenes();
      });
      categoryGrid.appendChild(button);
    });
  }

  function renderScenes() {
    const list = availableScenes(selectedCategory);
    sceneGrid.innerHTML = "";
    list.forEach((scene) => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = `scene-card${scene.id === selectedScene ? " active" : ""}`;
      button.setAttribute("role", "radio");
      button.setAttribute("aria-checked", scene.id === selectedScene ? "true" : "false");
      button.innerHTML = `
        <span class="scene-preview"><img src="${scene.image}" alt="${scene.label}" loading="lazy"></span>
        <span class="scene-copy"><b>${scene.label}</b><small>${scene.subtitle}</small></span>
      `;
      button.addEventListener("click", () => {
        selectedScene = scene.id;
        renderScenes();
      });
      sceneGrid.appendChild(button);
    });
    sceneHint.textContent = scenes[selectedScene]?.hint || "CardForge сам подставит профессиональный промпт для выбранной сцены.";
  }

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
    body.append("category", selectedCategory);
    body.append("scene", selectedScene);
    body.append("prompt", $("notes").value.trim());
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


  async function loadPublicPackages() {
    const grid = $("publicPackageGrid");
    if (!grid) return;
    try {
      const res = await fetch(`${API}/api/billing/packages`, { cache: "no-store" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Не удалось загрузить тарифы");
      grid.innerHTML = "";
      for (const pack of data.packages || []) {
        const card = document.createElement("article");
        card.className = `public-package-card${pack.popular ? " popular" : ""}`;
        card.innerHTML = `${pack.popular ? '<span class="public-package-badge">Популярный</span>' : ''}<span class="public-package-name">${pack.title}</span><div class="public-package-credits">${pack.credits}<small> генераций</small></div><div class="public-package-price">${money(pack.amount, pack.currency)}</div><p>${pack.credits <= 10 ? "Для знакомства и первых карточек" : pack.credits < 100 ? "Для регулярной работы с товарами" : "Для магазина и большого каталога"}</p><button type="button">Выбрать пакет</button>`;
        card.querySelector("button").addEventListener("click", () => {
          if (!sessionToken) openAuth("register");
          else openBilling();
        });
        grid.appendChild(card);
      }
    } catch {
      grid.innerHTML = '<div class="pricing-loading">Тарифы временно недоступны. Откройте окно покупки после входа.</div>';
    }
  }

  function initMobileMenu() {
    const button = $("mobileMenuBtn");
    const nav = document.getElementById("mainNav");
    if (!button || !nav) return;
    button.addEventListener("click", () => {
      const open = nav.classList.toggle("open");
      button.textContent = open ? "×" : "☰";
      button.setAttribute("aria-expanded", open ? "true" : "false");
    });
    nav.querySelectorAll("a").forEach((link) => link.addEventListener("click", () => {
      nav.classList.remove("open");
      button.textContent = "☰";
      button.setAttribute("aria-expanded", "false");
    }));
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
    renderCategories();
    renderScenes();
    initHeroCarousel();
    initMobileMenu();
    await checkApi();
    await initAuth();
    await loadPublicPackages();
    await handlePaymentReturn();
  }

  boot();
})();
