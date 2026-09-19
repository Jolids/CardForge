(() => {
  const API = (window.CARDFORGE_CONFIG?.API_BASE_URL || "").replace(/\/$/, "");
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
  let lastImage = "";

  const presets = {
    premium: "Создай премиальную рекламную карточку товара. Товар крупный и максимально похож на исходное фото. Дорогая предметная съёмка, глубокий благородный фон, мягкий направленный свет, объёмный подиум, аккуратные блики и ощущение люксового бренда. Композиция современная, чистая и продающая.",
    tech: "Сделай технологичную рекламную карточку товара. Тёмный графитовый фон, неоновое фиолетово-синее свечение, световые линии, объём и глубина. Товар крупный, контрастный и главный. Современный футуристичный e-commerce стиль.",
    clean: "Сделай чистую минималистичную карточку товара. Светлый объёмный фон, мягкие естественные тени, спокойная премиальная композиция, много воздуха, аккуратный подиум. Товар должен выглядеть как профессиональная студийная съёмка.",
    lifestyle: "Создай lifestyle-карточку товара в реалистичной красивой сцене. Сохрани сам товар максимально точно, но помести его в подходящее современное окружение. Естественный свет, глубина кадра, детали окружения поддерживают товар и не отвлекают от него."
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
    if (preview.dataset.objectUrl) URL.revokeObjectURL(preview.dataset.objectUrl);
    const url = URL.createObjectURL(file);
    preview.dataset.objectUrl = url;
    preview.src = url;
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
    document.querySelectorAll("[data-preset]").forEach((x) => x.classList.remove("active"));
    button.classList.add("active");
    $("prompt").value = presets[button.dataset.preset] || "";
  }));
  $("prompt").value = presets.premium;

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
      if (data.generatorReady === false) throw new Error("Генератор не настроен");
      apiState.classList.remove("bad");
      apiState.classList.add("ok");
      apiState.querySelector("span").textContent = "Сервис готов";
    } catch {
      apiState.classList.remove("ok");
      apiState.classList.add("bad");
      apiState.querySelector("span").textContent = "Сервис недоступен";
    }
  }

  async function generate() {
    showError("");
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
    generateBtn.innerHTML = "<span>✦</span> Создаём…";
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
      if (!res.ok) throw new Error(data.error || `Ошибка сервиса ${res.status}`);
      if (!data.image) throw new Error("Сервис не вернул изображение");
      lastImage = data.image;
      resultImage.src = data.image;
      resultImage.hidden = false;
      meta.textContent = data.elapsedMs ? `Готово за ${Math.max(1, Math.round(data.elapsedMs / 1000))} сек.` : "Готово";
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
    document.body.appendChild(a);
    a.click();
    a.remove();
  });

  checkApi();
})();
