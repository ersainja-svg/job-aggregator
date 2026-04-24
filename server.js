require("dotenv").config();

const express = require("express");
const cors = require("cors");
const axios = require("axios");
const path = require("path");
const cheerio = require("cheerio");
const fs = require("fs");
const TelegramBot = require("node-telegram-bot-api");
const { GoogleGenAI } = require("@google/genai");

const app = express();
const PORT = Number(process.env.PORT || 8080);
const HH_AREA = process.env.HH_AREA || "113";
const HH_TEXT = process.env.HH_TEXT || "";
const HH_PER_PAGE = Math.min(Math.max(Number(process.env.HH_PER_PAGE || 100), 1), 100);
const HH_PAGES = Math.min(Math.max(Number(process.env.HH_PAGES || 5), 1), 20);
const HH_DATE_FROM = process.env.HH_DATE_FROM || "";
const HH_DATE_TO = process.env.HH_DATE_TO || "";
const HH_USER_AGENT = process.env.HH_USER_AGENT || "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36";
const REMOTE_JOBS_LIMIT = Math.min(Math.max(Number(process.env.REMOTE_JOBS_LIMIT || 60), 10), 200);
const ARBEITNOW_PAGES = Math.min(Math.max(Number(process.env.ARBEITNOW_PAGES || 3), 1), 10);
const ARBEITNOW_LIMIT = Math.min(Math.max(Number(process.env.ARBEITNOW_LIMIT || 90), 20), 300);
const ENBEK_PAGES = Math.min(Math.max(Number(process.env.ENBEK_PAGES || 10), 1), 30);
const ENBEK_LIMIT = Math.min(Math.max(Number(process.env.ENBEK_LIMIT || 300), 20), 1000);
const NUR_LIMIT = Math.min(Math.max(Number(process.env.NUR_LIMIT || 120), 10), 300);
const OLX_LIMIT = Math.min(Math.max(Number(process.env.OLX_LIMIT || 120), 10), 300);
const KZ_QUERY = process.env.KZ_QUERY || "Казахстан Алматы Астана Шымкент Актау";
const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || "";
const TELEGRAM_CHANNELS = (process.env.TELEGRAM_CHANNELS || "")
  .split(",")
  .map((item) => item.trim().replace(/^@/, ""))
  .filter(Boolean);
const TELEGRAM_LIMIT_PER_CHANNEL = Number(process.env.TELEGRAM_LIMIT_PER_CHANNEL || 20);
const TELEGRAM_CHANNEL_CITY_MAP = {
  // Алматы
  almaty_rabota: "Алматы",
  rabota_v_almaty: "Алматы",
  // Астана
  astana_rabota: "Астана",
  rabota_astana_kz: "Астана",
  // Шымкент
  shymkent_rabota: "Шымкент",
  zhumys_shymkent: "Шымкент",
  // Актау / Мангистау
  rabotaaktau: "Актау",
  aktau_rabota_7: "Актау",
  // Актобе
  aktobe_job: "Актобе",
  aktobe_rabota: "Актобе",
  // Атырау
  atyrau_rabota_1: "Атырау",
  atyrau_job: "Атырау",
  // Караганда / Темиртау
  karaganda_rabota: "Караганда",
  rabota_krg: "Караганда",
  // Павлодар / Экибастуз
  pavlodar_work: "Павлодар",
  pvl_rabota: "Павлодар",
  // Костанай / Рудный
  kostanay_rabota: "Костанай",
  rabota_kst: "Костанай",
  // Кокшетау / Степногорск
  kokshe_rabota: "Кокшетау",
  rabota_kokshetau: "Кокшетау",
  // Петропавловск
  petropavlovsk_job: "Петропавловск",
  sko_rabota: "Петропавловск",
  // Усть-Каменогорск / Семей
  vko_rabota: "Усть-Каменогорск",
  rabota_vko: "Усть-Каменогорск",
  // Талдыкорган / Конаев
  taldykorgan_rabota: "Талдыкорган",
  rabota_taldyk: "Талдыкорган",
  // Тараз
  taraz_rabota: "Тараз",
  zhumys_taraz: "Тараз",
  // Туркестан
  turkestan_zhumys: "Туркестан",
  // Кызылорда
  kyzylorda_rabota: "Кызылорда",
  // Уральск / Аксай
  uralsk_rabota: "Уральск",
  zapad_job: "Уральск",
  // Жезказган / Сатпаев
  zhez_rabota: "Жезказган",
  satpaev_rabota: "Жезказган",
  // Балхаш
  balhash_rabota: "Балхаш",
  // Жанаозен / Кульсары
  rabota_zhanaozen: "Жанаозен",
  zhumys_oil: "Жанаозен",
  // Общие
  kz_jobs: "Казахстан",
};

const DEFAULT_PUBLIC_CHANNELS = Object.keys(TELEGRAM_CHANNEL_CITY_MAP).join(",");
const TELEGRAM_PUBLIC_CHANNELS = (process.env.TELEGRAM_PUBLIC_CHANNELS || DEFAULT_PUBLIC_CHANNELS)
  .split(",")
  .map((item) => item.trim().replace(/^@/, ""))
  .filter(Boolean);
