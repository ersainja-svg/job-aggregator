require("dotenv").config();

const express = require("express");
const cors = require("cors");
const axios = require("axios");
const path = require("path");

const app = express();
const PORT = Number(process.env.PORT || 8080);
const HH_AREA = process.env.HH_AREA || "113";
const HH_TEXT = process.env.HH_TEXT || "";
const HH_PER_PAGE = Number(process.env.HH_PER_PAGE || 20);
const HH_PAGES = Math.min(Math.max(Number(process.env.HH_PAGES || 5), 1), 20);
const HH_DATE_FROM = process.env.HH_DATE_FROM || "";
const HH_DATE_TO = process.env.HH_DATE_TO || "";
const HH_USER_AGENT = process.env.HH_USER_AGENT || "JobAggregator/1.0 (dev@localhost.local)";
const REMOTE_JOBS_LIMIT = Math.min(Math.max(Number(process.env.REMOTE_JOBS_LIMIT || 60), 10), 200);
const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || "";
const TELEGRAM_CHANNELS = (process.env.TELEGRAM_CHANNELS || "")
  .split(",")
  .map((item) => item.trim().replace(/^@/, ""))
  .filter(Boolean);
const TELEGRAM_LIMIT_PER_CHANNEL = Number(process.env.TELEGRAM_LIMIT_PER_CHANNEL || 20);
const KZ_SOURCE_CATALOG = [
  { id: "hh", name: "HeadHunter Kazakhstan", type: "website", url: "https://hh.kz", mode: "live" },
  { id: "remotive", name: "Remotive API", type: "website", url: "https://remotive.com", mode: "live" },
  { id: "enbek", name: "Enbek.kz", type: "website", url: "https://www.enbek.kz", mode: "catalog" },
  { id: "rabota-nur", name: "Rabota NUR.KZ", type: "website", url: "https://rabota.nur.kz", mode: "catalog" },
  { id: "olx-kz", name: "OLX Работа KZ", type: "website", url: "https://www.olx.kz/rabota", mode: "catalog" },
  { id: "linkedin-kz", name: "LinkedIn Jobs KZ", type: "website", url: "https://www.linkedin.com/jobs", mode: "catalog" },
  { id: "tg-kz-jobs", name: "Telegram KZ Jobs", type: "telegram", url: "https://t.me/s/kz_jobs", mode: "catalog" },
];

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname)));

function stripHtml(html) {
  return String(html || "").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
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

async function fetchHhJobs() {
  const jobs = [];
  const unique = new Set();
  const useDateRange = HH_DATE_FROM.trim() && HH_DATE_TO.trim();

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

    const { data } = await axios.get("https://api.hh.ru/vacancies", {
      params,
      timeout: 15000,
      headers: { "User-Agent": HH_USER_AGENT },
    });

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
    const tgJobs = await fetchTelegramJobs();
    jobs.push(...tgJobs);
  } catch (error) {
    errors.push(`Telegram: ${error.message}`);
  }

  const resultJobs = useDateRange
    ? jobs.filter((job) => inDateRange(job.postedAt, dateFromTs, dateToTs))
    : jobs;
  resultJobs.sort((a, b) => new Date(b.postedAt) - new Date(a.postedAt));
  res.json({
    jobs: resultJobs,
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
