'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Briefcase, Building, MapPin, DollarSign, AlignLeft, Send } from 'lucide-react';
import Link from 'next/link';

export default function CreateJobPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    // Здесь будет логика отправки в Supabase
    setTimeout(() => {
      setLoading(false);
      router.push('/');
    }, 1500);
  };

  return (
    <div className="min-h-screen bg-[#0f172a] text-slate-100 font-sans">
      {/* Background Decor */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] right-[-10%] w-[30%] h-[30%] bg-blue-600/10 blur-[100px] rounded-full" />
        <div className="absolute bottom-[-10%] left-[-10%] w-[30%] h-[30%] bg-indigo-600/10 blur-[100px] rounded-full" />
      </div>

      <main className="container mx-auto px-4 py-12 relative max-w-3xl">
        {/* Кнопка назад */}
        <Link 
          href="/" 
          className="inline-flex items-center gap-2 text-slate-400 hover:text-white transition-colors mb-8 group"
        >
          <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
          <span>Вернуться на главную</span>
        </Link>

        <div className="mb-10">
          <h1 className="text-4xl font-bold mb-3 bg-gradient-to-r from-white to-slate-400 bg-clip-text text-transparent">
            Опубликовать вакансию
          </h1>
          <p className="text-slate-400">Заполните детали, чтобы найти идеального кандидата в Казахстане.</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Стеклянная карточка формы */}
          <div className="p-8 rounded-3xl bg-white/5 border border-white/10 backdrop-blur-md space-y-6 shadow-2xl">
            
            {/* Название позиции */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-300 flex items-center gap-2">
                <Briefcase className="w-4 h-4 text-blue-400" />
                Название должности
              </label>
              <input 
                required
                type="text" 
                placeholder="например: Middle Frontend Developer"
                className="w-full bg-white/5 border border-white/10 rounded-2xl py-3 px-4 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all placeholder:text-slate-600"
              />
            </div>

            {/* Компания */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-300 flex items-center gap-2">
                <Building className="w-4 h-4 text-blue-400" />
                Название компании
              </label>
              <input 
                required
                type="text" 
                placeholder="Название вашего бренда"
                className="w-full bg-white/5 border border-white/10 rounded-2xl py-3 px-4 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all placeholder:text-slate-600"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Город */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-300 flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-blue-400" />
                  Город
                </label>
                <select className="w-full bg-[#1e293b] border border-white/10 rounded-2xl py-3 px-4 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all appearance-none text-slate-200 cursor-pointer">
                  <option value="almaty">Алматы</option>
                  <option value="astana">Астана</option>
                  <option value="shymkent">Шымкент</option>
                  <option value="karaganda">Караганда</option>
                  <option value="aktau">Актау</option>
                  <option value="atyrau">Атырау</option>
                  <option value="remote">Удаленно</option>
                </select>
              </div>

              {/* Зарплата */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-300 flex items-center gap-2">
                  <DollarSign className="w-4 h-4 text-emerald-400" />
                  Зарплата (₸)
                </label>
                <input 
                  type="text" 
                  placeholder="например: 500 000 - 800 000"
                  className="w-full bg-white/5 border border-white/10 rounded-2xl py-3 px-4 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all placeholder:text-slate-600"
                />
              </div>
            </div>

            {/* Описание */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-300 flex items-center gap-2">
                <AlignLeft className="w-4 h-4 text-blue-400" />
                Описание вакансии
              </label>
              <textarea 
                required
                rows={6}
                placeholder="Расскажите о задачах, требованиях и бонусах..."
                className="w-full bg-white/5 border border-white/10 rounded-2xl py-3 px-4 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all resize-none placeholder:text-slate-600"
              ></textarea>
            </div>
          </div>

          {/* Кнопка отправки */}
          <button 
            disabled={loading}
            type="submit" 
            className="w-full py-4 rounded-2xl bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed shadow-[0_0_30px_rgba(59,130,246,0.3)] transition-all flex items-center justify-center gap-3 font-bold text-lg text-white group"
          >
            {loading ? (
              <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <>
                <Send className="w-5 h-5 group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />
                <span>Опубликовать вакансию</span>
              </>
            )}
          </button>
        </form>
      </main>
    </div>
  );
}
