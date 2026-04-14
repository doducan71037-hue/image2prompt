const DEFAULT_PROVIDER_ID = "gemini";

const PROVIDER_DEFAULTS = {
  gemini: {
    name: "Gemini",
    model: "gemini-2.5-flash",
    baseUrl: ""
  },
  zhipu: {
    name: "Zhipu AI",
    model: "glm-4v-plus",
    baseUrl: ""
  },
  "custom-openai": {
    name: "Custom Relay API",
    model: "gpt-4.1-mini",
    baseUrl: ""
  }
};

const LEGACY_SIMPLE_PROMPT_INSTRUCTIONS = [
  "You are an assistant that writes high quality text-to-image prompts. Provide a single prompt that can recreate the given image faithfully.",
  "You are an assistant that writes high quality text-to-image prompts."
];

const PREVIOUS_VERBOSE_JSON_PROMPT_INSTRUCTION =
  "You are an expert visual analyst and text-to-image prompt engineer. Analyze the given image and produce a comprehensive JSON object that captures every visual detail needed to recreate this image faithfully with an AI image generator. Return ONLY a valid JSON object (no markdown fences, no commentary). The JSON must follow this schema:\n{\n  \"meta\": {\n    \"estimated_width\": <int>,\n    \"estimated_height\": <int>,\n    \"aspect_ratio\": \"<W:H>\",\n    \"orientation\": \"landscape|portrait|square\",\n    \"category\": \"portrait|landscape|product|animal|illustration|abstract|architecture|food|other\"\n  },\n  \"subject\": {\n    \"description\": \"<detailed main subject>\",\n    \"position\": \"<center|left|right|top|bottom|etc>\",\n    \"relative_size\": \"<percentage of frame>\",\n    \"details\": {}\n  },\n  \"secondary_subjects\": [ { \"description\": \"...\", \"position\": \"...\", \"relative_size\": \"...\" } ],\n  \"environment\": {\n    \"setting\": \"<indoor|outdoor|studio|abstract|etc>\",\n    \"background\": \"<detailed background description>\",\n    \"foreground\": \"<if any>\",\n    \"depth_of_field\": \"<shallow|medium|deep>\",\n    \"weather\": \"<if applicable>\",\n    \"time_of_day\": \"<if discernible>\"\n  },\n  \"composition\": {\n    \"framing\": \"<rule of thirds|centered|symmetrical|diagonal|etc>\",\n    \"camera_angle\": \"<eye level|low angle|high angle|bird's eye|worm's eye|Dutch angle|etc>\",\n    \"shot_type\": \"<close-up|medium|wide|extreme close-up|full body|etc>\",\n    \"perspective\": \"<frontal|3/4|profile|overhead|etc>\"\n  },\n  \"camera\": {\n    \"focal_length\": \"<estimated mm>\",\n    \"aperture\": \"<estimated f-stop>\",\n    \"lens_type\": \"<wide angle|standard|telephoto|macro|fisheye|tilt-shift|etc>\",\n    \"motion_blur\": false\n  },\n  \"lighting\": {\n    \"type\": \"<natural|studio|dramatic|ambient|rim|backlit|etc>\",\n    \"direction\": \"<front|side|back|top|bottom|etc>\",\n    \"intensity\": \"<soft|medium|hard>\",\n    \"color_temperature\": \"<warm|neutral|cool>\",\n    \"shadows\": \"<soft|harsh|minimal|none>\",\n    \"highlights\": \"<description if notable>\",\n    \"additional_lights\": []\n  },\n  \"color\": {\n    \"palette\": [ { \"name\": \"<descriptive name>\", \"hex\": \"#XXXXXX\", \"role\": \"<dominant|accent|background|etc>\" } ],\n    \"overall_tone\": \"<warm|cool|neutral|mixed>\",\n    \"saturation\": \"<vivid|muted|desaturated|pastel>\",\n    \"contrast\": \"<high|medium|low>\"\n  },\n  \"style\": {\n    \"art_style\": \"<photorealistic|digital art|oil painting|watercolor|3D render|anime|etc>\",\n    \"genre\": \"<if applicable>\",\n    \"influences\": \"<artist or movement references if apparent>\",\n    \"rendering_quality\": \"<8K|4K|high detail|etc>\"\n  },\n  \"texture_and_detail\": {\n    \"surface_textures\": [ \"<e.g., smooth skin, rough stone, glossy metal>\" ],\n    \"material_properties\": [ \"<e.g., translucent, reflective, matte>\" ],\n    \"fine_details\": \"<notable micro-details>\"\n  },\n  \"mood\": {\n    \"atmosphere\": \"<serene|dramatic|mysterious|joyful|melancholic|etc>\",\n    \"emotional_tone\": \"<description>\",\n    \"narrative\": \"<implied story or context if any>\"\n  },\n  \"text_in_image\": {\n    \"has_text\": false,\n    \"content\": [],\n    \"font_style\": \"\",\n    \"placement\": \"\"\n  },\n  \"post_processing\": {\n    \"filters\": [],\n    \"vignette\": false,\n    \"grain_noise\": false,\n    \"color_grading\": \"\",\n    \"effects\": []\n  },\n  \"negative_prompt\": \"<elements to explicitly AVOID to maintain fidelity>\",\n  \"tags\": [\"<exactly 8 tags, each exactly 4 Chinese characters>\"],\n  \"prompt_text\": {\n    \"en\": \"<a single flattened English natural-language prompt that combines all the above details into one paragraph, ready to paste into an image generator>\",\n    \"zh\": \"<同样内容的简体中文版本提示词，语言流畅自然，可直接用于AI图像生成>\"\n  }\n}\nFill every field based on what you observe. For fields that cannot be determined, use reasonable estimates or 'unknown'. Be precise with colors (always include hex codes). The prompt_text fields should be rich, detailed, and faithful to every visual element.";

const DEFAULT_JSON_PROMPT_INSTRUCTION = [
  "You are an expert visual analyst and text-to-image prompt engineer.",
  "Analyze the image and return ONLY valid JSON with no markdown fences or extra commentary.",
  "Use this exact structure:",
  "{",
  '  "meta":{"estimated_width":0,"estimated_height":0,"aspect_ratio":"","orientation":"","category":""},',
  '  "subject":{"description":"","position":"","relative_size":"","details":{}},',
  '  "secondary_subjects":[{"description":"","position":"","relative_size":""}],',
  '  "environment":{"setting":"","background":"","foreground":"","depth_of_field":"","weather":"","time_of_day":""},',
  '  "composition":{"framing":"","camera_angle":"","shot_type":"","perspective":""},',
  '  "camera":{"focal_length":"","aperture":"","lens_type":"","motion_blur":false},',
  '  "lighting":{"type":"","direction":"","intensity":"","color_temperature":"","shadows":"","highlights":"","additional_lights":[]},',
  '  "color":{"palette":[{"name":"","hex":"","role":""}],"overall_tone":"","saturation":"","contrast":""},',
  '  "style":{"art_style":"","genre":"","influences":"","rendering_quality":""},',
  '  "texture_and_detail":{"surface_textures":[],"material_properties":[],"fine_details":""},',
  '  "mood":{"atmosphere":"","emotional_tone":"","narrative":""},',
  '  "text_in_image":{"has_text":false,"content":[],"font_style":"","placement":""},',
  '  "post_processing":{"filters":[],"vignette":false,"grain_noise":false,"color_grading":"","effects":[]},',
  '  "negative_prompt":"",',
  '  "tags":["","","","","","","",""],',
  '  "prompt_text":{"en":"","zh":""}',
  "}",
  "Rules:",
  "- Keep the JSON valid and preserve every top-level section above.",
  '- Prefer direct observations. If a detail is uncertain, use a short estimate, "unknown", false, [], or {} as appropriate.',
  "- tags must contain exactly 8 Simplified Chinese tags, each exactly 4 Chinese characters.",
  "- prompt_text.en and prompt_text.zh must each be natural, paste-ready prompts for image generation.",
  "- Keep values factual and compact unless later instructions ask for more detail."
].join("\n");

const PROMPT_RICHNESS_OUTPUT_BUDGETS = {
  concise: 2560,
  standard: 3584,
  detailed: 5120,
  "very-detailed": 8192
};