const TELEGRAM_PUBLIC_LIMIT_PER_CHANNEL = Math.min(
  Math.max(Number(process.env.TELEGRAM_PUBLIC_LIMIT_PER_CHANNEL || 40), 5),
  100,
);
const GEMINI_API_KEY = process.env.GEMINI_API_KEY || "";

let bot = null;
if (TELEGRAM_BOT_TOKEN) {
  try {
    bot = new TelegramBot(TELEGRAM_BOT_TOKEN, { polling: true });
    console.log("Telegram Bot started in polling mode.");

    bot.onText(/\/start/, (msg) => {
      const chatId = msg.chat.id;
      bot.sendMessage(
        chatId,
        "Привет! Я бот для уведомлений о новых вакансиях.\n\n" +
        "Чтобы подписаться на новые вакансии определенной категории, отправьте:\n" +
        "`/subscribe <Категория>`\n" +
        "Например: `/subscribe Frontend`\n\n" +
        "Доступные категории: Backend, Frontend, Mobile, Data / Analytics, DevOps / SRE, QA / Testing, Design, Marketing / Sales, Support / Operations.\n\n" +
        "Чтобы отписаться, отправьте:\n`/unsubscribe`",
        { parse_mode: "Markdown" }
      );
    });

    bot.onText(/\/subscribe (.+)/i, (msg, match) => {
      const chatId = msg.chat.id;
      const specialty = match[1].trim();

      const existing = subscriptions.find((s) => s.chatId === chatId);
      if (existing) {
        existing.specialty = specialty;
      } else {
        subscriptions.push({ chatId, specialty });
      }
      saveSubscriptions();

      bot.sendMessage(chatId, `Вы успешно подписались на уведомления о новых вакансиях в категории: *${specialty}*`, { parse_mode: "Markdown" });
    });

    bot.onText(/\/unsubscribe/i, (msg) => {
      const chatId = msg.chat.id;
      subscriptions = subscriptions.filter((s) => s.chatId !== chatId);
      saveSubscriptions();
      bot.sendMessage(chatId, "Вы отписались от уведомлений.");
    });
  } catch (error) {
    console.error("Failed to start Telegram Bot:", error);
  }
}

const aiClient = GEMINI_API_KEY ? new GoogleGenAI({ apiKey: GEMINI_API_KEY }) : null;

const SUBSCRIPTIONS_FILE = path.join(__dirname, "subscriptions.json");
let subscriptions = [];
try {
  if (fs.existsSync(SUBSCRIPTIONS_FILE)) {
    subscriptions = JSON.parse(fs.readFileSync(SUBSCRIPTIONS_FILE, "utf-8"));
  }
} catch (e) {
  console.error("Error reading subscriptions:", e);
}

function saveSubscriptions() {
  fs.writeFileSync(SUBSCRIPTIONS_FILE, JSON.stringify(subscriptions, null, 2));
}

const KZ_SOURCE_CATALOG = [
  { id: "hh", name: "HeadHunter Kazakhstan", type: "website", url: "https://hh.kz", mode: "live" },
  { id: "remotive", name: "Remotive API", type: "website", url: "https://remotive.com", mode: "live" },
  { id: "arbeitnow", name: "Arbeitnow API", type: "website", url: "https://www.arbeitnow.com", mode: "live" },
  { id: "enbek", name: "Enbek.kz", type: "website", url: "https://www.enbek.kz", mode: "live" },
  { id: "rabota-nur", name: "Rabota NUR.KZ", type: "website", url: "https://rabota.nur.kz", mode: "catalog" },
  { id: "olx-kz", name: "OLX Работа KZ", type: "website", url: "https://www.olx.kz/rabota", mode: "live" },
  { id: "linkedin-kz", name: "LinkedIn Jobs KZ", type: "website", url: "https://www.linkedin.com/jobs", mode: "catalog" },
  { id: "tg-kz-jobs", name: "Telegram KZ Jobs", type: "telegram", url: "https://t.me/s/kz_jobs", mode: "catalog" },
];

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname)));

function stripHtml(html) {
  return String(html || "").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}

