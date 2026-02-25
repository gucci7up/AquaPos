import React, { useState, useEffect } from 'react';
import { HashRouter, Routes, Route, useLocation, useNavigate } from 'react-router-dom';
import { LanguageProvider, useLanguage } from './LanguageContext';
import { BrandingProvider, useBranding } from './BrandingContext';
import LandingPage from './views/LandingPage';
import Dashboard from './views/Dashboard';
import POS from './views/POS';
import Inventory from './views/Inventory';
import Sales from './views/Sales';
import Quotes from './views/Quotes';
import Finance from './views/Finance';
import Customers from './views/Customers';
import Suppliers from './views/Suppliers';
import AquaAI from './views/AquaAI';
import Settings from './views/Settings';
import Support from './views/Support';
import Auth from './views/Auth';
import Subscriptions from './views/Subscriptions';
import SubscriptionCheckout from './views/SubscriptionCheckout';

const SidebarLink = ({ to, icon, label, isNew = false, onClick }: { to: string; icon: string; label: string; isNew?: boolean; onClick?: () => void }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const isActive = location.pathname === to;

  return (
    <div
      onClick={() => {
        navigate(to);
        if (onClick) onClick();
      }}
      className={`flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-lg cursor-pointer transition-colors mt-1 ${isActive
        ? 'bg-primary/10 text-primary border border-primary/20'
        : 'text-slate-600 hover:bg-slate-100'
        }`}
    >
      <span className="material-symbols-outlined">{icon}</span>
      <span className="flex-1">{label}</span>
      {isNew && (
        <span className="bg-primary/20 text-primary text-[10px] font-bold px-1.5 py-0.5 rounded uppercase">New</span>
      )}
    </div>
  );
};

const MobileNavItem = ({ to, icon, label, isActive }: { to: string; icon: string; label: string; isActive: boolean }) => {
  const navigate = useNavigate();
  return (
    <button
      onClick={() => navigate(to)}
      className={`flex flex-col items-center justify-center w-full py-2 transition-all duration-300 ${isActive ? 'text-primary -translate-y-1' : 'text-slate-400'}`}
    >
      <div className={`p-1.5 rounded-xl mb-0.5 transition-all ${isActive ? 'bg-primary/10' : 'bg-transparent'}`}>
        <span className={`material-symbols-outlined text-2xl ${isActive ? 'fill-1' : ''}`}>{icon}</span>
      </div>
      <span className="text-[10px] font-bold">{label}</span>
    </button>
  );
};