const DEFAULT_CONFIG = {
  llmProvider: DEFAULT_PROVIDER_ID,
  providerSettings: createDefaultProviderSettings(),
  geminiApiKey: "",
  zhipuApiKey: "",
  model: PROVIDER_DEFAULTS.gemini.model,
  zhipuModel: PROVIDER_DEFAULTS.zhipu.model,
  promptInstruction: DEFAULT_JSON_PROMPT_INSTRUCTION,
  platformUrl: "https://chatgpt.com/?prompt={{prompt}}",
  minImageWidth: 256,
  minImageHeight: 256,
  promptLanguage: "en-US",
  removeWatermark: false,
  imageTextTranslationTarget: "",
  language: "en",
  autoOpenPlatform: true,
  selectedPlatformId: "openai",
  selectedPlatformLabel: "OpenAI",
  customPlatforms: [],
  enableCustomPromptInput: false,
  aspectRatio: "auto",
  customAspectRatio: "",
  promptRichness: "standard"
};

const HISTORY_STORAGE_KEY = "generationHistory";
const MAX_HISTORY_ENTRIES = 100;

const PROMPT_LANGUAGE_RULES = {
  "en-US": {
    name: "English (United States)",
    directive:
      "For the prompt_text.en field, write in natural English as used in the United States. The JSON structure itself should always use English keys."
  },
  "en-GB": {
    name: "English (United Kingdom)",
    directive:
      "For the prompt_text.en field, write in British English. The JSON structure itself should always use English keys."
  },
  "zh-CN": {
    name: "Simplified Chinese",
    directive:
      "请确保 prompt_text.zh 字段使用流畅自然的简体中文。JSON结构的键名始终使用英文。"
  },
  "ja-JP": {
    name: "Japanese",
    directive:
      "回答は日本語のみで書き、追加の説明や他言語での翻訳は含めないでください。"
  },
  "ko-KR": {
    name: "Korean",
    directive:
      "응답은 한국어로만 작성하고, 다른 언어 번역이나 추가 설명은 포함하지 마세요."
  },
  "fr-FR": {
    name: "French",
    directive:
      "Rédigez uniquement le prompt final en français (France) sans ajouter d'autres langues ni explications supplémentaires."
  },
  "de-DE": {
    name: "German",
    directive:
      "Schreiben Sie ausschließlich den endgültigen Prompt auf Deutsch (Deutschland) ohne zusätzliche Sprachen oder Erläuterungen."
  },
  "es-ES": {
    name: "Spanish (Spain)",
    directive:
      "Escribe únicamente el prompt final en español de España, sin añadir otros idiomas ni explicaciones adicionales."
  },
  "es-MX": {
    name: "Spanish (Mexico)",
    directive:
      "Escribe solo el prompt final en español de México y evita incluir otros idiomas o explicaciones extra."
  },
  "it-IT": {
    name: "Italian",
    directive:
      "Scrivi esclusivamente il prompt finale in italiano (Italia) senza aggiungere altre lingue o spiegazioni."
  },
  "pt-BR": {
    name: "Portuguese (Brazil)",
    directive:
      "Escreva somente o prompt final em português do Brasil, sem outras línguas ou explicações adicionais."
  },
  "ru-RU": {
    name: "Russian",
    directive:
      "Напишите только итоговый промпт на русском языке (Россия), без других языков и дополнительных пояснений."
  },
  "hi-IN": {
    name: "Hindi",
    directive:
      "उत्तर केवल हिंदी (भारत) में लिखें और कोई अन्य भाषा या अतिरिक्त व्याख्या शामिल न करें।"
  },
  "ar-AE": {
    name: "Arabic (UAE)",
    directive:
      "اكتب فقط النص النهائي باللغة العربية كما تُستخدم في الإمارات، بدون لغات أخرى أو شروحات إضافية."
  },
  "nl-NL": {
    name: "Dutch",
    directive:
      "Schrijf uitsluitend de uiteindelijke prompt in het Nederlands (Nederland) en voeg geen andere talen of extra uitleg toe."
  },
  "tr-TR": {
    name: "Turkish",
    directive:
      "Yalnızca nihai metin istemini Türkçe (Türkiye) olarak yazın; başka dil veya ek açıklama eklemeyin."
  },
  "th-TH": {
    name: "Thai",
    directive:
      "เขียนเฉพาะพรอมต์สุดท้ายเป็นภาษาไทย (ประเทศไทย) โดยไม่ใส่ภาษาอื่นหรือคำอธิบายเพิ่มเติม"
  },
  "vi-VN": {
    name: "Vietnamese",
    directive:
      "Chỉ viết prompt cuối cùng bằng tiếng Việt (Việt Nam), không thêm ngôn ngữ khác hay giải thích bổ sung."
  },
  "id-ID": {
    name: "Indonesian",
    directive:
      "Tuliskan hanya prompt akhir dalam bahasa Indonesia tanpa bahasa lain atau penjelasan tambahan."
  },
  "pl-PL": {
    name: "Polish",
    directive:
      "Napisz wyłącznie końcowy prompt w języku polskim, bez innych języków i dodatkowych wyjaśnień."
  }
};

const LLM_PROVIDERS = {
  gemini: {
    id: "gemini",
    name: PROVIDER_DEFAULTS.gemini.name,
    defaultModel: PROVIDER_DEFAULTS.gemini.model,
    generate: requestPromptFromGemini
  },
  zhipu: {
    id: "zhipu",
    name: PROVIDER_DEFAULTS.zhipu.name,
    defaultModel: PROVIDER_DEFAULTS.zhipu.model,
    generate: requestPromptFromZhipu
  },
  "custom-openai": {
    id: "custom-openai",
    name: PROVIDER_DEFAULTS["custom-openai"].name,
    defaultModel: PROVIDER_DEFAULTS["custom-openai"].model,
    requiresBaseUrl: true,
    generate: requestPromptFromCustomOpenAI
  }
};

const IMAGE_CONTEXT_MENU_ID = "i2p-generate-prompt";

chrome.runtime.onInstalled.addListener(() => {
  registerContextMenu();
});

chrome.runtime.onStartup.addListener(() => {
  registerContextMenu();
});

chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId !== IMAGE_CONTEXT_MENU_ID) {
    return;
  }
  handleImageContextMenuClick(info, tab).catch((error) => {
    console.error("[Image2Prompt] Context menu click failed:", error);
  });
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message?.type === "generatePrompt") {
    handleGeneratePrompt(message, sender)
      .then((result) =>
        sendResponse({
          success: true,
          prompt: result.prompt,
          platformUrl: result.platformUrl,
          platformPrompt: result.platformPrompt,
          shouldAutofillPlatform: result.shouldAutofillPlatform,
          autoOpened: result.autoOpened
        })
      )
      .catch((error) => {
        console.error("[Image2Prompt] Failed generating prompt:", error);
        sendResponse({ success: false, error: error.message });
      });
    return true;
  }

  if (message?.type === "openPlatform") {
    handleOpenPlatform(message, sender)
      .then((result) => sendResponse({ success: true, ...result }))
      .catch((error) => {
        console.error("[Image2Prompt] Opening AI platform failed:", error);
        sendResponse({ success: false, error: error.message });
      });
    return true;
  }

  if (message?.type === "testProviderConnection") {
    handleTestProviderConnection(message)
      .then((result) => sendResponse({ success: true, ...result }))
      .catch((error) => {
        console.error("[Image2Prompt] Provider connectivity test failed:", error);
        sendResponse({ success: false, error: error.message });
      });
    return true;
  }

  if (message?.type === "enrichPromptPresentation") {
    handleEnrichPromptPresentation(message)
      .then((result) => sendResponse({ success: true, ...result }))
      .catch((error) => {
        console.error("[Image2Prompt] Prompt presentation enrichment failed:", error);
        sendResponse({ success: false, error: error.message });
      });
    return true;
  }
});

function registerContextMenu() {
  chrome.contextMenus.removeAll(() => {
    chrome.contextMenus.create(
      {
        id: IMAGE_CONTEXT_MENU_ID,
        title: "\uD83C\uDFA8 Generate prompt with image2prompt",
        contexts: ["image", "link"]
      },
      () => {
        if (chrome.runtime.lastError) {
          console.warn(
            "[Image2Prompt] Unable to register context menu:",
            chrome.runtime.lastError.message
          );
        }
      }
    );
  });
}

