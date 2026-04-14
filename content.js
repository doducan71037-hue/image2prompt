if (!globalThis.__IMAGE2PROMPT_CONTENT_READY__) {
  globalThis.__IMAGE2PROMPT_CONTENT_READY__ = true;

  const DEFAULT_CONFIG = {
    platformUrl: "https://chatgpt.com/?prompt={{prompt}}",
    language: "zh",
    theme: "dark",
    autoOpenPlatform: true,
    enableCustomPromptInput: false,
    domainFilters: [],
    promptRichness: "standard"
  };

  const CUSTOM_DIALOG_BACKDROP_CLASS = "i2p-dialog-backdrop";
  const CURRENT_HOSTNAME = normalizeHostname(window.location.hostname || "");
  const HISTORY_STORAGE_KEY = "generationHistory";
  const SIDE_PANEL_POSITION_KEY = "sidePanelHandleTop";
  const SIDE_HISTORY_LIMIT = 10;
  const PANEL_LANGUAGES = [
    { id: "zh", label: "中" },
    { id: "en", label: "EN" },
    { id: "json", label: "JSON", compact: true }
  ];
  const PROMPT_RICHNESS_OPTIONS = [
    { id: "concise", labelEn: "Concise", labelZh: "简洁" },
    { id: "standard", labelEn: "Standard", labelZh: "标准" },
    { id: "detailed", labelEn: "Detailed", labelZh: "详细" },
    { id: "very-detailed", labelEn: "Very", labelZh: "极致" }
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
      unknownError: "Unknown error.",
      sideQuickTitle: "Quick controls",
      sideQuickSubtitle: "Adjust core settings without leaving the page.",
      sideRichnessLabel: "Analysis depth",
      sideViewHistoryButton: "View history",
      sideHistoryTitle: "Generation History",
      sideHistorySubtitle: "Recent 10 generations",
      sideHistoryEmptyTitle: "No history yet",
      sideHistoryEmptyDescription: "Generate a prompt once and your recent records will appear here.",
      sideHistoryBack: "Back",
      sideHistoryOpen: "Open",
      sideHistoryDelete: "Delete",
      sideHistoryModel: "Model",
      sideHistoryPlatform: "Platform",
      sideHistoryGenerated: "Generated",
      sideHistoryLatest: "Latest",
      sideHistoryCopySuccess: "History prompt copied.",
      sideHistoryDeleteSuccess: "History entry removed."
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
      unknownError: "未知错误。",
      sideQuickTitle: "快捷面板",
      sideQuickSubtitle: "不用离开页面，直接调整常用设置。",
      sideRichnessLabel: "分析程度",
      sideViewHistoryButton: "查看历史",
      sideHistoryTitle: "生成历史",
      sideHistorySubtitle: "最近 10 条记录",
      sideHistoryEmptyTitle: "还没有历史记录",
      sideHistoryEmptyDescription: "先生成一次提示词，最近记录就会显示在这里。",
      sideHistoryBack: "返回",
      sideHistoryOpen: "打开",
      sideHistoryDelete: "删除",
      sideHistoryModel: "模型",
      sideHistoryPlatform: "平台",
      sideHistoryGenerated: "生成时间",
      sideHistoryLatest: "最近一次",
      sideHistoryCopySuccess: "历史提示词已复制。",
      sideHistoryDeleteSuccess: "历史记录已删除。"
    }
  };

  let config = { ...DEFAULT_CONFIG };
  let panelRefs = null;
  let panelState = null;
  let sidePanelRefs = null;
  let sidePanelState = {
    quickOpen: false,
    historyOpen: false,
    historyEntries: [],
    historyLocales: {},
    handleTop: null
  };
  let lastContextAnchor = null;
  let panelDismissBound = false;
  let panelDragState = null;
  let sideHandleDragState = null;
  let loadingTickerId = 0;
  let panelGeneration = 0;
  let crossfadeTimerId = 0;

  init().catch((error) => {
    console.error("[Image2Prompt] Failed to initialize content script:", error);
  });

  async function init() {
    await loadConfig();
    await loadSideHistory();
    await loadSidePanelPreferences();
    watchForConfigChanges();
    watchForHistoryChanges();
    document.addEventListener("contextmenu", handleContextMenuCapture, true);
    window.addEventListener("resize", () => {
      if (isPanelVisible()) {
        queuePanelPosition(panelState?.anchor);
      }
      sidePanelState.handleTop = clampSideHandleTop(getSideHandleTop());
      renderSidePanel();
    });
    setupRuntimeListener();
    ensureSidePanel();
    renderSidePanel();
  }

  function setupRuntimeListener() {
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
      if (message?.type === "contextMenuGeneratePrompt") {
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
      }

      if (message?.type === "platformAutofillPrompt") {
        handlePlatformAutofillPrompt(message)
          .then((success) => sendResponse({ success }))
          .catch((error) => {
            console.error("[Image2Prompt] Platform autofill failed:", error);
            sendResponse({ success: false, error: error?.message || getUiString("unknownError") });
          });
        return true;
      }

      // Background asks for the image URL captured during the last right-click.
      // This is used when right-clicking on a link overlay (e.g. Pinterest thumbnails)
      // where Chrome reports a "link" context instead of "image".
      if (message?.type === "getContextImageUrl") {
        const imageUrl = lastContextAnchor?.imageUrl || "";
        sendResponse({ imageUrl });
        return false;
      }
    });
  }

  function parseEmbeddedPromptPresentation(prompt) {
    const parsed = parseJsonObjectFromText(prompt);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      return null;
    }

    const promptText =
      parsed.prompt_text && typeof parsed.prompt_text === "object"
        ? parsed.prompt_text
        : null;
    const translations = {
      zh: typeof promptText?.zh === "string" ? promptText.zh.trim() : "",
      en: typeof promptText?.en === "string" ? promptText.en.trim() : ""
    };
    const tags = normalizePanelTags(parsed.tags);

    return {
      translations,
      tags,
      isComplete: Boolean(translations.zh && translations.en && tags.length === 8)
    };
  }

  function normalizePanelTags(tags) {
    if (!Array.isArray(tags)) {
      return [];
    }

    const normalized = [];
    for (const entry of tags) {
      const value = typeof entry === "string" ? entry.trim() : "";
      if (!isFourChineseCharacterTag(value)) {
        continue;
      }
      if (!normalized.includes(value)) {
        normalized.push(value);
      }
      if (normalized.length === 8) {
        break;
      }
    }

    return normalized;
  }

  function isFourChineseCharacterTag(value) {
    return typeof value === "string" && /^[\u4e00-\u9fff]{4}$/.test(value.trim());
  }

  function parseJsonObjectFromText(text) {
    if (typeof text !== "string" || !text.trim()) {
      return null;
    }

    const trimmed = text.trim();
    const candidates = [trimmed];
    const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
    if (fenced?.[1]) {
      candidates.unshift(fenced[1].trim());
    }
    const objectMatch = trimmed.match(/\{[\s\S]*\}/);
    if (objectMatch?.[0]) {
      candidates.unshift(objectMatch[0]);
    }

    for (const candidate of candidates) {
      try {
        return JSON.parse(candidate);
      } catch (error) {
        // ignore invalid JSON candidates and keep trying
      }
    }

    return null;
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

    const embeddedPresentation = parseEmbeddedPromptPresentation(prompt);
    const jsonTranslations = embeddedPresentation?.translations || null;
    const jsonTags = embeddedPresentation?.tags || null;
    let enrichment = null;

    if (!embeddedPresentation?.isComplete) {
      enrichment = await sendRuntimeMessage({
        type: "enrichPromptPresentation",
        prompt: jsonTranslations?.en || jsonTranslations?.zh || prompt
      });
    }

    const translations = {
      zh: (enrichment?.success ? enrichment.translations?.zh : null) || jsonTranslations?.zh || prompt,
      en: (enrichment?.success ? enrichment.translations?.en : null) || jsonTranslations?.en || prompt
    };
    const enrichedTags = enrichment?.success ? normalizePanelTags(enrichment.tags) : [];
    const tags = enrichedTags.length > 0
      ? enrichedTags
      : (jsonTags && jsonTags.length > 0 ? jsonTags : []);
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
      platformPrompt: generation.platformPrompt || translations[selectedLocale] || prompt,
      shouldAutofillPlatform: generation.shouldAutofillPlatform === true,
      autoOpened: generation.autoOpened === true,
      autoCopied
    });
  }

  function handleContextMenuCapture(event) {
    // First, try the direct target as an <img>
    let imageElement = findImageTarget(event.target);

    // If not found, use elementsFromPoint to find an <img> underneath overlays
    // (e.g. Pinterest puts <a> and <div> overlays on top of thumbnails)
    if (!imageElement) {
      const elementsAtPoint = document.elementsFromPoint(event.clientX, event.clientY);
      for (const el of elementsAtPoint) {
        if (el instanceof HTMLImageElement) {
          imageElement = el;
          break;
        }
      }
    }

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

  function applyPanelTheme() {
    const isLight = config.theme === "light";
    if (panelRefs?.root) {
      panelRefs.root.classList.toggle("i2p-theme-light", isLight);
    }
  }

  function showLoadingPanel(anchor) {
    const refs = ensurePanel();
    panelGeneration++;

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

    // Animated show
    refs.backdrop.hidden = false;
    refs.root.hidden = false;
    refs.root.classList.remove("is-hiding");
    refs.backdrop.classList.remove("is-hiding");
    requestAnimationFrame(() => {
      refs.backdrop.classList.add("is-visible");
      refs.root.classList.add("is-visible");
    });

    panelState = { anchor };
    applyPanelTheme();
    startFakeLoadingProgress();
    bindPanelDismissHandlers();
    queuePanelPosition(anchor);
  }

  function showResultPanel(nextState) {
    const refs = ensurePanel();
    panelGeneration++;
    panelState = inheritManualPosition(nextState);
    applyPanelTheme();
    refs.root.dataset.state = "result";
    refs.eyebrow.textContent = getUiString("eyebrow");
    refs.title.textContent = getUiString("resultTitle");
    refs.progress.hidden = true;
    refs.progressMeta.hidden = true;
    refs.body.hidden = false;
    refs.footer.hidden = false;
    stopFakeLoadingProgress();

    // Ensure panel is visible (may already be from loading state)
    refs.backdrop.hidden = false;
    refs.root.hidden = false;
    refs.root.classList.remove("is-hiding");
    refs.backdrop.classList.remove("is-hiding");
    requestAnimationFrame(() => {
      refs.backdrop.classList.add("is-visible");
      refs.root.classList.add("is-visible");
    });

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
    // Re-trigger body entrance animation (skip if called from crossfade)
    refs.body.classList.remove("is-switching", "is-entering");
    refs.body.style.animation = "none";
    void refs.body.offsetWidth;
    refs.body.style.animation = "";

    refs.tags.innerHTML = "";
    (panelState.tags || []).forEach((tag, index) => {
      const chip = document.createElement("span");
      chip.className = "i2p-panel__tag";
      chip.textContent = tag;
      chip.style.setProperty("--tag-delay", `${index * 0.045}s`);
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
        if (panelState.selectedLocale === entry.id) return;
        panelState.selectedLocale = entry.id;
        crossfadeRenderPanelBody();
      });
      refs.localeGroup.appendChild(button);
    });

    refs.actions.innerHTML = "";
    if (panelState.platformUrl) {
      const openButton = document.createElement("button");
      openButton.type = "button";
      openButton.className = "i2p-panel__action i2p-panel__action--secondary";
      openButton.textContent = getUiString("openPlatformButton");
      openButton.addEventListener("click", async () => {
        const promptText = currentText || panelState.platformPrompt || panelState.prompt || "";
        const platformUrl = buildPlatformLaunchUrl(
          promptText,
          panelState.shouldAutofillPlatform
        );
        if (!platformUrl) {
          refs.status.textContent = getUiString("unknownError");
          return;
        }
        await tryCopyToClipboard(promptText);
        const response = await sendRuntimeMessage({
          type: "openPlatform",
          url: platformUrl,
          prompt: promptText,
          shouldAutofill: panelState.shouldAutofillPlatform === true
        });
        if (response?.success) {
          refs.status.textContent = getUiString("platformOpened");
        } else {
          refs.status.textContent = response?.error || getUiString("unknownError");
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

  function crossfadeRenderPanelBody() {
    const refs = ensurePanel();

    // Cancel any pending crossfade to prevent stacking
    if (crossfadeTimerId) {
      clearTimeout(crossfadeTimerId);
      crossfadeTimerId = 0;
    }

    // Fade out body & tags
    refs.body.classList.remove("is-entering");
    refs.body.classList.add("is-switching");
    refs.tags.classList.remove("is-entering");
    refs.tags.classList.add("is-switching");

    crossfadeTimerId = setTimeout(() => {
      crossfadeTimerId = 0;
      // Disable the keyframe animation so it doesn't conflict with crossfade transition
      refs.body.style.animation = "none";
      renderPanelBody();
      // Fade in via transition classes
      refs.body.classList.remove("is-switching");
      refs.body.classList.add("is-entering");
      refs.tags.classList.remove("is-switching");
      refs.tags.classList.add("is-entering");
    }, 160);
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
    // Try to parse the original prompt as JSON (new comprehensive format)
    let parsedJson = null;
    try {
      const raw = state.prompt || "";
      // Try to extract JSON from the prompt (may have markdown fences)
      let jsonStr = raw;
      const fenced = raw.match(/```(?:json)?\s*([\s\S]*?)```/i);
      if (fenced?.[1]) {
        jsonStr = fenced[1].trim();
      } else {
        const objectMatch = raw.match(/\{[\s\S]*\}/);
        if (objectMatch?.[0]) {
          jsonStr = objectMatch[0];
        }
      }
      parsedJson = JSON.parse(jsonStr);
    } catch (e) {
      // Not JSON, fall back to legacy format
    }

    if (parsedJson && typeof parsedJson === "object" && parsedJson.meta) {
      // New comprehensive JSON format — merge enrichment translations if available
      if (state.translations) {
        if (!parsedJson.prompt_text) {
          parsedJson.prompt_text = {};
        }
        // Use enrichment translations as override if prompt_text is missing or sparse
        if (state.translations.zh && (!parsedJson.prompt_text.zh || parsedJson.prompt_text.zh === "unknown")) {
          parsedJson.prompt_text.zh = state.translations.zh;
        }
        if (state.translations.en && (!parsedJson.prompt_text.en || parsedJson.prompt_text.en === "unknown")) {
          parsedJson.prompt_text.en = state.translations.en;
        }
      }
      if (state.tags && Array.isArray(state.tags) && state.tags.length > 0) {
        parsedJson.tags = state.tags;
      }
      return JSON.stringify(parsedJson, null, 2);
    }

    // Legacy fallback: plain text prompt
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
    panelGeneration++;
    const anchor = panelState?.anchor || getFallbackAnchor();
    applyPanelTheme();
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

    // Animated show
    refs.backdrop.hidden = false;
    refs.root.hidden = false;
    refs.root.classList.remove("is-hiding");
    refs.backdrop.classList.remove("is-hiding");
    requestAnimationFrame(() => {
      refs.backdrop.classList.add("is-visible");
      refs.root.classList.add("is-visible");
    });

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

    const gen = ++panelGeneration;

    // Animated hide
    panelRefs.root.classList.remove("is-visible");
    panelRefs.root.classList.add("is-hiding");
    panelRefs.backdrop.classList.remove("is-visible");
    panelRefs.backdrop.classList.add("is-hiding");

    const onEnd = (event) => {
      // Ignore bubbled transitionend from children
      if (event && event.target !== panelRefs.root) return;
      // Bail if a new show was triggered after this hide
      if (panelGeneration !== gen) return;

      panelRefs.root.removeEventListener("transitionend", onEnd);
      panelRefs.root.hidden = true;
      panelRefs.backdrop.hidden = true;
      panelRefs.root.classList.remove("is-hiding");
      panelRefs.backdrop.classList.remove("is-hiding");
    };
    panelRefs.root.addEventListener("transitionend", onEnd);

    // Fallback in case transitionend doesn't fire
    setTimeout(() => {
      if (panelGeneration !== gen) return;
      if (panelRefs && !panelRefs.root.hidden) {
        onEnd(null);
      }
    }, 350);

    unbindPanelDismissHandlers();
  }

  function isPanelVisible() {
    return (
      panelRefs?.root &&
      !panelRefs.root.hidden &&
      panelRefs.root.classList.contains("is-visible") &&
      !panelRefs.root.classList.contains("is-hiding")
    );
  }

  function queuePanelPosition(anchor) {
    requestAnimationFrame(() => {
      if (!isPanelVisible()) {
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
    if (event.button !== 0 || !isPanelVisible()) {
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
    if (!isPanelVisible()) {
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
    if (isEventInsideSidePanel(event.target)) {
      return;
    }
    hidePanel();
  }

  function handleDocumentKeydown(event) {
    if (event.key === "Escape" && !document.querySelector(`.${CUSTOM_DIALOG_BACKDROP_CLASS}`)) {
      if (isSidePanelOpen()) {
        closeSidePanels();
      }
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
    if (translations.zh) {
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

  async function handlePlatformAutofillPrompt(message) {
    const prompt = typeof message?.prompt === "string" ? message.prompt.trim() : "";
    if (!prompt) {
      return false;
    }
    return tryAutofillPromptIntoPage(prompt);
  }

  function promptForCustomInstruction() {
    return new Promise((resolve) => {
      const existing = document.querySelector(`.${CUSTOM_DIALOG_BACKDROP_CLASS}`);
      if (existing) {
        existing.remove();
      }

      const backdrop = document.createElement("div");
      backdrop.className = CUSTOM_DIALOG_BACKDROP_CLASS;
      if (config.theme === "light") {
        backdrop.classList.add("i2p-theme-light");
      }

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
    // Check if the node itself is inside an <img> ancestor (unlikely but safe)
    const fromClosest = node?.closest?.("img");
    if (fromClosest) {
      return fromClosest;
    }
    // Try to find an <img> inside a parent container
    // (handles Pinterest-style overlays where <a>/<div> sits on top of <img>)
    if (node instanceof Element) {
      const containerSelectors = "a, [data-test-id], [role='listitem'], [role='link']";
      const parent = node.closest(containerSelectors) || node.parentElement;
      if (parent) {
        const img = parent.querySelector("img");
        if (img) {
          return img;
        }
      }
    }
    return null;
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
      renderSidePanel();
    });
  }

  function getUiLanguage() {
    return config.language === "zh" ? "zh" : "en";
  }

  function getUiString(key) {
    const language = getUiLanguage();
    return UI_STRINGS[language]?.[key] ?? UI_STRINGS.en[key] ?? "";
  }

  function getPromptRichnessLabel(value) {
    const option = PROMPT_RICHNESS_OPTIONS.find((entry) => entry.id === value);
    if (!option) {
      return value;
    }
    return getUiLanguage() === "zh" ? option.labelZh : option.labelEn;
  }

  function setUiLanguage(nextLanguage) {
    const normalized = nextLanguage === "zh" ? "zh" : "en";
    config.language = normalized;
    renderSidePanel();
    if (isPanelVisible()) {
      renderPanelBody();
    }
    chrome.storage.sync.set({ language: normalized }, () => {
      if (chrome.runtime.lastError) {
        console.warn("[Image2Prompt] Unable to update UI language:", chrome.runtime.lastError);
      }
    });
  }

  function toggleTheme() {
    const nextTheme = config.theme === "light" ? "dark" : "light";
    config.theme = nextTheme;
    renderSidePanel();
    applyPanelTheme();
    chrome.storage.sync.set({ theme: nextTheme }, () => {
      if (chrome.runtime.lastError) {
        console.warn("[Image2Prompt] Unable to update theme:", chrome.runtime.lastError);
      }
    });
  }

  function buildUiLanguageToggle() {
    const group = document.createElement("div");
    group.className = "i2p-side-lang";

    const langButton = document.createElement("button");
    langButton.type = "button";
    langButton.className = "i2p-side-lang__button";
    langButton.dataset.i2pSideAction = "toggle-lang";
    langButton.textContent = getUiLanguage() === "zh" ? "中" : "EN";
    group.appendChild(langButton);

    const themeButton = document.createElement("button");
    themeButton.type = "button";
    themeButton.className = "i2p-side-lang__button";
    themeButton.dataset.i2pSideAction = "toggle-theme";
    themeButton.textContent = config.theme === "light" ? "\u2600" : "\u263E";
    group.appendChild(themeButton);

    return group;
  }

  function loadSideHistory() {
    return new Promise((resolve) => {
      chrome.storage.local.get({ [HISTORY_STORAGE_KEY]: [] }, (items) => {
        if (chrome.runtime.lastError) {
          console.warn("[Image2Prompt] Unable to load side history:", chrome.runtime.lastError);
          resolve();
          return;
        }
        const list = items?.[HISTORY_STORAGE_KEY];
        sidePanelState.historyEntries = Array.isArray(list)
          ? list.map(normalizeSideHistoryEntry).filter(Boolean)
          : [];
        syncHistoryLocaleState();
        resolve();
      });
    });
  }

  function loadSidePanelPreferences() {
    return new Promise((resolve) => {
      chrome.storage.local.get({ [SIDE_PANEL_POSITION_KEY]: null }, (items) => {
        if (chrome.runtime.lastError) {
          console.warn(
            "[Image2Prompt] Unable to load side panel position:",
            chrome.runtime.lastError
          );
          sidePanelState.handleTop = getDefaultSideHandleTop();
          resolve();
          return;
        }
        sidePanelState.handleTop = clampSideHandleTop(items?.[SIDE_PANEL_POSITION_KEY]);
        resolve();
      });
    });
  }

  function watchForHistoryChanges() {
    chrome.storage.onChanged.addListener((changes, areaName) => {
      if (areaName !== "local" || !(HISTORY_STORAGE_KEY in changes)) {
        return;
      }
      const updated = changes[HISTORY_STORAGE_KEY]?.newValue;
      sidePanelState.historyEntries = Array.isArray(updated)
        ? updated.map(normalizeSideHistoryEntry).filter(Boolean)
        : [];
      syncHistoryLocaleState();
      renderSidePanel();
    });
  }

  function syncHistoryLocaleState() {
    const nextLocales = {};
    sidePanelState.historyEntries.forEach((entry) => {
      const previous = sidePanelState.historyLocales?.[entry.id];
      nextLocales[entry.id] =
        previous && PANEL_LANGUAGES.some((lang) => lang.id === previous)
          ? previous
          : getDefaultPanelLocale(entry.translations);
    });
    sidePanelState.historyLocales = nextLocales;
  }

  function normalizeSideHistoryEntry(entry) {
    if (!entry) {
      return null;
    }

    const prompt = typeof entry.prompt === "string" ? entry.prompt.trim() : "";
    if (!prompt) {
      return null;
    }

    const id = entry.id || `hist-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const parsed = parseJsonObjectFromText(prompt);
    const promptText =
      parsed && typeof parsed.prompt_text === "object" ? parsed.prompt_text : null;
    const translations = {
      zh: typeof promptText?.zh === "string" ? promptText.zh.trim() : "",
      en: typeof promptText?.en === "string" ? promptText.en.trim() : ""
    };
    const tags = normalizePanelTags(parsed?.tags);
    const model = typeof entry.model === "string" ? entry.model.trim() : "";
    const platformName = typeof entry.platformName === "string" ? entry.platformName.trim() : "";
    const platformUrl = typeof entry.platformUrl === "string" ? entry.platformUrl.trim() : "";

    return {
      id,
      prompt,
      translations,
      tags,
      model,
      provider: typeof entry.provider === "string" ? entry.provider.trim() : "",
      providerId: typeof entry.providerId === "string" ? entry.providerId.trim() : "",
      platformName: platformName || platformUrl,
      platformId: typeof entry.platformId === "string" ? entry.platformId.trim() : "",
      platformUrl,
      imageDataUrl: typeof entry.imageDataUrl === "string" ? entry.imageDataUrl : "",
      imageAlt: typeof entry.imageAlt === "string" ? entry.imageAlt : "",
      createdAt: Number(entry.createdAt) || Date.now(),
      customInstruction:
        typeof entry.customInstruction === "string" ? entry.customInstruction.trim() : ""
    };
  }

  function getRecentSideHistoryEntries(limit = SIDE_HISTORY_LIMIT) {
    return [...sidePanelState.historyEntries]
      .sort((a, b) => (Number(b.createdAt) || 0) - (Number(a.createdAt) || 0))
      .slice(0, limit);
  }

  function formatSideHistoryTimestamp(timestamp) {
    const date = timestamp ? new Date(Number(timestamp)) : new Date();
    try {
      return new Intl.DateTimeFormat(getUiLanguage() === "zh" ? "zh-CN" : "en-US", {
        month: "short",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit"
      }).format(date);
    } catch (error) {
      return date.toLocaleString();
    }
  }

  function getDefaultSideHandleTop() {
    return Math.round(window.innerHeight * 0.32);
  }

  function clampSideHandleTop(value) {
    const minTop = 104;
    const maxTop = Math.max(minTop, window.innerHeight - 120);
    const numeric = Number(value);
    const fallback = getDefaultSideHandleTop();
    const safeValue = Number.isFinite(numeric) ? Math.round(numeric) : fallback;
    return Math.min(Math.max(minTop, safeValue), maxTop);
  }

  function getSideHandleTop() {
    return clampSideHandleTop(sidePanelState.handleTop);
  }

  function persistSideHandleTop(nextTop) {
    const safeTop = clampSideHandleTop(nextTop);
    sidePanelState.handleTop = safeTop;
    chrome.storage.local.set({ [SIDE_PANEL_POSITION_KEY]: safeTop }, () => {
      if (chrome.runtime.lastError) {
        console.warn(
          "[Image2Prompt] Unable to persist side panel position:",
          chrome.runtime.lastError
        );
      }
    });
  }

  function clampSideCardTop(top, height) {
    const margin = 18;
    const safeHeight = Math.max(80, Number(height) || 0);
    return Math.min(
      Math.max(margin, Math.round(top)),
      Math.max(margin, window.innerHeight - safeHeight - margin)
    );
  }

  function applySidePanelLayout() {
    const refs = ensureSidePanel();
    const handleTop = getSideHandleTop();
    refs.handle.style.top = `${handleTop}px`;

    const quickHeight = refs.quick.hidden ? 150 : refs.quick.offsetHeight || 150;
    const historyHeight = refs.history.hidden
      ? Math.min(window.innerHeight - 36, 640)
      : refs.history.offsetHeight || Math.min(window.innerHeight - 36, 640);

    refs.quick.style.top = `${clampSideCardTop(handleTop + 34, quickHeight)}px`;
    refs.history.style.top = `${clampSideCardTop(handleTop - 56, historyHeight)}px`;
  }

  function scheduleSidePanelLayout() {
    applySidePanelLayout();
    window.requestAnimationFrame(() => {
      if (!sidePanelRefs?.handle?.isConnected) {
        return;
      }
      applySidePanelLayout();
    });
  }

  function toggleSideQuickPanel() {
    if (sidePanelState.quickOpen || sidePanelState.historyOpen) {
      closeSidePanels();
      return;
    }
    sidePanelState.quickOpen = true;
    sidePanelState.historyOpen = false;
    renderSidePanel();
  }

  let sideHandleWasDragged = false;

  function isPointerInsideElement(event, element) {
    if (!element || !element.isConnected) {
      return false;
    }
    const rect = element.getBoundingClientRect();
    return (
      event.clientX >= rect.left &&
      event.clientX <= rect.right &&
      event.clientY >= rect.top &&
      event.clientY <= rect.bottom
    );
  }

  function handleDocumentPointerDownForSide(event) {
    if (event.button !== 0 || !sidePanelRefs?.handle) {
      return;
    }

    // Check handle hit
    if (isPointerInsideElement(event, sidePanelRefs.handle)) {
      event.stopPropagation();
      sideHandleWasDragged = false;
      sideHandleDragState = {
        startY: event.clientY,
        startX: event.clientX,
        startTop: getSideHandleTop(),
        moved: false
      };
      document.addEventListener("mousemove", handleSideHandleMouseMove, true);
      document.addEventListener("mouseup", handleSideHandleMouseUp, true);
      return;
    }

    // Check if inside quick/history panels
    if (
      isPointerInsideElement(event, sidePanelRefs.quick) ||
      isPointerInsideElement(event, sidePanelRefs.history)
    ) {
      return;
    }

    // Click outside everything → close panels
    if (isSidePanelOpen()) {
      closeSidePanels();
    }
  }

  function handleDocumentClickForSide(event) {
    if (event.button !== 0 || !sidePanelRefs?.handle) {
      return;
    }

    // Check handle hit
    if (isPointerInsideElement(event, sidePanelRefs.handle)) {
      event.stopPropagation();
      event.preventDefault();
      if (sideHandleWasDragged) {
        sideHandleWasDragged = false;
        return;
      }
      toggleSideQuickPanel();
      return;
    }

    // Check if inside quick/history panels → delegate to panel interaction
    const quickVisible = sidePanelState.quickOpen && sidePanelRefs.quick;
    const historyVisible = sidePanelState.historyOpen && sidePanelRefs.history;

    if (quickVisible && isPointerInsideElement(event, sidePanelRefs.quick)) {
      handleSidePanelInteraction(event);
      return;
    }
    if (historyVisible && isPointerInsideElement(event, sidePanelRefs.history)) {
      handleSidePanelInteraction(event);
      return;
    }
  }

  function handleSideHandleMouseMove(event) {
    if (!sideHandleDragState) {
      return;
    }
    const deltaY = event.clientY - sideHandleDragState.startY;
    const deltaX = event.clientX - sideHandleDragState.startX;
    if (Math.abs(deltaY) > 4 || Math.abs(deltaX) > 4) {
      sideHandleDragState.moved = true;
      sideHandleWasDragged = true;
    }
    if (sideHandleDragState.moved) {
      sidePanelState.handleTop = clampSideHandleTop(sideHandleDragState.startTop + deltaY);
      applySidePanelLayout();
    }
  }

  function clearSideHandleDragState() {
    sideHandleDragState = null;
    document.removeEventListener("mousemove", handleSideHandleMouseMove, true);
    document.removeEventListener("mouseup", handleSideHandleMouseUp, true);
  }

  function handleSideHandleMouseUp() {
    if (!sideHandleDragState) {
      return;
    }
    if (sideHandleDragState.moved) {
      persistSideHandleTop(getSideHandleTop());
      scheduleSidePanelLayout();
    }
    clearSideHandleDragState();
  }

  function getSideHistoryEntryById(entryId) {
    return sidePanelState.historyEntries.find((entry) => entry.id === entryId) || null;
  }

  async function handleSidePanelInteraction(event) {
    if ("button" in event && event.button !== 0) {
      return;
    }

    // Find the actual target inside our panel using coordinates,
    // because event.target may be an overlapping page element
    const panelEl = sidePanelState.quickOpen
      ? sidePanelRefs?.quick
      : sidePanelState.historyOpen
        ? sidePanelRefs?.history
        : null;
    if (!panelEl) {
      return;
    }

    let target = null;
    const elementsAtPoint = document.elementsFromPoint(event.clientX, event.clientY);
    for (const el of elementsAtPoint) {
      if (panelEl.contains(el)) {
        target = el;
        break;
      }
    }
    if (!target) {
      return;
    }

    const richnessButton = target.closest("[data-i2p-side-richness]");
    if (richnessButton instanceof HTMLElement) {
      event.preventDefault();
      event.stopPropagation();
      const nextRichness = richnessButton.dataset.i2pSideRichness;
      if (!nextRichness || config.promptRichness === nextRichness) {
        return;
      }
      config.promptRichness = nextRichness;
      renderSidePanel();
      chrome.storage.sync.set({ promptRichness: nextRichness }, () => {
        if (chrome.runtime.lastError) {
          console.warn("[Image2Prompt] Unable to update prompt richness:", chrome.runtime.lastError);
        }
      });
      return;
    }

    const sideActionButton = target.closest("[data-i2p-side-action]");
    if (sideActionButton instanceof HTMLElement) {
      event.preventDefault();
      event.stopPropagation();
      const action = sideActionButton.dataset.i2pSideAction;
      if (action === "view-history") {
        sidePanelState.quickOpen = false;
        sidePanelState.historyOpen = true;
        renderSidePanel();
      } else if (action === "back-history") {
        sidePanelState.quickOpen = true;
        sidePanelState.historyOpen = false;
        renderSidePanel();
      } else if (action === "toggle-lang") {
        const nextLang = getUiLanguage() === "zh" ? "en" : "zh";
        setUiLanguage(nextLang);
      } else if (action === "toggle-theme") {
        toggleTheme();
      }
      return;
    }

    const historyLocaleButton = target.closest("[data-i2p-history-locale]");
    if (historyLocaleButton instanceof HTMLElement) {
      event.preventDefault();
      event.stopPropagation();
      const entryId = historyLocaleButton.dataset.i2pEntryId;
      const locale = historyLocaleButton.dataset.i2pHistoryLocale;
      if (!entryId || !locale) {
        return;
      }
      sidePanelState.historyLocales[entryId] = locale;
      renderSideHistoryPanel();
      return;
    }

    const historyActionButton = target.closest("[data-i2p-history-action]");
    if (historyActionButton instanceof HTMLElement) {
      event.preventDefault();
      event.stopPropagation();
      const entryId = historyActionButton.dataset.i2pEntryId;
      const action = historyActionButton.dataset.i2pHistoryAction;
      if (!entryId || !action) {
        return;
      }
      const entry = getSideHistoryEntryById(entryId);
      if (!entry) {
        return;
      }
      const actionLocale = getHistoryEntryLocale(entry);
      if (action === "copy") {
        try {
          await copyToClipboard(getHistoryEntryDisplayText(entry, actionLocale));
        } catch (error) {
          console.warn("[Image2Prompt] Unable to copy history entry:", error);
        }
        return;
      }
      if (action === "open") {
        const promptText = getHistoryEntryDisplayText(entry, actionLocale);
        const shouldAutofill = shouldAutofillForPlatform(entry.platformId, entry.platformUrl);
        const launchUrl = buildPlatformLaunchUrlFromTemplate(
          entry.platformUrl || config.platformUrl,
          promptText,
          shouldAutofill
        );
        if (!launchUrl) {
          return;
        }
        await tryCopyToClipboard(promptText);
        await sendRuntimeMessage({
          type: "openPlatform",
          url: launchUrl,
          prompt: promptText,
          shouldAutofill
        });
        return;
      }
      if (action === "delete") {
        deleteHistoryEntry(entry.id);
      }
    }
  }

  function ensureSidePanel() {
    if (sidePanelRefs?.handle?.isConnected) {
      return sidePanelRefs;
    }

    console.log("[Image2Prompt] ensureSidePanel: creating, using document-level capture handlers");

    const root = document.createElement("div");
    root.className = "i2p-side-root";

    const handle = document.createElement("button");
    handle.type = "button";
    handle.className = "i2p-side-handle";
    handle.setAttribute("aria-label", "Toggle image2prompt quick panel");
    handle.innerHTML = '<span class="i2p-side-handle__chevron">‹</span>';
    handle.draggable = false;
    handle.addEventListener("dragstart", (event) => {
      event.preventDefault();
    });

    const quick = document.createElement("section");
    quick.className = "i2p-side-card i2p-side-card--quick";
    quick.hidden = true;

    const history = document.createElement("section");
    history.className = "i2p-side-card i2p-side-card--history";
    history.hidden = true;

    const parent = document.body || document.documentElement;
    parent.append(handle, quick, history);

    // Register all side panel events at document level (capture phase)
    // to bypass any page elements covering our UI
    document.addEventListener("mousedown", handleDocumentPointerDownForSide, true);
    document.addEventListener("click", handleDocumentClickForSide, true);

    sidePanelRefs = { root, handle, quick, history };
    return sidePanelRefs;
  }

  function renderSidePanel() {
    const refs = ensureSidePanel();
    const isOpening = sidePanelState.quickOpen || sidePanelState.historyOpen;
    refs.handle.classList.toggle("is-open", isOpening);

    const isLight = config.theme === "light";
    refs.handle.classList.toggle("i2p-theme-light", isLight);
    refs.quick.classList.toggle("i2p-theme-light", isLight);
    refs.history.classList.toggle("i2p-theme-light", isLight);

    if (sidePanelState.quickOpen) {
      refs.quick.hidden = false;
      refs.history.hidden = true;
      refs.history.classList.remove("is-visible");
      requestAnimationFrame(() => {
        refs.quick.classList.add("is-visible");
      });
    } else if (sidePanelState.historyOpen) {
      refs.history.hidden = false;
      refs.quick.hidden = true;
      refs.quick.classList.remove("is-visible");
      requestAnimationFrame(() => {
        refs.history.classList.add("is-visible");
      });
    } else {
      refs.quick.classList.remove("is-visible");
      refs.history.classList.remove("is-visible");
      refs.quick.hidden = true;
      refs.history.hidden = true;
    }

    renderSideQuickPanel();
    renderSideHistoryPanel();
    scheduleSidePanelLayout();
  }

  function renderSideQuickPanel() {
    const refs = ensureSidePanel();
    refs.quick.innerHTML = "";

    const top = document.createElement("div");
    top.className = "i2p-side-quick__top";

    const label = document.createElement("div");
    label.className = "i2p-side-quick__label";
    label.textContent = getUiString("sideRichnessLabel");

    const langToggle = buildUiLanguageToggle();
    top.append(label, langToggle);

    const section = document.createElement("section");
    section.className = "i2p-side-section";

    const richnessGrid = document.createElement("div");
    richnessGrid.className = "i2p-side-richness";
    PROMPT_RICHNESS_OPTIONS.forEach((entry) => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "i2p-side-richness__button";
      button.dataset.i2pSideRichness = entry.id;
      button.textContent = getPromptRichnessLabel(entry.id);
      if (config.promptRichness === entry.id) {
        button.classList.add("is-active");
      }
      richnessGrid.appendChild(button);
    });

    section.appendChild(richnessGrid);

    const historyButton = document.createElement("button");
    historyButton.type = "button";
    historyButton.className = "i2p-side-primary";
    historyButton.dataset.i2pSideAction = "view-history";
    historyButton.textContent = getUiString("sideViewHistoryButton");

    refs.quick.append(top, section, historyButton);
  }

  function renderSideHistoryPanel() {
    const refs = ensureSidePanel();
    const entries = getRecentSideHistoryEntries();
    const prevList = refs.history.querySelector(".i2p-side-history__list");
    const savedScrollTop = prevList ? prevList.scrollTop : 0;
    refs.history.innerHTML = "";

    const header = document.createElement("div");
    header.className = "i2p-side-history__header";

    const backButton = document.createElement("button");
    backButton.type = "button";
    backButton.className = "i2p-side-history__back";
    backButton.dataset.i2pSideAction = "back-history";
    backButton.textContent = "‹";
    backButton.setAttribute("aria-label", getUiString("sideHistoryBack"));

    const titleGroup = document.createElement("div");
    titleGroup.className = "i2p-side-history__title-group";

    const title = document.createElement("h4");
    title.className = "i2p-side-card__title";
    title.textContent = getUiString("sideHistoryTitle");

    const subtitle = document.createElement("p");
    subtitle.className = "i2p-side-card__subtitle";
    subtitle.textContent = getUiString("sideHistorySubtitle");

    const controls = document.createElement("div");
    controls.className = "i2p-side-history__controls";
    controls.appendChild(buildUiLanguageToggle());

    titleGroup.append(title, subtitle);
    header.append(backButton, titleGroup, controls);
    refs.history.appendChild(header);

    if (!entries.length) {
      const empty = document.createElement("div");
      empty.className = "i2p-side-empty";
      const emptyTitle = document.createElement("div");
      emptyTitle.className = "i2p-side-empty__title";
      emptyTitle.textContent = getUiString("sideHistoryEmptyTitle");
      const emptyDesc = document.createElement("div");
      emptyDesc.className = "i2p-side-empty__description";
      emptyDesc.textContent = getUiString("sideHistoryEmptyDescription");
      empty.append(emptyTitle, emptyDesc);
      refs.history.appendChild(empty);
      return;
    }

    const list = document.createElement("div");
    list.className = "i2p-side-history__list";
    entries.forEach((entry) => {
      list.appendChild(buildHistoryEntryCard(entry));
    });
    refs.history.appendChild(list);
    list.scrollTop = savedScrollTop;
  }

  function buildHistoryEntryCard(entry) {
    const card = document.createElement("article");
    card.className = "i2p-history-card";
    card.dataset.entryId = entry.id;

    const top = document.createElement("div");
    top.className = "i2p-history-card__top";

    const preview = document.createElement("div");
    preview.className = "i2p-history-card__preview";
    if (entry.imageDataUrl) {
      const img = document.createElement("img");
      img.src = entry.imageDataUrl;
      img.alt = entry.imageAlt || getUiString("sideHistoryTitle");
      img.loading = "lazy";
      img.decoding = "async";
      preview.appendChild(img);
    } else {
      const placeholder = document.createElement("div");
      placeholder.className = "i2p-history-card__placeholder";
      placeholder.textContent = "IMG";
      preview.appendChild(placeholder);
    }

    const meta = document.createElement("div");
    meta.className = "i2p-history-card__meta";

    const metaTop = document.createElement("div");
    metaTop.className = "i2p-history-card__meta-top";

    const time = document.createElement("div");
    time.className = "i2p-history-card__time";
    time.textContent = `${getUiString("sideHistoryGenerated")} · ${formatSideHistoryTimestamp(entry.createdAt)}`;

    const badges = document.createElement("div");
    badges.className = "i2p-history-card__badges";
    if (entry.model) {
      const modelBadge = document.createElement("span");
      modelBadge.className = "i2p-history-card__badge";
      modelBadge.textContent = `${getUiString("sideHistoryModel")} · ${entry.model}`;
      badges.appendChild(modelBadge);
    }
    if (entry.platformName) {
      const platformBadge = document.createElement("span");
      platformBadge.className = "i2p-history-card__badge";
      platformBadge.textContent = `${getUiString("sideHistoryPlatform")} · ${entry.platformName}`;
      badges.appendChild(platformBadge);
    }

    metaTop.append(time, badges);

    if (entry.customInstruction) {
      const custom = document.createElement("div");
      custom.className = "i2p-history-card__custom";
      custom.textContent = entry.customInstruction;
      meta.append(metaTop, custom);
    } else {
      meta.appendChild(metaTop);
    }

    top.append(preview, meta);

    const toolbar = document.createElement("div");
    toolbar.className = "i2p-history-card__toolbar";

    const locales = document.createElement("div");
    locales.className = "i2p-history-card__locales";
    const currentLocale = getHistoryEntryLocale(entry);
    PANEL_LANGUAGES.forEach((lang) => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "i2p-history-card__locale";
      button.dataset.i2pEntryId = entry.id;
      button.dataset.i2pHistoryLocale = lang.id;
      if (lang.compact) {
        button.classList.add("i2p-history-card__locale--compact");
      }
      if (lang.id === currentLocale) {
        button.classList.add("is-active");
      }
      button.textContent = lang.label;
      locales.appendChild(button);
    });

    const actions = document.createElement("div");
    actions.className = "i2p-history-card__actions";
    const actionLocale = getHistoryEntryLocale(entry);

    const copyButton = document.createElement("button");
    copyButton.type = "button";
    copyButton.className = "i2p-history-card__action";
    copyButton.dataset.i2pEntryId = entry.id;
    copyButton.dataset.i2pHistoryAction = "copy";
    copyButton.textContent = getUiString("copyButton");

    const openButton = document.createElement("button");
    openButton.type = "button";
    openButton.className = "i2p-history-card__action i2p-history-card__action--secondary";
    openButton.dataset.i2pEntryId = entry.id;
    openButton.dataset.i2pHistoryAction = "open";
    openButton.textContent = getUiString("sideHistoryOpen");

    const deleteButton = document.createElement("button");
    deleteButton.type = "button";
    deleteButton.className = "i2p-history-card__action i2p-history-card__action--ghost";
    deleteButton.dataset.i2pEntryId = entry.id;
    deleteButton.dataset.i2pHistoryAction = "delete";
    deleteButton.textContent = getUiString("sideHistoryDelete");

    actions.append(copyButton, openButton, deleteButton);
    toolbar.append(locales, actions);

    const content = document.createElement("pre");
    content.className = "i2p-history-card__content";
    if (currentLocale === "json") {
      content.classList.add("is-json");
    }
    content.textContent = getHistoryEntryDisplayText(entry, currentLocale);

    card.append(top, toolbar, content);
    return card;
  }

  function getHistoryEntryLocale(entry) {
    return sidePanelState.historyLocales[entry.id] || getDefaultPanelLocale(entry.translations);
  }

  function getHistoryEntryDisplayText(entry, locale) {
    if (locale === "json") {
      return buildStructuredPromptText({
        prompt: entry.prompt,
        translations: entry.translations,
        tags: entry.tags
      });
    }
    if (locale === "zh") {
      return entry.translations.zh || entry.translations.en || entry.prompt;
    }
    return entry.translations.en || entry.translations.zh || entry.prompt;
  }

  function deleteHistoryEntry(entryId) {
    const next = sidePanelState.historyEntries.filter((entry) => entry.id !== entryId);
    sidePanelState.historyEntries = next;
    delete sidePanelState.historyLocales[entryId];
    chrome.storage.local.set({ [HISTORY_STORAGE_KEY]: next }, () => {
      if (chrome.runtime.lastError) {
        console.warn("[Image2Prompt] Unable to delete history entry:", chrome.runtime.lastError);
      }
      renderSidePanel();
    });
  }

  function closeSidePanels() {
    if (!sidePanelState.quickOpen && !sidePanelState.historyOpen) {
      return;
    }
    sidePanelState.quickOpen = false;
    sidePanelState.historyOpen = false;
    renderSidePanel();
  }

  function isSidePanelOpen() {
    return sidePanelState.quickOpen || sidePanelState.historyOpen;
  }

  function isEventInsideSidePanel(target) {
    if (!(target instanceof Node) || !sidePanelRefs) {
      return false;
    }
    return [sidePanelRefs.handle, sidePanelRefs.quick, sidePanelRefs.history].some(
      (node) => node?.contains?.(target)
    );
  }

  function buildPlatformUrl(prompt) {
    return buildPlatformUrlFromTemplate(config.platformUrl || DEFAULT_CONFIG.platformUrl, prompt);
  }

  function buildPlatformLaunchUrl(prompt, shouldAutofill = false) {
    return buildPlatformLaunchUrlFromTemplate(
      config.platformUrl || DEFAULT_CONFIG.platformUrl,
      prompt,
      shouldAutofill
    );
  }

  function buildPlatformUrlFromTemplate(template, prompt) {
    const safeTemplate = typeof template === "string" ? template.trim() : "";
    if (!safeTemplate) {
      return "";
    }
    const encodedPrompt = encodeURIComponent(prompt);
    if (safeTemplate.includes("{{prompt}}")) {
      return safeTemplate.replace(/{{prompt}}/g, encodedPrompt);
    }
    const separator = safeTemplate.includes("?") ? "&" : "?";
    return `${safeTemplate}${separator}prompt=${encodedPrompt}`;
  }

  function buildPlatformLaunchUrlFromTemplate(template, prompt, shouldAutofill = false) {
    const safeTemplate = typeof template === "string" ? template.trim() : "";
    if (!safeTemplate) {
      return "";
    }
    if (shouldAutofill && !safeTemplate.includes("{{prompt}}")) {
      return safeTemplate;
    }
    return buildPlatformUrlFromTemplate(safeTemplate, prompt);
  }

  function shouldAutofillForPlatform(platformId, template) {
    return typeof platformId === "string" && platformId.startsWith("custom-");
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

  async function tryAutofillPromptIntoPage(prompt) {
    const deadline = Date.now() + 12000;
    while (Date.now() < deadline) {
      const target = findAutofillTarget();
      if (target && writePromptToEditable(target, prompt)) {
        return true;
      }
      await wait(400);
    }
    return false;
  }

  function findAutofillTarget() {
    const activeTarget = normalizeAutofillTarget(document.activeElement);
    if (activeTarget && isUsableAutofillTarget(activeTarget)) {
      return activeTarget;
    }

    const selector = [
      "textarea",
      "input:not([type])",
      "input[type='text']",
      "input[type='search']",
      "input[type='url']",
      "input[type='email']",
      "[contenteditable='true']",
      "[role='textbox']"
    ].join(",");

    const candidates = Array.from(document.querySelectorAll(selector))
      .map((element) => normalizeAutofillTarget(element))
      .filter((element) => element && isUsableAutofillTarget(element))
      .sort((left, right) => scoreAutofillTarget(right) - scoreAutofillTarget(left));

    return candidates[0] || null;
  }

  function normalizeAutofillTarget(element) {
    if (!(element instanceof Element)) {
      return null;
    }
    if (
      element instanceof HTMLTextAreaElement ||
      element instanceof HTMLInputElement ||
      element instanceof HTMLElement
    ) {
      return element;
    }
    return null;
  }

  function isUsableAutofillTarget(element) {
    if (!(element instanceof HTMLElement)) {
      return false;
    }
    if (element.matches("[disabled], [readonly], [aria-disabled='true']")) {
      return false;
    }
    if (
      element instanceof HTMLInputElement &&
      !["", "text", "search", "url", "email"].includes((element.type || "").toLowerCase())
    ) {
      return false;
    }
    if (
      !(element instanceof HTMLTextAreaElement) &&
      !(element instanceof HTMLInputElement) &&
      !element.isContentEditable &&
      element.getAttribute("role") !== "textbox"
    ) {
      return false;
    }
    const rect = element.getBoundingClientRect();
    if (rect.width < 120 || rect.height < 24) {
      return false;
    }
    const style = window.getComputedStyle(element);
    if (style.display === "none" || style.visibility === "hidden") {
      return false;
    }
    return true;
  }

  function scoreAutofillTarget(element) {
    if (!(element instanceof HTMLElement)) {
      return 0;
    }
    const rect = element.getBoundingClientRect();
    const descriptor = [
      element.getAttribute("placeholder"),
      element.getAttribute("aria-label"),
      element.getAttribute("name"),
      element.getAttribute("data-testid")
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();

    let score = Math.min((rect.width * rect.height) / 4000, 40);
    if (element instanceof HTMLTextAreaElement) {
      score += 40;
    } else if (element.isContentEditable || element.getAttribute("role") === "textbox") {
      score += 30;
    } else {
      score += 15;
    }
    if (/(prompt|message|chat|ask|describe|输入|消息|提示词)/i.test(descriptor)) {
      score += 35;
    }
    return score;
  }

  function writePromptToEditable(element, prompt) {
    if (!(element instanceof HTMLElement)) {
      return false;
    }
    element.focus({ preventScroll: true });

    if (element instanceof HTMLTextAreaElement || element instanceof HTMLInputElement) {
      const prototype =
        element instanceof HTMLTextAreaElement
          ? HTMLTextAreaElement.prototype
          : HTMLInputElement.prototype;
      const setter = Object.getOwnPropertyDescriptor(prototype, "value")?.set;
      if (setter) {
        setter.call(element, prompt);
      } else {
        element.value = prompt;
      }
      dispatchEditableEvents(element, prompt);
      return true;
    }

    const selection = window.getSelection();
    if (selection) {
      const range = document.createRange();
      range.selectNodeContents(element);
      range.collapse(false);
      selection.removeAllRanges();
      selection.addRange(range);
    }

    let inserted = false;
    try {
      inserted = document.execCommand("selectAll", false) &&
        document.execCommand("insertText", false, prompt);
    } catch (error) {
      inserted = false;
    }
    if (!inserted) {
      element.textContent = prompt;
    }
    dispatchEditableEvents(element, prompt);
    return true;
  }

  function dispatchEditableEvents(element, prompt) {
    try {
      element.dispatchEvent(
        new InputEvent("input", {
          bubbles: true,
          data: prompt,
          inputType: "insertText"
        })
      );
    } catch (error) {
      element.dispatchEvent(new Event("input", { bubbles: true }));
    }
    element.dispatchEvent(new Event("change", { bubbles: true }));
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