const KZ_CITY_ALIASES = {
  Алматы: ["алматы", "almaty"],
  Астана: ["астана", "astana", "нур-султан", "nur-sultan", "nursultan"],
  Шымкент: ["шымкент", "shymkent"],
  Актау: ["актау", "aktau"],
  Актобе: ["актобе", "aktobe"],
  Атырау: ["атырау", "atyrau"],
  Караганда: ["караганда", "karaganda"],
  Павлодар: ["павлодар", "pavlodar"],
  Костанай: ["костанай", "kostanay", "kostanai"],
  Кокшетау: ["кокшетау", "kokshetau"],
  Петропавловск: ["петропавловск", "petropavlovsk"],
  "Усть-Каменогорск": ["усть-каменогорск", "oskemen", "ust-kamenogorsk"],
  Семей: ["семей", "semey"],
  Талдыкорган: ["талдыкорган", "taldykorgan"],
  Тараз: ["тараз", "taraz"],
  Туркестан: ["туркестан", "turkistan"],
  Кызылорда: ["кызылорда", "kyzylorda"],
  Уральск: ["уральск", "oral", "uralsk"],
  Жезказган: ["жезказган", "zhezkazgan"],
  Экибастуз: ["экибастуз", "ekibastuz"],
  Рудный: ["рудный", "rudny"],
  Темиртау: ["темиртау", "temirtau"],
  Жанаозен: ["жанаозен", "zhanaozen"],
  Балхаш: ["балхаш", "balkhash"],
  Сатпаев: ["сатпаев", "satpayev"],
  Конаев: ["конаев", "konaev", "kapchagay", "капчагай"],
  Кульсары: ["кульсары", "kulsary"],
  Аксай: ["аксай", "aksai"],
  Степногорск: ["степногорск", "stepnogorsk"],
  Риддер: ["риддер", "ridder"],
  Щучинск: ["щучинск", "shchuchinsk"],
  Текели: ["текели", "tekeli"],
  Сарыагаш: ["сарыагаш", "saryagash"],
  Аркалык: ["аркалык", "arkalyk"],
  Шу: ["шу", "shu"],
  Жаркент: ["жаркент", "zharkent"],
  Аягоз: ["аягоз", "ayagoz"],
  Мангистау: ["мангистау", "мангыстау", "mangystau", "mangistau"],
};

function detectCityAI(job) {
  const text = `${job.title || ""} ${job.location || ""} ${job.description || ""}`.toLowerCase();
  for (const [city, aliases] of Object.entries(KZ_CITY_ALIASES)) {
    if (aliases.some((alias) => text.includes(alias))) {
      return city;
    }
  }
  return null;
}

const SPECIALTY_PATTERNS = [
  { specialty: "Backend", patterns: ["backend", "back-end", "java", "python", "golang", "node.js", "php", "django", "laravel", "spring", "c#", ".net", "ruby", "c++", "rust"] },
  { specialty: "Frontend", patterns: ["frontend", "front-end", "react", "vue", "angular", "javascript", "typescript", "html", "css", "next.js", "nuxt", "svelte", "web-разработчик"] },
  { specialty: "Mobile", patterns: ["android", "ios", "flutter", "react native", "kotlin", "swift", "mobile", "ios-разработчик", "android-разработчик"] },
  { specialty: "Data / Analytics", patterns: ["data", "analyst", "analytics", "bi", "power bi", "tableau", "sql", "etl", "machine learning", "аналитик", "data science", "ai", "artificial intelligence"] },
  { specialty: "DevOps / SRE", patterns: ["devops", "sre", "kubernetes", "docker", "ci/cd", "terraform", "ansible", "sysadmin", "системный администратор", "linux"] },
  { specialty: "QA / Testing", patterns: ["qa", "test", "testing", "manual tester", "automation", "тестировщик", "qa engineer", "автотестировщик"] },
  { specialty: "Design", patterns: ["designer", "ux", "ui", "figma", "product design", "дизайнер", "graphic design", "3d"] },
  { specialty: "Marketing / Sales", patterns: ["marketing", "smm", "seo", "sales", "business development", "продаж", "маркетолог", "менеджер по продажам", "pr", "b2b"] },
  { specialty: "HR / Recruiting", patterns: ["hr", "recruiter", "рекрутер", "менеджер по персоналу", "talent acquisition"] },
  { specialty: "Management / PM", patterns: ["project manager", "product manager", "scrum", "agile", "руководитель проектов", "директор", "менеджер проекта", "ceo", "cto"] },
  { specialty: "Support / Operations", patterns: ["support", "оператор", "call center", "клиент", "operations", "поддержка", "администратор"] },
];

function detectSpecialtyAI(job) {
  const text = `${job.title || ""} ${job.description || ""} ${(job.tags || []).join(" ")}`.toLowerCase();
  for (const rule of SPECIALTY_PATTERNS) {
    if (rule.patterns.some((pattern) => text.includes(pattern))) {
      return rule.specialty;
    }
  }
  return "Other";
}

function deriveRegion(job) {
  const sourceId = String(job.sourceId || "").toLowerCase();
  const rawLocation = String(job.location || "").trim();
  const text = `${rawLocation} ${job.title || ""} ${job.description || ""}`.toLowerCase();

  // Try to detect specific KZ city from any text
  const detectedCity = detectCityAI(job);

  if (rawLocation && detectedCity) {
    return detectedCity;
  }
  if (rawLocation) {
    return rawLocation;
  }
  if (detectedCity) {
    return detectedCity;
  }
  if (sourceId === "hh" || sourceId === "enbek" || sourceId === "rabota-nur" || sourceId === "olx-kz") {
    return "Казахстан";
  }
  if (sourceId.startsWith("tg-")) {
    // Extract city from channel name via TELEGRAM_CHANNEL_CITY_MAP
    const channelName = sourceId.replace(/^tg-public-/, "").replace(/^tg-/, "");
    return TELEGRAM_CHANNEL_CITY_MAP[channelName] || "Казахстан";
  }
  if (text.includes("kz") || text.includes("казахстан")) {
    return "Казахстан";
  }
  return "Иностранный / Remote";
}