async function handleImageContextMenuClick(info, tab) {
  const tabId = tab?.id;
  if (!tabId) {
    return;
  }

  let imageUrl = typeof info.srcUrl === "string" ? info.srcUrl : "";

  // When right-clicking on a link (e.g. Pinterest thumbnails wrapped in <a>),
  // Chrome reports it as a link context without srcUrl. Ask the content script
  // for the image URL it captured from the underlying <img> element.
  if (!imageUrl) {
    try {
      const result = await sendMessageToTabSafe(tabId, { type: "getContextImageUrl" });
      imageUrl = typeof result?.imageUrl === "string" ? result.imageUrl : "";
    } catch (error) {
      // Content script may not be injected yet — inject and retry
      await ensureContentScriptInjected(tabId);
      try {
        const result = await sendMessageToTabSafe(tabId, { type: "getContextImageUrl" });
        imageUrl = typeof result?.imageUrl === "string" ? result.imageUrl : "";
      } catch (retryError) {
        console.warn("[Image2Prompt] Unable to get image URL from content script:", retryError);
      }
    }
  }

  if (!imageUrl) {
    console.warn("[Image2Prompt] No image URL found for context menu click.");
    return;
  }

  const payload = {
    type: "contextMenuGeneratePrompt",
    imageUrl,
    pageUrl: info.pageUrl || tab?.url || ""
  };

  try {
    await sendMessageToTab(tabId, payload);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : String(error || "");
    const shouldInject =
      /Receiving end does not exist/i.test(message) ||
      /Could not establish connection/i.test(message);

    if (!shouldInject) {
      throw error;
    }

    await ensureContentScriptInjected(tabId);
    await sendMessageToTab(tabId, payload);
  }
}

function sendMessageToTab(tabId, message) {
  return new Promise((resolve, reject) => {
    chrome.tabs.sendMessage(tabId, message, (response) => {
      if (chrome.runtime.lastError) {
        reject(new Error(chrome.runtime.lastError.message));
        return;
      }
      resolve(response);
    });
  });
}

function sendMessageToTabSafe(tabId, message) {
  return new Promise((resolve) => {
    chrome.tabs.sendMessage(tabId, message, (response) => {
      if (chrome.runtime.lastError) {
        resolve(null);
        return;
      }
      resolve(response);
    });
  });
}

async function ensureContentScriptInjected(tabId) {
  await insertCssFile(tabId, "content.css");
  await executeScriptFile(tabId, "content.js");
}

function insertCssFile(tabId, file) {
  return new Promise((resolve, reject) => {
    chrome.scripting.insertCSS(
      {
        target: { tabId },
        files: [file]
      },
      () => {
        if (chrome.runtime.lastError) {
          reject(new Error(chrome.runtime.lastError.message));
          return;
        }
        resolve();
      }
    );
  });
}

function executeScriptFile(tabId, file) {
  return new Promise((resolve, reject) => {
    chrome.scripting.executeScript(
      {
        target: { tabId },
        files: [file]
      },
      () => {
        if (chrome.runtime.lastError) {
          reject(new Error(chrome.runtime.lastError.message));
          return;
        }
        resolve();
      }
    );
  });
}

async function handleGeneratePrompt(message, sender) {
  const config = await getConfig();
  const { providerId, provider, settings } = resolveProvider(config);
  const pageHostname = extractHostnameFromSender(sender);
  if (isDomainBlocked(pageHostname, config.domainFilters)) {
    throw new Error("Prompt generation is disabled on this domain.");
  }
  const imageData = await getImageDataFromMessage(message);
  const languageDirective = getLanguageDirective(config.promptLanguage);
  const baseInstruction = config.promptInstruction || DEFAULT_CONFIG.promptInstruction;
  const promptRichness = normalizePromptRichness(config.promptRichness);
  const richnessInstruction = getRichnessInstruction(promptRichness);
  const instruction = richnessInstruction 
    ? `${baseInstruction}\n\n${richnessInstruction}`
    : baseInstruction;
  const maxOutputTokens = getPromptMaxOutputTokens(promptRichness);
  const runtimeInstruction =
    typeof message.customInstruction === "string"
      ? message.customInstruction.trim()
      : "";
  const aspectInstruction = composeAspectRatioInstruction(
    config.aspectRatio,
    config.customAspectRatio
  );
  const customInstructionParts = [];
  if (aspectInstruction) {
    customInstructionParts.push(aspectInstruction);
  }
  if (config.removeWatermark) {
    customInstructionParts.push(
      "Remove any watermark, platform logo, signature, photographer credit, or similar artifacts from the generated composition so the final result looks clean."
    );
  }
  if (config.imageTextTranslationTarget) {
    const translationLabel = getPromptLanguageName(
      config.imageTextTranslationTarget
    );
    customInstructionParts.push(
      `If the source image contains text, translate that text into ${translationLabel} and describe it using the translated wording in the final prompt.`
    );
  }
  if (runtimeInstruction) {
    customInstructionParts.push(runtimeInstruction);
  }
  const customInstruction = customInstructionParts.join("\n\n");
  const model =
    settings.model?.trim() ||
    provider.defaultModel ||
    PROVIDER_DEFAULTS[DEFAULT_PROVIDER_ID].model;

  if (!settings.apiKey) {
    throw new Error(`${provider.name} API key is not set in the extension options.`);
  }
  if (provider.requiresBaseUrl && !settings.baseUrl) {
    throw new Error(`${provider.name} base URL is not set in the extension options.`);
  }
  console.log('[image2prompt 提示词配置]', {
    apiKey: maskSecret(settings.apiKey),
    baseUrl: settings.baseUrl,
    model,
    instruction,
    promptRichness,
    maxOutputTokens,
    aspectRatio: config.aspectRatio,
    customAspectRatio: config.customAspectRatio,
    aspectInstruction,
    customInstruction,
    languageDirective,
    imageBase64Length: imageData.data?.length || 0,
    imageMimeType: imageData.mimeType,
    altText: message.imageAlt || ""
  })
  const promptText = await provider.generate({
    apiKey: settings.apiKey,
    baseUrl: settings.baseUrl,
    model,
    instruction,
    languageDirective,
    customInstruction,
    imageBase64: imageData.data,
    imageMimeType: imageData.mimeType,
    altText: message.imageAlt || "",
    maxOutputTokens
  });

  const trimmedPrompt = promptText.trim();
  if (!trimmedPrompt) {
    throw new Error(`${provider.name} did not return any prompt text.`);
  }
  const promptWithAspect = appendAspectRatioToPrompt(
    trimmedPrompt,
    config.aspectRatio,
    config.customAspectRatio
  );
  const normalizedPrompt = promptWithAspect.trim();
  if (!normalizedPrompt) {
    throw new Error(`${provider.name} did not return any prompt text.`);
  }
  const platformPrompt = derivePlatformPromptText(
    normalizedPrompt,
    config.promptLanguage
  );
  const shouldAutofillPlatform = shouldAutofillPlatformPrompt(
    config.selectedPlatformId,
    config.platformUrl
  );
  const platformUrl = buildPlatformLaunchUrl(
    config.platformUrl,
    platformPrompt,
    shouldAutofillPlatform
  );
  const shouldAutoOpen = config.autoOpenPlatform !== false;
  let autoOpened = false;

  if (platformUrl && shouldAutoOpen) {
    try {
      await openPlatformDestination({
        url: platformUrl,
        prompt: platformPrompt,
        shouldAutofill: shouldAutofillPlatform,
        windowId: sender?.tab?.windowId
      });
      autoOpened = true;
    } catch (error) {
      console.warn("[Image2Prompt] Unable to open AI platform tab:", error);
    }
  }

  appendGenerationHistorySafe({
    prompt: normalizedPrompt,
    provider: provider.name,
    providerId,
    model,
    createdAt: Date.now(),
    platformName: config.selectedPlatformLabel || config.selectedPlatformId || "",
    platformId: config.selectedPlatformId || "",
    platformUrl: config.platformUrl || "",
    imageDataUrl: buildDataUrl(imageData?.mimeType, imageData?.data),
    imageAlt: message.imageAlt || "",
    customInstruction
  });

  return {
    prompt: normalizedPrompt,
    platformUrl,
    platformPrompt,
    shouldAutofillPlatform,
    autoOpened
  };
}

async function handleOpenPlatform(message, sender) {
  const url = typeof message?.url === "string" ? message.url.trim() : "";
  const prompt = typeof message?.prompt === "string" ? message.prompt : "";
  const shouldAutofill = message?.shouldAutofill === true;

  if (!url) {
    throw new Error("Platform URL is empty.");
  }

  await openPlatformDestination({
    url,
    prompt,
    shouldAutofill,
    windowId: sender?.tab?.windowId
  });

  return { opened: true };
}

