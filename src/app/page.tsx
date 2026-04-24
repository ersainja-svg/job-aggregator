'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Search, LogIn, PlusCircle, MapPin, Briefcase, DollarSign, X, Loader2, Globe } from 'lucide-react';

const cities = ["Все", "Алматы", "Астана", "Шымкент", "Актау", "Актобе", "Атырау", "Караганда", "Павлодар", "Уральск", "Усть-Каменогорск"];

export default function HomePage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCity, setSelectedCity] = useState('Все');
  const [jobs, setJobs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // ЗАГРУЗКА РЕАЛЬНЫХ ДАННЫХ
  useEffect(() => {
    async function fetchJobs() {
      try {
        setLoading(true);
        const res = await fetch('/api/jobs');
        if (!res.ok) throw new Error("Ошибка при загрузке данных");
        const data = await res.json();
        setJobs(data.jobs || []);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
    fetchJobs();
  }, []);

  // Логика фильтрации
  const filteredJobs = jobs.filter(job => {
    const matchesSearch = job.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          job.company.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCity = selectedCity === 'Все' || job.city === selectedCity;
    return matchesSearch && matchesCity;
  });

  return (
    <div className="min-h-screen bg-[#0f172a] text-slate-100 font-sans selection:bg-blue-500/30">
      {/* Background Decor */}
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
              placeholder="Поиск по реальным вакансиям..." 
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
        {/* Chips для фильтрации по городам */}
        <section className="mb-10">
          <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-4">Города</h2>
          <div className="flex gap-2 overflow-x-auto pb-4 scrollbar-hide">
            {cities.map((city) => (
              <button 
                key={city}
                onClick={() => setSelectedCity(city)}
                className={`whitespace-nowrap px-5 py-2 rounded-full border transition-all text-sm ${
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

        {/* Лента вакансий */}
        <section>
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-2">
              <Briefcase className="w-6 h-6 text-blue-500" />
              <h1 className="text-2xl font-bold uppercase tracking-tight">
                {selectedCity === 'Все' ? 'Последние вакансии' : `Вакансии в г. ${selectedCity}`}
              </h1>
            </div>
            {!loading && (
              <span className="text-xs font-mono text-slate-500 bg-white/5 px-2 py-1 rounded border border-white/5">
                {filteredJobs.length} ВАКАНСИЙ
              </span>
            )}
          </div>

          {loading ? (
            <div className="flex flex-col items-center justify-center py-32 gap-6 bg-white/[0.02] rounded-[40px] border border-white/5">
              <div className="relative">
                <div className="w-16 h-16 border-4 border-blue-500/20 border-t-blue-500 rounded-full animate-spin" />
                <div className="absolute inset-0 bg-blue-500/10 blur-xl rounded-full" />
              </div>
              <p className="text-slate-400 font-medium animate-pulse">Загрузка данных с HeadHunter...</p>
            </div>
          ) : error ? (
            <div className="p-12 text-center bg-red-500/5 border border-red-500/20 rounded-3xl">
              <p className="text-red-400 font-medium mb-4">{error}</p>
              <button onClick={() => window.location.reload()} className="px-6 py-2 bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 rounded-xl transition-all">
                Повторить попытку
              </button>
            </div>
          ) : filteredJobs.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredJobs.map((job) => (
                <a 
                  href={job.url} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  key={job.id}
                  className="group relative p-6 rounded-[32px] bg-white/5 border border-white/10 backdrop-blur-md hover:bg-white/[0.08] hover:border-white/20 transition-all cursor-pointer overflow-hidden"
                >
                  <div className="flex justify-between items-start mb-6">
                    <div className="p-3 rounded-2xl bg-blue-500/10 border border-blue-500/20 group-hover:bg-blue-500/20 group-hover:scale-110 transition-all">
                      <Globe className="w-6 h-6 text-blue-400" />
                    </div>
                    <span className="text-[10px] font-black uppercase tracking-widest text-blue-400/60 border border-blue-400/20 px-2 py-1 rounded-lg">
                      {job.type}
                    </span>
                  </div>

                  <h3 className="text-lg font-bold mb-2 group-hover:text-blue-400 transition-colors line-clamp-2 leading-tight">
                    {job.title}
                  </h3>
                  <p className="text-slate-400 text-sm mb-6 font-medium">{job.company}</p>

                  <div className="flex flex-col gap-3">
                    <div className="flex items-center gap-2 text-emerald-400 font-bold text-base">
                      <DollarSign className="w-4 h-4" />
                      <span>{job.salary}</span>
                    </div>
                    <div className="flex items-center gap-2 text-slate-400 text-xs font-medium">
                      <MapPin className="w-4 h-4" />
                      <span>{job.city}</span>
                    </div>
                  </div>

                  {/* Glass highlight */}
                  <div className="absolute top-0 right-0 w-20 h-20 bg-gradient-to-br from-white/10 to-transparent blur-2xl pointer-events-none" />
                </a>
              ))}
            </div>
          ) : (
            <div className="text-center py-24 bg-white/5 rounded-3xl border border-dashed border-white/10">
              <p className="text-slate-500 text-lg">Ничего не найдено 😔</p>
              <button 
                onClick={() => { setSearchQuery(''); setSelectedCity('Все'); }}
                className="mt-6 text-blue-400 font-bold hover:text-blue-300 transition-colors"
              >
                Сбросить все фильтры
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