const aiCategoryCache = new Map();

async function getSpecialtyForJob(job) {
  if (aiCategoryCache.has(job.id)) {
    return aiCategoryCache.get(job.id);
  }

  let specialty = detectSpecialtyAI(job);

  if (aiClient) {
    try {
      const prompt = `Отнеси эту вакансию строго к ОДНОЙ из категорий: Backend, Frontend, Mobile, Data / Analytics, DevOps / SRE, QA / Testing, Design, Marketing / Sales, HR / Recruiting, Management / PM, Support / Operations, Other.\nВ ответе напиши ТОЛЬКО название категории.\nВакансия: ${job.title}\nОписание: ${job.description.slice(0, 300)}`;
      const response = await aiClient.models.generateContent({
        model: "gemini-2.5-flash",
        contents: prompt
      });
      const text = response.text.trim();
      const validCategories = ["Backend", "Frontend", "Mobile", "Data / Analytics", "DevOps / SRE", "QA / Testing", "Design", "Marketing / Sales", "HR / Recruiting", "Management / PM", "Support / Operations", "Other"];
      const matched = validCategories.find(c => text.toLowerCase().includes(c.toLowerCase()));
      if (matched) {
        specialty = matched;
      }
    } catch (e) {
      console.error("Gemini AI error:", e.message);
    }
  }

  aiCategoryCache.set(job.id, specialty);
  return specialty;
}

function normalizeJobs(inputJobs) {
  return inputJobs.map((job) => {
    const region = deriveRegion(job);
    const city = detectCityAI(job);
    const specialty = aiCategoryCache.get(job.id) || detectSpecialtyAI(job);
    return {
      ...job,
      location: region,
      region,
      city: city || region,
      specialty,
    };
  });
}

function safeAbsoluteUrl(url, base) {
  try {
    return new URL(url, base).toString();
  } catch (_error) {
    return base;
  }
}

function detectType(text) {
  const value = String(text || "").toLowerCase();
  if (value.includes("стаж") || value.includes("intern")) {
    return "internship";
  }
  if (value.includes("part-time") || value.includes("part time") || value.includes("частич")) {
    return "part-time";
  }
  if (value.includes("contract") || value.includes("контракт")) {
    return "contract";
  }
  if (value.includes("удален") || value.includes("remote")) {
    return "remote";
  }
  return "full-time";
}

function mapHhItem(item) {
  return {
    id: `hh-${item.id}`,
    title: item.name || "Без названия",
    company: item.employer?.name || "Не указана",
    location: item.area?.name || "Не указана",
    type: detectType(`${item.schedule?.name || ""} ${item.employment?.name || ""}`),
    sourceId: "hh",
    tags: [item.snippet?.requirement, item.snippet?.responsibility]
      .filter(Boolean)
      .map((part) => stripHtml(part).slice(0, 60)),
    postedAt: item.published_at || new Date().toISOString(),
    description: stripHtml(item.snippet?.responsibility || item.snippet?.requirement || ""),
    url: item.alternate_url || "https://hh.ru",
  };
}

function toSafeTime(value, fallback) {
  const timestamp = new Date(value).getTime();
  return Number.isNaN(timestamp) ? fallback : timestamp;
}

function inDateRange(isoDate, fromTs, toTs) {
  const ts = new Date(isoDate).getTime();
  if (Number.isNaN(ts)) {
    return false;
  }
  return ts >= fromTs && ts <= toTs;
}

function isKzJob(job) {
  const sourceId = String(job.sourceId || "").toLowerCase();
  if (sourceId === "hh" || sourceId === "rabota-nur" || sourceId === "olx-kz" || sourceId.startsWith("tg-")) {
    return true;
  }
  const text = `${job.location || ""} ${job.description || ""}`.toLowerCase();
  return (
    text.includes("казахстан")
    || text.includes("kz")
    || text.includes("алматы")
    || text.includes("астана")
    || text.includes("шымкент")
    || text.includes("актау")
    || text.includes("атырау")
    || text.includes("караганда")
    || text.includes("мангистау")
    || text.includes("мангыстау")
    || text.includes("mangystau")
  );
}