async function handleTestProviderConnection(message) {
  const providerId = normalizeProviderId(message?.providerId);
  const provider = LLM_PROVIDERS[providerId] || LLM_PROVIDERS[DEFAULT_PROVIDER_ID];
  const providerSettings = sanitizeProviderSettings(message?.providerSettings || {});
  const settings = providerSettings[providerId] || createDefaultProviderSettings()[providerId];
  const apiKey = settings?.apiKey ? String(settings.apiKey) : "";
  const model = settings?.model ? String(settings.model) : provider.defaultModel;
  const baseUrl = sanitizeProviderBaseUrl(settings?.baseUrl);

  if (!apiKey) {
    throw new Error(`${provider.name} API key is not set.`);
  }
  if (provider.requiresBaseUrl && !baseUrl) {
    throw new Error(`${provider.name} base URL is not set.`);
  }

  if (providerId === "custom-openai") {
    return testCustomOpenAIConnection({ apiKey, baseUrl, model });
  }
  if (providerId === "gemini") {
    return testGeminiConnection({ apiKey, model });
  }
  if (providerId === "zhipu") {
    return testZhipuConnection({ apiKey, model });
  }

  throw new Error(`Connectivity test is not supported for provider "${providerId}".`);
}

async function handleEnrichPromptPresentation(message) {
  const prompt = typeof message?.prompt === "string" ? message.prompt.trim() : "";
  if (!prompt) {
    throw new Error("Prompt text is empty.");
  }

  const config = await getConfig();
  const { providerId, provider, settings } = resolveProvider(config);
  const model =
    settings.model?.trim() ||
    provider.defaultModel ||
    PROVIDER_DEFAULTS[DEFAULT_PROVIDER_ID].model;

  if (!settings.apiKey) {
    throw new Error(`${provider.name} API key is not set in the extension options.`);
  }
  if (provider.requiresBaseUrl && !settings.baseUrl) {
    throw new Error(`${provider.name} base URL is not set in the extension options.`);
  }

  const instruction = [
    "You are a professional bilingual translator and prompt analyst specializing in text-to-image prompts.",
    "Your task is to produce accurate, natural, and faithful translations of the supplied prompt.",
    "Return strict JSON only, no markdown fences, no extra commentary.",
    'Use this shape: {"translations":{"zh":"...","en":"..."},"tags":["..."]}.',
    "",
    "## Translation Rules:",
    "1. Translate the supplied prompt faithfully into both Simplified Chinese (zh) and English (en).",
    "2. Preserve ALL visual details, technical terms, color descriptions, composition elements, and artistic style references.",
    "3. Do NOT omit, summarize, or simplify any part of the prompt during translation.",
    "4. Do NOT add information that is not in the original prompt.",
    "5. If the original prompt is already in Chinese, produce a polished Chinese version and an accurate English translation.",
    "6. If the original prompt is already in English, produce a polished English version and an accurate Chinese translation.",
    "7. For Chinese (zh): use natural, fluent Simplified Chinese. Translate technical/artistic terms into their commonly accepted Chinese equivalents (e.g., 'bokeh' → '焦外虚化', 'rule of thirds' → '三分法构图', 'rim lighting' → '轮廓光'). Maintain the descriptive richness of the original.",
    "8. For English (en): use natural, professional English. Keep standard photography/art terminology in their original English form.",
    "",
    "## Tag Rules:",
    "Generate exactly 8 short tags in Simplified Chinese.",
    "Each tag must be exactly 4 Chinese characters — no more, no less.",
    "Tags should cover: subject matter, art style, mood/atmosphere, lighting type, dominant colors, material/texture, composition technique, and camera angle.",
    "Tags should be diverse and specific — avoid generic tags like '美丽' or '好看'.",
    "Prioritize visually descriptive and technically meaningful tags."
  ].join("\n");

  const raw = await requestTextCompletion({
    providerId,
    settings,
    model,
    systemInstruction: instruction,
    userText: `Prompt:\n${prompt}`
  });

  return normalizePresentationPayload(raw, prompt);
}

async function getConfig() {
  return new Promise((resolve, reject) => {
    chrome.storage.sync.get(DEFAULT_CONFIG, (items) => {
      if (chrome.runtime.lastError) {
        reject(chrome.runtime.lastError);
      } else {
        resolve(sanitizeConfig(items));
      }
    });
  });
}

async function getImageData(imageUrl) {
  if (imageUrl.startsWith("data:")) {
    const { mimeType, data } = parseDataUrl(imageUrl);
    return { mimeType, data };
  }

  const response = await fetch(imageUrl);
  if (!response.ok) {
    throw new Error(`Could not fetch the image (status ${response.status}).`);
  }

  const mimeType =
    response.headers.get("content-type") || "image/png";
  const buffer = await response.arrayBuffer();

  return {
    mimeType,
    data: arrayBufferToBase64(buffer)
  };
}

async function getImageDataFromMessage(message) {
  const providedBase64 = message.imageBase64;
  const providedMime = message.imageMimeType;

  if (providedBase64 && providedMime) {
    return {
      mimeType: providedMime,
      data: providedBase64
    };
  }

  return getImageData(message.imageUrl);
}

async function requestPromptFromGemini({
  apiKey,
  model,
  instruction,
  customInstruction,
  languageDirective,
  imageBase64,
  imageMimeType,
  altText,
  maxOutputTokens
}) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(
    model
  )}:generateContent?key=${encodeURIComponent(apiKey)}`;

  const parts = [];

  const trimmedInstruction = instruction?.trim() ?? "";
  const trimmedDirective = languageDirective?.trim() ?? "";
  const trimmedCustomInstruction = customInstruction?.trim() ?? "";

  if (trimmedInstruction) {
    parts.push({ text: trimmedInstruction });
  }

  if (trimmedDirective) {
    parts.push({ text: trimmedDirective });
  }

  if (trimmedCustomInstruction) {
    parts.push({
      text: `Additional user instructions to combine with the image: ${trimmedCustomInstruction}`
    });
  }

  parts.push({
    inline_data: {
      mime_type: imageMimeType,
      data: imageBase64
    }
  });

  if (altText) {
    parts.push({
      text: `Image alt text: ${altText}`
    });
  }

  const payload = {
    contents: [
      {
        role: "user",
        parts
      }
    ],
    generationConfig: {
      temperature: 0.4,
      topK: 32,
      topP: 0.95,
      responseMimeType: "application/json",
      maxOutputTokens: maxOutputTokens || PROMPT_RICHNESS_OUTPUT_BUDGETS["very-detailed"]
    }
  };

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    const errorDetails = await safeReadJson(response);
    throw new Error(
      errorDetails?.error?.message ||
      `Gemini API error (status ${response.status}).`
    );
  }

  const result = await response.json();
  const promptText =
    result?.candidates?.[0]?.content?.parts
      ?.map((part) => part.text)
      .filter(Boolean)
      .join("\n")
      .trim() || "";

  if (!promptText) {
    throw new Error("Gemini did not return any prompt text.");
  }

  return promptText;
}

async function requestPromptFromZhipu({
  apiKey,
  model,
  instruction,
  customInstruction,
  languageDirective,
  imageBase64,
  imageMimeType,
  altText,
  maxOutputTokens
}) {
  const url = "https://open.bigmodel.cn/api/paas/v4/chat/completions";
  const textSegments = [];
  const trimmedInstruction = instruction?.trim() ?? "";
  const trimmedDirective = languageDirective?.trim() ?? "";
  const trimmedCustomInstruction = customInstruction?.trim() ?? "";

  if (trimmedInstruction) {
    textSegments.push(trimmedInstruction);
  }
  if (trimmedDirective) {
    textSegments.push(trimmedDirective);
  }
  if (altText) {
    textSegments.push(`Image alt text: ${altText}`);
  }
  if (trimmedCustomInstruction) {
    textSegments.push(
      `Additional user instructions to blend with the final prompt:\n${trimmedCustomInstruction}`
    );
  }

  const content = [];
  if (textSegments.length > 0) {
    content.push({
      type: "text",
      text: textSegments.join("\n\n")
    });
  }
  const safeMimeType = imageMimeType || "image/png";
  content.push({
    type: "image_url",
    image_url: {
      url: `data:${safeMimeType};base64,${imageBase64}`
    }
  });

  const payload = {
    model,
    messages: [
      {
        role: "user",
        content
      }
    ],
    temperature: 0.4,
    top_p: 0.95,
    max_tokens: maxOutputTokens || PROMPT_RICHNESS_OUTPUT_BUDGETS["very-detailed"]
  };

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`
    },
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    const errorDetails = await safeReadJson(response);
    throw new Error(
      errorDetails?.error?.message ||
      `Zhipu AI API error (status ${response.status}).`
    );
  }

  const result = await response.json();
  const messageContent = result?.choices?.[0]?.message?.content;
  const promptText = extractTextFromZhipuContent(messageContent).trim();
  if (!promptText) {
    throw new Error("Zhipu AI did not return any prompt text.");
  }
  return promptText;
}

