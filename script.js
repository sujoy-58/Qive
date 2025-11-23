// ============ CONFIG ============
const QUOTES_API_KEY = "tBEAzH8EoZjhGeoVP5qnEQ==YJ30wWOBGVGjmYgc"; // <-- put your API Ninjas key
const QUOTES_API_URL = "https://api.api-ninjas.com/v2/randomquotes";
const WIKI_API_BASE = "https://en.wikipedia.org/api/rest_v1/page/summary/";

// Only these categories, random between them on each fetch (v2 behavior)
const QUOTE_CATEGORIES = [
  "wisdom",
  "philosophy",
  "life",
  "truth",
  "inspirational",
  "relationships",
  "love",
  "faith",
  "humor",
  "success",
  "courage",
  "happiness",
  "art",
  "writing",
  "fear",
  "nature",
  "time",
  "freedom",
  "death",
  "leadership",
];

// ============ DOM ELEMENT REFERENCES ============
// Quote display elements
const quoteTextEl = document.getElementById("quoteText");
const quoteAuthorEl = document.getElementById("quoteAuthor");
const quoteCategoryEl = document.getElementById("quoteCategory");
const quoteCountLabelEl = document.getElementById("quoteCountLabel");
const authorInitialsEl = document.getElementById("authorInitials");

// Context panel elements
const authorBioEl = document.getElementById("authorBio");
const authorReadMoreEl = document.getElementById("authorReadMore");
const quoteApplicationEl = document.getElementById("quoteApplication");
const reflectionListEl = document.getElementById("reflectionList");

// Statistics elements
const statCountEl = document.getElementById("statCount");
const savedCountEl = document.getElementById("savedCount");
const savedQuotesContainer = document.getElementById("savedQuotesContainer");

// Action button elements
const newQuoteBtn = document.getElementById("newQuoteBtn");
const copyQuoteBtn = document.getElementById("copyQuoteBtn");
const saveLocalBtn = document.getElementById("saveLocalBtn");
const headerRandomBtn = document.getElementById("headerRandomBtn");
const toastEl = document.getElementById("toast");

// Journaling elements
const reflectionInputEl = document.getElementById("reflectionInput");
const saveReflectionBtn = document.getElementById("saveReflectionBtn");

// Settings panel elements
const settingsToggle = document.getElementById("settingsToggle");
const settingsPanel = document.getElementById("settingsPanel");
const closeSettings = document.getElementById("closeSettings");
const fontStyleSelect = document.getElementById("fontStyle");
const textSizeSelect = document.getElementById("textSize");
const themeSelect = document.getElementById("theme");

// Quote analysis elements
const toggleAnalysisBtn = document.getElementById("toggleAnalysis");
const analysisContent = document.querySelector(".analysis-content");
const wordCountEl = document.getElementById("wordCount");
const readingTimeEl = document.getElementById("readingTime");
const sentimentScoreEl = document.getElementById("sentimentScore");
const complexityLevelEl = document.getElementById("complexityLevel");
const themeTagsEl = document.getElementById("themeTags");
const shareTwitterBtn = document.getElementById("shareTwitter");
const shareThreadsBtn = document.getElementById("shareThreads");
const copyAsImageBtn = document.getElementById("copyAsImage");

// Saved quotes action elements
const clearAllSavedBtn = document.getElementById("clearAllSaved");
const exportSavedBtn = document.getElementById("exportSaved");

// ============ APPLICATION STATE ============
let quoteCounter = 0;           // Track how many quotes have been viewed
let isLoading = false;          // Prevent multiple simultaneous API calls
let currentQuoteObject = null;  // Store the current quote data
let isUsingFallbackAPI = false; // Track if we're using fallback API

// LocalStorage keys for persistent data
const SAVED_KEY = "quotify_saved_quotes_v1";      // Saved quotes storage key
const JOURNAL_KEY = "quotify_journal_entries_v1"; // Journal notes storage key
const SETTINGS_KEY = "quotify_settings_v1";       // User preferences storage key

// Map fontStyle values -> CSS classes on <body>
const FONT_CLASS_MAP = {
  sans: "font-sans",          // DM Sans – default
  inter: "font-inter",        // Inter
  cormorant: "font-cormorant",// Cormorant SC
  kalam: "font-kalam",        // Kalam
  comic: "font-comic"         // Comic Relief
};

/**
 * Apply a font style key by updating body classes
 * @param {string} styleKey
 */
function applyFontStyle(styleKey) {
  // Remove all font-* classes
  Object.values(FONT_CLASS_MAP).forEach((cls) =>
    document.body.classList.remove(cls)
  );

  // Backwards compatibility: old saved value "serif"
  if (styleKey === "serif") styleKey = "sans";

  const cls = FONT_CLASS_MAP[styleKey] || FONT_CLASS_MAP["sans"];
  document.body.classList.add(cls);
}

// ============ UTILITY FUNCTIONS ============

/**
 * Format category text to be more readable
 */
function prettifyCategory(cat) {
  if (!cat) return "General";
  return cat.charAt(0).toUpperCase() + cat.slice(1);
}

/**
 * Set the UI to loading state when fetching new quote
 */
function setLoadingState() {
  isLoading = true;
  quoteTextEl.style.opacity = "0.5";
  quoteTextEl.textContent = "Finding something worth reading…";
  authorBioEl.textContent = "Looking up the author for some context…";

  if (authorReadMoreEl) {
    authorReadMoreEl.classList.add("hidden");
  }

  // Clear journaling input and reset analysis
  reflectionInputEl.value = "";
  resetAnalysisDisplay();
}

