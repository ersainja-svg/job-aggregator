'use client';

import React from 'react';
import Link from 'next/link';
import { Search, LogIn, PlusCircle, MapPin, Briefcase, DollarSign } from 'lucide-react';

const cities = [
  "Алматы", "Астана", "Шымкент", "Актау", "Актобе", "Атырау", "Караганда", 
  "Павлодар", "Костанай", "Кокшетау", "Петропавловск", "Усть-Каменогорск", 
  "Семей", "Талдыкорган", "Тараз", "Туркестан", "Кызылорда", "Уральск", 
  "Жезказган", "Экибастуз", "Рудный", "Темиртау", "Жанаозен", "Балхаш", 
  "Сатпаев", "Конаев", "Кульсары", "Аксай", "Степногорск", "Риддер", 
  "Щучинск", "Текели", "Сарыагаш", "Аркалык", "Шу", "Жаркент", "Аягоз", "Мангистау"
];

const mockJobs = [
  { id: 1, title: "Senior React Developer", company: "Tech Flow KZ", salary: "1 200 000 ₸", city: "Алматы" },
  { id: 2, title: "UI/UX Designer", company: "Design Studio", salary: "600 000 ₸", city: "Астана" },
  { id: 3, title: "Marketing Manager", company: "Eco Systems", salary: "450 000 ₸", city: "Шымкент" },
];

export default function HomePage() {
  return (
    <div className="min-h-screen bg-[#0f172a] text-slate-100 font-sans selection:bg-blue-500/30">
      {/* Background Orbs for depth */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-600/10 blur-[120px] rounded-full" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-indigo-600/10 blur-[120px] rounded-full" />
      </div>

      {/* Header */}
      <header className="sticky top-0 z-50 backdrop-blur-md border-b border-white/5 bg-[#0f172a]/80">
        <div className="container mx-auto px-4 h-20 flex items-center justify-between gap-4">
          <div className="text-2xl font-bold bg-gradient-to-r from-blue-400 to-indigo-400 bg-clip-text text-transparent">
            WorkKZ
          </div>

          <div className="hidden md:flex flex-1 max-w-xl relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
            <input 
              type="text" 
              placeholder="Поиск вакансий (например: Frontend developer)..." 
              className="w-full bg-white/5 border border-white/10 rounded-2xl py-3 pl-12 pr-4 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all placeholder:text-slate-500"
            />
          </div>

          <div className="flex items-center gap-3">
            <button className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 transition-all text-sm font-medium">
              <LogIn className="w-4 h-4" />
              <span className="hidden sm:inline">Войти через Google</span>
              <span className="sm:hidden text-xs">Войти</span>
            </button>
            <Link href="/jobs/create" className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 shadow-[0_0_20px_rgba(59,130,246,0.4)] transition-all text-sm font-bold text-white whitespace-nowrap">
              <PlusCircle className="w-4 h-4" />
              <span className="hidden sm:inline">Опубликовать</span>
            </Link>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 relative">
        {/* Блок городов (Chips) */}
        <section className="mb-10">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wider">Популярные города</h2>
          </div>
          <div className="flex gap-2 overflow-x-auto pb-4 scrollbar-hide">
            {cities.map((city) => (
              <button 
                key={city}
                className="whitespace-nowrap px-4 py-2 rounded-full bg-white/5 border border-white/10 text-sm hover:border-blue-500/50 hover:bg-blue-500/10 transition-all active:scale-95"
              >
                {city}
              </button>
            ))}
          </div>
        </section>

        {/* Лента вакансий */}
        <section>
          <div className="flex items-center gap-2 mb-8">
            <Briefcase className="w-6 h-6 text-blue-500" />
            <h1 className="text-3xl font-bold">Свежие вакансии</h1>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {mockJobs.map((job) => (
              <div 
                key={job.id}
                className="group relative p-6 rounded-3xl bg-white/5 border border-white/10 backdrop-blur-sm hover:bg-white/[0.08] hover:border-white/20 transition-all cursor-pointer"
              >
                <div className="flex justify-between items-start mb-4">
                  <div className="p-3 rounded-2xl bg-blue-500/10 border border-blue-500/20 group-hover:scale-110 transition-transform">
                    <Briefcase className="w-6 h-6 text-blue-400" />
                  </div>
                  <span className="text-xs font-bold text-blue-400/80 px-2 py-1 rounded-md bg-blue-500/5 border border-blue-500/10">
                    Full-time
                  </span>
                </div>

                <h3 className="text-xl font-bold mb-2 group-hover:text-blue-400 transition-colors">{job.title}</h3>
                <p className="text-slate-400 text-sm mb-6">{job.company}</p>

                <div className="flex flex-col gap-3">
                  <div className="flex items-center gap-2 text-slate-300">
                    <DollarSign className="w-4 h-4 text-emerald-400" />
                    <span className="font-semibold">{job.salary}</span>
                  </div>
                  <div className="flex items-center gap-2 text-slate-400 text-sm">
                    <MapPin className="w-4 h-4" />
                    <span>{job.city}</span>
                  </div>
                </div>

                <div className="absolute inset-0 border-2 border-blue-500/0 group-hover:border-blue-500/20 rounded-3xl transition-all" />
              </div>
            ))}
          </div>
        </section>
      </main>

      <style jsx global>{`
        .scrollbar-hide::-webkit-scrollbar {
          display: none;
        }
        .scrollbar-hide {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
      `}</style>
    </div>
  );
}