async function requestPromptFromCustomOpenAI({
  apiKey,
  baseUrl,
  model,
  instruction,
  customInstruction,
  languageDirective,
  imageBase64,
  imageMimeType,
  altText,
  maxOutputTokens
}) {
  const url = buildOpenAICompatibleEndpoint(baseUrl);
  const systemSegments = [];
  const userSegments = [];

  const trimmedInstruction = instruction?.trim() ?? "";
  const trimmedDirective = languageDirective?.trim() ?? "";
  const trimmedCustomInstruction = customInstruction?.trim() ?? "";

  if (trimmedInstruction) {
    systemSegments.push(trimmedInstruction);
  }
  if (trimmedDirective) {
    systemSegments.push(trimmedDirective);
  }
  if (trimmedCustomInstruction) {
    userSegments.push(
      `Additional user instructions to blend with the final prompt:\n${trimmedCustomInstruction}`
    );
  }
  if (altText) {
    userSegments.push(`Image alt text: ${altText}`);
  }
  if (userSegments.length === 0) {
    userSegments.push(
      "Analyze this image and return a comprehensive JSON object describing every visual detail for faithful recreation."
    );
  }

  const safeMimeType = imageMimeType || "image/png";
  const messages = [];

  if (systemSegments.length > 0) {
    messages.push({
      role: "system",
      content: systemSegments.join("\n\n")
    });
  }

  messages.push({
    role: "user",
    content: [
      {
        type: "text",
        text: userSegments.join("\n\n")
      },
      {
        type: "image_url",
        image_url: {
          url: `data:${safeMimeType};base64,${imageBase64}`
        }
      }
    ]
  });

  const payload = {
    model,
    messages,
    temperature: 0.4,
    top_p: 0.95,
    max_tokens: maxOutputTokens || PROMPT_RICHNESS_OUTPUT_BUDGETS["very-detailed"],
    response_format: { type: "json_object" }
  };

  let response;
  try {
    response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`
      },
      body: JSON.stringify(payload)
    });
  } catch (error) {
    throw new Error(
      "Unable to reach the custom relay API. Check that the Base URL uses HTTPS and that the relay allows browser-origin requests."
    );
  }

  if (!response.ok) {
    const errorDetails = await safeReadJson(response);
    throw new Error(
      errorDetails?.error?.message ||
      errorDetails?.message ||
      `Custom relay API error (status ${response.status}).`
    );
  }

  const result = await response.json();
  const messageContent = result?.choices?.[0]?.message?.content;
  const promptText = extractTextFromOpenAIContent(messageContent).trim();
  if (!promptText) {
    throw new Error("Custom relay API did not return any prompt text.");
  }
  return promptText;
}

async function testCustomOpenAIConnection({ apiKey, baseUrl, model }) {
  const modelsUrl = buildOpenAICompatibleModelsEndpoint(baseUrl);

  try {
    const response = await fetch(modelsUrl, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${apiKey}`
      }
    });

    if (response.ok) {
      const result = await safeReadJson(response);
      const modelIds = extractOpenAIModelIds(result);
      if (modelIds.length === 0) {
        return {
          message:
            "Relay reachable. Authentication succeeded, but the model list was empty."
        };
      }

      const hasModel = modelIds.includes(model);
      const sample = modelIds.slice(0, 8).join(", ");
      return {
        message: hasModel
          ? `Relay reachable. Model "${model}" is available. Sample models: ${sample}`
          : `Relay reachable, but "${model}" was not listed. Sample models: ${sample}`
      };
    }

    if (response.status !== 404 && response.status !== 405) {
      const errorDetails = await safeReadJson(response);
      throw new Error(
        errorDetails?.error?.message ||
        errorDetails?.message ||
        `Relay API error (status ${response.status}).`
      );
    }
  } catch (error) {
    if (error instanceof TypeError) {
      throw new Error(
        "Unable to reach the custom relay API. Check that the Base URL uses HTTPS and that the relay is online."
      );
    }
    if (error instanceof Error) {
      throw error;
    }
  }

  const chatUrl = buildOpenAICompatibleEndpoint(baseUrl);
  let response;
  try {
    response = await fetch(chatUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model,
        messages: [
          {
            role: "user",
            content: "Reply with the single word ok."
          }
        ],
        temperature: 0
      })
    });
  } catch (error) {
    throw new Error(
      "Unable to reach the custom relay API. Check that the Base URL uses HTTPS and that the relay is online."
    );
  }

  if (!response.ok) {
    const errorDetails = await safeReadJson(response);
    throw new Error(
      errorDetails?.error?.message ||
      errorDetails?.message ||
      `Relay API error (status ${response.status}).`
    );
  }

  return {
    message: `Relay reachable. The model "${model}" accepted a basic text request.`
  };
}

async function testGeminiConnection({ apiKey, model }) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${encodeURIComponent(
    apiKey
  )}`;
  let response;
  try {
    response = await fetch(url, { method: "GET" });
  } catch (error) {
    throw new Error("Unable to reach the Gemini API.");
  }

  if (!response.ok) {
    const errorDetails = await safeReadJson(response);
    throw new Error(
      errorDetails?.error?.message ||
      `Gemini API error (status ${response.status}).`
    );
  }

  const result = await response.json();
  const modelNames = Array.isArray(result?.models)
    ? result.models
        .map((entry) => String(entry?.name || "").split("/").pop())
        .filter(Boolean)
    : [];
  if (modelNames.length === 0) {
    return { message: "Gemini API reachable. No models were returned." };
  }

  const hasModel = modelNames.includes(model);
  const sample = modelNames.slice(0, 8).join(", ");
  return {
    message: hasModel
      ? `Gemini API reachable. Model "${model}" is available. Sample models: ${sample}`
      : `Gemini API reachable, but "${model}" was not listed. Sample models: ${sample}`
  };
}

async function testZhipuConnection({ apiKey, model }) {
  const url = "https://open.bigmodel.cn/api/paas/v4/chat/completions";
  let response;
  try {
    response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model,
        messages: [
          {
            role: "user",
            content: [
              {
                type: "text",
                text: "Reply with the single word ok."
              }
            ]
          }
        ],
        temperature: 0
      })
    });
  } catch (error) {
    throw new Error("Unable to reach the Zhipu API.");
  }

  if (!response.ok) {
    const errorDetails = await safeReadJson(response);
    throw new Error(
      errorDetails?.error?.message ||
      `Zhipu API error (status ${response.status}).`
    );
  }

  return {
    message: `Zhipu API reachable. The model "${model}" accepted a basic text request.`
  };
}

async function requestTextCompletion({
  providerId,
  settings,
  model,
  systemInstruction,
  userText
}) {
  if (providerId === "custom-openai") {
    return requestTextCompletionFromCustomOpenAI({
      apiKey: settings.apiKey,
      baseUrl: settings.baseUrl,
      model,
      systemInstruction,
      userText
    });
  }
  if (providerId === "gemini") {
    return requestTextCompletionFromGemini({
      apiKey: settings.apiKey,
      model,
      systemInstruction,
      userText
    });
  }
  if (providerId === "zhipu") {
    return requestTextCompletionFromZhipu({
      apiKey: settings.apiKey,
      model,
      systemInstruction,
      userText
    });
  }
  throw new Error(`Text completion is not supported for provider "${providerId}".`);
}

async function requestTextCompletionFromGemini({
  apiKey,
  model,
  systemInstruction,
  userText
}) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(
    model
  )}:generateContent?key=${encodeURIComponent(apiKey)}`;

  const parts = [];
  if (systemInstruction?.trim()) {
    parts.push({ text: systemInstruction.trim() });
  }
  if (userText?.trim()) {
    parts.push({ text: userText.trim() });
  }

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      contents: [
        {
          role: "user",
          parts
        }
      ],
      generationConfig: {
        temperature: 0.2,
        topK: 32,
        topP: 0.9
      }
    })
  });

  if (!response.ok) {
    const errorDetails = await safeReadJson(response);
    throw new Error(
      errorDetails?.error?.message ||
      `Gemini API error (status ${response.status}).`
    );
  }

  const result = await response.json();
  return (
    result?.candidates?.[0]?.content?.parts
      ?.map((part) => part.text)
      .filter(Boolean)
      .join("\n")
      .trim() || ""
  );
}

