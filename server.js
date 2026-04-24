require("dotenv").config();

const express = require("express");
const cors = require("cors");
const axios = require("axios");
const path = require("path");
const cheerio = require("cheerio");

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

function deriveRegion(job) {
  const sourceId = String(job.sourceId || "").toLowerCase();
  const rawLocation = String(job.location || "").trim();
  const text = `${rawLocation} ${job.description || ""}`.toLowerCase();

  if (rawLocation) {
    return rawLocation;
  }
  if (sourceId === "hh" || sourceId === "enbek" || sourceId === "rabota-nur" || sourceId === "olx-kz") {
    return "Казахстан";
  }
  if (sourceId.startsWith("tg-")) {
    return "Казахстан / Telegram";
  }
  if (text.includes("kz") || text.includes("казахстан")) {
    return "Казахстан";
  }
  return "Иностранный / Remote";
}

function normalizeJobs(inputJobs) {
  return inputJobs.map((job) => {
    const region = deriveRegion(job);
    return {
      ...job,
      location: region,
      region,
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

  return [...base, ...tgSources];
}

app.get("/api/sources", (req, res) => {
  res.json({ sources: buildSources() });
});

app.get("/api/jobs", async (req, res) => {
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

  // NUR.KZ can be intermittently unavailable from some regions/DNS providers.
  // Keep as catalog source for now; skip hard-failing live fetch.

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

  const resultJobs = useDateRange
    ? jobs.filter((job) => inDateRange(job.postedAt, dateFromTs, dateToTs))
    : jobs;
  resultJobs.sort((a, b) => new Date(b.postedAt) - new Date(a.postedAt));
  const normalizedJobs = normalizeJobs(resultJobs);

  let kzJobs = normalizedJobs.filter((job) => isKzJob(job));
  if (!kzJobs.length) {
    // Fallback: never leave KZ section empty if regional sources are temporarily blocked.
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

app.get("/*all", (req, res) => {
  res.sendFile(path.join(__dirname, "index.html"));
});

app.listen(PORT, () => {
  console.log(`WorkFlow Jobs server started on http://localhost:${PORT}`);
});
