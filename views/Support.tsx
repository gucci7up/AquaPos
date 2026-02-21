import React from 'react';
import { useLanguage } from '../LanguageContext';
import UserMenu from '../UserMenu';

export default function Support() {
  const { t } = useLanguage();
  return (
    <>
      <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-8 z-10 shrink-0">
        <div className="flex items-center gap-4 flex-1">
          <h2 className="text-lg font-bold text-slate-900">{t('support.title')}</h2>
        </div>
        <div className="flex items-center gap-4">
          <div className="hidden lg:flex items-center gap-2 px-3 py-1.5 bg-emerald-50 rounded-full border border-emerald-100">
            <span className="material-symbols-outlined text-emerald-500 text-sm">cloud_done</span>
            <span className="text-[10px] font-bold text-emerald-600 uppercase">Cloud Sync Active</span>
          </div>
          <button className="relative p-2 text-slate-500 hover:bg-slate-100 rounded-full transition-colors">
            <span className="material-symbols-outlined">notifications</span>
          </button>
          <div className="h-8 w-[1px] bg-slate-200 mx-1"></div>
          <div className="flex items-center gap-3 pl-2">
            <UserMenu />
          </div>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto p-8 relative">
        <div className="max-w-6xl mx-auto space-y-12 pb-24">
          <section className="text-center space-y-6 pt-4 pb-8">
            <div className="space-y-2">
              <h3 className="text-4xl font-extrabold text-slate-900 tracking-tight">{t('support.greeting')}</h3>
              <p className="text-lg text-slate-500">{t('support.subtitle')}</p>
            </div>
            <div className="max-w-2xl mx-auto relative group">
              <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 text-2xl transition-colors group-focus-within:text-primary">search</span>
              <input className="w-full bg-white border-slate-200 rounded-2xl py-5 pl-14 pr-6 text-lg shadow-xl shadow-primary/5 focus:ring-4 focus:ring-primary/20 focus:border-primary transition-all placeholder:text-slate-400 outline-none border" placeholder={t('support.searchPlaceholder')} type="text" />
              <div className="absolute right-4 top-1/2 -translate-y-1/2">
                <button className="px-4 py-2 bg-slate-900 text-white rounded-lg text-sm font-bold hover:bg-slate-800 transition-colors">{t('support.quickHelp')}</button>
              </div>
            </div>
          </section>

          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            <div className="lg:col-span-3 bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
              <div className="flex items-center justify-between mb-6">
                <h4 className="font-bold text-slate-900 flex items-center gap-2">
                  <span className="material-symbols-outlined text-primary">analytics</span>
                  {t('support.systemHealth')}
                </h4>
                <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Updated 2m ago</span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <SystemStatusItem icon="cloud_sync" title={t('support.cloudSync')} status="Connected" />
                <SystemStatusItem icon="extension" title={t('support.integrations')} status="Operational" />
                <SystemStatusItem icon="payments" title={t('support.posServices')} status="Live" />
              </div>
            </div>
            <div className="bg-gradient-to-br from-primary to-blue-500 rounded-2xl p-6 text-white shadow-lg shadow-primary/20">
              <div className="h-full flex flex-col justify-between">
                <div>
                  <h4 className="font-bold text-lg mb-1">{t('support.primeSupport')}</h4>
                  <p className="text-xs text-white/80 leading-relaxed">Upgrade to Prime for 24/7 dedicated account management and advanced analytics.</p>
                </div>
                <button className="mt-4 w-full py-2 bg-white/20 hover:bg-white/30 backdrop-blur-md rounded-lg text-xs font-bold transition-all border border-white/30 uppercase tracking-widest">Learn More</button>
              </div>
            </div>
          </div>

          <section className="space-y-6">
            <div className="flex items-center justify-between">
              <h4 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                <span className="material-symbols-outlined text-primary">play_circle</span>
                {t('support.tutorials')}
              </h4>
              <button className="text-sm font-bold text-primary hover:underline">{t('support.browseAll')}</button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <VideoCard title="Setting up your first POS station" desc="Get started with hardware and local network sync." duration="04:20" image="https://lh3.googleusercontent.com/aida-public/AB6AXuDW19RiUFrR_mn2RGvVwJ8N99th62qgLHbGN8TLlr02MVRiJWKoecvhRnNUa5Uy_NeF_VG5tVS6lONSYiQXOQ3_tOzsjFZlCjlTKfCsCDA1tqF6pk6lEHRv-zjY149E2BLJNX-Qeo_Uu6qEAh92A1Un_UylasP7UhFBWIJVMwACC1UorZF2TB7H-Af_xAOVnfGz45yN5DYFVqveC5XtVpfsZH97qDvA7OKBfeIAvduH782ZuQ7kUM281h9A7jtZpmAjxP37dSvemrM" />
              <VideoCard title="Advanced Inventory Management" desc="Bulk imports, SKU variations, and stock alerts." duration="06:45" image="https://lh3.googleusercontent.com/aida-public/AB6AXuD1akzIzB_2RWWdmCZ99jzNwvIYNayqLm5XZZi97B5sY5Ho_KkgvFJlb44g5ImmQUkHVAdQcUTdwX_xvZCwIc5sQzSZqapV66qlrzjoswmE4N0nIR7fgPFD3q8iCFKCmWfGG8nrPUvvDDg6Szjo4H4hyG7eQacqc34istTLmpufhYzeTR6GloOA_ol-EtuvmCsfdYSETA6FmtpYnH-C6PGQ2VVMkQ2PNoFJhGrBk1EdhSOOQl6CHSd6H89FAOQb-W4d7mGUGVbQuuo" />
              <VideoCard title="Using AquaAI for Sales Insights" desc="Leverage automated reports to grow your margins." duration="03:15" image="https://lh3.googleusercontent.com/aida-public/AB6AXuDswOYPQs-98R3MnN64Ahhr55ngIvD1W3a7FM_QP6KmfJ9eL9sF1r9cnyEVOwiGJgxbrvow22-l-XfGdb8kdDE4R6q8y3NcHq_eRhj1aStAtAQk0ogHmpvIfZPZ7fWQE9iXwzL2tIkO2mKH6tZkbA7Vf9ioUDkjQ984sNFhQLxsgqGdVimVgsWnCg98O7AvVTYoO2ks9x_BuCdjEQKXGqy7Q64gaqdxZ_tK6uOnBUKMk1oIoqbypkMlEs3R7Ifl1iOyhxc8kJOUurI" />
            </div>
          </section>

          <section className="pb-12">
            <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
              <div className="p-6 border-b border-slate-100">
                <h4 className="font-bold text-slate-900">{t('support.articles')}</h4>
              </div>
              <div className="divide-y divide-slate-100">
                <ArticleRow title="How to handle multi-currency transactions?" />
                <ArticleRow title="Integrating Latin American local payment gateways" />
                <ArticleRow title="Closing the day: Reconciling POS and Bank accounts" />
              </div>
            </div>
          </section>
        </div>

        <div className="fixed bottom-8 right-8 z-50 flex flex-col items-end gap-4">
          <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-2xl max-w-xs animate-bounce-in">
            <div className="flex items-start gap-4">
              <div className="relative">
                <div className="size-12 rounded-full overflow-hidden bg-primary/20 bg-cover bg-center" style={{ backgroundImage: "url('https://lh3.googleusercontent.com/aida-public/AB6AXuBcb5pP93pYZlcXctU0crapHp_EuiKZc_pXQxmKKl3MFk4Fz0YE4YeRuaRrN9kXqTA5GAVaR94QMu60NgIY6fYy42KFqKRYwhasq_HRqvGlIRZGoCYpvL2hPHmvcJkfVQ9pU_3sEwtuAVEr87FuDNpqiXIGYpuXd0Q9URY53kdnQcwAYtjeJ_G9i1nXRUfa1cnWguXtbaJ7eI17nDEr5dWTCoOLZUpRRsrbkhA1woemgHyyqYk1xxY5Hro5xrjWI9hCRzLZ4YT')" }}></div>
                <div className="absolute bottom-0 right-0 size-3 bg-emerald-500 border-2 border-white rounded-full"></div>
              </div>
              <div>
                <p className="font-bold text-slate-900 text-sm">Mariana (Aqua Expert)</p>
                <p className="text-xs text-slate-500 mb-1">{t('support.online')}</p>
                <p className="text-xs font-medium text-slate-700 bg-slate-50 p-2 rounded-lg rounded-tl-none">Hola Juan, I noticed your cloud sync was delayed. Do you need help with that?</p>
              </div>
            </div>
          </div>
          <button className="flex items-center gap-2 bg-slate-900 text-white pl-5 pr-6 py-4 rounded-full shadow-2xl hover:scale-105 active:scale-95 transition-all font-bold group">
            <span className="material-symbols-outlined text-2xl group-hover:animate-bounce">support_agent</span>
            {t('support.liveExpert')}
          </button>
        </div>
      </div>
    </>
  );
}