/**
 * Reset the analysis display to default values
 */
function resetAnalysisDisplay() {
  wordCountEl.textContent = "—";
  readingTimeEl.textContent = "—";
  sentimentScoreEl.textContent = "—";
  sentimentScoreEl.className = "analysis-value";
  complexityLevelEl.textContent = "—";
  complexityLevelEl.className = "analysis-value";
  themeTagsEl.innerHTML = "";
}

/**
 * Clear the loading state after quote is loaded
 */
function clearLoadingState() {
  isLoading = false;
  quoteTextEl.style.opacity = "1";
}

/**
 * Update the quote counter in the UI
 */
function updateQuoteCount() {
  quoteCounter += 1;
  statCountEl.textContent = quoteCounter;
  quoteCountLabelEl.textContent = `Quote #${quoteCounter}`;
}

/**
 * Extract initials from author name for avatar display
 */
function initialsFromName(name) {
  return name
    .split(" ")
    .filter(Boolean)
    .map((w) => w[0]?.toUpperCase())
    .slice(0, 2)
    .join("");
}

// Toast notification system
let toastTimeout;

/**
 * Show a temporary toast notification to the user
 */
function showToast(msg) {
  toastEl.textContent = msg;
  toastEl.classList.add("show");
  clearTimeout(toastTimeout);
  toastTimeout = setTimeout(() => toastEl.classList.remove("show"), 2000);
}

// ============ SETTINGS MANAGEMENT ============

/**
 * Load user settings from localStorage and apply them
 */
function loadSettings() {
  const raw = localStorage.getItem(SETTINGS_KEY);
  if (!raw) {
    if (fontStyleSelect) fontStyleSelect.value = "sans";
    if (textSizeSelect) textSizeSelect.value = "normal";
    if (themeSelect) themeSelect.value = "light";

    applyFontStyle("sans");
    document.body.classList.toggle("text-large", false);
    document.body.setAttribute("data-theme", "light");
    return;
  }

  try {
    const settings = JSON.parse(raw);

    // ----- FONT STYLE -----
    let fontStyle = settings.fontStyle || "sans";

    if (fontStyle === "crimson") fontStyle = "cormorant";
    if (fontStyle === "dmserif") fontStyle = "cormorant";
    if (fontStyle === "literata") fontStyle = "sans";
    if (fontStyle === "serif") fontStyle = "cormorant";
    if (fontStyle === "sans") fontStyle = "sans";

    const allowedFontStyles = ["sans", "inter", "cormorant", "kalam", "comic"];
    if (!allowedFontStyles.includes(fontStyle)) {
      fontStyle = "sans";
    }

    if (fontStyleSelect) {
      fontStyleSelect.value = fontStyle;
    }

    applyFontStyle(fontStyle);

    // ----- TEXT SIZE -----
    if (settings.textSize) {
      if (textSizeSelect) textSizeSelect.value = settings.textSize;
      document.body.classList.toggle(
        "text-large",
        settings.textSize === "large"
      );
    } else {
      if (textSizeSelect) textSizeSelect.value = "normal";
      document.body.classList.toggle("text-large", false);
    }

    // ----- THEME -----
    if (settings.theme) {
      if (themeSelect) themeSelect.value = settings.theme;
      document.body.setAttribute("data-theme", settings.theme);
    } else {
      if (themeSelect) themeSelect.value = "light";
      document.body.setAttribute("data-theme", "light");
    }
  } catch (err) {
    console.error("Error loading settings:", err);
  }
}

/**
 * Save current settings to localStorage
 */
function saveSettings() {
  const settings = {
    fontStyle: fontStyleSelect ? fontStyleSelect.value : "sans",
    textSize: textSizeSelect ? textSizeSelect.value : "normal",
    theme: themeSelect ? themeSelect.value : "light",
  };

  localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
}

/**
 * Apply current settings to the UI
 */
function applySettings() {
  const fontStyle = fontStyleSelect ? fontStyleSelect.value : "sans";
  applyFontStyle(fontStyle);

  if (textSizeSelect) {
    document.body.classList.toggle(
      "text-large",
      textSizeSelect.value === "large"
    );
  }

  if (themeSelect) {
    document.body.setAttribute("data-theme", themeSelect.value);
  }

  saveSettings();
}

// ============ QUOTE FETCHING AND DISPLAY ============

/**
 * Fetch a new quote from the primary API (API Ninjas v2)
 */
async function fetchQuote() {
  if (isLoading) return;

  setLoadingState();
  isUsingFallbackAPI = false;

  try {
    const randomCategory =
      QUOTE_CATEGORIES[Math.floor(Math.random() * QUOTE_CATEGORIES.length)];

    const url = `${QUOTES_API_URL}?categories=${encodeURIComponent(
      randomCategory
    )}`;

    const res = await fetch(url, {
      method: "GET",
      headers: {
        "X-Api-Key": QUOTES_API_KEY,
      },
    });

    if (!res.ok) {
      throw new Error(`Quotes API error: ${res.status}`);
    }

    const data = await res.json();
    if (!Array.isArray(data) || data.length === 0) {
      throw new Error("No quote returned.");
    }

    const quoteObj = data[0];

    const finalQuoteObj = {
      ...quoteObj,
      category: quoteObj.category || randomCategory,
    };

    currentQuoteObject = finalQuoteObj;

    renderQuote(finalQuoteObj);
    updateQuoteCount();

    const authorName = finalQuoteObj.author;
    await fetchAuthorContext(authorName);
    generateApplicationAndReflection(finalQuoteObj.quote);

    loadJournalEntry(finalQuoteObj.quote, authorName);
  } catch (err) {
    console.error("Primary API failed:", err);
    await fetchQuoteFallback();
  } finally {
    clearLoadingState();
  }
}