async function fetchHhJobs() {
  const jobs = [];
  const unique = new Set();
  const useDateRange = HH_DATE_FROM.trim() && HH_DATE_TO.trim();

  async function requestHhPage(params, userAgent) {
    return axios.get("https://api.hh.ru/vacancies", {
      params,
      timeout: 15000,
      headers: { "User-Agent": userAgent },
    });
  }

  for (let page = 0; page < HH_PAGES; page += 1) {
    const params = {
      area: HH_AREA,
      per_page: HH_PER_PAGE,
      page,
      order_by: "publication_time",
    };
    if (useDateRange) {
      params.date_from = HH_DATE_FROM.trim();
      params.date_to = HH_DATE_TO.trim();
    }
    if (HH_TEXT.trim()) {
      params.text = HH_TEXT.trim();
    }

    let data;
    try {
      ({ data } = await requestHhPage(params, HH_USER_AGENT));
    } catch (error) {
      const status = error?.response?.status;
      // Retry with conservative params and a browser User-Agent when HH rejects custom headers/params.
      if (status === 400 || status === 403) {
        const fallbackParams = {
          area: HH_AREA,
          per_page: Math.min(HH_PER_PAGE, 50),
          page,
          order_by: "publication_time",
        };
        ({ data } = await requestHhPage(
          fallbackParams,
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
        ));
      } else {
        throw error;
      }
    }

    const items = Array.isArray(data.items) ? data.items : [];
    if (!items.length) {
      break;
    }

    for (const item of items) {
      const key = String(item.id);
      if (unique.has(key)) {
        continue;
      }
      unique.add(key);
      jobs.push(mapHhItem(item));
    }
  }

  return jobs;
}

async function fetchTelegramJobs() {
  if (!TELEGRAM_BOT_TOKEN || TELEGRAM_CHANNELS.length === 0) {
    return [];
  }

  const tgUrl = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/getUpdates`;
  const { data } = await axios.get(tgUrl, {
    params: { timeout: 0, limit: 100 },
    timeout: 15000,
  });

  const updates = Array.isArray(data.result) ? data.result : [];
  const channelSet = new Set(TELEGRAM_CHANNELS.map((name) => name.toLowerCase()));
  const jobs = [];

  for (const update of updates) {
    const post = update.channel_post;
    if (!post) {
      continue;
    }

    const username = String(post.chat?.username || "").toLowerCase();
    if (!channelSet.has(username)) {
      continue;
    }

    const text = String(post.text || post.caption || "").trim();
    if (!text) {
      continue;
    }

    jobs.push({
      id: `tg-${post.chat.id}-${post.message_id}`,
      title: text.split("\n")[0].slice(0, 120) || "Вакансия из Telegram",
      company: "Telegram",
      location: "Не указана",
      type: detectType(text),
      sourceId: `tg-${username}`,
      tags: ["telegram", "канал", "live"],
      postedAt: new Date((post.date || Date.now() / 1000) * 1000).toISOString(),
      description: text.slice(0, 500),
      url: `https://t.me/${username}/${post.message_id}`,
    });
  }

  return jobs.slice(0, TELEGRAM_CHANNELS.length * TELEGRAM_LIMIT_PER_CHANNEL);
}

async function fetchTelegramPublicJobs() {
  const jobs = [];
  for (const channel of TELEGRAM_PUBLIC_CHANNELS) {
    try {
      const { data } = await axios.get(`https://t.me/s/${channel}`, {
        timeout: 15000,
        headers: { "User-Agent": HH_USER_AGENT },
      });
      const $ = cheerio.load(String(data || ""));
      const channelJobs = [];
      $(".tgme_widget_message_wrap").each((_, node) => {
        if (channelJobs.length >= TELEGRAM_PUBLIC_LIMIT_PER_CHANNEL) {
          return false;
        }
        const messageEl = $(node);
        const text = stripHtml(messageEl.find(".tgme_widget_message_text").text());
        if (!text) {
          return undefined;
        }
        const link = messageEl.find("a.tgme_widget_message_date").attr("href");
        const msgId = String(link || "").split("/").pop() || `${channel}-${channelJobs.length}`;
        channelJobs.push({
          id: `tg-public-${channel}-${msgId}`,
          title: text.split("\n")[0].slice(0, 120) || `Вакансия @${channel}`,
          company: `Telegram @${channel}`,
          location: TELEGRAM_CHANNEL_CITY_MAP[channel] || "Казахстан",
          type: detectType(text),
          sourceId: `tg-public-${channel}`,
          tags: ["telegram", "kz", "public"],
          postedAt: new Date().toISOString(),
          description: text.slice(0, 500),
          url: link ? safeAbsoluteUrl(link, `https://t.me/${channel}`) : `https://t.me/${channel}`,
        });
        return undefined;
      });
      jobs.push(...channelJobs);
    } catch (_error) {
      // Skip broken public channels silently; other sources still return.
    }
  }
  return jobs;
}

async function fetchRemotiveJobs() {
  const { data } = await axios.get("https://remotive.com/api/remote-jobs", {
    timeout: 15000,
  });

  const items = Array.isArray(data.jobs) ? data.jobs.slice(0, REMOTE_JOBS_LIMIT) : [];
  return items.map((item) => ({
    id: `remotive-${item.id}`,
    title: item.title || "Без названия",
    company: item.company_name || "Не указана",
    location: item.candidate_required_location || "Remote",
    type: "remote",
    sourceId: "remotive",
    tags: Array.isArray(item.tags) ? item.tags.slice(0, 5) : ["remote"],
    postedAt: item.publication_date || new Date().toISOString(),
    description: stripHtml(item.description || "").slice(0, 350),
    url: item.url || "https://remotive.com",
  }));
}