async function requestTextCompletionFromZhipu({
  apiKey,
  model,
  systemInstruction,
  userText
}) {
  const response = await fetch("https://open.bigmodel.cn/api/paas/v4/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model,
      messages: [
        {
          role: "user",
          content: [
            {
              type: "text",
              text: [systemInstruction?.trim(), userText?.trim()]
                .filter(Boolean)
                .join("\n\n")
            }
          ]
        }
      ],
      temperature: 0.2,
      top_p: 0.9
    })
  });

  if (!response.ok) {
    const errorDetails = await safeReadJson(response);
    throw new Error(
      errorDetails?.error?.message ||
      `Zhipu API error (status ${response.status}).`
    );
  }

  const result = await response.json();
  return extractTextFromZhipuContent(result?.choices?.[0]?.message?.content).trim();
}

async function requestTextCompletionFromCustomOpenAI({
  apiKey,
  baseUrl,
  model,
  systemInstruction,
  userText
}) {
  const response = await fetch(buildOpenAICompatibleEndpoint(baseUrl), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model,
      messages: [
        ...(systemInstruction?.trim()
          ? [
              {
                role: "system",
                content: systemInstruction.trim()
              }
            ]
          : []),
        {
          role: "user",
          content: userText?.trim() || ""
        }
      ],
      temperature: 0.2,
      top_p: 0.9
    })
  });

  if (!response.ok) {
    const errorDetails = await safeReadJson(response);
    throw new Error(
      errorDetails?.error?.message ||
      errorDetails?.message ||
      `Custom relay API error (status ${response.status}).`
    );
  }

  const result = await response.json();
  return extractTextFromOpenAIContent(result?.choices?.[0]?.message?.content).trim();
}

function extractTextFromZhipuContent(content) {
  if (!content) {
    return "";
  }
  if (typeof content === "string") {
    return content;
  }
  if (Array.isArray(content)) {
    return content
      .map((part) => extractTextFromZhipuContent(part))
      .filter(Boolean)
      .join("\n");
  }
  if (typeof content === "object") {
    if (typeof content.text === "string") {
      return content.text;
    }
    if (content.type === "text" && typeof content.text === "string") {
      return content.text;
    }
    if (content.type === "output_text" && typeof content.text === "string") {
      return content.text;
    }
    if (Array.isArray(content.content)) {
      return extractTextFromZhipuContent(content.content);
    }
  }
  return "";
}

function extractTextFromOpenAIContent(content) {
  if (!content) {
    return "";
  }
  if (typeof content === "string") {
    return content;
  }
  if (Array.isArray(content)) {
    return content
      .map((part) => extractTextFromOpenAIContent(part))
      .filter(Boolean)
      .join("\n");
  }
  if (typeof content === "object") {
    if (typeof content.text === "string") {
      return content.text;
    }
    if (typeof content.output_text === "string") {
      return content.output_text;
    }
    if (content.type === "text" && typeof content.text === "string") {
      return content.text;
    }
    if (Array.isArray(content.content)) {
      return extractTextFromOpenAIContent(content.content);
    }
  }
  return "";
}

function normalizePresentationPayload(rawText, originalPrompt) {
  const fallback = {
    translations: {
      zh: originalPrompt,
      en: originalPrompt
    },
    tags: deriveFallbackTags(originalPrompt)
  };

  const parsed = parseJsonObjectFromText(rawText);
  if (!parsed || typeof parsed !== "object") {
    return fallback;
  }

  const translations = parsed.translations && typeof parsed.translations === "object"
    ? parsed.translations
    : parsed;

  const zh = typeof translations.zh === "string" ? translations.zh.trim() : "";
  const en = typeof translations.en === "string" ? translations.en.trim() : "";

  const tags = Array.isArray(parsed.tags)
    ? parsed.tags
        .map((entry) => (typeof entry === "string" ? entry.trim() : ""))
        .filter(Boolean)
        .slice(0, 8)
    : deriveFallbackTags(originalPrompt);

  return {
    translations: {
      zh: zh || fallback.translations.zh,
      en: en || fallback.translations.en
    },
    tags: tags.length > 0 ? tags : fallback.tags
  };
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
      // ignore parsing failures and try the next candidate
    }
  }
  return null;
}

function deriveFallbackTags(prompt) {
  if (typeof prompt !== "string" || !prompt.trim()) {
    return [];
  }
  const pieces = prompt
    .split(/[\n,.;:，。；：]/)
    .map((part) => part.trim())
    .filter(Boolean);

  const unique = [];
  for (const piece of pieces) {
    const normalized = piece
      .replace(/\s+/g, "")
      .replace(/^[-–—]+/, "")
      .slice(0, 8);
    if (!normalized) {
      continue;
    }
    if (!unique.includes(normalized)) {
      unique.push(normalized);
    }
    if (unique.length >= 8) {
      break;
    }
  }
  return unique;
}

function buildOpenAICompatibleEndpoint(baseUrl) {
  const sanitized = sanitizeProviderBaseUrl(baseUrl);
  if (!sanitized) {
    throw new Error("Custom relay API base URL is empty.");
  }

  let parsed;
  try {
    parsed = new URL(sanitized);
  } catch (error) {
    throw new Error("Custom relay API base URL is invalid.");
  }

  const pathname = parsed.pathname.replace(/\/+$/, "");
  if (pathname.endsWith("/chat/completions")) {
    parsed.pathname = pathname;
    return parsed.toString();
  }

  if (pathname.endsWith("/v1")) {
    parsed.pathname = `${pathname}/chat/completions`;
    return parsed.toString();
  }

  parsed.pathname = pathname
    ? `${pathname}/v1/chat/completions`
    : "/v1/chat/completions";
  return parsed.toString();
}

function buildOpenAICompatibleModelsEndpoint(baseUrl) {
  const sanitized = sanitizeProviderBaseUrl(baseUrl);
  if (!sanitized) {
    throw new Error("Custom relay API base URL is empty.");
  }

  let parsed;
  try {
    parsed = new URL(sanitized);
  } catch (error) {
    throw new Error("Custom relay API base URL is invalid.");
  }

  const pathname = parsed.pathname.replace(/\/+$/, "");
  if (pathname.endsWith("/chat/completions")) {
    parsed.pathname = pathname.replace(/\/chat\/completions$/, "/models");
    return parsed.toString();
  }

  if (pathname.endsWith("/v1")) {
    parsed.pathname = `${pathname}/models`;
    return parsed.toString();
  }

  parsed.pathname = pathname ? `${pathname}/v1/models` : "/v1/models";
  return parsed.toString();
}

function extractOpenAIModelIds(payload) {
  if (!Array.isArray(payload?.data)) {
    return [];
  }
  return payload.data
    .map((entry) => (entry?.id ? String(entry.id) : ""))
    .filter(Boolean);
}

function buildPlatformUrl(template, prompt) {
  const trimmedTemplate = (template || DEFAULT_CONFIG.platformUrl).trim();
  if (!trimmedTemplate) {
    return "";
  }

  const encodedPrompt = encodeURIComponent(prompt);
  if (trimmedTemplate.includes("{{prompt}}")) {
    return trimmedTemplate.replace(/{{prompt}}/g, encodedPrompt);
  }

  const separator = trimmedTemplate.includes("?") ? "&" : "?";
  return `${trimmedTemplate}${separator}prompt=${encodedPrompt}`;
}

function buildPlatformLaunchUrl(template, prompt, shouldAutofill) {
  const trimmedTemplate = (template || DEFAULT_CONFIG.platformUrl).trim();
  if (!trimmedTemplate) {
    return "";
  }
  if (shouldAutofill && !trimmedTemplate.includes("{{prompt}}")) {
    return trimmedTemplate;
  }
  return buildPlatformUrl(trimmedTemplate, prompt);
}

async function openPlatformTab(url, windowId) {
  return new Promise((resolve, reject) => {
    chrome.tabs.create(
      {
        url,
        windowId
      },
      (tab) => {
        if (chrome.runtime.lastError) {
          reject(chrome.runtime.lastError);
        } else {
          resolve(tab);
        }
      }
    );
  });
}

