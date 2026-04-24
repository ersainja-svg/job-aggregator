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

// Список твоих старых каналов из server.js
const TELEGRAM_CHANNELS = [
  "kz_jobs", "almaty_rabota", "astana_rabota", "shymkent_rabota", 
  "rabotaaktau", "aktobe_job", "atyrau_rabota_1", "karaganda_rabota"
];

function detectCity(text: string): string {
  const lowText = text.toLowerCase();
  for (const [city, aliases] of Object.entries(KZ_CITY_ALIASES)) {
    if (aliases.some(alias => lowText.includes(alias))) return city;
  }
  return "Казахстан";
}

export async function GET() {
  try {
    const allJobs: any[] = [];

    // 1. ЗАГРУЗКА ИЗ HEADHUNTER
    try {
      const hhRes = await axios.get('https://api.hh.ru/vacancies', {
        params: { area: '113', per_page: 50 },
        headers: { 'User-Agent': 'WorkKZ/1.0' }
      });
      const hhJobs = hhRes.data.items.map((item: any) => ({
        id: `hh-${item.id}`,
        title: item.name,
        company: item.employer?.name || "HeadHunter",
        salary: item.salary ? `${item.salary.from || ''} ${item.salary.currency}` : "З/П по договоренности",
        city: detectCity(`${item.name} ${item.area?.name}`),
        url: item.alternate_url,
        source: "HH.kz"
      }));
      allJobs.push(...hhJobs);
    } catch (e) { console.error("HH Error"); }

    // 2. ЗАГРУЗКА ИЗ TELEGRAM (Парсинг публичных каналов)
    for (const channel of TELEGRAM_CHANNELS) {
      try {
        const { data } = await axios.get(`https://t.me/s/${channel}`, { timeout: 5000 });
        const $ = cheerio.load(data);
        
        $(".tgme_widget_message_wrap").each((i, el) => {
          if (i > 10) return; // Берем последние 10 сообщений
          const text = $(el).find(".tgme_widget_message_text").text();
          if (!text) return;
          
          const link = $(el).find("a.tgme_widget_message_date").attr("href");
          
          allJobs.push({
            id: `tg-${channel}-${i}`,
            title: text.split('\n')[0].slice(0, 100) || "Вакансия из Telegram",
            company: `@${channel}`,
            salary: "См. в описании",
            city: detectCity(text) || "Казахстан",
            url: link || `https://t.me/${channel}`,
            source: "Telegram"
          });
        });
      } catch (e) { console.error(`TG Error for ${channel}`); }
    }

    // Сортировка (сначала новые)
    return NextResponse.json({ jobs: allJobs.slice(0, 150) });
  } catch (error) {
    return NextResponse.json({ jobs: [], error: "Server Error" }, { status: 500 });
  }
}
