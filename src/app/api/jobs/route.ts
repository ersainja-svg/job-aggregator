import { NextResponse } from 'next/server';
import axios from 'axios';
import * as cheerio from 'cheerio';

const KZ_CITY_ALIASES: Record<string, string[]> = {
  "Алматы": ["алматы", "almaty"],
  "Астана": ["астана", "astana", "нур-султан", "nur-sultan"],
  "Шымкент": ["шымкент", "shymkent"],
  "Актау": ["актау", "aktau"],
  "Актобе": ["актобе", "aktobe"],
  "Атырау": ["атырау", "atyrau"],
  "Караганда": ["караганда", "karaganda"],
  "Павлодар": ["павлодар", "pavlodar"],
  "Костанай": ["костанай", "kostanay"],
};

const TELEGRAM_CHANNELS = ["kz_jobs", "almaty_rabota", "astana_rabota", "shymkent_rabota", "rabotaaktau", "atyrau_rabota_1"];

function detectCity(text: string): string {
  const lowText = text.toLowerCase();
  for (const [city, aliases] of Object.entries(KZ_CITY_ALIASES)) {
    if (aliases.some(alias => lowText.includes(alias))) return city;
  }
  return "Казахстан";
}

export async function GET() {
  const allJobs: any[] = [];
  const timeout = 8000; // 8 секунд на каждый источник

  // --- 1. HEADHUNTER KZ ---
  try {
    const res = await axios.get('https://api.hh.ru/vacancies', {
      params: { area: '113', per_page: 50 },
      headers: { 'User-Agent': 'WorkKZ/1.0' },
      timeout
    });
    const jobs = res.data.items.map((item: any) => ({
      id: `hh-${item.id}`,
      title: item.name,
      company: item.employer?.name || "HH.kz",
      salary: item.salary ? `${item.salary.from || ''} ${item.salary.currency}` : "З/П по договоренности",
      city: detectCity(`${item.name} ${item.area?.name}`),
      url: item.alternate_url,
      source: "HeadHunter"
    }));
    allJobs.push(...jobs);
  } catch (e) { console.error("HH Error"); }

  // --- 2. ENBEK.KZ ---
  try {
    const { data } = await axios.get('https://www.enbek.kz/ru/search/vacancy', { timeout });
    const $ = cheerio.load(data);
    $(".vacancy-item, .search-result-item").each((i, el) => {
      if (i > 20) return;
      const title = $(el).find("h2, h3, a[href*='/vacancy/']").first().text().trim();
      const link = $(el).find("a[href*='/vacancy/']").first().attr("href");
      if (title && link) {
        allJobs.push({
          id: `enbek-${i}-${Date.now()}`,
          title,
          company: "Enbek.kz",
          salary: "Гос. оклад",
          city: detectCity(title) || "Казахстан",
          url: link.startsWith('http') ? link : `https://www.enbek.kz${link}`,
          source: "Enbek.kz"
        });
      }
    });
  } catch (e) { console.error("Enbek Error"); }

  // --- 3. OLX.KZ ---
  try {
    const { data } = await axios.get('https://www.olx.kz/rabota/', { timeout, headers: { 'User-Agent': 'Mozilla/5.0' } });
    const $ = cheerio.load(data);
    $("div[data-cy='l-card']").each((i, el) => {
      if (i > 15) return;
      const title = $(el).find("h6").text().trim();
      const link = $(el).find("a").attr("href");
      if (title && link) {
        allJobs.push({
          id: `olx-${i}`,
          title,
          company: "Работодатель OLX",
          salary: "См. на OLX",
          city: detectCity(title),
          url: link.startsWith('http') ? link : `https://www.olx.kz${link}`,
          source: "OLX"
        });
      }
    });
  } catch (e) { console.error("OLX Error"); }

  // --- 4. TELEGRAM ---
  for (const channel of TELEGRAM_CHANNELS) {
    try {
      const { data } = await axios.get(`https://t.me/s/${channel}`, { timeout: 5000 });
      const $ = cheerio.load(data);
      $(".tgme_widget_message_wrap").each((i, el) => {
        if (i > 5) return;
        const text = $(el).find(".tgme_widget_message_text").text();
        const link = $(el).find("a.tgme_widget_message_date").attr("href");
        if (text && link) {
          allJobs.push({
            id: `tg-${channel}-${i}`,
            title: text.split('\n')[0].slice(0, 80),
            company: `@${channel}`,
            salary: "В описании",
            city: detectCity(text),
            url: link,
            source: "Telegram"
          });
        }
      });
    } catch (e) { console.error(`TG Error ${channel}`); }
  }

  // Удаляем дубликаты и перемешиваем (чтобы было разнообразие)
  const uniqueJobs = Array.from(new Map(allJobs.map(j => [j.url, j])).values());
  return NextResponse.json({ jobs: uniqueJobs.sort(() => Math.random() - 0.5) });
}