async function openPlatformDestination({
  url,
  prompt,
  shouldAutofill,
  windowId
}) {
  const tab = await openPlatformTab(url, windowId);
  if (!shouldAutofill || !prompt || !tab?.id) {
    return tab;
  }
  try {
    await autofillPromptInTab(tab.id, prompt);
  } catch (error) {
    console.warn("[Image2Prompt] Unable to autofill AI platform prompt:", error);
  }
  return tab;
}

async function autofillPromptInTab(tabId, prompt) {
  const deadline = Date.now() + 12000;
  while (Date.now() < deadline) {
    const tab = await getTab(tabId);
    if (!tab) {
      return false;
    }
    if (tab.status === "complete") {
      const response = await sendMessageToTabEnsured(tabId, {
        type: "platformAutofillPrompt",
        prompt
      }).catch(() => null);
      if (response?.success) {
        return true;
      }
    }
    await wait(400);
  }
  return false;
}

async function sendMessageToTabEnsured(tabId, message) {
  try {
    return await sendMessageToTab(tabId, message);
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error || "");
    const shouldInject =
      /Receiving end does not exist/i.test(reason) ||
      /Could not establish connection/i.test(reason);
    if (!shouldInject) {
      throw error;
    }
    await ensureContentScriptInjected(tabId);
    return sendMessageToTab(tabId, message);
  }
}

async function getTab(tabId) {
  return new Promise((resolve) => {
    chrome.tabs.get(tabId, (tab) => {
      if (chrome.runtime.lastError) {
        resolve(null);
        return;
      }
      resolve(tab);
    });
  });
}

async function wait(duration) {
  return new Promise((resolve) => setTimeout(resolve, duration));
}

function derivePlatformPromptText(prompt, promptLanguage) {
  const parsed = parseJsonObjectFromText(prompt);
  const promptText =
    parsed && typeof parsed === "object" && !Array.isArray(parsed)
      ? parsed.prompt_text
      : null;
  const zh = typeof promptText?.zh === "string" ? promptText.zh.trim() : "";
  const en = typeof promptText?.en === "string" ? promptText.en.trim() : "";
  const preferChinese =
    typeof promptLanguage === "string" && promptLanguage.toLowerCase().startsWith("zh");

  if (preferChinese && zh) {
    return zh;
  }
  if (en) {
    return en;
  }
  if (zh) {
    return zh;
  }
  return prompt;
}