const SystemStatusItem = ({ icon, title, status }: { icon: string; title: string; status: string }) => {
  const isLive = status === 'Live' || status === 'Connected' || status === 'Operational';
  return (
    <div className="flex items-start gap-4 p-4 rounded-xl bg-slate-50 border border-slate-100">
      <div className={`p-2 rounded-lg ${isLive ? 'bg-emerald-100 text-emerald-600' : 'bg-amber-100 text-amber-600'}`}>
        <span className="material-symbols-outlined">{icon}</span>
      </div>
      <div>
        <p className="font-bold text-slate-900 text-sm">{title}</p>
        <p className={`text-xs font-bold uppercase mt-1 ${isLive ? 'text-emerald-600' : 'text-amber-600'}`}>{status}</p>
      </div>
    </div>
  );
};

const VideoCard = ({ title, desc, duration, image }: { title: string; desc: string; duration: string; image: string }) => (
  <div className="group bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm hover:shadow-md transition-all cursor-pointer">
    <div className="relative aspect-video bg-slate-100 overflow-hidden">
      <img src={image} alt={title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
      <div className="absolute inset-0 bg-black/20 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity backdrop-blur-[2px]">
        <div className="size-12 bg-white/90 rounded-full flex items-center justify-center shadow-lg">
          <span className="material-symbols-outlined text-primary text-3xl ml-1">play_arrow</span>
        </div>
      </div>
      <span className="absolute bottom-2 right-2 bg-black/70 text-white text-[10px] font-bold px-1.5 py-0.5 rounded backdrop-blur-md">{duration}</span>
    </div>
    <div className="p-4">
      <h5 className="font-bold text-slate-900 leading-tight mb-1 group-hover:text-primary transition-colors">{title}</h5>
      <p className="text-xs text-slate-500 line-clamp-2">{desc}</p>
    </div>
  </div>
);

const ArticleRow = ({ title }: { title: string }) => (
  <button className="w-full flex items-center justify-between p-4 hover:bg-slate-50 transition-colors text-left group">
    <div className="flex items-center gap-3">
      <span className="material-symbols-outlined text-slate-300 group-hover:text-primary transition-colors">article</span>
      <span className="text-sm font-medium text-slate-700 group-hover:text-slate-900 transition-colors">{title}</span>
    </div>
    <span className="material-symbols-outlined text-slate-300 text-sm">chevron_right</span>
  </button>
);