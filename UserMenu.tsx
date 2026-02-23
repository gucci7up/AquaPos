import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from './LanguageContext';
import { account } from '@/lib/appwrite';

export default function UserMenu() {
  const { t } = useLanguage();
  const [isOpen, setIsOpen] = useState(false);
  const [userName, setUserName] = useState('Administrador');
  const navigate = useNavigate();

  useEffect(() => {
    account.get().then(user => {
      setUserName(user.name || user.email);
    }).catch(() => {
      // Not logged in or error
    });
  }, []);

  const handleLogout = async () => {
    try {
      await account.deleteSession('current');
    } catch (e) { }
    navigate('/login');
  };

  return (
    <div className="relative z-50">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-3 pl-2 focus:outline-none group"
      >
        <div className="text-right hidden sm:block">
          <p className="text-sm font-bold text-slate-900 leading-tight group-hover:text-primary transition-colors">{userName}</p>
          <p className="text-xs text-slate-500 font-medium">Store Admin</p>
        </div>
        <div className="size-10 rounded-full bg-primary/20 border-2 border-primary/30 overflow-hidden bg-cover bg-center transition-all group-hover:ring-2 ring-primary/50" style={{ backgroundImage: "url('https://lh3.googleusercontent.com/aida-public/AB6AXuBFwVRi_zYIrbyiw0EDgKmURSt4MhFc4OCjAq8aUMJk-naKkCBgsOjI-zA362lY-D-HCe79biMT4Nf7H-BbjeegGWEV8YpRgUvBIWoO1mQsgqu-tgc4PQFLez7RDNaMt0yUCcfZeD_btlkIHrosYYJqiH_2O9MrqSkMSKPI5rKCO1V8qLHRLZi_CcK-6QlfqLg8M83zaiZauYjNkPwUSDPmbZTD_MU_rMLIlJM-nPMWjhW_9NO0HGArMNt5IkfOXcM0z1XVIPA9wj4')" }}></div>
      </button>

      {isOpen && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setIsOpen(false)}></div>
          <div className="absolute right-0 top-full mt-2 w-48 bg-white rounded-xl shadow-xl border border-slate-100 z-20 overflow-hidden py-1 animate-in fade-in zoom-in-95 duration-100">
            <div className="px-4 py-3 border-b border-slate-50 bg-slate-50/50">
              <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">{t('userMenu.account')}</p>
            </div>
            <button className="w-full text-left px-4 py-2.5 text-sm text-slate-600 hover:bg-slate-50 hover:text-slate-900 font-medium flex items-center gap-2">
              <span className="material-symbols-outlined text-lg">person</span> {t('userMenu.profile')}
            </button>
            <button className="w-full text-left px-4 py-2.5 text-sm text-slate-600 hover:bg-slate-50 hover:text-slate-900 font-medium flex items-center gap-2">
              <span className="material-symbols-outlined text-lg">settings</span> {t('userMenu.settings')}
            </button>
            <div className="h-px bg-slate-100 my-1"></div>
            <button
              onClick={handleLogout}
              className="w-full text-left px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 font-bold flex items-center gap-2"
            >
              <span className="material-symbols-outlined text-lg">logout</span> {t('userMenu.logout')}
            </button>
          </div>
        </>
      )}
    </div>
  );
}