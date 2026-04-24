import { NextResponse } from 'next/server';
import axios from 'axios';

// Твои старые алиасы городов для точности
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
  "Кокшетау": ["кокшетау", "kokshetau"],
  "Петропавловск": ["петропавловск", "petropavlovsk"],
  "Усть-Каменогорск": ["усть-каменогорск", "oskemen"],
  "Семей": ["семей", "semey"],
  "Талдыкорган": ["талдыкорган", "taldykorgan"],
  "Тараз": ["тараз", "taraz"],
  "Туркестан": ["туркестан", "turkistan"],
  "Кызылорда": ["кызылорда", "kyzylorda"],
  "Уральск": ["уральск", "oral"],
};

function detectCity(title: string, location: string): string {
  const text = `${title} ${location}`.toLowerCase();
  for (const [city, aliases] of Object.entries(KZ_CITY_ALIASES)) {
    if (aliases.some(alias => text.includes(alias))) return city;
  }
  return location || "Казахстан";
}

export async function GET() {
  try {
    // 1. Загрузка из HeadHunter Kazakhstan
    const hhResponse = await axios.get('https://api.hh.ru/vacancies', {
      params: { 
        area: '113', 
        per_page: 100,
        order_by: 'publication_time'
      },
      headers: { 'User-Agent': 'WorkKZ/1.0 (contact: admin@workkz.com)' },
      timeout: 10000
    });

    if (!hhResponse.data || !Array.isArray(hhResponse.data.items)) {
      throw new Error("Invalid response from HH API");
    }

    const jobs = hhResponse.data.items.map((item: any) => ({
      id: `hh-${item.id}`,
      title: item.name,
      company: item.employer?.name || "Не указана",
      salary: item.salary ? 
        `${item.salary.from || ''} ${item.salary.to ? '- ' + item.salary.to : ''} ${item.salary.currency}`.trim() : 
        "З/П не указана",
      city: detectCity(item.name, item.area?.name),
      url: item.alternate_url,
      postedAt: item.published_at,
      type: item.schedule?.name || "Полный день"
    }));

    return NextResponse.json({ 
      jobs, 
      total: jobs.length,
      timestamp: new Date().toISOString()
    });
  } catch (error: any) {
    console.error("Ошибка API вакансий:", error.message);
    return NextResponse.json({ 
      jobs: [], 
      error: error.message,
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}
