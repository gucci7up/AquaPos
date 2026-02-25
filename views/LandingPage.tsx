import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '../LanguageContext';
import { useBranding } from '../BrandingContext';

export default function LandingPage() {
  const { t, setLanguage, language } = useLanguage();
  const { branding } = useBranding();
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isFormOpen, setIsFormOpen] = useState(false);

  // Use the exact custom colors from the provided HTML reference
  const colors = {
    aquaLight: '#e8fbfe',
    primary: '#13daec',
    aquaDark: '#0ea5b9',
    slate950: '#020617'
  };

  // Scroll handler to prevent HashRouter conflicts and enable smooth scrolling
  const scrollToSection = (e: React.MouseEvent<HTMLAnchorElement>, id: string) => {
    e.preventDefault();
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
    setMobileMenuOpen(false);
  };

  return (
    <div className="bg-white min-h-screen font-sans selection:bg-[#13daec]/20">
      <style>{`
        @keyframes float {
          0% { transform: translateY(0px); }
          50% { transform: translateY(-20px); }
          100% { transform: translateY(0px); }
        }
        .animate-float {
          animation: float 6s ease-in-out infinite;
        }
        .hero-gradient {
            background: radial-gradient(circle at 70% 30%, ${colors.aquaLight} 0%, #ffffff 100%);
        }
      `}</style>

      {/* Navbar */}
      <nav className="bg-white/80 backdrop-blur-md border-b border-slate-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-20 items-center">
            <div className="flex items-center gap-2 cursor-pointer" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
              {branding.logoUrl ? (
                <img src={branding.logoUrl} alt="logo" className="h-10 w-10 object-contain rounded-lg" />
              ) : (
                <div className="size-10 bg-primary rounded-lg flex items-center justify-center text-white shadow-lg shadow-primary/20" style={{ backgroundColor: colors.primary }}>
                  <span className="material-symbols-outlined text-2xl font-bold">water_drop</span>
                </div>
              )}
              <span className="text-2xl font-extrabold tracking-tight" style={{ color: colors.slate950 }}>{branding.businessName || 'AquaPos'}</span>
            </div>

            {/* Desktop Nav */}
            <div className="hidden md:flex items-center space-x-8 text-sm font-semibold text-slate-600">
              <a href="#solutions" onClick={(e) => scrollToSection(e, 'solutions')} className="hover:text-primary transition-colors">{t('landing.nav.solutions')}</a>
              <a href="#why-aqua" onClick={(e) => scrollToSection(e, 'why-aqua')} className="hover:text-primary transition-colors">{t('landing.nav.why')}</a>
              <a href="#pricing" onClick={(e) => scrollToSection(e, 'pricing')} className="hover:text-primary transition-colors">{t('landing.nav.pricing')}</a>
              <div className="flex gap-3 items-center ml-2">
                <button
                  onClick={() => setLanguage(language === 'en' ? 'es' : 'en')}
                  className="text-xs font-bold uppercase hover:text-primary transition-colors border border-slate-200 rounded px-2 py-1"
                >
                  {language}
                </button>
                <button
                  onClick={() => navigate('/login')}
                  className="text-sm font-bold text-slate-600 hover:text-primary transition-colors px-4"
                >
                  {t('landing.nav.login')}
                </button>
                <button
                  onClick={() => navigate('/login')}
                  className="px-5 py-2.5 bg-primary text-white rounded-full hover:bg-[#0ea5b9] transition-all shadow-md shadow-primary/20 font-semibold"
                  style={{ backgroundColor: colors.primary }}
                >
                  {t('landing.nav.start')}
                </button>
              </div>
            </div>

            {/* Mobile Menu Button */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-2 text-slate-600 hover:text-primary transition-colors"
            >
              <span className="material-symbols-outlined text-3xl">{mobileMenuOpen ? 'close' : 'menu'}</span>
            </button>
          </div>
        </div>

        {/* Mobile Menu Overlay */}
        {mobileMenuOpen && (
          <div className="md:hidden absolute top-20 left-0 w-full bg-white border-b border-slate-100 shadow-xl p-6 flex flex-col gap-4 animate-in slide-in-from-top-5">
            <a href="#solutions" onClick={(e) => scrollToSection(e, 'solutions')} className="text-lg font-bold text-slate-700">{t('landing.nav.solutions')}</a>
            <a href="#why-aqua" onClick={(e) => scrollToSection(e, 'why-aqua')} className="text-lg font-bold text-slate-700">{t('landing.nav.why')}</a>
            <a href="#pricing" onClick={(e) => scrollToSection(e, 'pricing')} className="text-lg font-bold text-slate-700">{t('landing.nav.pricing')}</a>
            <button onClick={() => { setLanguage(language === 'en' ? 'es' : 'en'); setMobileMenuOpen(false); }} className="text-left font-bold text-slate-500 uppercase text-sm">Switch Language ({language})</button>
            <button onClick={() => navigate('/login')} className="w-full py-3 border border-slate-200 text-slate-900 rounded-xl font-bold">{t('landing.nav.login')}</button>
            <button onClick={() => navigate('/login')} className="w-full py-3 bg-primary text-white rounded-xl font-bold shadow-lg" style={{ backgroundColor: colors.primary }}>{t('landing.nav.start')}</button>
          </div>
        )}
      </nav>

      {/* Hero Section */}
      <section className="relative overflow-hidden hero-gradient pt-16 pb-24 lg:pt-32 lg:pb-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <div className="text-center lg:text-left z-10">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-primary/20 text-primary text-xs font-bold uppercase tracking-widest mb-6" style={{ backgroundColor: colors.aquaLight, color: colors.primary, borderColor: 'rgba(19,218,236,0.2)' }}>
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75" style={{ backgroundColor: colors.primary }}></span>
                  <span className="relative inline-flex rounded-full h-2 w-2" style={{ backgroundColor: colors.primary }}></span>
                </span>
                {t('landing.hero.new')}
              </div>
              <h1 className="text-5xl lg:text-7xl font-extrabold text-slate-950 leading-[1.1] mb-8" style={{ color: colors.slate950 }}>
                {t('landing.hero.title')} <span style={{ color: colors.primary }}>{t('landing.hero.titleHighlight')}</span>
              </h1>
              <p className="text-xl text-slate-600 mb-10 leading-relaxed max-w-2xl mx-auto lg:mx-0">
                {t('landing.hero.subtitle')}
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start">
                <button onClick={() => navigate('/login')} className="px-8 py-4 bg-primary text-white text-lg font-bold rounded-xl hover:bg-[#0ea5b9] transition-all shadow-xl shadow-primary/30 flex items-center justify-center gap-2" style={{ backgroundColor: colors.primary }}>
                  {t('landing.nav.start')}
                  <span className="material-symbols-outlined">arrow_forward</span>
                </button>
                <button onClick={() => setIsFormOpen(true)} className="px-8 py-4 bg-white text-slate-900 text-lg font-bold rounded-xl border border-slate-200 hover:bg-slate-50 transition-all flex items-center justify-center gap-2">
                  <span className="material-symbols-outlined">play_circle</span>
                  {t('landing.hero.demo')}
                </button>
              </div>
              <p className="mt-6 text-sm text-slate-400 font-medium">{t('landing.hero.noCard')}</p>
            </div>
            <div className="relative">
              <div className="relative z-10 w-full animate-float">
                {/* Dashboard Image */}
                <div className="rounded-2xl shadow-2xl border border-slate-200 w-full aspect-[4/3] bg-white overflow-hidden relative group">
                  <img
                    src={branding.landingHero || 'https://lh3.googleusercontent.com/aida-public/AB6AXuA7lYcDqoIsNqzIvtzR5LqLXZ4JlKkCRqIagznKEbsvnI6pQ0x3chrwmsp2U2cowE7Ll7tO1aysWfCu6OAs8JWAmc3l7dTPPSPlpAo47gaVg6U8y2iE797oWUBO7ciQyHbV12LoYTMIPIG8GMEZd9lTyZvzWK_ruTQvnXT0-mnS1ALu5_BS9IBUSudsfL_KcDvFjHWumWoiUFxNRQHnf0DoZ7rRh823k53HIdQDHsKEFehywkn_mMIGNhvfoyrX86Qwx8nLDCcVw3s'}
                    className="w-full h-full object-cover object-top"
                    alt="Dashboard Preview"
                  />
                </div>
              </div>
              {/* Floating Mobile App Element */}
              <div className="absolute -bottom-10 -left-10 z-20 w-48 hidden md:block">
                <img
                  alt="Mobile App"
                  className="rounded-[2rem] shadow-2xl border-4 border-white w-full aspect-[1/2] object-cover"
                  src="https://lh3.googleusercontent.com/aida-public/AB6AXuBWvk9CAUtPBscww0R9xdnm16iCqTl3vQGzRcMDKb3AkQXIrubU3SwcHYdhUU41WiP2xhBPSZ3eTSeBHgAmArSU4b3y3-SBg3LgvQWtyr1YiUuMxCOXU4oAUQ5xgFWsHahkNg0berzKsxAomp43EQs9flRJVbHnlYxhEfKQNvTI4VU7J8dg5rEiY5qewE8Sw7PWbzcP2PO8Ds0LPhwuthyMeF-wdGACHbd5ZmTdiRlNLV42wfTy31U0QxmBqpdcsVYtVdvda09XJx8"
                />
              </div>
              <div className="absolute -top-20 -right-20 size-64 bg-primary/10 rounded-full blur-3xl" style={{ backgroundColor: 'rgba(19,218,236,0.1)' }}></div>
              <div className="absolute -bottom-20 -left-20 size-64 bg-[#0ea5b9]/10 rounded-full blur-3xl"></div>
            </div>
          </div>
        </div>
      </section>

      {/* Solutions Section */}
      <section id="solutions" className="py-24 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-slate-950 mb-4 tracking-tight" style={{ color: colors.slate950 }}>{t('landing.solutions.title')}</h2>
            <p className="text-slate-500 max-w-2xl mx-auto">{t('landing.solutions.subtitle')}</p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            <SolutionCard icon="storefront" title={t('landing.solutions.retail.title')} desc={t('landing.solutions.retail.desc')} link={t('landing.solutions.learnMore')} primaryColor={colors.primary} />
            <SolutionCard icon="restaurant" title={t('landing.solutions.restaurant.title')} desc={t('landing.solutions.restaurant.desc')} link={t('landing.solutions.learnMore')} primaryColor={colors.primary} />
            <SolutionCard icon="warehouse" title={t('landing.solutions.wholesale.title')} desc={t('landing.solutions.wholesale.desc')} link={t('landing.solutions.learnMore')} primaryColor={colors.primary} />
            <SolutionCard icon="shopping_bag" title={t('landing.solutions.digital.title')} desc={t('landing.solutions.digital.desc')} link={t('landing.solutions.learnMore')} primaryColor={colors.primary} />
          </div>
        </div>
      </section>

      {/* Features / Dark Section */}
      <section id="why-aqua" className="py-24 bg-slate-950 text-white overflow-hidden relative" style={{ backgroundColor: colors.slate950 }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="grid lg:grid-cols-2 gap-20 items-center">
            <div>
              <h2 className="text-4xl font-bold mb-8 tracking-tight">{t('landing.features.title')}</h2>
              <p className="text-slate-400 text-lg mb-12">{t('landing.features.subtitle')}</p>
              <div className="space-y-10">
                <FeatureRow icon="sync_saved_locally" title={t('landing.features.sync.title')} desc={t('landing.features.sync.desc')} primaryColor={colors.primary} />
                <FeatureRow icon="data_exploration" title={t('landing.features.precision.title')} desc={t('landing.features.precision.desc')} primaryColor={colors.primary} />
                <FeatureRow icon="auto_awesome" title={t('landing.features.ai.title')} desc={t('landing.features.ai.desc')} primaryColor={colors.primary} />
              </div>
            </div>
            <div className="hidden lg:block">
              <div className="relative bg-slate-900 rounded-[3rem] p-12 border border-slate-800 shadow-3xl">
                <div className="absolute -inset-1 bg-gradient-to-r from-[#13daec] to-[#0ea5b9] blur opacity-20"></div>

                {/* Abstract Dashboard UI */}
                <div className="relative space-y-6">
                  <div className="h-4 w-1/2 bg-slate-800 rounded-full"></div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="h-32 bg-slate-800/50 rounded-2xl border border-slate-700"></div>
                    <div className="h-32 bg-slate-800/50 rounded-2xl border border-slate-700"></div>
                  </div>
                  <div className="h-48 bg-[#13daec]/10 rounded-2xl border border-[#13daec]/20 flex items-center justify-center relative overflow-hidden">
                    <span className="material-symbols-outlined text-6xl text-[#13daec]/50">monitoring</span>
                  </div>
                  <div className="h-4 w-3/4 bg-slate-800 rounded-full"></div>
                </div>
              </div>
            </div>
          </div>
        </div>
        {/* Background blobs */}
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-[#13daec]/10 rounded-full blur-[120px] -mr-64 -mt-64"></div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="py-24 bg-slate-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-slate-950 mb-4 tracking-tight" style={{ color: colors.slate950 }}>{t('landing.pricing.title')}</h2>
            <p className="text-slate-500 max-w-2xl mx-auto">{t('landing.pricing.subtitle')}</p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 items-start">
            <PricingCard
              title={t('landing.pricing.plans.free')}
              price="FREE"
              btnText={t('landing.pricing.start')}
              features={t('landing.pricing.features.free')}
              primaryColor={colors.primary}
              onSelect={() => navigate('/login')}
            />
            <PricingCard
              title={t('landing.pricing.plans.pro')}
              price="$29"
              period={t('landing.pricing.monthly')}
              subText={t('landing.pricing.annual')}
              btnText={`${t('landing.pricing.choose')} PRO`}
              features={t('landing.pricing.features.pro')}
              primaryColor={colors.primary}
              onSelect={() => navigate('/checkout/profesional')}
            />
            <PricingCard
              title={t('landing.pricing.plans.growth')}
              price="$79"
              period={t('landing.pricing.monthly')}
              subText={t('landing.pricing.annual')}
              btnText={`${t('landing.pricing.choose')} GROW`}
              popular={t('landing.pricing.mostPopular')}
              features={t('landing.pricing.features.growth')}
              isPrimary
              primaryColor={colors.primary}
              onSelect={() => navigate('/checkout/crecimiento')}
            />
            <PricingCard
              title={t('landing.pricing.plans.corp')}
              price="Custom"
              btnText={t('landing.pricing.contact')}
              features={t('landing.pricing.features.corp')}
              primaryColor={colors.primary}
              onContact={() => setIsFormOpen(true)}
              onSelect={() => setIsFormOpen(true)}
            />
          </div>
        </div>
      </section>

      {/* Trust Badge Bar */}
      <section className="py-12" style={{ backgroundColor: colors.primary }}>
        <div className="max-w-7xl mx-auto px-4 flex flex-col md:flex-row items-center justify-between gap-8 text-white">
          <div className="flex items-center gap-6">
            <span className="material-symbols-outlined text-5xl opacity-80">verified_user</span>
            <div>
              <h3 className="text-2xl font-bold">Soberanía Digital</h3>
              <p className="opacity-90 font-medium">Tus datos te pertenecen. Alojamiento regional con máxima seguridad.</p>
            </div>
          </div>
          <div className="flex items-center gap-8 opacity-80 flex-wrap justify-center">
            <span className="font-bold tracking-widest text-xl">ISO 27001</span>
            <span className="font-bold tracking-widest text-xl">GDPR READY</span>
            <span className="font-bold tracking-widest text-xl">LATAM COMPLIANT</span>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-white pt-24 pb-12 border-t border-slate-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-12 mb-20">
            <div className="col-span-2">
              <div className="flex items-center gap-2 mb-6">
                <div className="size-8 bg-primary rounded flex items-center justify-center text-white" style={{ backgroundColor: colors.primary }}>
                  <span className="material-symbols-outlined text-lg">water_drop</span>
                </div>
                <span className="text-xl font-extrabold tracking-tight text-slate-950" style={{ color: colors.slate950 }}>AquaPos</span>
              </div>
              <p className="text-slate-500 text-sm mb-8 max-w-xs leading-relaxed">{t('landing.footer.desc')}</p>
              <div className="flex gap-4">
                <a href="#" className="size-10 rounded-full border border-slate-100 flex items-center justify-center text-slate-400 hover:text-primary transition-colors"><span className="material-symbols-outlined text-xl">public</span></a>
                <a href="#" className="size-10 rounded-full border border-slate-100 flex items-center justify-center text-slate-400 hover:text-primary transition-colors"><span className="material-symbols-outlined text-xl">share</span></a>
              </div>
            </div>
            <div>
              <h4 className="font-bold mb-6 text-sm uppercase tracking-widest text-slate-400">{t('landing.footer.product')}</h4>
              <ul className="space-y-4 text-slate-600 text-sm">
                <li><a href="#" className="hover:text-primary">Funciones</a></li>
                <li><a href="#" className="hover:text-primary">Integraciones</a></li>
                <li><a href="#" className="hover:text-primary">AquaAI</a></li>
                <li><a href="#" className="hover:text-primary">Hardware</a></li>
              </ul>
            </div>
            <div>
              <h4 className="font-bold mb-6 text-sm uppercase tracking-widest text-slate-400">{t('landing.footer.company')}</h4>
              <ul className="space-y-4 text-slate-600 text-sm">
                <li><a href="#" className="hover:text-primary">Sobre Nosotros</a></li>
                <li><a href="#" className="hover:text-primary">Carreras</a></li>
                <li><a href="#" className="hover:text-primary">Blog</a></li>
                <li><a href="#" className="hover:text-primary">Partners</a></li>
              </ul>
            </div>
            <div>
              <h4 className="font-bold mb-6 text-sm uppercase tracking-widest text-slate-400">{t('landing.footer.support')}</h4>
              <ul className="space-y-4 text-slate-600 text-sm">
                <li><a href="#" className="hover:text-primary">Centro de Ayuda</a></li>
                <li><a href="#" className="hover:text-primary">Documentación</a></li>
                <li><a href="#" className="hover:text-primary">Estado del Sistema</a></li>
                <li><a href="#" className="hover:text-primary">Contacto</a></li>
              </ul>
            </div>
            <div className="flex flex-col items-end col-span-2 lg:col-span-1">
              <div className="p-4 bg-slate-50 border border-slate-100 rounded-xl text-center inline-block">
                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] mb-2">Certificado</div>
                <div className="flex items-center gap-1 font-extrabold text-slate-900">
                  <span className="material-symbols-outlined" style={{ color: colors.primary }}>verified</span>
                  PEPPOL-Ready
                </div>
              </div>
            </div>
          </div>
          <div className="pt-12 border-t border-slate-100 flex flex-col md:flex-row justify-between items-center gap-6">
            <p className="text-sm text-slate-400">© 2024 AquaPos Inc. Hecho con ❤️ en Latinoamérica.</p>
            <div className="flex gap-8 text-xs font-bold text-slate-400 uppercase tracking-widest">
              <a href="#" className="hover:text-slate-900">{t('landing.footer.privacy')}</a>
              <a href="#" className="hover:text-slate-900">{t('landing.footer.terms')}</a>
              <a href="#" className="hover:text-slate-900">{t('landing.footer.cookies')}</a>
            </div>
          </div>
        </div>
      </footer>

      {/* Contact/Demo Modal (Added to satisfy 'missing forms' request) */}
      {isFormOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <div>
                <h3 className="text-lg font-bold text-slate-900">{t('landing.form.title')}</h3>
                <p className="text-xs text-slate-500">{t('landing.form.subtitle')}</p>
              </div>
              <button onClick={() => setIsFormOpen(false)} className="text-slate-400 hover:text-slate-600">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">{t('landing.form.name')}</label>
                <input className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary" placeholder="Juan Pérez" />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">{t('landing.form.email')}</label>
                <input className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary" placeholder="juan@empresa.com" type="email" />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">{t('landing.form.company')}</label>
                <input className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary" placeholder="Tu Negocio S.A.S." />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">{t('landing.form.message')}</label>
                <textarea className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary resize-none h-24" placeholder="Estoy interesado en..." />
              </div>
              <button onClick={() => { alert(t('landing.form.success')); setIsFormOpen(false); }} className="w-full py-3 bg-primary text-white font-bold rounded-xl shadow-lg hover:brightness-105 transition-all" style={{ backgroundColor: colors.primary }}>
                {t('landing.form.submit')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Sub-components
const SolutionCard = ({ icon, title, desc, link, primaryColor }: any) => (
  <div className="p-8 rounded-2xl border border-slate-100 bg-slate-50 hover:border-primary/50 transition-all group cursor-pointer">
    <div className="size-14 rounded-xl bg-white shadow-sm flex items-center justify-center mb-6 group-hover:bg-primary group-hover:text-white transition-all" style={{ '--tw-hover-bg': primaryColor } as React.CSSProperties}>
      <span className="material-symbols-outlined text-3xl">{icon}</span>
    </div>
    <h3 className="text-xl font-bold mb-3 text-slate-900">{title}</h3>
    <p className="text-slate-500 text-sm leading-relaxed mb-6">{desc}</p>
    <span className="text-primary font-bold text-sm flex items-center gap-1 group-hover:gap-2 transition-all" style={{ color: primaryColor }}>
      {link} <span className="material-symbols-outlined text-sm">arrow_forward</span>
    </span>
  </div>
);

const FeatureRow = ({ icon, title, desc, primaryColor }: any) => (
  <div className="flex gap-6">
    <div className="size-14 shrink-0 rounded-2xl bg-primary/20 flex items-center justify-center text-primary" style={{ backgroundColor: 'rgba(19,218,236,0.2)', color: primaryColor }}>
      <span className="material-symbols-outlined text-3xl">{icon}</span>
    </div>
    <div>
      <h4 className="text-xl font-bold mb-2">{title}</h4>
      <p className="text-slate-400">{desc}</p>
    </div>
  </div>
);

const PricingCard = ({ title, price, period, subText, btnText, features, popular, isPrimary, primaryColor, onContact, onSelect }: any) => (
  <div className={`bg-white p-8 rounded-3xl border flex flex-col relative ${isPrimary ? 'border-2 border-primary ring-4 ring-primary/10 scale-105 z-10' : 'border-slate-200'}`} style={isPrimary ? { borderColor: primaryColor, boxShadow: '0 0 0 4px rgba(19,218,236,0.1)' } : {}}>
    {popular && (
      <div className="absolute -top-4 left-1/2 -translate-x-1/2 px-4 py-1 bg-primary text-white text-xs font-bold rounded-full uppercase tracking-widest shadow-lg" style={{ backgroundColor: primaryColor }}>
        {popular}
      </div>
    )}
    <h3 className={`${isPrimary ? 'text-primary' : 'text-slate-400'} font-bold uppercase text-xs tracking-widest mb-2`} style={isPrimary ? { color: primaryColor } : {}}>{title}</h3>
    <div className="text-3xl font-extrabold mb-1 flex items-baseline gap-1 text-slate-900">
      {price}
      {period && <span className="text-sm font-medium text-slate-400">{period}</span>}
    </div>
    {subText && <p className="text-xs text-slate-400 mb-6">{subText}</p>}
    {!subText && <div className="mb-10"></div>}

    <ul className="space-y-4 mb-10 flex-1">
      {features && features.map((f: string, i: number) => (
        <li key={i} className={`flex items-center gap-2 text-sm ${isPrimary ? 'text-slate-700 font-semibold' : 'text-slate-600'}`}>
          <span className="material-symbols-outlined text-emerald-500 text-lg">check_circle</span> {f}
        </li>
      ))}
    </ul>
    <button
      onClick={onSelect || onContact}
      className={`w-full py-3 rounded-xl font-bold transition-all ${isPrimary
        ? 'bg-primary text-white hover:brightness-105 shadow-lg shadow-primary/20'
        : 'border border-slate-200 text-slate-900 hover:bg-slate-50'
        }`} style={isPrimary ? { backgroundColor: primaryColor } : {}}>
      {btnText}
    </button>
  </div>
);