async function fetchArbeitnowJobs() {
  const jobs = [];
  let page = 1;

  while (page <= ARBEITNOW_PAGES && jobs.length < ARBEITNOW_LIMIT) {
    const { data } = await axios.get("https://www.arbeitnow.com/api/job-board-api", {
      params: { page },
      timeout: 15000,
    });

    const items = Array.isArray(data.data) ? data.data : [];
    if (!items.length) {
      break;
    }

    for (const item of items) {
      if (jobs.length >= ARBEITNOW_LIMIT) {
        break;
      }
      jobs.push({
        id: `arbeitnow-${item.slug || `${page}-${jobs.length}`}`,
        title: item.title || "Без названия",
        company: item.company_name || "Не указана",
        location: item.location || "Remote",
        type: item.remote ? "remote" : "full-time",
        sourceId: "arbeitnow",
        tags: Array.isArray(item.tags) ? item.tags.slice(0, 5) : ["job"],
        postedAt: item.created_at || new Date().toISOString(),
        description: stripHtml(item.description || "").slice(0, 350),
        url: item.url || "https://www.arbeitnow.com",
      });
    }

    page += 1;
  }

  return jobs;
}

async function fetchEnbekJobs() {
  const jobs = [];
  const seen = new Set();

  for (let page = 1; page <= ENBEK_PAGES && jobs.length < ENBEK_LIMIT; page += 1) {
    const { data } = await axios.get("https://enbek.kz/ru/search/vacancy", {
      params: { page, text: KZ_QUERY || undefined },
      timeout: 15000,
      headers: { "User-Agent": HH_USER_AGENT },
    });

    const $ = cheerio.load(String(data || ""));
    const pageLinks = $("a[href*='/ru/vacancy/'], a[href*='/vacancy/']");
    if (!pageLinks.length) {
      break;
    }

    pageLinks.each((_, node) => {
      if (jobs.length >= ENBEK_LIMIT) {
        return false;
      }
      const href = $(node).attr("href");
      if (!href) {
        return undefined;
      }
      const url = safeAbsoluteUrl(href, "https://enbek.kz");
      if (seen.has(url)) {
        return undefined;
      }
      seen.add(url);

      const card = $(node).closest("article, li, .vacancy-item, .search-result-item, .list-group-item, div");
      const title =
        stripHtml($(node).find("h2, h3, h4, [class*=title]").first().text()) ||
        stripHtml($(node).text()) ||
        "Вакансия Enbek.kz";
      const company =
        stripHtml(card.find("[class*=company], [class*=employer], [data-qa*=company]").first().text()) || "Не указана";
      const location =
        stripHtml(card.find("[class*=region], [class*=city], [class*=location], [data-qa*=address]").first().text()) || "Казахстан";
      const salary =
        stripHtml(card.find("[class*=salary], [class*=wage], [data-qa*=salary]").first().text()) || "";
      const descriptionBase = stripHtml(card.find("p, [class*=description], [class*=snippet]").first().text());
      const description = [salary, descriptionBase].filter(Boolean).join(" | ").slice(0, 350) || "Вакансия с Enbek.kz";

      jobs.push({
        id: `enbek-${Buffer.from(url).toString("base64").slice(0, 20)}`,
        title: title.slice(0, 140),
        company,
        location,
        type: detectType(`${title} ${description}`),
        sourceId: "enbek",
        tags: ["kz", "enbek.kz", "local"],
        postedAt: new Date().toISOString(),
        description,
        url,
      });
      return undefined;
    });
  }

  return jobs;
}

async function fetchNurJobs() {
  const { data } = await axios.get("https://rabota.nur.kz/search", {
    params: { text: KZ_QUERY },
    timeout: 15000,
    headers: { "User-Agent": HH_USER_AGENT },
  });
  const $ = cheerio.load(String(data || ""));
  const jobs = [];
  const seen = new Set();

  $("a[href*='/vacancy/'], a[href*='/job/']").each((_, node) => {
    if (jobs.length >= NUR_LIMIT) {
      return false;
    }
    const href = $(node).attr("href");
    if (!href) {
      return undefined;
    }
    const url = safeAbsoluteUrl(href, "https://rabota.nur.kz");
    if (seen.has(url)) {
      return undefined;
    }
    seen.add(url);

    const title =
      stripHtml($(node).text()) ||
      stripHtml($(node).find("h2, h3, [class*=title]").first().text()) ||
      "Вакансия NUR.KZ";
    const card = $(node).closest("article, li, div");
    const company = stripHtml(card.find("[class*=company], [data-qa*=company]").first().text()) || "Не указана";
    const location = stripHtml(card.find("[class*=city], [class*=location], [data-qa*=address]").first().text()) || "Казахстан";
    const description =
      stripHtml(card.find("[class*=description], [class*=snippet], p").first().text()).slice(0, 350) ||
      "Вакансия с Rabota NUR.KZ";

    jobs.push({
      id: `nur-${Buffer.from(url).toString("base64").slice(0, 20)}`,
      title: title.slice(0, 120),
      company,
      location,
      type: detectType(`${title} ${description}`),
      sourceId: "rabota-nur",
      tags: ["kz", "nur.kz", "local"],
      postedAt: new Date().toISOString(),
      description,
      url,
    });
    return undefined;
  });

  return jobs;
}

