(() => {
  const API = (window.CARDFORGE_CONFIG?.API_BASE_URL || "").replace(/\/$/, "");
  const $ = (id) => document.getElementById(id);
  const form = $("generatorForm");
  const fileInput = $("product");
  const dropzone = $("dropzone");
  const preview = $("uploadPreview");
  const uploadEmpty = $("uploadEmpty");
  const replacePhoto = $("replacePhoto");
  const provider = $("provider");
  const resultImage = $("resultImage");
  const resultPlaceholder = $("resultPlaceholder");
  const loadingOverlay = $("loadingOverlay");
  const generateBtn = $("generateBtn");
  const errorBox = $("errorBox");
  const downloadBtn = $("downloadBtn");
  const againBtn = $("againBtn");
  const resultStage = $("resultStage");
  const apiState = $("apiState");
  const providerCards = $("providerCards");
  const modelBadge = $("modelBadge");
  const meta = $("meta");

  let lastImage = "";
  let providersInfo = null;

  const presets = {
    premium: "Создай премиальную рекламную карточку товара. Глубокий тёмный фон, выразительный свет, дорогие материалы, аккуратный подиум, ощущение люксовой предметной съёмки. Товар должен быть главным объектом.",
    tech: "Сделай технологичную рекламную карточку: тёмный графитовый фон, неоновое свечение, световые линии, глубина, современный футуристичный стиль. Товар крупный и контрастный.",
    clean: "Сделай чистую минималистичную карточку маркетплейса: светлый объёмный фон, мягкие тени, аккуратная композиция, много воздуха и премиальная студийная подача."
  };

  function showError(message) {
    errorBox.textContent = message;
    errorBox.hidden = !message;
  }

  function setFile(file) {
    if (!file) return;
    if (!/^image\/(jpeg|png|webp)$/.test(file.type)) return showError("Поддерживаются JPG, PNG и WEBP.");
    if (file.size > 12 * 1024 * 1024) return showError("Максимальный размер файла — 12 МБ.");
    showError("");
    const dt = new DataTransfer();
    dt.items.add(file);
    fileInput.files = dt.files;
    preview.src = URL.createObjectURL(file);
    preview.hidden = false;
    uploadEmpty.hidden = true;
    replacePhoto.hidden = false;
  }

  fileInput.addEventListener("change", () => setFile(fileInput.files?.[0]));
  replacePhoto.addEventListener("click", (e) => { e.preventDefault(); fileInput.click(); });
  dropzone.addEventListener("dragover", (e) => { e.preventDefault(); dropzone.classList.add("drag"); });
  dropzone.addEventListener("dragleave", () => dropzone.classList.remove("drag"));
  dropzone.addEventListener("drop", (e) => { e.preventDefault(); dropzone.classList.remove("drag"); setFile(e.dataTransfer.files?.[0]); });

  document.querySelectorAll("[data-preset]").forEach((button) => button.addEventListener("click", () => {
    $("prompt").value = presets[button.dataset.preset] || "";
  }));

  $("size").addEventListener("change", () => {
    resultStage.classList.remove("portrait", "square", "story");
    resultStage.classList.add($("size").value);
  });

  async function loadProviders() {
    if (!API) {
      apiState.classList.add("bad");
      apiState.querySelector("span").textContent = "API_BASE_URL не задан";
      return;
    }
    try {
      const res = await fetch(`${API}/api/providers`, { cache: "no-store" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      providersInfo = await res.json();
      apiState.classList.add("ok");
      apiState.querySelector("span").textContent = "API онлайн";
      providerCards.innerHTML = providersInfo.providers.map((p) =>
        `<div class="provider-mini ${p.configured ? "on" : "off"}" title="${escapeHtml(p.model)}">${escapeHtml(p.label)} · ${p.configured ? "готов" : "нет ключа"}</div>`
      ).join("");
    } catch (e) {
      apiState.classList.add("bad");
      apiState.querySelector("span").textContent = "API недоступен";
      providerCards.innerHTML = `<div class="provider-mini off">Проверь HTTPS/CORS на VPS</div>`;
    }
  }

  function escapeHtml(v) { return String(v).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }

  async function generate() {
    showError("");
    const file = fileInput.files?.[0];
    if (!file) return showError("Сначала загрузите фотографию товара.");
    if (!API) return showError("В config.js не задан API_BASE_URL.");

    const body = new FormData();
    body.append("product", file);
    body.append("provider", provider.value);
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
    meta.textContent = "";

    try {
      const res = await fetch(`${API}/api/generate`, { method: "POST", body });
      const text = await res.text();
      let data;
      try { data = JSON.parse(text); } catch { data = { error: text || `HTTP ${res.status}` }; }
      if (!res.ok) throw new Error(data.error || `Ошибка API ${res.status}`);
      if (!data.image) throw new Error("API не вернул изображение");
      lastImage = data.image;
      resultImage.src = data.image;
      resultImage.hidden = false;
      modelBadge.textContent = data.model || data.provider || "AI";
      meta.textContent = `${data.providerLabel || data.provider} · ${Math.round((data.elapsedMs || 0) / 1000)} сек.`;
      downloadBtn.disabled = false;
      againBtn.disabled = false;
    } catch (e) {
      resultPlaceholder.hidden = false;
      showError(e?.message || "Ошибка генерации");
    } finally {
      loadingOverlay.hidden = true;
      generateBtn.disabled = false;
      generateBtn.innerHTML = "<span>✦</span> Сгенерировать карточку";
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

  loadProviders();
})();