/**
 * Fallback quote fetching using Quotable API
 */
async function fetchQuoteFallback() {
  try {
    isUsingFallbackAPI = true;
    showToast("Primary source is down, pulling from backup source.");

    const url = "https://api.quotable.io/random";
    const res = await fetch(url);

    if (!res.ok) {
      throw new Error(`Fallback API error: ${res.status}`);
    }

    const quoteObj = await res.json();
    currentQuoteObject = {
      quote: quoteObj.content,
      author: quoteObj.author,
      category: quoteObj.tags ? quoteObj.tags[0] : "General",
    };

    renderQuote(currentQuoteObject);
    updateQuoteCount();

    const authorName = quoteObj.author;
    await fetchAuthorContext(authorName);
    generateApplicationAndReflection(quoteObj.content);

    loadJournalEntry(quoteObj.content, authorName);
  } catch (err) {
    console.error("Fallback API also failed:", err);
    quoteTextEl.textContent =
      "We couldn't fetch a quote right now. Try again in a moment.";
    quoteAuthorEl.textContent = "System";
    authorInitialsEl.textContent = "!";
    authorBioEl.textContent =
      "No author context available at the moment.";
    if (authorReadMoreEl) authorReadMoreEl.classList.add("hidden");
  }
}

/**
 * Render a quote object to the UI
 */
function renderQuote(quoteObj) {
  const { quote, author, category } = quoteObj;

  quoteTextEl.textContent = quote || "No quote text provided.";
  quoteAuthorEl.textContent = author || "Unknown";

  quoteCategoryEl.textContent = category
    ? prettifyCategory(category)
    : "General";

  const initials = initialsFromName(author || "Unknown");
  authorInitialsEl.textContent = initials || "QV";

  analyzeQuote(quote);
}

// ============ AUTHOR CONTEXT (WIKIPEDIA + SEARCH) ============

/**
 * Fetch author biography using Wikipedia with search fallback.
 */
async function fetchAuthorContext(authorName) {
  if (!authorName || typeof authorName !== "string") {
    authorBioEl.textContent =
      "No author information is attached to this quote.";
    if (authorReadMoreEl) authorReadMoreEl.classList.add("hidden");
    return;
  }

  const cleaned = authorName.trim();
  if (!cleaned || cleaned.toLowerCase() === "unknown") {
    authorBioEl.textContent =
      "No author information is attached to this quote.";
    if (authorReadMoreEl) authorReadMoreEl.classList.add("hidden");
    return;
  }

  try {
    const info = await getAuthorSummary(cleaned);

    if (info && info.summary) {
      renderAuthorBio(info.summary, info.url, info.truncated);
    } else {
      authorBioEl.textContent =
        "Couldn't find a compact biography, but this author is well-cited in modern quote collections.";
      if (authorReadMoreEl) authorReadMoreEl.classList.add("hidden");
    }
  } catch (err) {
    console.error("Author context error:", err);
    authorBioEl.textContent =
      "Couldn't find a compact biography, but this author is well-cited in modern quote collections.";
    if (authorReadMoreEl) authorReadMoreEl.classList.add("hidden");
  }
}

/**
 * Try to get an author summary using Wikipedia (with search fallback).
 */
async function getAuthorSummary(authorName) {
  const wikiSummary = await getWikiSummaryFromWikipedia(authorName);
  return wikiSummary || null;
}

/**
 * Get Wikipedia summary for a given author.
 */
async function getWikiSummaryFromWikipedia(authorName) {
  try {
    if (!authorName) return null;

    let base = authorName
      .replace(/\s+/g, " ")
      .replace(/[.,]$/g, "")
      .trim();

    base = base.split("(")[0].split(",")[0].trim();
    if (!base) return null;

    const parts = base.split(" ");
    const firstLast =
      parts.length >= 2 ? `${parts[0]} ${parts[parts.length - 1]}` : base;

    const candidateTitles = Array.from(
      new Set([base, firstLast])
    ).map((title) => title.replace(/\s+/g, "_"));

    async function fetchSummaryForTitle(title) {
      const url = `${WIKI_API_BASE}${encodeURIComponent(
        title
      )}?redirect=true`;

      const res = await fetch(url);
      if (!res.ok) return null;

      const data = await res.json();
      if (
        data &&
        typeof data.extract === "string" &&
        data.extract.trim().length > 0
      ) {
        const extract = data.extract.trim();
        let truncated = extract;
        let truncatedFlag = false;

        if (extract.length > 450) {
          truncated = extract.slice(0, 430).trimEnd() + "…";
          truncatedFlag = true;
        }

        const pageUrl =
          (data.content_urls &&
            data.content_urls.desktop &&
            data.content_urls.desktop.page) ||
          `https://en.wikipedia.org/wiki/${encodeURIComponent(title)}`;

        return {
          summary: truncated,
          url: pageUrl,
          truncated: truncatedFlag,
        };
      }
      return null;
    }

    // Try direct summary
    for (const title of candidateTitles) {
      const result = await fetchSummaryForTitle(title);
      if (result) return result;
    }

    // Search API fallback
    const searchUrl =
      `https://en.wikipedia.org/w/api.php?` +
      `action=query&list=search&srsearch=${encodeURIComponent(
        base
      )}&format=json&origin=*`;

    const searchRes = await fetch(searchUrl);
    if (!searchRes.ok) return null;

    const searchData = await searchRes.json();
    const hits =
      searchData &&
      searchData.query &&
      Array.isArray(searchData.query.search)
        ? searchData.query.search
        : [];

    if (!hits.length) return null;

    const bestTitle = hits[0].title;
    if (!bestTitle) return null;

    const finalSummary = await fetchSummaryForTitle(bestTitle);
    return finalSummary;
  } catch (err) {
    console.error("Error in getWikiSummaryFromWikipedia:", err);
    return null;
  }
}

