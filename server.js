require("dotenv").config();

const express = require("express");
const cors = require("cors");
const axios = require("axios");
const path = require("path");

const app = express();
const PORT = Number(process.env.PORT || 8080);
const HH_AREA = process.env.HH_AREA || "113";
const HH_TEXT = process.env.HH_TEXT || "developer";
const HH_PER_PAGE = Number(process.env.HH_PER_PAGE || 20);
const HH_USER_AGENT = process.env.HH_USER_AGENT || "JobAggregator/1.0 (dev@localhost.local)";
const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || "";
const TELEGRAM_CHANNELS = (process.env.TELEGRAM_CHANNELS || "")
  .split(",")
  .map((item) => item.trim().replace(/^@/, ""))
  .filter(Boolean);
const TELEGRAM_LIMIT_PER_CHANNEL = Number(process.env.TELEGRAM_LIMIT_PER_CHANNEL || 20);
const KZ_SOURCE_CATALOG = [
  { id: "hh", name: "HeadHunter Kazakhstan", type: "website", url: "https://hh.kz", mode: "live" },
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

async function fetchHhJobs() {
  const { data } = await axios.get("https://api.hh.ru/vacancies", {
    params: {
      text: HH_TEXT,
      area: HH_AREA,
      per_page: HH_PER_PAGE,
      order_by: "publication_time",
    },
    timeout: 15000,
    headers: { "User-Agent": HH_USER_AGENT },
  });

  const items = Array.isArray(data.items) ? data.items : [];
  return items.map((item) => ({
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
  }));
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

function buildSources() {
  const base = KZ_SOURCE_CATALOG.map((source) => {
    if (source.id === "hh") {
      return {
        id: source.id,
        name: source.name,
        type: source.type,
        url: source.url,
        note: `Поиск: ${HH_TEXT}, регион: ${HH_AREA}`,
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

  try {
    const hhJobs = await fetchHhJobs();
    jobs.push(...hhJobs);
  } catch (error) {
    errors.push(`HH: ${error.message}`);
  }

  try {
    const tgJobs = await fetchTelegramJobs();
    jobs.push(...tgJobs);
  } catch (error) {
    errors.push(`Telegram: ${error.message}`);
  }

  jobs.sort((a, b) => new Date(b.postedAt) - new Date(a.postedAt));
  res.json({
    jobs,
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