async function fetchOlxJobs() {
  const { data } = await axios.get("https://www.olx.kz/rabota/", {
    timeout: 15000,
    headers: { "User-Agent": HH_USER_AGENT },
  });
  const $ = cheerio.load(String(data || ""));
  const jobs = [];
  const seen = new Set();

  $("a[href*='/d/obyavlenie/'], a[href*='/ads/job/']").each((_, node) => {
    if (jobs.length >= OLX_LIMIT) {
      return false;
    }
    const href = $(node).attr("href");
    if (!href) {
      return undefined;
    }
    const url = safeAbsoluteUrl(href, "https://www.olx.kz");
    if (seen.has(url)) {
      return undefined;
    }
    seen.add(url);

    const card = $(node).closest("div[data-cy=l-card], article, li, div");
    const title =
      stripHtml($(node).find("h4, h5, [data-cy=l-card-title]").first().text()) ||
      stripHtml($(node).text()) ||
      "Вакансия OLX";
    const location =
      stripHtml(card.find("[data-testid=location-date], [data-cy=l-card-location], [class*=location]").first().text()) ||
      "Казахстан";
    const description = stripHtml(card.find("p, [data-testid=ad-description]").first().text()).slice(0, 350) || "Вакансия с OLX KZ";

    jobs.push({
      id: `olx-${Buffer.from(url).toString("base64").slice(0, 20)}`,
      title: title.slice(0, 120),
      company: "OLX работодатель",
      location,
      type: detectType(`${title} ${description}`),
      sourceId: "olx-kz",
      tags: ["kz", "olx", "local"],
      postedAt: new Date().toISOString(),
      description,
      url,
    });
    return undefined;
  });

  return jobs;
}

function buildSources() {
  const base = KZ_SOURCE_CATALOG.map((source) => {
    if (source.id === "hh") {
      return {
        id: source.id,
        name: source.name,
        type: source.type,
        url: source.url,
        note: `HH API: ${HH_PAGES} стр., по ${HH_PER_PAGE} вакансий, регион: ${HH_AREA}`,
        status: "live",
      };
    }
    if (source.id === "remotive") {
      return {
        id: source.id,
        name: source.name,
        type: source.type,
        url: source.url,
        note: `Remote API: до ${REMOTE_JOBS_LIMIT} вакансий`,
        status: "live",
      };
    }
    if (source.id === "arbeitnow") {
      return {
        id: source.id,
        name: source.name,
        type: source.type,
        url: source.url,
        note: `Global API: до ${ARBEITNOW_LIMIT} вакансий (${ARBEITNOW_PAGES} стр.)`,
        status: "live",
      };
    }
    if (source.id === "enbek") {
      return {
        id: source.id,
        name: source.name,
        type: source.type,
        url: source.url,
        note: `Enbek scraper: до ${ENBEK_LIMIT} вакансий (${ENBEK_PAGES} стр.)`,
        status: "live",
      };
    }
    if (source.id === "rabota-nur") {
      return {
        id: source.id,
        name: source.name,
        type: source.type,
        url: source.url,
        note: `NUR.KZ scraper: до ${NUR_LIMIT} вакансий`,
        status: "live",
      };
    }
    if (source.id === "olx-kz") {
      return {
        id: source.id,
        name: source.name,
        type: source.type,
        url: source.url,
        note: `OLX scraper: до ${OLX_LIMIT} вакансий`,
        status: "live",
      };
    }

    return {
      id: source.id,
      name: source.name,
      type: source.type,
      url: source.url,
      note: "Источник доступен в каталоге KZ, live API пока не подключен",
      status: "catalog",
    };
  });

  const tgSources = TELEGRAM_CHANNELS.map((channel) => ({
    id: `tg-${channel}`,
    name: `Telegram: @${channel}`,
    type: "telegram",
    url: `https://t.me/${channel}`,
    note: TELEGRAM_BOT_TOKEN ? "Через Telegram Bot API" : "Нужен TELEGRAM_BOT_TOKEN",
    status: TELEGRAM_BOT_TOKEN ? "live" : "setup-needed",
  }));

  const tgPublicSources = TELEGRAM_PUBLIC_CHANNELS.map((channel) => ({
    id: `tg-public-${channel}`,
    name: `Telegram Public: @${channel}`,
    type: "telegram",
    url: `https://t.me/s/${channel}`,
    note: `Public parser: до ${TELEGRAM_PUBLIC_LIMIT_PER_CHANNEL} постов`,
    status: "live",
  }));

  return [...base, ...tgSources, ...tgPublicSources];
}

app.get("/api/sources", (req, res) => {
  res.json({ sources: buildSources() });
});