/**
 * Render the author biography and handle "Read more" link visibility.
 */
function renderAuthorBio(summary, url, truncated) {
  authorBioEl.textContent = summary;

  if (!authorReadMoreEl) return;

  if (url && truncated) {
    authorReadMoreEl.href = url;
    authorReadMoreEl.classList.remove("hidden");
  } else {
    authorReadMoreEl.classList.add("hidden");
  }
}

// ============ QUOTE ANALYSIS SYSTEM ============

/**
 * Analyze a quote and update the analysis panel
 */
function analyzeQuote(quoteText) {
  if (!quoteText) return;

  const words = quoteText.trim().split(/\s+/).length;
  wordCountEl.textContent = words;

  const readingTimeMinutes = words / 200;
  const readingTimeSeconds = Math.ceil(readingTimeMinutes * 60);
  readingTimeEl.textContent =
    readingTimeSeconds <= 60
      ? `${readingTimeSeconds}s`
      : `${Math.ceil(readingTimeMinutes)}min`;

  const sentiment = analyzeSentiment(quoteText);
  sentimentScoreEl.textContent = sentiment.score;
  sentimentScoreEl.className = `analysis-value sentiment-${sentiment.label}`;

  const complexity = analyzeComplexity(quoteText);
  complexityLevelEl.textContent = complexity.level;
  complexityLevelEl.className = `analysis-value complexity-${complexity.level}`;

  const themes = detectThemes(quoteText);
  renderThemeTags(themes);
}

/**
 * Simple sentiment analysis based on keyword matching
 */
function analyzeSentiment(text) {
  const positiveWords = [
    "love",
    "happy",
    "great",
    "beautiful",
    "wonderful",
    "amazing",
    "best",
    "excellent",
    "fantastic",
    "perfect",
    "joy",
    "peace",
    "hope",
    "success",
    "win",
    "achievement",
  ];
  const negativeWords = [
    "hate",
    "sad",
    "terrible",
    "awful",
    "horrible",
    "worst",
    "bad",
    "failure",
    "lost",
    "pain",
    "suffering",
    "death",
    "fear",
    "angry",
    "mad",
  ];

  const words = text.toLowerCase().split(/\s+/);
  let positiveCount = 0;
  let negativeCount = 0;

  words.forEach((word) => {
    if (positiveWords.some((pw) => word.includes(pw))) positiveCount++;
    if (negativeWords.some((nw) => word.includes(nw))) negativeCount++;
  });

  const total = positiveCount + negativeCount;
  if (total === 0) return { score: "Neutral", label: "neutral" };

  const ratio = positiveCount / total;

  if (ratio > 0.6) return { score: "Positive", label: "positive" };
  if (ratio < 0.4) return { score: "Negative", label: "negative" };
  return { score: "Neutral", label: "neutral" };
}

/**
 * Analyze text complexity based on sentence and word length
 */
function analyzeComplexity(text) {
  const words = text.split(/\s+/);
  const sentences = text
    .split(/[.!?]+/)
    .filter((s) => s.trim().length > 0);
  const avgSentenceLength = words.length / sentences.length;
  const avgWordLength =
    text.replace(/[^a-zA-Z]/g, "").length / words.length;

  let complexityScore = avgSentenceLength * 0.5 + avgWordLength * 0.5;

  if (complexityScore < 4)
    return { level: "Simple", score: complexityScore };
  if (complexityScore < 6)
    return { level: "Medium", score: complexityScore };
  return { level: "Complex", score: complexityScore };
}

/**
 * Detect themes in the quote text based on keyword patterns
 */
function detectThemes(text) {
  const lowerText = text.toLowerCase();
  const themes = [];

  const themePatterns = {
    Wisdom: ["wisdom", "knowledge", "learn", "understand", "truth"],
    Love: ["love", "heart", "care", "affection", "compassion"],
    Success: ["success", "achieve", "win", "victory", "goal", "dream"],
    Time: ["time", "moment", "past", "future", "present", "now"],
    Courage: ["courage", "brave", "fear", "risk", "bold"],
    Work: ["work", "effort", "labor", "persistence", "hard"],
    Life: ["life", "live", "experience", "journey", "path"],
    Hope: ["hope", "faith", "believe", "optimism", "positive"],
    Change: ["change", "grow", "evolve", "transform", "become"],
  };

  Object.entries(themePatterns).forEach(([theme, keywords]) => {
    if (keywords.some((keyword) => lowerText.includes(keyword))) {
      themes.push(theme);
    }
  });

  if (themes.length === 0) {
    if (text.length < 50) themes.push("Reflection");
    else if (text.length > 150) themes.push("Philosophy");
    else themes.push("Inspiration");
  }

  return themes.slice(0, 3);
}