function shouldAutofillPlatformPrompt(platformId, template) {
  return (
    typeof platformId === "string" &&
    platformId.startsWith("custom-")
  );
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

async function safeReadJson(response) {
  try {
    return await response.json();
  } catch (error) {
    return null;
  }
}

function getLanguageDirective(code) {
  if (!code) {
    return "";
  }
  const entry = PROMPT_LANGUAGE_RULES[code] ?? PROMPT_LANGUAGE_RULES["en-US"];
  return entry.directive;
}

function buildDataUrl(mimeType, base64) {
  if (!base64) {
    return "";
  }
  const safeMime = mimeType || "image/png";
  return `data:${safeMime};base64,${base64}`;
}

function appendGenerationHistorySafe(entry) {
  appendGenerationHistory(entry).catch((error) => {
    console.warn("[Image2Prompt] Unable to store generation history:", error);
  });
}

async function appendGenerationHistory(entry) {
  const sanitized = sanitizeHistoryEntry(entry);
  if (!sanitized) {
    return;
  }

  const history = (await readGenerationHistory())
    .map(sanitizeHistoryEntry)
    .filter(Boolean);
  history.unshift(sanitized);
  if (history.length > MAX_HISTORY_ENTRIES) {
    history.length = MAX_HISTORY_ENTRIES;
  }
  await writeGenerationHistory(history);
}

function sanitizeHistoryEntry(entry) {
  if (!entry || !entry.prompt) {
    return null;
  }
  const id = entry.id || `hist-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const rawProviderName = entry.provider ? String(entry.provider) : "";
  let providerId = entry.providerId ? normalizeProviderId(entry.providerId) : "";
  if (!providerId && rawProviderName) {
    providerId = inferProviderIdFromName(rawProviderName);
  }
  if (!providerId) {
    providerId = DEFAULT_PROVIDER_ID;
  }
  const providerDescriptor = LLM_PROVIDERS[providerId];
  const providerName =
    rawProviderName ||
    providerDescriptor?.name ||
    PROVIDER_DEFAULTS[providerId]?.name ||
    PROVIDER_DEFAULTS[DEFAULT_PROVIDER_ID].name;
  const defaultModel = PROVIDER_DEFAULTS[providerId]?.model || "";
  return {
    id,
    prompt: String(entry.prompt || ""),
    provider: providerName,
    providerId,
    model: entry.model ? String(entry.model) : defaultModel,
    platformName: entry.platformName || "",
    platformId: entry.platformId || "",
    platformUrl: entry.platformUrl || "",
    imageDataUrl: entry.imageDataUrl || "",
    imageAlt: entry.imageAlt || "",
    createdAt: Number(entry.createdAt) || Date.now(),
    customInstruction: entry.customInstruction
      ? String(entry.customInstruction)
      : ""
  };
}

function readGenerationHistory() {
  return new Promise((resolve) => {
    chrome.storage.local.get({ [HISTORY_STORAGE_KEY]: [] }, (items) => {
      const list = items?.[HISTORY_STORAGE_KEY];
      resolve(Array.isArray(list) ? list : []);
    });
  });
}

function writeGenerationHistory(history) {
  return new Promise((resolve, reject) => {
    chrome.storage.local.set({ [HISTORY_STORAGE_KEY]: history }, () => {
      if (chrome.runtime.lastError) {
        reject(chrome.runtime.lastError);
      } else {
        resolve();
      }
    });
  });
}

function resolveProvider(config) {
  const providerId = normalizeProviderId(config.llmProvider);
  const provider = LLM_PROVIDERS[providerId] || LLM_PROVIDERS[DEFAULT_PROVIDER_ID];
  const settingsSource =
    config.providerSettings?.[providerId] || createDefaultProviderSettings()[providerId];
  return {
    providerId,
    provider,
    settings: {
      apiKey: settingsSource?.apiKey ? String(settingsSource.apiKey) : "",
      baseUrl: sanitizeProviderBaseUrl(settingsSource?.baseUrl),
      model: settingsSource?.model
        ? String(settingsSource.model)
        : provider.defaultModel
    }
  };
}

function sanitizeConfig(raw) {
  const merged = { ...DEFAULT_CONFIG, ...raw };
  const providerSettings = sanitizeProviderSettings(raw?.providerSettings, raw);
  merged.providerSettings = providerSettings;
  merged.llmProvider = normalizeProviderId(raw?.llmProvider ?? merged.llmProvider);
  merged.geminiApiKey = providerSettings.gemini.apiKey;
  merged.model = providerSettings.gemini.model;
  merged.zhipuApiKey = providerSettings.zhipu.apiKey;
  merged.zhipuModel = providerSettings.zhipu.model;
  merged.enableCustomPromptInput = merged.enableCustomPromptInput === true;
  merged.removeWatermark = raw?.removeWatermark === true;

  // Auto-migrate: replace legacy promptInstruction defaults with the optimized JSON default
  const LEGACY_INSTRUCTIONS = [
    ...LEGACY_SIMPLE_PROMPT_INSTRUCTIONS,
    PREVIOUS_VERBOSE_JSON_PROMPT_INSTRUCTION
  ];
  if (
    typeof merged.promptInstruction === "string" &&
    LEGACY_INSTRUCTIONS.some(
      (legacy) => merged.promptInstruction.trim() === legacy.trim()
    )
  ) {
    merged.promptInstruction = DEFAULT_CONFIG.promptInstruction;
    // Persist the migration so it only triggers once
    try {
      chrome.storage.sync.set({ promptInstruction: DEFAULT_CONFIG.promptInstruction });
    } catch (e) {
      // ignore storage errors during migration
    }
  }
  merged.imageTextTranslationTarget = normalizeImageTextTranslationTarget(
    raw?.imageTextTranslationTarget
  );
  merged.aspectRatio = normalizeAspectRatio(raw?.aspectRatio);
  merged.customAspectRatio = merged.aspectRatio === "custom"
    ? sanitizeAspectRatio(raw?.customAspectRatio)
    : "";
  merged.promptRichness = normalizePromptRichness(raw?.promptRichness);
  merged.domainFilters = sanitizeDomainFilters(raw?.domainFilters);
  return merged;
}

function normalizeAspectRatio(value) {
  const allowed = new Set([
    "auto",
    "21:9",
    "16:9",
    "3:2",
    "4:3",
    "1:1",
    "3:4",
    "2:3",
    "9:16",
    "custom"
  ]);
  if (typeof value !== "string") {
    return DEFAULT_CONFIG.aspectRatio;
  }
  return allowed.has(value) ? value : DEFAULT_CONFIG.aspectRatio;
}

function normalizeImageTextTranslationTarget(value) {
  if (typeof value !== "string") {
    return DEFAULT_CONFIG.imageTextTranslationTarget;
  }
  const trimmed = value.trim();
  if (!trimmed) {
    return DEFAULT_CONFIG.imageTextTranslationTarget;
  }
  return Object.prototype.hasOwnProperty.call(PROMPT_LANGUAGE_RULES, trimmed)
    ? trimmed
    : DEFAULT_CONFIG.imageTextTranslationTarget;
}

function sanitizeAspectRatio(value) {
  if (typeof value !== "string") {
    return "";
  }
  const trimmed = value.trim();
  if (!trimmed) {
    return "";
  }
  const normalized = trimmed.replace(/\s+/g, "").replace(/x/gi, ":");
  if (/^\d+(?:\.\d+)?:\d+(?:\.\d+)?$/.test(normalized)) {
    return normalized;
  }
  return "";
}

function composeAspectRatioInstruction(aspectRatio, customAspectRatio) {
  const normalized = normalizeAspectRatio(aspectRatio);
  if (normalized === "auto") {
    return "";
  }
  const ratioValue = normalized === "custom"
    ? sanitizeAspectRatio(customAspectRatio)
    : normalized;
  if (!ratioValue) {
    return "";
  }
  return `Please ensure the generated image matches an aspect ratio of ${ratioValue}.`;
}

function appendAspectRatioToPrompt(prompt, aspectRatio, customAspectRatio) {
  const normalized = normalizeAspectRatio(aspectRatio);
  if (normalized === "auto") {
    return prompt;
  }
  const ratioValue = normalized === "custom"
    ? sanitizeAspectRatio(customAspectRatio)
    : normalized;
  if (!ratioValue) {
    return prompt;
  }
  const lowerPrompt = prompt.toLowerCase();
  const ratioLower = ratioValue.toLowerCase();
  const ratioWithX = ratioLower.replace(":", "x");
  if (lowerPrompt.includes(ratioLower) || lowerPrompt.includes(ratioWithX)) {
    return prompt;
  }
  const parsed = parseJsonObjectFromText(prompt);
  if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
    const next = {
      ...parsed,
      meta: {
        ...(parsed.meta && typeof parsed.meta === "object" ? parsed.meta : {}),
        aspect_ratio: ratioValue
      }
    };
    return JSON.stringify(next, null, 2);
  }
  return `${prompt}\n\nAspect ratio: ${ratioValue}`;
}

function getPromptLanguageName(code) {
  if (!code) {
    return "";
  }
  return PROMPT_LANGUAGE_RULES[code]?.name || code;
}

function getRichnessInstruction(richness) {
  const normalized = normalizePromptRichness(richness);
  const instructions = {
    concise:
      'Prioritize only the most recreation-critical details. Keep field values short. You may leave secondary_subjects empty and use "unknown" for uncertain camera, post_processing, or fine-detail fields instead of guessing. Limit color.palette to 1-3 key colors. Keep prompt_text.en and prompt_text.zh to 1-2 compact sentences.',
    standard:
      "Provide balanced detail across the JSON. Fill clearly observable fields, but keep uncertain fields brief. Include 3-5 key colors, the main lighting setup, and the most important composition cues. Keep prompt_text.en and prompt_text.zh to 2-3 sentences.",
    detailed:
      "Provide comprehensive detail for the major fields. Describe key materials, textures, lighting direction, notable shadows, and spatial relationships. Include 4-6 colors with hex values for the most visible tones. Keep prompt_text.en and prompt_text.zh to 3-5 sentences.",
    "very-detailed":
      'Be exhaustive in every field. Fill every field based on what you observe; when something cannot be determined, use a reasonable estimate or "unknown". Describe all notable colors with precise hex codes, analyze every visible light source and shadow, identify textures and materials, map spatial relationships and proportions, and capture subtle gradients and transitions. Keep prompt_text.en and prompt_text.zh extremely thorough (5-8 sentences), preserving the current maximum level of fidelity.'
  };
  return instructions[normalized] || instructions["standard"];
}

function getPromptMaxOutputTokens(richness) {
  const normalized = normalizePromptRichness(richness);
  return (
    PROMPT_RICHNESS_OUTPUT_BUDGETS[normalized] ||
    PROMPT_RICHNESS_OUTPUT_BUDGETS[DEFAULT_CONFIG.promptRichness]
  );
}

function normalizePromptRichness(value) {
  const allowed = new Set(["concise", "standard", "detailed", "very-detailed"]);
  if (typeof value === "string" && allowed.has(value)) {
    return value;
  }
  return DEFAULT_CONFIG.promptRichness || "standard";
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
  domain = domain.replace(/^\.+/, "");
  if (domain.startsWith("www.")) {
    domain = domain.slice(4);
  }
  domain = domain.replace(/\.$/, "");
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

function extractHostnameFromSender(sender) {
  const url = sender?.tab?.url;
  if (!url) {
    return "";
  }
  try {
    const parsed = new URL(url);
    return normalizeHostname(parsed.hostname || "");
  } catch (error) {
    return "";
  }
}

function sanitizeProviderSettings(raw, legacySource = {}) {
  const result = createDefaultProviderSettings();
  if (raw && typeof raw === "object") {
    Object.entries(raw).forEach(([providerId, entry]) => {
      if (!entry || typeof entry !== "object") {
        return;
      }
      const normalized = normalizeProviderId(providerId);
      result[normalized] = {
        apiKey: entry.apiKey ? String(entry.apiKey) : "",
        baseUrl: sanitizeProviderBaseUrl(entry.baseUrl),
        model: entry.model
          ? String(entry.model)
          : PROVIDER_DEFAULTS[normalized]?.model || ""
      };
    });
  }

  if (Object.prototype.hasOwnProperty.call(legacySource, "geminiApiKey")) {
    result.gemini.apiKey = legacySource.geminiApiKey
      ? String(legacySource.geminiApiKey)
      : "";
  }
  if (Object.prototype.hasOwnProperty.call(legacySource, "model")) {
    result.gemini.model = legacySource.model
      ? String(legacySource.model)
      : PROVIDER_DEFAULTS.gemini.model;
  }
  if (Object.prototype.hasOwnProperty.call(legacySource, "zhipuApiKey")) {
    result.zhipu.apiKey = legacySource.zhipuApiKey
      ? String(legacySource.zhipuApiKey)
      : "";
  }
  if (Object.prototype.hasOwnProperty.call(legacySource, "zhipuModel")) {
    result.zhipu.model = legacySource.zhipuModel
      ? String(legacySource.zhipuModel)
      : PROVIDER_DEFAULTS.zhipu.model;
  }

  return result;
}

function createDefaultProviderSettings() {
  const defaults = {};
  Object.entries(PROVIDER_DEFAULTS).forEach(([id, descriptor]) => {
    defaults[id] = {
      apiKey: "",
      baseUrl: descriptor.baseUrl || "",
      model: descriptor.model
    };
  });
  return defaults;
}

function normalizeProviderId(value) {
  if (!value) {
    return DEFAULT_PROVIDER_ID;
  }
  const id = String(value).toLowerCase();
  return LLM_PROVIDERS[id]?.id || DEFAULT_PROVIDER_ID;
}

function inferProviderIdFromName(name) {
  if (!name) {
    return "";
  }
  const lower = String(name).toLowerCase();
  if (lower.includes("zhipu") || lower.includes("glm") || lower.includes("智谱")) {
    return "zhipu";
  }
  if (lower.includes("gemini")) {
    return "gemini";
  }
  if (
    lower.includes("newapi") ||
    lower.includes("relay") ||
    lower.includes("openai-compatible") ||
    lower.includes("兼容")
  ) {
    return "custom-openai";
  }
  return "";
}

function sanitizeProviderBaseUrl(value) {
  if (typeof value !== "string") {
    return "";
  }
  return value.trim().replace(/\s+/g, "");
}

function maskSecret(value) {
  if (typeof value !== "string" || !value) {
    return "";
  }
  if (value.length <= 8) {
    return "********";
  }
  return `${value.slice(0, 4)}...${value.slice(-4)}`;
}