const Layout = ({ children }: { children?: React.ReactNode }) => {
  const { t } = useLanguage();
  const { branding } = useBranding();
  const location = useLocation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Close mobile menu on route change
  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [location]);

  return (
    <div className="flex h-screen overflow-hidden bg-background-light">
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex w-64 flex-shrink-0 bg-white border-r border-slate-200 flex-col z-20">
        <div className="p-6 flex items-center gap-3">
          {branding.logoUrl ? (
            <img src={branding.logoUrl} alt="logo" className="h-10 w-10 object-contain rounded-lg" />
          ) : (
            <div className="size-10 bg-primary rounded-lg flex items-center justify-center text-white shadow-lg shadow-primary/20">
              <span className="material-symbols-outlined text-2xl">water_drop</span>
            </div>
          )}
          <div>
            <h1 className="text-xl font-bold tracking-tight text-slate-900 leading-none">{branding.businessName || 'AquaPos'}</h1>
            <p className="text-[10px] text-slate-500 font-bold uppercase tracking-[0.1em] mt-1">Enterprise OS</p>
          </div>
        </div>

        <nav className="flex-1 px-4 space-y-1 overflow-y-auto custom-scrollbar">
          <div className="pb-4 pt-2">
            <p className="px-3 text-xs font-semibold text-slate-400 uppercase tracking-widest mb-2">{t('sidebar.mainMenu')}</p>
            <SidebarLink to="/dashboard" icon="dashboard" label={t('sidebar.dashboard')} />
            <SidebarLink to="/pos" icon="point_of_sale" label={t('sidebar.pos')} />
            <SidebarLink to="/inventory" icon="inventory_2" label={t('sidebar.inventory')} />
            <SidebarLink to="/suppliers" icon="local_shipping" label={t('sidebar.suppliers')} />
            <SidebarLink to="/sales" icon="insights" label={t('sidebar.sales')} />
            <SidebarLink to="/quotes" icon="request_quote" label={t('sidebar.quotes')} />
            <SidebarLink to="/finance" icon="account_balance" label={t('sidebar.finance')} />
            <SidebarLink to="/customers" icon="group" label={t('sidebar.customers')} />
            <SidebarLink to="/subscriptions" icon="loyalty" label={t('sidebar.subscriptions')} />
          </div>

          <div className="pt-4 border-t border-slate-100">
            <p className="px-3 text-xs font-semibold text-slate-400 uppercase tracking-widest mb-2">{t('sidebar.intelligence')}</p>
            <SidebarLink to="/ai" icon="auto_awesome" label={t('sidebar.ai')} isNew={true} />
          </div>
        </nav>

        <div className="p-4 border-t border-slate-100 space-y-1">
          <SidebarLink to="/settings" icon="settings" label={t('sidebar.settings')} />
          <SidebarLink to="/support" icon="help" label={t('sidebar.support')} />
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden relative">
        <div className="flex-1 overflow-hidden relative">
          {/* Added padding bottom for mobile nav */}
          <div className="h-full pb-[80px] md:pb-0 overflow-y-auto bg-background-light">
            {children}
          </div>
        </div>

        {/* Mobile Bottom Navigation (WhatsApp Style / Floating Modern) */}
        <div className="md:hidden fixed bottom-4 left-4 right-4 bg-white/90 backdrop-blur-xl border border-white/50 shadow-2xl rounded-2xl z-50 flex justify-around items-center h-[70px] px-2 ring-1 ring-black/5">
          <MobileNavItem to="/dashboard" icon="dashboard" label="Home" isActive={location.pathname === '/dashboard'} />
          <MobileNavItem to="/pos" icon="point_of_sale" label="POS" isActive={location.pathname === '/pos'} />

          {/* Central Action Button - BRAND COLOR */}
          <div className="relative -top-6">
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="size-14 bg-primary rounded-full shadow-xl shadow-primary/30 flex items-center justify-center text-white border-4 border-[#f6f8f8] active:scale-95 transition-transform"
            >
              <span className="material-symbols-outlined text-2xl">{isMobileMenuOpen ? 'close' : 'apps'}</span>
            </button>
          </div>

          <MobileNavItem to="/inventory" icon="inventory_2" label="Stock" isActive={location.pathname === '/inventory'} />
          <MobileNavItem to="/sales" icon="receipt_long" label="Sales" isActive={location.pathname === '/sales'} />
        </div>

        {/* Mobile Expanded Menu (Drawer) */}
        {isMobileMenuOpen && (
          <div className="md:hidden fixed inset-0 z-40 bg-slate-900/20 backdrop-blur-sm" onClick={() => setIsMobileMenuOpen(false)}>
            <div
              className="absolute bottom-[100px] left-4 right-4 bg-white rounded-2xl shadow-2xl p-4 animate-in slide-in-from-bottom-10 fade-in duration-200"
              onClick={(e) => e.stopPropagation()}
            >
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3 px-2">More Options</p>
              <div className="grid grid-cols-4 gap-4">
                <MenuGridItem to="/suppliers" icon="local_shipping" label="Suppliers" color="bg-orange-100 text-orange-600" onClick={() => setIsMobileMenuOpen(false)} />
                <MenuGridItem to="/finance" icon="account_balance" label="Finance" color="bg-emerald-100 text-emerald-600" onClick={() => setIsMobileMenuOpen(false)} />
                <MenuGridItem to="/customers" icon="group" label="Clients" color="bg-blue-100 text-blue-600" onClick={() => setIsMobileMenuOpen(false)} />
                <MenuGridItem to="/ai" icon="auto_awesome" label="AquaAI" color="bg-primary/20 text-primary" onClick={() => setIsMobileMenuOpen(false)} />
                <MenuGridItem to="/quotes" icon="request_quote" label="Quotes" color="bg-purple-100 text-purple-600" onClick={() => setIsMobileMenuOpen(false)} />
                <MenuGridItem to="/subscriptions" icon="loyalty" label="Subs" color="bg-pink-100 text-pink-600" onClick={() => setIsMobileMenuOpen(false)} />
                <MenuGridItem to="/settings" icon="settings" label="Settings" color="bg-slate-100 text-slate-600" onClick={() => setIsMobileMenuOpen(false)} />
                <MenuGridItem to="/support" icon="help" label="Support" color="bg-amber-100 text-amber-600" onClick={() => setIsMobileMenuOpen(false)} />
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

const MenuGridItem = ({ to, icon, label, color, onClick }: any) => {
  const navigate = useNavigate();
  return (
    <button onClick={() => { navigate(to); onClick(); }} className="flex flex-col items-center gap-2 p-2 rounded-xl hover:bg-slate-50 transition-colors">
      <div className={`size-12 rounded-xl flex items-center justify-center ${color}`}>
        <span className="material-symbols-outlined text-2xl">{icon}</span>
      </div>
      <span className="text-xs font-medium text-slate-700">{label}</span>
    </button>
  );
}

export default function App() {
  return (
    <LanguageProvider>
      <BrandingProvider>
        <HashRouter>
          <Routes>
            {/* Landing Page Route - No Layout */}
            <Route path="/" element={<LandingPage />} />

            {/* Auth Route - No Layout */}
            <Route path="/login" element={<Auth />} />

            {/* Public Checkout - No Layout */}
            <Route path="/checkout/:planSlug" element={<SubscriptionCheckout />} />

            {/* Application Routes - Wrapped in Layout */}
            <Route path="/dashboard" element={<Layout><Dashboard /></Layout>} />
            <Route path="/pos" element={<Layout><POS /></Layout>} />
            <Route path="/inventory" element={<Layout><Inventory /></Layout>} />
            <Route path="/suppliers" element={<Layout><Suppliers /></Layout>} />
            <Route path="/sales" element={<Layout><Sales /></Layout>} />
            <Route path="/quotes" element={<Layout><Quotes /></Layout>} />
            <Route path="/finance" element={<Layout><Finance /></Layout>} />
            <Route path="/customers" element={<Layout><Customers /></Layout>} />
            <Route path="/subscriptions" element={<Layout><Subscriptions /></Layout>} />
            <Route path="/ai" element={<Layout><AquaAI /></Layout>} />
            <Route path="/settings" element={<Layout><Settings /></Layout>} />
            <Route path="/support" element={<Layout><Support /></Layout>} />
          </Routes>
        </HashRouter>
      </BrandingProvider>
    </LanguageProvider>
  );
}