/**
 * Render theme tags
 */
function renderThemeTags(themes) {
  themeTagsEl.innerHTML = "";
  themes.forEach((theme) => {
    const tag = document.createElement("span");
    tag.className = "theme-tag";
    tag.textContent = theme;
    themeTagsEl.appendChild(tag);
  });
}

/**
 * Toggle visibility of the analysis panel
 */
function toggleAnalysis() {
  analysisContent.classList.toggle("hidden");
  toggleAnalysisBtn.textContent = analysisContent.classList.contains(
    "hidden"
  )
    ? "Show Details"
    : "Hide Details";
}

// ============ SOCIAL SHARING FUNCTIONALITY ============

/**
 * Share on Twitter (X)
 * Can be used for current quote OR a saved quote.
 */
function shareOnTwitter(quoteText, authorName) {
  const quote =
    typeof quoteText === "string"
      ? quoteText
      : currentQuoteObject?.quote;
  const author =
    typeof authorName === "string"
      ? authorName
      : currentQuoteObject?.author;

  if (!quote) return;

  const text = `"${quote}" — ${author || "Unknown"}`;
  const url = `https://twitter.com/intent/tweet?text=${encodeURIComponent(
    text
  )}&hashtags=Qive, QiveQuotes, DailyQuotes`;
  window.open(url, "_blank");
}

/**
 * Share on Threads
 */
function shareOnThreads(quoteText, authorName) {
  const quote =
    typeof quoteText === "string"
      ? quoteText
      : currentQuoteObject?.quote;
  const author =
    typeof authorName === "string"
      ? authorName
      : currentQuoteObject?.author;

  if (!quote) return;

  const text = `"${quote}" — ${author || "Unknown"}`;
  const url = `https://threads.net/intent/post?text=${encodeURIComponent(
    text
  )}`;
  window.open(url, "_blank");
}

/**
 * Copy quote as a designed image (PNG) to clipboard or download
 * Can be used for current quote OR a saved quote.
 */
async function copyAsImage(quoteText, authorName) {
  const quote =
    typeof quoteText === "string"
      ? quoteText
      : currentQuoteObject?.quote || "";
  const author =
    typeof authorName === "string"
      ? authorName
      : currentQuoteObject?.author || "Unknown";

  if (!quote) return;

  try {
    const canvas = document.createElement("canvas");
    const width = 900;
    const height = 450;
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");

    const bgGrad = ctx.createLinearGradient(0, 0, width, height);
    bgGrad.addColorStop(0, "#111827");
    bgGrad.addColorStop(1, "#4b5563");
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, width, height);

    const cardX = 36;
    const cardY = 36;
    const cardW = width - cardX * 2;
    const cardH = height - cardY * 2;
    const radius = 24;

    function roundRect(ctx, x, y, w, h, r) {
      ctx.beginPath();
      ctx.moveTo(x + r, y);
      ctx.lineTo(x + w - r, y);
      ctx.quadraticCurveTo(x + w, y, x + w, y + r);
      ctx.lineTo(x + w, y + h - r);
      ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
      ctx.lineTo(x + r, y + h);
      ctx.quadraticCurveTo(x, y + h, x, y + h - r);
      ctx.lineTo(x, y + r);
      ctx.quadraticCurveTo(x, y, x + r, y);
      ctx.closePath();
    }

    ctx.save();
    ctx.shadowColor = "rgba(15, 23, 42, 0.45)";
    ctx.shadowBlur = 24;
    ctx.shadowOffsetY = 16;
    ctx.fillStyle = "#fdfbf7";
    roundRect(ctx, cardX, cardY, cardW, cardH, radius);
    ctx.fill();
    ctx.restore();

    const paddingX = cardX + 40;
    const paddingY = cardY + 70;
    const maxTextWidth = cardW - 80;

    function wrapText(ctx, text, x, y, maxWidth, lineHeight) {
      const words = text.split(/\s+/);
      let line = "";
      let currentY = y;

      for (let i = 0; i < words.length; i++) {
        const testLine = line + words[i] + " ";
        const metrics = ctx.measureText(testLine);
        if (metrics.width > maxWidth && i > 0) {
          ctx.fillText(line, x, currentY);
          line = words[i] + " ";
          currentY += lineHeight;
        } else {
          line = testLine;
        }
      }
      if (line) {
        ctx.fillText(line, x, currentY);
      }
      return currentY + lineHeight;
    }

    ctx.fillStyle = "rgba(148, 163, 184, 0.6)";
    ctx.font = '64px "DM Serif Text", "Crimson Text", serif';
    ctx.fillText("“", paddingX - 10, paddingY - 20);

    ctx.fillStyle = "#111827";
    ctx.font = '26px "DM Serif Text", "Crimson Text", serif';
    ctx.textBaseline = "top";

    let nextY = wrapText(
      ctx,
      quote,
      paddingX,
      paddingY,
      maxTextWidth,
      36
    );

    ctx.font = '18px "Inter", system-ui, sans-serif';
    ctx.fillStyle = "#6b7280";
    ctx.fillText(`— ${author}`, paddingX, nextY + 10);

    ctx.font = '14px "Inter", system-ui, sans-serif';
    ctx.fillStyle = "#9ca3af";
    const footerText = "Saved from Quotify Notes";
    const footerWidth = ctx.measureText(footerText).width;
    ctx.fillText(
      footerText,
      cardX + cardW - 40 - footerWidth,
      cardY + cardH - 40
    );

    const blob = await new Promise((resolve, reject) => {
      canvas.toBlob((b) => {
        if (b) resolve(b);
        else reject(new Error("Failed to create image blob"));
      }, "image/png");
    });

    if (
      navigator.clipboard &&
      navigator.clipboard.write &&
      window.ClipboardItem
    ) {
      const item = new ClipboardItem({ "image/png": blob });
      await navigator.clipboard.write([item]);
      showToast("Quote card copied as image 📷");
    } else {
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "quote-card.png";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      showToast("Image downloaded (clipboard not supported) 💾");
    }
  } catch (err) {
    console.error("Failed to copy as image:", err);
    showToast("Couldn't copy as image 😕");
  }
}