async function fetchAndNormalizeAllJobs() {
  const errors = [];
  const jobs = [];
  const useDateRange = HH_DATE_FROM.trim() && HH_DATE_TO.trim();
  const dateFromTs = toSafeTime(HH_DATE_FROM, Number.MIN_SAFE_INTEGER);
  const dateToTs = toSafeTime(HH_DATE_TO, Number.MAX_SAFE_INTEGER);

  try {
    const hhJobs = await fetchHhJobs();
    jobs.push(...hhJobs);
  } catch (error) {
    errors.push(`HH: ${error.message}`);
  }

  try {
    const remotiveJobs = await fetchRemotiveJobs();
    jobs.push(...remotiveJobs);
  } catch (error) {
    errors.push(`Remotive: ${error.message}`);
  }

  try {
    const arbeitnowJobs = await fetchArbeitnowJobs();
    jobs.push(...arbeitnowJobs);
  } catch (error) {
    errors.push(`Arbeitnow: ${error.message}`);
  }

  try {
    const enbekJobs = await fetchEnbekJobs();
    jobs.push(...enbekJobs);
  } catch (error) {
    errors.push(`Enbek: ${error.message}`);
  }

  try {
    const olxJobs = await fetchOlxJobs();
    jobs.push(...olxJobs);
  } catch (error) {
    errors.push(`OLX: ${error.message}`);
  }

  try {
    const tgJobs = await fetchTelegramJobs();
    jobs.push(...tgJobs);
  } catch (error) {
    errors.push(`Telegram: ${error.message}`);
  }

  try {
    const tgPublicJobs = await fetchTelegramPublicJobs();
    jobs.push(...tgPublicJobs);
  } catch (error) {
    errors.push(`Telegram Public: ${error.message}`);
  }

  const resultJobs = useDateRange
    ? jobs.filter((job) => inDateRange(job.postedAt, dateFromTs, dateToTs))
    : jobs;
  resultJobs.sort((a, b) => new Date(b.postedAt) - new Date(a.postedAt));

  const normalizedJobs = normalizeJobs(resultJobs);

  return { normalizedJobs, errors };
}

app.get("/api/jobs", async (req, res) => {
  const { normalizedJobs, errors } = await fetchAndNormalizeAllJobs();

  let kzJobs = normalizedJobs.filter((job) => isKzJob(job));
  if (!kzJobs.length) {
    kzJobs = normalizedJobs.slice(0, 120);
    errors.push("KZ fallback: региональные источники временно недоступны, показаны общие вакансии.");
  }

  res.json({
    jobs: normalizedJobs,
    kzJobs,
    sources: buildSources(),
    errors,
    updatedAt: new Date().toISOString(),
  });
});

const seenJobIds = new Set();
let isFirstRun = true;

async function runBackgroundJobCheck() {
  if (!bot) return;
  console.log("Running background job check...");

  try {
    const { normalizedJobs } = await fetchAndNormalizeAllJobs();

    if (isFirstRun) {
      for (const job of normalizedJobs) {
        seenJobIds.add(job.id);
      }
      isFirstRun = false;
      console.log(`Initialized background check with ${seenJobIds.size} existing jobs.`);

      // Асинхронный прогрев ИИ-кэша для первых 10 свежих вакансий
      if (aiClient) {
        (async () => {
          console.log("Started background AI categorization for initial jobs...");
          for (const job of normalizedJobs.slice(0, 10)) {
            await getSpecialtyForJob(job);
          }
          console.log("Finished background AI categorization.");
        })();
      }

      return;
    }

    const newJobs = [];
    for (const job of normalizedJobs) {
      if (!seenJobIds.has(job.id)) {
        newJobs.push(job);
        seenJobIds.add(job.id);
      }
    }

    if (newJobs.length > 0) {
      console.log(`Found ${newJobs.length} new jobs. Processing notifications...`);
      for (const job of newJobs) {
        const specialty = await getSpecialtyForJob(job);
        job.specialty = specialty;

        const subscribers = subscriptions.filter(s => s.specialty.toLowerCase() === specialty.toLowerCase() || s.specialty.toLowerCase() === "all");

        for (const sub of subscribers) {
          const msg = `🚀 *Новая вакансия: ${specialty}*\n\n` +
            `*${job.title}*\n` +
            `🏢 ${job.company}\n` +
            `📍 ${job.location}\n\n` +
            `${job.description.slice(0, 200)}...\n\n` +
            `[Откликнуться](${job.url})`;

          bot.sendMessage(sub.chatId, msg, { parse_mode: "Markdown", disable_web_page_preview: true })
            .catch(err => console.error("Error sending TG msg:", err.message));
        }
      }
    }

    if (seenJobIds.size > 5000) {
      const arr = Array.from(seenJobIds);
      seenJobIds.clear();
      for (let i = arr.length - 2000; i < arr.length; i++) {
        if (arr[i]) seenJobIds.add(arr[i]);
      }
    }
  } catch (err) {
    console.error("Background job check failed:", err.message);
  }
}

setInterval(runBackgroundJobCheck, 15 * 60 * 1000);
setTimeout(runBackgroundJobCheck, 5000);

app.get("/*all", (req, res) => {
  res.sendFile(path.join(__dirname, "index.html"));
});

app.listen(PORT, () => {
  console.log(`WorkFlow Jobs server started on http://localhost:${PORT}`);
});
