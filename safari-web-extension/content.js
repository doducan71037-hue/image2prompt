if (!globalThis.__IMAGE2PROMPT_CONTENT_READY__) {
  globalThis.__IMAGE2PROMPT_CONTENT_READY__ = true;

  const DEFAULT_CONFIG = {
    platformUrl: "https://chatgpt.com/?prompt={{prompt}}",
    language: "en",
    autoOpenPlatform: true,
    enableCustomPromptInput: false,
    domainFilters: []
  };

  const CUSTOM_DIALOG_BACKDROP_CLASS = "i2p-dialog-backdrop";
  const CURRENT_HOSTNAME = normalizeHostname(window.location.hostname || "");
  const PANEL_LANGUAGES = [
    { id: "zh", label: "中" },
    { id: "en", label: "EN" },
    { id: "json", label: "JSON", compact: true }
  ];

  const UI_STRINGS = {
    en: {
      eyebrow: "IMAGETOPROMPT",
      loadingTitle: "Analyzing image",
      loadingDescription: "Generating prompt, tags, and translations",
      resultTitle: "Analysis Result",
      errorTitle: "Request failed",
      closeButton: "Close",
      copyButton: "Copy",
      openPlatformButton: "Open",
      copied: "Prompt copied to clipboard.",
      copyFailed: "Unable to copy to clipboard.",
      platformOpened: "Opened in a new tab.",
      customInputTitle: "Add custom instructions",
      customInputDescription:
        "Optional: add per-image tweaks before the model crafts the prompt.",
      customInputPlaceholder:
        "Example: Replace the background with a neon-lit city skyline.",
      customInputConfirm: "Generate prompt",
      customInputCancel: "Cancel",
      blocked: "Prompt generation is disabled on this domain.",
      emptyPrompt: "The provider returned an empty prompt.",
      unknownError: "Unknown error."
    },
    zh: {
      eyebrow: "IMAGETOPROMPT",
      loadingTitle: "分析图片",
      loadingDescription: "正在生成提示词、标签与翻译",
      resultTitle: "分析结果",
      errorTitle: "请求失败",
      closeButton: "关闭",
      copyButton: "复制",
      openPlatformButton: "Open",
      copied: "提示词已复制到剪贴板。",
      copyFailed: "复制失败。",
      platformOpened: "已在新标签页打开。",
      customInputTitle: "补充自定义说明",
      customInputDescription: "可选：补充本次生成的额外需求。",
      customInputPlaceholder: "示例：把背景改成赛博朋克风格的霓虹城市。",
      customInputConfirm: "生成提示词",
      customInputCancel: "取消",
      blocked: "当前域名已被设置为不生成提示词。",
      emptyPrompt: "模型没有返回提示词。",
      unknownError: "未知错误。"
    }
  };

  let config = { ...DEFAULT_CONFIG };
  let panelRefs = null;
  let panelState = null;
  let lastContextAnchor = null;
  let panelDismissBound = false;
  let panelDragState = null;
  let loadingTickerId = 0;

  init().catch((error) => {
    console.error("[Image2Prompt] Failed to initialize content script:", error);
  });

  async function init() {
    await loadConfig();
    watchForConfigChanges();
    document.addEventListener("contextmenu", handleContextMenuCapture, true);
    window.addEventListener("resize", () => {
      if (!panelRefs?.root?.hidden) {
        queuePanelPosition(panelState?.anchor);
      }
    });
    setupRuntimeListener();
  }

  function setupRuntimeListener() {
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
      if (message?.type !== "contextMenuGeneratePrompt") {
        return;
      }

      handleContextMenuGenerate(message)
        .then(() => sendResponse({ success: true }))
        .catch((error) => {
          console.error("[Image2Prompt] Context menu flow failed:", error);
          showErrorPanel(error?.message || getUiString("unknownError"));
          sendResponse({
            success: false,
            error: error?.message || getUiString("unknownError")
          });
        });

      return true;
    });
  }

  async function handleContextMenuGenerate(message) {
    if (isDomainBlocked(CURRENT_HOSTNAME, config.domainFilters)) {
      throw new Error(getUiString("blocked"));
    }

    const imageUrl =
      typeof message.imageUrl === "string" ? message.imageUrl.trim() : "";
    if (!imageUrl) {
      throw new Error(getUiString("unknownError"));
    }

    let customInstruction = "";
    if (config.enableCustomPromptInput) {
      const dialogResult = await promptForCustomInstruction();
      if (dialogResult === null) {
        return;
      }
      customInstruction = dialogResult;
    }

    const anchor = resolveAnchorPoint(imageUrl);
    showLoadingPanel(anchor);

    const imageElement = findImageElementByUrl(imageUrl);
    const imagePayload = await collectImagePayload(imageElement, imageUrl);
    const generation = await sendRuntimeMessage({
      type: "generatePrompt",
      imageUrl: imagePayload.imageUrl,
      imageAlt: imagePayload.imageAlt,
      ...(imagePayload.base64
        ? {
            imageMimeType: imagePayload.mimeType,
            imageBase64: imagePayload.base64
          }
        : {}),
      customInstruction
    });

    if (!generation?.success) {
      throw new Error(generation?.error || getUiString("unknownError"));
    }

    const prompt = String(generation.prompt || "").trim();
    if (!prompt) {
      throw new Error(getUiString("emptyPrompt"));
    }

    const enrichment = await sendRuntimeMessage({
      type: "enrichPromptPresentation",
      prompt
    });

    const translations = {
      zh: enrichment?.success ? enrichment.translations?.zh || prompt : prompt,
      en: enrichment?.success ? enrichment.translations?.en || prompt : prompt
    };
    const tags = enrichment?.success && Array.isArray(enrichment.tags)
      ? enrichment.tags.slice(0, 8)
      : [];
    const selectedLocale = getDefaultPanelLocale(translations);
    const autoCopied = await tryCopyToClipboard(translations[selectedLocale] || prompt);
    await completeLoadingProgress();

    showResultPanel({
      anchor,
      prompt,
      translations,
      tags,
      selectedLocale,
      platformUrl: generation.platformUrl || buildPlatformUrl(prompt),
      autoOpened: generation.autoOpened === true,
      autoCopied
    });
  }

  function handleContextMenuCapture(event) {
    const imageElement = findImageTarget(event.target);
    if (!imageElement) {
      return;
    }

    const imageUrl = normalizeComparableUrl(
      imageElement.currentSrc || imageElement.src || ""
    );
    if (!imageUrl) {
      return;
    }

    lastContextAnchor = {
      x: event.clientX,
      y: event.clientY,
      imageUrl
    };
  }

  function showLoadingPanel(anchor) {
    const refs = ensurePanel();
    refs.root.dataset.state = "loading";
    refs.eyebrow.textContent = getUiString("eyebrow");
    refs.title.textContent = getUiString("loadingTitle");
    refs.progressHint.textContent = getUiString("loadingDescription");
    refs.body.textContent = "";
    refs.body.hidden = true;
    refs.status.textContent = "";
    refs.tags.innerHTML = "";
    refs.localeGroup.innerHTML = "";
    refs.actions.innerHTML = "";
    refs.progress.hidden = false;
    refs.progressMeta.hidden = false;
    refs.footer.hidden = true;
    refs.backdrop.hidden = false;
    refs.root.hidden = false;
    panelState = { anchor };
    startFakeLoadingProgress();
    bindPanelDismissHandlers();
    queuePanelPosition(anchor);
  }

  function showResultPanel(nextState) {
    const refs = ensurePanel();
    panelState = inheritManualPosition(nextState);
    refs.root.dataset.state = "result";
    refs.eyebrow.textContent = getUiString("eyebrow");
    refs.title.textContent = getUiString("resultTitle");
    refs.progress.hidden = true;
    refs.progressMeta.hidden = true;
    refs.body.hidden = false;
    refs.footer.hidden = false;
    stopFakeLoadingProgress();

    renderPanelBody();
    bindPanelDismissHandlers();
    queuePanelPosition(panelState.anchor);
  }

  function renderPanelBody() {
    const refs = ensurePanel();
    if (!panelState) {
      return;
    }

    const currentText = getCurrentPanelText(panelState);
    const isJsonView = panelState.selectedLocale === "json";

    refs.body.textContent = currentText;
    refs.tags.innerHTML = "";
    (panelState.tags || []).forEach((tag) => {
      const chip = document.createElement("span");
      chip.className = "i2p-panel__tag";
      chip.textContent = tag;
      refs.tags.appendChild(chip);
    });
    refs.tags.hidden = isJsonView || refs.tags.childElementCount === 0;

    refs.status.textContent = panelState.autoCopied
      ? getUiString("copied")
      : panelState.autoOpened
        ? getUiString("platformOpened")
        : "";

    refs.localeGroup.innerHTML = "";
    PANEL_LANGUAGES.forEach((entry) => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "i2p-panel__locale";
      if (entry.compact) {
        button.classList.add("i2p-panel__locale--compact");
      }
      button.textContent = entry.label;
      if (entry.id === panelState.selectedLocale) {
        button.classList.add("is-active");
      }
      button.addEventListener("click", () => {
        panelState.selectedLocale = entry.id;
        renderPanelBody();
      });
      refs.localeGroup.appendChild(button);
    });

    refs.actions.innerHTML = "";
    if (panelState.platformUrl) {
      const openButton = document.createElement("button");
      openButton.type = "button";
      openButton.className = "i2p-panel__action i2p-panel__action--secondary";
      openButton.textContent = getUiString("openPlatformButton");
      openButton.addEventListener("click", () => {
        if (openPlatformUrl(panelState.platformUrl)) {
          refs.status.textContent = getUiString("platformOpened");
        }
      });
      refs.actions.appendChild(openButton);
    }

    const copyButton = document.createElement("button");
    copyButton.type = "button";
    copyButton.className = "i2p-panel__action i2p-panel__action--primary";
    copyButton.textContent = getUiString("copyButton");
    copyButton.addEventListener("click", async () => {
      try {
        await copyToClipboard(currentText);
        refs.status.textContent = getUiString("copied");
      } catch (error) {
        refs.status.textContent = getUiString("copyFailed");
      }
    });
    refs.actions.appendChild(copyButton);

    refs.backdrop.hidden = false;
    refs.root.hidden = false;
  }

  function getCurrentPanelText(state) {
    if (state.selectedLocale === "json") {
      return buildStructuredPromptText(state);
    }

    return (
      state.translations?.[state.selectedLocale] ||
      state.translations?.en ||
      state.translations?.zh ||
      state.prompt ||
      ""
    );
  }

  function buildStructuredPromptText(state) {
    return JSON.stringify(
      {
        prompt: {
          original: state.prompt || "",
          zh: state.translations?.zh || "",
          en: state.translations?.en || ""
        },
        tags: Array.isArray(state.tags) ? state.tags : []
      },
      null,
      2
    );
  }

  function showErrorPanel(message) {
    const refs = ensurePanel();
    const anchor = panelState?.anchor || getFallbackAnchor();
    refs.root.dataset.state = "error";
    refs.eyebrow.textContent = getUiString("eyebrow");
    refs.title.textContent = getUiString("errorTitle");
    refs.body.textContent = message;
    refs.body.hidden = false;
    refs.progressMeta.hidden = true;
    refs.status.textContent = "";
    refs.tags.innerHTML = "";
    refs.localeGroup.innerHTML = "";
    refs.actions.innerHTML = "";
    refs.progress.hidden = true;
    refs.footer.hidden = false;
    stopFakeLoadingProgress();
    const closeButton = document.createElement("button");
    closeButton.type = "button";
    closeButton.className = "i2p-panel__action i2p-panel__action--primary";
    closeButton.textContent = getUiString("closeButton");
    closeButton.addEventListener("click", hidePanel);
    refs.actions.appendChild(closeButton);
    refs.backdrop.hidden = false;
    refs.root.hidden = false;
    panelState = inheritManualPosition({ anchor });
    bindPanelDismissHandlers();
    queuePanelPosition(anchor);
  }

  function ensurePanel() {
    if (panelRefs?.root?.isConnected) {
      return panelRefs;
    }

    const backdrop = document.createElement("div");
    backdrop.className = "i2p-panel-backdrop";
    backdrop.hidden = true;

    const root = document.createElement("section");
    root.className = "i2p-panel";
    root.hidden = true;
    root.addEventListener("mousedown", (event) => {
      event.stopPropagation();
    });
    root.addEventListener("pointerdown", handlePanelPointerDown);

    const header = document.createElement("div");
    header.className = "i2p-panel__header";

    const eyebrow = document.createElement("div");
    eyebrow.className = "i2p-panel__eyebrow";

    const closeButton = document.createElement("button");
    closeButton.type = "button";
    closeButton.className = "i2p-panel__close";
    closeButton.textContent = "×";
    closeButton.addEventListener("click", hidePanel);

    header.append(eyebrow, closeButton);

    const title = document.createElement("h3");
    title.className = "i2p-panel__title";

    const progress = document.createElement("div");
    progress.className = "i2p-panel__progress";
    const progressBar = document.createElement("span");
    progressBar.className = "i2p-panel__progress-bar";
    progress.appendChild(progressBar);

    const progressMeta = document.createElement("div");
    progressMeta.className = "i2p-panel__progress-meta";
    const progressHint = document.createElement("span");
    progressHint.className = "i2p-panel__progress-hint";
    progressMeta.append(progressHint);

    const body = document.createElement("div");
    body.className = "i2p-panel__body";

    const tags = document.createElement("div");
    tags.className = "i2p-panel__tags";
    tags.hidden = true;

    const footer = document.createElement("div");
    footer.className = "i2p-panel__footer";

    const footerLeft = document.createElement("div");
    footerLeft.className = "i2p-panel__footer-left";

    const status = document.createElement("div");
    status.className = "i2p-panel__status";

    const localeGroup = document.createElement("div");
    localeGroup.className = "i2p-panel__locales";

    footerLeft.append(status, localeGroup);

    const actions = document.createElement("div");
    actions.className = "i2p-panel__actions";

    footer.append(footerLeft, actions);
    root.append(header, title, progressMeta, progress, body, tags, footer);
    backdrop.appendChild(root);

    const host = document.body || document.documentElement;
    host.appendChild(backdrop);

    panelRefs = {
      backdrop,
      root,
      eyebrow,
      title,
      progressMeta,
      progress,
      progressBar,
      progressHint,
      body,
      tags,
      footer,
      status,
      localeGroup,
      actions
    };

    return panelRefs;
  }

  function hidePanel() {
    if (!panelRefs) {
      return;
    }
    stopFakeLoadingProgress();
    stopPanelDrag();
    panelRefs.root.hidden = true;
    panelRefs.backdrop.hidden = true;
    unbindPanelDismissHandlers();
  }

  function queuePanelPosition(anchor) {
    requestAnimationFrame(() => {
      if (!panelRefs?.root || panelRefs.root.hidden) {
        return;
      }
      if (panelState?.manualPosition) {
        applyPanelPosition(panelState.manualLeft, panelState.manualTop);
        return;
      }
      positionPanel(anchor || getFallbackAnchor());
    });
  }

  function positionPanel(anchor) {
    const refs = ensurePanel();
    const gap = 14;
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    const rect = refs.root.getBoundingClientRect();
    const width = rect.width || Math.min(340, viewportWidth - 24);
    const height = rect.height || 320;

    let left = anchor.x + gap;
    let top = anchor.y + 10;

    if (left + width > viewportWidth - 12) {
      left = Math.max(12, anchor.x - width - gap);
    }
    if (top + height > viewportHeight - 12) {
      top = Math.max(12, viewportHeight - height - 12);
    }
    if (top < 12) {
      top = 12;
    }

    applyPanelPosition(left, top);
  }

  function applyPanelPosition(left, top) {
    const refs = ensurePanel();
    const rect = refs.root.getBoundingClientRect();
    const width = rect.width || Math.min(340, window.innerWidth - 24);
    const height = rect.height || 320;
    const clamped = clampPanelPosition(left, top, width, height);

    refs.root.style.left = `${clamped.left}px`;
    refs.root.style.top = `${clamped.top}px`;
    return clamped;
  }

  function clampPanelPosition(left, top, width, height) {
    const minOffset = 12;
    const maxLeft = Math.max(minOffset, window.innerWidth - width - minOffset);
    const maxTop = Math.max(minOffset, window.innerHeight - height - minOffset);
    return {
      left: Math.min(Math.max(minOffset, left), maxLeft),
      top: Math.min(Math.max(minOffset, top), maxTop)
    };
  }

  function handlePanelPointerDown(event) {
    if (event.button !== 0 || !panelRefs?.root || panelRefs.root.hidden) {
      return;
    }

    const target = event.target;
    if (!(target instanceof Element)) {
      return;
    }
    if (target.closest("button, a, input, textarea, select")) {
      return;
    }
    if (target.closest(".i2p-panel__body, .i2p-panel__tags, .i2p-panel__footer")) {
      return;
    }

    const rect = panelRefs.root.getBoundingClientRect();
    panelDragState = {
      offsetX: event.clientX - rect.left,
      offsetY: event.clientY - rect.top
    };
    panelRefs.root.classList.add("is-dragging");
    document.addEventListener("pointermove", handlePanelPointerMove, true);
    document.addEventListener("pointerup", stopPanelDrag, true);
    document.addEventListener("pointercancel", stopPanelDrag, true);
    event.preventDefault();
  }

  function handlePanelPointerMove(event) {
    if (!panelDragState || !panelRefs?.root) {
      return;
    }
    const next = applyPanelPosition(
      event.clientX - panelDragState.offsetX,
      event.clientY - panelDragState.offsetY
    );
    panelState = {
      ...(panelState || {}),
      manualPosition: true,
      manualLeft: next.left,
      manualTop: next.top
    };
  }

  function stopPanelDrag() {
    if (!panelDragState) {
      return;
    }
    panelDragState = null;
    document.removeEventListener("pointermove", handlePanelPointerMove, true);
    document.removeEventListener("pointerup", stopPanelDrag, true);
    document.removeEventListener("pointercancel", stopPanelDrag, true);
    panelRefs?.root?.classList.remove("is-dragging");
  }

  function inheritManualPosition(nextState) {
    if (!panelState?.manualPosition) {
      return nextState;
    }
    return {
      ...nextState,
      manualPosition: true,
      manualLeft: panelState.manualLeft,
      manualTop: panelState.manualTop
    };
  }

  function openPlatformUrl(url) {
    if (!url) {
      return false;
    }
    const opened = window.open(url, "_blank", "noopener,noreferrer");
    return Boolean(opened);
  }

  function bindPanelDismissHandlers() {
    if (panelDismissBound) {
      return;
    }
    document.addEventListener("mousedown", handleDocumentPointerDown, true);
    document.addEventListener("keydown", handleDocumentKeydown, true);
    panelDismissBound = true;
  }

  function unbindPanelDismissHandlers() {
    if (!panelDismissBound) {
      return;
    }
    document.removeEventListener("mousedown", handleDocumentPointerDown, true);
    document.removeEventListener("keydown", handleDocumentKeydown, true);
    panelDismissBound = false;
  }

  function handleDocumentPointerDown(event) {
    if (!panelRefs?.root || panelRefs.root.hidden) {
      return;
    }
    if (event.target instanceof Node && panelRefs.root.contains(event.target)) {
      return;
    }
    if (
      event.target instanceof Element &&
      event.target.closest(`.${CUSTOM_DIALOG_BACKDROP_CLASS}`)
    ) {
      return;
    }
    hidePanel();
  }

  function handleDocumentKeydown(event) {
    if (event.key === "Escape" && !document.querySelector(`.${CUSTOM_DIALOG_BACKDROP_CLASS}`)) {
      hidePanel();
    }
  }

  function resolveAnchorPoint(imageUrl) {
    const normalizedUrl = normalizeComparableUrl(imageUrl);
    if (
      lastContextAnchor &&
      normalizedUrl &&
      lastContextAnchor.imageUrl === normalizedUrl
    ) {
      return {
        x: lastContextAnchor.x,
        y: lastContextAnchor.y
      };
    }
    return getFallbackAnchor();
  }

  function getFallbackAnchor() {
    return {
      x: Math.round(window.innerWidth * 0.68),
      y: Math.round(window.innerHeight * 0.32)
    };
  }

  function getDefaultPanelLocale(translations) {
    const uiLanguage = getUiLanguage();
    if (uiLanguage === "zh" && translations.zh) {
      return "zh";
    }
    if (translations.en) {
      return "en";
    }
    if (translations.zh) {
      return "zh";
    }
    return "en";
  }

  function startFakeLoadingProgress() {
    stopFakeLoadingProgress();
    updateLoadingProgress(10);
    let current = 10;
    loadingTickerId = window.setInterval(() => {
      if (!panelRefs?.root || panelRefs.root.hidden || panelRefs.root.dataset.state !== "loading") {
        return;
      }
      if (current >= 90) {
        return;
      }
      current = Math.min(90, current + Math.max(1.2, (92 - current) * 0.08));
      updateLoadingProgress(current);
    }, 180);
  }

  function stopFakeLoadingProgress() {
    if (loadingTickerId) {
      window.clearInterval(loadingTickerId);
      loadingTickerId = 0;
    }
  }

  async function completeLoadingProgress() {
    updateLoadingProgress(100);
    stopFakeLoadingProgress();
    await wait(180);
  }

  function updateLoadingProgress(value) {
    if (!panelRefs?.progressBar) {
      return;
    }
    const safeValue = Math.max(0, Math.min(100, Number(value) || 0));
    panelRefs.progressBar.style.width = `${safeValue}%`;
  }

  function wait(duration) {
    return new Promise((resolve) => window.setTimeout(resolve, duration));
  }

  async function sendRuntimeMessage(payload) {
    return new Promise((resolve) => {
      chrome.runtime.sendMessage(payload, (response) => {
        if (chrome.runtime.lastError) {
          resolve({
            success: false,
            error: chrome.runtime.lastError.message
          });
          return;
        }
        resolve(response);
      });
    });
  }

  function promptForCustomInstruction() {
    return new Promise((resolve) => {
      const existing = document.querySelector(`.${CUSTOM_DIALOG_BACKDROP_CLASS}`);
      if (existing) {
        existing.remove();
      }

      const backdrop = document.createElement("div");
      backdrop.className = CUSTOM_DIALOG_BACKDROP_CLASS;

      const dialog = document.createElement("div");
      dialog.className = "i2p-dialog";

      const title = document.createElement("h3");
      title.className = "i2p-dialog__title";
      title.textContent = getUiString("customInputTitle");

      const description = document.createElement("p");
      description.className = "i2p-dialog__description";
      description.textContent = getUiString("customInputDescription");

      const textarea = document.createElement("textarea");
      textarea.className = "i2p-dialog__textarea";
      textarea.placeholder = getUiString("customInputPlaceholder");

      const actions = document.createElement("div");
      actions.className = "i2p-dialog__actions";

      const cancelButton = document.createElement("button");
      cancelButton.type = "button";
      cancelButton.className = "i2p-dialog__button i2p-dialog__button--secondary";
      cancelButton.textContent = getUiString("customInputCancel");

      const confirmButton = document.createElement("button");
      confirmButton.type = "button";
      confirmButton.className = "i2p-dialog__button i2p-dialog__button--primary";
      confirmButton.textContent = getUiString("customInputConfirm");

      const cleanup = (value) => {
        document.removeEventListener("keydown", handleKeydown, true);
        backdrop.remove();
        resolve(value);
      };

      const handleKeydown = (event) => {
        if (!dialog.contains(event.target)) {
          return;
        }
        if (event.key === "Escape") {
          event.preventDefault();
          cleanup(null);
        }
        if (
          event.key === "Enter" &&
          (event.metaKey || event.ctrlKey) &&
          !event.shiftKey
        ) {
          event.preventDefault();
          cleanup(textarea.value.trim());
        }
      };

      cancelButton.addEventListener("click", () => cleanup(null));
      confirmButton.addEventListener("click", () => cleanup(textarea.value.trim()));
      backdrop.addEventListener("click", (event) => {
        if (event.target === backdrop) {
          cleanup(null);
        }
      });

      actions.append(cancelButton, confirmButton);
      dialog.append(title, description, textarea, actions);
      backdrop.appendChild(dialog);
      document.addEventListener("keydown", handleKeydown, true);
      (document.body || document.documentElement).appendChild(backdrop);
      requestAnimationFrame(() => textarea.focus());
    });
  }

  async function collectImagePayload(imageElement, imageUrl) {
    const altText = imageElement?.alt ? String(imageElement.alt) : "";

    if (imageUrl.startsWith("data:")) {
      const parsed = parseDataUrl(imageUrl);
      return {
        imageUrl,
        imageAlt: altText,
        mimeType: parsed.mimeType,
        base64: parsed.data
      };
    }

    try {
      const response = await fetch(imageUrl, {
        credentials: "include",
        mode: "cors"
      });

      if (!response.ok) {
        throw new Error(
          `Unable to fetch image (${response.status} ${response.statusText || ""}).`
        );
      }

      const blob = await response.blob();
      const mimeType = blob.type || "image/png";
      const base64 = arrayBufferToBase64(await blob.arrayBuffer());
      return {
        imageUrl,
        imageAlt: altText,
        mimeType,
        base64
      };
    } catch (error) {
      console.warn("[Image2Prompt] Unable to prefetch image in content script:", error);
      return {
        imageUrl,
        imageAlt: altText,
        mimeType: "",
        base64: ""
      };
    }
  }

  function findImageTarget(node) {
    if (node instanceof HTMLImageElement) {
      return node;
    }
    return node?.closest?.("img") || null;
  }

  function findImageElementByUrl(targetUrl) {
    const normalizedTarget = normalizeComparableUrl(targetUrl);
    if (!normalizedTarget) {
      return null;
    }
    return (
      Array.from(document.querySelectorAll("img")).find((img) => {
        const current = normalizeComparableUrl(img.currentSrc || img.src || "");
        return current === normalizedTarget;
      }) || null
    );
  }

  function loadConfig() {
    return new Promise((resolve, reject) => {
      chrome.storage.sync.get(DEFAULT_CONFIG, (items) => {
        if (chrome.runtime.lastError) {
          reject(chrome.runtime.lastError);
          return;
        }
        config = {
          ...DEFAULT_CONFIG,
          ...items,
          domainFilters: sanitizeDomainFilters(items.domainFilters)
        };
        resolve();
      });
    });
  }

  function watchForConfigChanges() {
    chrome.storage.onChanged.addListener((changes, areaName) => {
      if (areaName !== "sync") {
        return;
      }
      for (const [key, change] of Object.entries(changes)) {
        if (key === "domainFilters") {
          config.domainFilters = sanitizeDomainFilters(change.newValue);
          continue;
        }
        config[key] = change.newValue ?? DEFAULT_CONFIG[key];
      }
    });
  }

  function getUiLanguage() {
    return config.language === "zh" ? "zh" : "en";
  }

  function getUiString(key) {
    const language = getUiLanguage();
    return UI_STRINGS[language]?.[key] ?? UI_STRINGS.en[key] ?? "";
  }

  function buildPlatformUrl(prompt) {
    const template = (config.platformUrl || DEFAULT_CONFIG.platformUrl).trim();
    if (!template) {
      return "";
    }
    const encodedPrompt = encodeURIComponent(prompt);
    if (template.includes("{{prompt}}")) {
      return template.replace(/{{prompt}}/g, encodedPrompt);
    }
    const separator = template.includes("?") ? "&" : "?";
    return `${template}${separator}prompt=${encodedPrompt}`;
  }

  async function tryCopyToClipboard(text) {
    try {
      await copyToClipboard(text);
      return true;
    } catch (error) {
      return false;
    }
  }

  async function copyToClipboard(text) {
    if (navigator.clipboard?.writeText && document.hasFocus()) {
      await navigator.clipboard.writeText(text);
      return;
    }
    const textarea = document.createElement("textarea");
    textarea.value = text;
    textarea.style.position = "fixed";
    textarea.style.opacity = "0";
    document.body.appendChild(textarea);
    textarea.focus({ preventScroll: true });
    textarea.select();
    const succeeded = document.execCommand("copy");
    textarea.remove();
    if (!succeeded) {
      throw new Error("execCommand copy rejected");
    }
  }

  function arrayBufferToBase64(buffer) {
    let binary = "";
    const bytes = new Uint8Array(buffer);
    const chunkSize = 0x8000;
    for (let i = 0; i < bytes.length; i += chunkSize) {
      const chunk = bytes.subarray(i, i + chunkSize);
      binary += String.fromCharCode(...chunk);
    }
    return btoa(binary);
  }

  function parseDataUrl(url) {
    const match = url.match(/^data:([^;,]+)?(?:;base64)?,(.*)$/);
    if (!match) {
      throw new Error("Unsupported data URL format.");
    }
    const mimeType = match[1] || "image/png";
    const data = match[2];
    if (!url.includes(";base64,")) {
      return {
        mimeType,
        data: btoa(decodeURIComponent(data))
      };
    }
    return { mimeType, data };
  }

  function normalizeComparableUrl(value) {
    if (typeof value !== "string") {
      return "";
    }
    const trimmed = value.trim();
    if (!trimmed) {
      return "";
    }
    if (trimmed.startsWith("data:")) {
      return trimmed.slice(0, 128);
    }
    try {
      return new URL(trimmed, window.location.href).toString();
    } catch (error) {
      return trimmed;
    }
  }

  function sanitizeDomainFilters(list) {
    if (!Array.isArray(list)) {
      return [];
    }
    const unique = new Set();
    list.forEach((entry) => {
      const sanitized = sanitizeDomain(entry);
      if (sanitized) {
        unique.add(sanitized);
      }
    });
    return Array.from(unique).sort();
  }

  function sanitizeDomain(value) {
    if (typeof value !== "string") {
      return "";
    }
    let domain = value.trim().toLowerCase();
    if (!domain) {
      return "";
    }
    domain = domain.replace(/^https?:\/\//i, "");
    domain = domain.replace(/\/.*$/, "");
    domain = domain.replace(/:\d+$/, "");
    domain = domain.replace(/^[.]+/, "");
    if (domain.startsWith("www.")) {
      domain = domain.slice(4);
    }
    domain = domain.replace(/[.]+$/, "");
    if (!domain) {
      return "";
    }
    if (!/^[a-z0-9.-]+$/.test(domain)) {
      return "";
    }
    if (!domain.includes(".") && domain !== "localhost") {
      return "";
    }
    return domain;
  }

  function normalizeHostname(value) {
    if (typeof value !== "string") {
      return "";
    }
    let host = value.trim().toLowerCase();
    if (!host) {
      return "";
    }
    host = host.replace(/^[.]+/, "");
    if (host.startsWith("www.")) {
      host = host.slice(4);
    }
    return host.replace(/[.]+$/, "");
  }

  function isDomainBlocked(hostname, filters) {
    if (!hostname) {
      return false;
    }
    const normalizedHost = normalizeHostname(hostname);
    return filters.some((domain) => {
      if (!domain) {
        return false;
      }
      if (normalizedHost === domain) {
        return true;
      }
      return normalizedHost.endsWith(`.${domain}`);
    });
  }
}