// ============ APPLICATION AND REFLECTION SYSTEM ============

function generateApplicationAndReflection(quoteText) {
  if (!quoteText) {
    quoteApplicationEl.textContent =
      "Reflect on what this means to you personally.";
    reflectionListEl.innerHTML = "";
    return;
  }

  const lower = quoteText.toLowerCase();
  let mainIdea =
    "Use this quote as a lens: what would change if you actually believed this today?";
  let prompts = [
    "Rewrite the quote in your own words in one sentence.",
    "Think of one decision this week that would look different if you applied this idea.",
    "Pick one tiny action (5–10 minutes) that matches this quote and schedule it.",
  ];

  if (
    lower.includes("success") ||
    lower.includes("failure") ||
    lower.includes("goal")
  ) {
    mainIdea =
      "Treat this quote as a new rule for how you approach goals: less obsession with outcome, more focus on repeated small actions.";
    prompts = [
      "Choose one goal you're stuck on and describe why in 1–2 lines.",
      "Break it into the smallest next step you can do in under 15 minutes.",
      "Add that step to today's calendar and actually do it.",
    ];
  } else if (
    lower.includes("fear") ||
    lower.includes("courage") ||
    lower.includes("risk")
  ) {
    mainIdea =
      "Let this quote be a gentle push to move toward something slightly uncomfortable but important.";
    prompts = [
      "Write down one thing you're avoiding because it feels scary or uncertain.",
      "Write the worst realistic outcome and the best realistic outcome.",
      "Commit to a tiny experiment that moves you toward the best outcome.",
    ];
  } else if (
    lower.includes("time") ||
    lower.includes("day") ||
    lower.includes("today")
  ) {
    mainIdea =
      "Use this quote to audit your day: where is your time going versus where you say your priorities are?";
    prompts = [
      "List the top three things you say matter to you.",
      "Look at your last 3 days: where did most of your free time actually go?",
      "Decide one thing you'll remove and one thing you'll add to better match your values.",
    ];
  }

  quoteApplicationEl.textContent = mainIdea;
  reflectionListEl.innerHTML = "";
  prompts.forEach((p) => {
    const li = document.createElement("li");
    li.textContent = p;
    reflectionListEl.appendChild(li);
  });
}

// ============ JOURNALING SYSTEM ============

function loadJournalEntries() {
  const raw = localStorage.getItem(JOURNAL_KEY);
  if (!raw) return {};

  try {
    return JSON.parse(raw);
  } catch {
    return {};
  }
}

function saveJournalEntries(entries) {
  localStorage.setItem(JOURNAL_KEY, JSON.stringify(entries));
}

function loadJournalEntry(quote, author) {
  const entries = loadJournalEntries();
  const key = `${quote}|${author}`;

  if (entries[key]) {
    reflectionInputEl.value = entries[key].note;
  } else {
    reflectionInputEl.value = "";
  }
}

function saveJournalEntry() {
  if (!currentQuoteObject) {
    showToast("Load a quote first.");
    return;
  }

  const note = reflectionInputEl.value.trim();
  if (!note) {
    showToast("Write a note first.");
    return;
  }

  const entries = loadJournalEntries();
  const key = `${currentQuoteObject.quote}|${currentQuoteObject.author}`;

  entries[key] = {
    note: note,
    date: new Date().toISOString(),
  };

  saveJournalEntries(entries);
  showToast("Note saved ✨");
  renderSavedQuotes();
}

// ============ COPY AND SAVE FUNCTIONALITY ============

async function copyQuoteToClipboard() {
  const text = `"${quoteTextEl.textContent.trim()}" — ${quoteAuthorEl.textContent.trim()}`;
  try {
    await navigator.clipboard.writeText(text);
    showToast("Copied to clipboard ✅");
  } catch (err) {
    console.error(err);
    showToast("Unable to copy 😕");
  }
}

