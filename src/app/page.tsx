'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Search, LogIn, PlusCircle, MapPin, Briefcase, DollarSign, X } from 'lucide-react';

const cities = [
  "Все", "Алматы", "Астана", "Шымкент", "Актау", "Актобе", "Атырау", "Караганда", 
  "Павлодар", "Костанай", "Кокшетау", "Петропавловск", "Усть-Каменогорск", 
  "Семей", "Талдыкорган", "Тараз", "Туркестан", "Кызылорда", "Уральск"
];

export default function HomePage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCity, setSelectedCity] = useState('Все');
  const [jobs, setJobs] = useState([
    { id: 1, title: "Senior React Developer", company: "Tech Flow KZ", salary: "1 200 000 ₸", city: "Алматы", description: "Разработка высоконагруженных приложений..." },
    { id: 2, title: "UI/UX Designer", company: "Design Studio", salary: "600 000 ₸", city: "Астана", description: "Создание интерфейсов для мобильных игр..." },
    { id: 3, title: "Marketing Manager", company: "Eco Systems", salary: "450 000 ₸", city: "Шымкент", description: "Управление рекламными кампаниями..." },
    { id: 4, title: "Backend Engineer (Go)", company: "Fintech Solutions", salary: "900 000 ₸", city: "Алматы", description: "Микросервисная архитектура..." },
    { id: 5, title: "QA Engineer", company: "Quality First", salary: "400 000 ₸", city: "Караганда", description: "Автоматизация тестирования..." },
  ]);

  // Логика фильтрации
  const filteredJobs = jobs.filter(job => {
    const matchesSearch = job.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          job.company.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCity = selectedCity === 'Все' || job.city === selectedCity;
    return matchesSearch && matchesCity;
  });

  return (
    <div className="min-h-screen bg-[#0f172a] text-slate-100 font-sans selection:bg-blue-500/30">
      {/* Background Orbs */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-600/10 blur-[120px] rounded-full" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-indigo-600/10 blur-[120px] rounded-full" />
      </div>

      {/* Header */}
      <header className="sticky top-0 z-50 backdrop-blur-md border-b border-white/5 bg-[#0f172a]/80">
        <div className="container mx-auto px-4 h-20 flex items-center justify-between gap-4">
          <Link href="/" className="text-2xl font-bold bg-gradient-to-r from-blue-400 to-indigo-400 bg-clip-text text-transparent">
            WorkKZ
          </Link>

          <div className="hidden md:flex flex-1 max-w-xl relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
            <input 
              type="text" 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Поиск вакансий (Frontend, Дизайнер)..." 
              className="w-full bg-white/5 border border-white/10 rounded-2xl py-3 pl-12 pr-4 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all placeholder:text-slate-500"
            />
            {searchQuery && (
              <button 
                onClick={() => setSearchQuery('')}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          <div className="flex items-center gap-3">
            <button className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 transition-all text-sm font-medium">
              <LogIn className="w-4 h-4" />
              <span className="hidden sm:inline">Войти</span>
            </button>
            <Link href="/jobs/create" className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 shadow-[0_0_20px_rgba(59,130,246,0.4)] transition-all text-sm font-bold text-white whitespace-nowrap">
              <PlusCircle className="w-4 h-4" />
              <span className="hidden sm:inline">Опубликовать</span>
            </Link>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 relative">
        {/* Города (Chips) */}
        <section className="mb-10">
          <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-4">Города Казахстана</h2>
          <div className="flex gap-2 overflow-x-auto pb-4 scrollbar-hide">
            {cities.map((city) => (
              <button 
                key={city}
                onClick={() => setSelectedCity(city)}
                className={`whitespace-nowrap px-5 py-2.5 rounded-full border transition-all active:scale-95 text-sm ${
                  selectedCity === city 
                  ? 'bg-blue-600 border-blue-500 text-white shadow-[0_0_15px_rgba(59,130,246,0.4)]' 
                  : 'bg-white/5 border-white/10 text-slate-300 hover:border-white/30'
                }`}
              >
                {city}
              </button>
            ))}
          </div>
        </section>

        {/* Результаты поиска */}
        <section>
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-2">
              <Briefcase className="w-6 h-6 text-blue-500" />
              <h1 className="text-2xl font-bold">
                {selectedCity === 'Все' ? 'Все вакансии' : `Вакансии в г. ${selectedCity}`}
              </h1>
            </div>
            <span className="text-sm text-slate-500 bg-white/5 px-3 py-1 rounded-lg border border-white/5">
              Найдено: {filteredJobs.length}
            </span>
          </div>

          {filteredJobs.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredJobs.map((job) => (
                <div 
                  key={job.id}
                  className="group relative p-6 rounded-3xl bg-white/5 border border-white/10 backdrop-blur-sm hover:bg-white/[0.08] hover:border-white/20 transition-all cursor-pointer"
                >
                  <div className="flex justify-between items-start mb-4">
                    <div className="p-3 rounded-2xl bg-blue-500/10 border border-blue-500/20 group-hover:scale-110 transition-transform">
                      <Briefcase className="w-6 h-6 text-blue-400" />
                    </div>
                  </div>
                  <h3 className="text-xl font-bold mb-2 group-hover:text-blue-400 transition-colors">{job.title}</h3>
                  <p className="text-slate-400 text-sm mb-4">{job.company}</p>
                  
                  <div className="space-y-3 mb-2">
                    <div className="flex items-center gap-2 text-emerald-400 font-bold">
                      <DollarSign className="w-4 h-4" />
                      <span>{job.salary}</span>
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
          ) : (
            <div className="text-center py-20 bg-white/5 rounded-3xl border border-dashed border-white/10">
              <p className="text-slate-500">Ничего не найдено по вашему запросу 😔</p>
              <button 
                onClick={() => { setSearchQuery(''); setSelectedCity('Все'); }}
                className="mt-4 text-blue-400 hover:underline"
              >
                Сбросить фильтры
              </button>
            </div>
          )}
        </section>
      </main>

      <style jsx global>{`
        .scrollbar-hide::-webkit-scrollbar { display: none; }
        .scrollbar-hide { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>
    </div>
  );
}