function loadSavedQuotes() {
  const raw = localStorage.getItem(SAVED_KEY);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveQuotesToStorage(list) {
  localStorage.setItem(SAVED_KEY, JSON.stringify(list));
}

/**
 * Render saved quotes, including hover actions:
 * - X (Twitter)
 * - Threads
 * - Save as image
 * - Copy
 * - Edit note
 * - Delete
 */
function renderSavedQuotes() {
  const list = loadSavedQuotes();
  const journalEntries = loadJournalEntries();

  savedCountEl.textContent = list.length.toString();
  savedQuotesContainer.innerHTML = "";

  if (list.length === 0) {
    const empty = document.createElement("p");
    empty.textContent =
      "No saved quotes yet. When something hits you, save it.";
    empty.className = "saved-subtitle";
    savedQuotesContainer.appendChild(empty);
    return;
  }

  list.forEach((item, index) => {
    const card = document.createElement("article");
    card.className = "saved-card";

    const q = document.createElement("p");
    q.className = "saved-quote";
    q.textContent = `"${item.quote}"`;

    const a = document.createElement("p");
    a.className = "saved-author";
    a.textContent = `— ${item.author}`;

    card.appendChild(q);
    card.appendChild(a);

    const key = `${item.quote}|${item.author}`;
    if (journalEntries[key]) {
      const note = document.createElement("p");
      note.className = "saved-note";
      note.textContent = journalEntries[key].note;
      card.appendChild(note);

      const date = document.createElement("p");
      date.className = "saved-date";
      const savedDate = new Date(journalEntries[key].date);
      date.textContent = `Saved on ${savedDate.toLocaleDateString()}`;
      card.appendChild(date);
    }

    const actions = document.createElement("div");
    actions.className = "saved-actions-card";

    // --- NEW: Share on X (Twitter) ---
    const twitterBtn = document.createElement("button");
    twitterBtn.className = "btn subtle small icon";
    twitterBtn.title = "Share on X";
    twitterBtn.innerHTML = `<i class="fa-brands fa-x-twitter"></i>`;
    twitterBtn.addEventListener("click", () => {
      shareOnTwitter(item.quote, item.author);
    });

    // --- NEW: Share on Threads ---
    const threadsBtn = document.createElement("button");
    threadsBtn.className = "btn subtle small icon";
    threadsBtn.title = "Share on Threads";
    threadsBtn.innerHTML = `<i class="fa-brands fa-threads"></i>`;
    threadsBtn.addEventListener("click", () => {
      shareOnThreads(item.quote, item.author);
    });

    // --- NEW: Save as Image ---
    const imageBtn = document.createElement("button");
    imageBtn.className = "btn subtle small icon";
    imageBtn.title = "Save as image";
    imageBtn.innerHTML = `<i class="fa-regular fa-image"></i>`;
    imageBtn.addEventListener("click", () => {
      copyAsImage(item.quote, item.author);
    });

    // Copy button
    const copyBtn = document.createElement("button");
    copyBtn.className = "btn subtle small icon";
    copyBtn.title = "Copy quote";
    copyBtn.innerHTML = `
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <rect x="9" y="9" width="13" height="13" rx="2" ry="2" stroke="currentColor" stroke-width="2"/>
        <path d="M5 15H4C2.89543 15 2 14.1046 2 13V4C2 2.89543 2.89543 2 4 2H13C14.1046 2 15 2.89543 15 4V5" stroke="currentColor" stroke-width="2"/>
      </svg>
    `;
    copyBtn.addEventListener("click", () => {
      const text = `"${item.quote}" — ${item.author}`;
      navigator.clipboard
        .writeText(text)
        .then(() => showToast("Copied to clipboard ✅"))
        .catch(() => showToast("Failed to copy"));
    });

    // Edit note button
    const editBtn = document.createElement("button");
    editBtn.className = "btn ghost small icon";
    editBtn.title = journalEntries[key] ? "Edit note" : "Add note";
    editBtn.innerHTML = `
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M11 4H4C3.46957 4 2.96086 4.21071 2.58579 4.58579C2.21071 4.96086 2 5.46957 2 6V20C2 20.5304 2.21071 21.0391 2.58579 21.4142C2.96086 21.7893 3.46957 22 4 22H18C18.5304 22 19.0391 21.7893 19.4142 21.4142C19.7893 21.0391 20 20.5304 20 20V13" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
        <path d="M18.5 2.5C18.8978 2.10217 19.4374 1.87868 20 1.87868C20.5626 1.87868 21.1022 2.10217 21.5 2.5C21.8978 2.89782 22.1213 3.43739 22.1213 4C22.1213 4.56261 21.8978 5.10217 21.5 5.5L12 15L8 16L9 12L18.5 2.5Z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
      </svg>
    `;
    editBtn.addEventListener("click", () => {
      if (
        currentQuoteObject &&
        currentQuoteObject.quote === item.quote &&
        currentQuoteObject.author === item.author
      ) {
        reflectionInputEl.focus();
        showToast("You can edit your note above");
      } else {
        const newNote = prompt(
          "Add or edit your note for this quote:",
          journalEntries[key]?.note || ""
        );
        if (newNote !== null) {
          const entries = loadJournalEntries();
          if (newNote.trim()) {
            entries[key] = {
              note: newNote.trim(),
              date:
                journalEntries[key]?.date ||
                new Date().toISOString(),
            };
            showToast("Note updated ✨");
          } else if (entries[key]) {
            delete entries[key];
            showToast("Note removed");
          }
          saveJournalEntries(entries);
          renderSavedQuotes();
        }
      }
    });

    // Delete button
    const deleteBtn = document.createElement("button");
    deleteBtn.className = "btn danger small icon";
    deleteBtn.title = "Delete quote";
    deleteBtn.innerHTML = `
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M3 6H5H21" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
        <path d="M8 6V4C8 3.46957 8.21071 2.96086 8.58579 2.58579C8.96086 2.21071 9.46957 2 10 2H14C14.5304 2 15.0391 2.21071 15.4142 2.58579C15.7893 2.96086 16 3.46957 16 4V6M19 6V20C19 20.5304 18.7893 21.0391 18.4142 21.4142C18.0391 21.7893 17.5304 22 17 22H7C6.46957 22 5.96086 21.7893 5.58579 21.4142C5.21071 21.0391 5 20.5304 5 20V6H19Z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
      </svg>
    `;
    deleteBtn.addEventListener("click", () => {
      if (
        confirm(
          "Are you sure you want to delete this saved quote?"
        )
      ) {
        const saved = loadSavedQuotes();
        saved.splice(index, 1);
        saveQuotesToStorage(saved);

        const entries = loadJournalEntries();
        if (entries[key]) {
          delete entries[key];
          saveJournalEntries(entries);
        }

        renderSavedQuotes();
        showToast("Quote deleted");
      }
    });

    // Append in a nice order
    actions.appendChild(twitterBtn);
    actions.appendChild(threadsBtn);
    actions.appendChild(imageBtn);
    actions.appendChild(copyBtn);
    actions.appendChild(editBtn);
    actions.appendChild(deleteBtn);

    card.appendChild(actions);
    savedQuotesContainer.appendChild(card);
  });
}

function handleSaveCurrentQuote() {
  if (!currentQuoteObject) {
    showToast("Load a quote first.");
    return;
  }
  const list = loadSavedQuotes();

  const exists = list.some(
    (item) =>
      item.quote === currentQuoteObject.quote &&
      item.author === currentQuoteObject.author
  );
  if (exists) {
    showToast("Already saved.");
    return;
  }

  list.push({
    quote: currentQuoteObject.quote,
    author: currentQuoteObject.author || "Unknown",
  });
  saveQuotesToStorage(list);
  renderSavedQuotes();
  showToast("Saved to your notes ⭐");
}

// ============ SAVED QUOTES MANAGEMENT ============

function clearAllSavedQuotes() {
  const list = loadSavedQuotes();
  if (list.length === 0) {
    showToast("No saved quotes to clear");
    return;
  }

  if (
    confirm(
      `Are you sure you want to delete all ${list.length} saved quotes? This cannot be undone.`
    )
  ) {
    saveQuotesToStorage([]);
    localStorage.setItem(JOURNAL_KEY, JSON.stringify({}));
    renderSavedQuotes();
    showToast("All saved quotes cleared");
  }
}

function exportSavedQuotes() {
  const list = loadSavedQuotes();
  const journalEntries = loadJournalEntries();

  if (list.length === 0) {
    showToast("No saved quotes to export");
    return;
  }

  let exportText = "Quotify Notes Export\n";
  exportText += "====================\n\n";
  exportText += `Exported on: ${new Date().toLocaleDateString()}\n`;
  exportText += `Total quotes: ${list.length}\n\n`;

  list.forEach((item, index) => {
    exportText += `Quote ${index + 1}:\n`;
    exportText += `"${item.quote}"\n`;
    exportText += `— ${item.author}\n`;

    const key = `${item.quote}|${item.author}`;
    if (journalEntries[key]) {
      exportText += `My note: ${journalEntries[key].note}\n`;
      exportText += `Saved on: ${new Date(
        journalEntries[key].date
      ).toLocaleDateString()}\n`;
    }

    exportText += "\n" + "=".repeat(40) + "\n\n";
  });

  const blob = new Blob([exportText], { type: "text/plain" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `quotify-notes-${
    new Date().toISOString().split("T")[0]
  }.txt`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);

  showToast("Quotes exported successfully");
}

// ============ SETTINGS PANEL MANAGEMENT ============

function toggleSettingsPanel() {
  settingsPanel.classList.toggle("hidden");

  let overlay = document.querySelector(".overlay");
  if (!overlay) {
    overlay = document.createElement("div");
    overlay.className = "overlay";
    document.body.appendChild(overlay);

    overlay.addEventListener("click", () => {
      settingsPanel.classList.add("hidden");
      overlay.classList.remove("show");
    });
  }

  if (settingsPanel.classList.contains("hidden")) {
    overlay.classList.remove("show");
  } else {
    overlay.classList.add("show");
  }
}

// ============ EVENT LISTENERS ============

newQuoteBtn.addEventListener("click", fetchQuote);
headerRandomBtn.addEventListener("click", fetchQuote);
copyQuoteBtn.addEventListener("click", copyQuoteToClipboard);
saveLocalBtn.addEventListener("click", handleSaveCurrentQuote);

saveReflectionBtn.addEventListener("click", saveJournalEntry);

settingsToggle.addEventListener("click", toggleSettingsPanel);
closeSettings.addEventListener("click", toggleSettingsPanel);
fontStyleSelect.addEventListener("change", applySettings);
textSizeSelect.addEventListener("change", applySettings);
themeSelect.addEventListener("change", applySettings);

toggleAnalysisBtn.addEventListener("click", toggleAnalysis);

// Wrap to avoid passing event into our functions as first param
shareTwitterBtn.addEventListener("click", () => shareOnTwitter());
shareThreadsBtn.addEventListener("click", () => shareOnThreads());
copyAsImageBtn.addEventListener("click", () => copyAsImage());

clearAllSavedBtn.addEventListener("click", clearAllSavedQuotes);
exportSavedBtn.addEventListener("click", exportSavedQuotes);

document.addEventListener("keydown", (e) => {
  if (e.key === "Escape" && !settingsPanel.classList.contains("hidden")) {
    toggleSettingsPanel();
  }
});

// ============ APPLICATION INITIALIZATION ============

function initApp() {
  loadSettings();
  renderSavedQuotes();
  fetchQuote();
}

initApp();
