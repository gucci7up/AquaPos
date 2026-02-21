import React, { useState, useRef, useEffect } from 'react';
import { useLanguage } from '../LanguageContext';
import UserMenu from '../UserMenu';

export default function AquaAI() {
  const { t } = useLanguage();
  // Vision / OCR State
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [scanResult, setScanResult] = useState<any>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Insights State
  const [insights, setInsights] = useState([
    { id: 1, type: 'revenue', title: 'Linen Shirts (White)', subtitle: '+24% predicted demand', action: 'Prep Stock', status: 'pending' },
    { id: 2, type: 'revenue', title: 'Cold Brew Concentrate', subtitle: '+18% predicted demand', action: 'Prep Stock', status: 'pending' },
    { id: 3, type: 'margin', title: 'Gourmet Coffee Beans', subtitle: 'Supply costs -12%. Opt margin +5%.', action: 'Apply $24.50 → $25.75', status: 'pending' }
  ]);

  // Chat State
  const [chatInput, setChatInput] = useState('');
  const [chatHistory, setChatHistory] = useState<{role: 'user' | 'ai', text: string}[]>([]);
  const [isAiTyping, setIsAiTyping] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Scroll to bottom of chat
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatHistory, isAiTyping]);

  // --- Handlers: Vision ---
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setIsAnalyzing(true);
      setScanResult(null);
      
      // Simulate AI Processing
      setTimeout(() => {
        setIsAnalyzing(false);
        setScanResult({
          image: URL.createObjectURL(e.target.files![0]),
          detected: [
            { name: 'Organic Coffee Bag', confidence: '98%', sku: 'BEV-COF-001' },
            { name: 'Ceramic Mug (Blue)', confidence: '92%', sku: 'HOM-MUG-002' }
          ]
        });
      }, 2500);
    }
  };

  const resetScan = () => {
    setScanResult(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // --- Handlers: Insights ---
  const handleInsightAction = (id: number) => {
    setInsights(prev => prev.map(item => 
      item.id === id ? { ...item, status: 'completed' } : item
    ));
  };

  // --- Handlers: Chat ---
  const handleChatSubmit = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!chatInput.trim()) return;

    const userMsg = chatInput;
    setChatHistory(prev => [...prev, { role: 'user', text: userMsg }]);
    setChatInput('');
    setIsAiTyping(true);

    // Simulate Contextual AI Response
    setTimeout(() => {
      let aiResponse = "I've analyzed your request. Here are the latest details.";
      const lowerMsg = userMsg.toLowerCase();

      if (lowerMsg.includes('sales') || lowerMsg.includes('revenue')) {
        aiResponse = "Sales are trending up (+12.5%) this week compared to last week. Top performer: 'Organic Coffee Beans'.";
      } else if (lowerMsg.includes('stock') || lowerMsg.includes('inventory')) {
        aiResponse = "Inventory alert: 'Wireless Studio Headphones' are out of stock. 'Eco Glass Water Bottle' is low (4 units). Should I draft a reorder?";
      } else if (lowerMsg.includes('hello') || lowerMsg.includes('hi')) {
        aiResponse = "Hello! I'm AquaAI. I can help with inventory tracking, sales predictions, or answering business questions.";
      }

      setChatHistory(prev => [...prev, { role: 'ai', text: aiResponse }]);
      setIsAiTyping(false);
    }, 1500);
  };

  return (
    <>
      <header className="h-16 bg-white/80 backdrop-blur-md border-b border-slate-200 flex items-center justify-between px-8 z-10 sticky top-0">
        <div className="flex items-center gap-4">
          <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <span className="material-symbols-outlined text-primary">auto_awesome</span>
            {t('ai.title')}
          </h2>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 px-3 py-1 bg-primary/10 text-primary rounded-full text-xs font-bold">
            <span className="size-1.5 rounded-full bg-primary animate-pulse"></span>
            {t('ai.status')}
          </div>
          <div className="h-8 w-[1px] bg-slate-200 mx-1"></div>
          <UserMenu />
        </div>
      </header>

      <div className="flex-1 overflow-y-auto p-8 pb-32 space-y-8 bg-background-light">
        
        {/* SECTION: VISION TO INVENTORY */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-xl font-bold text-slate-900">{t('ai.visionTitle')}</h3>
              <p className="text-sm text-slate-500">{t('ai.visionSubtitle')}</p>
            </div>
            <span className="material-symbols-outlined text-primary/40 text-4xl">camera_enhance</span>
          </div>

          <div className="relative group">
            {/* Background Glow */}
            <div className={`absolute -inset-1 bg-gradient-to-r from-primary to-ai-glow rounded-2xl blur opacity-10 transition duration-1000 ${isAnalyzing ? 'opacity-40 animate-pulse' : 'group-hover:opacity-25'}`}></div>
            
            <div 
              onClick={() => !scanResult && !isAnalyzing && fileInputRef.current?.click()}
              className={`relative flex flex-col items-center justify-center border-2 border-dashed ${isAnalyzing ? 'border-primary bg-primary/5' : 'border-primary/30 bg-white/50 hover:border-primary hover:bg-primary/5'} rounded-2xl p-8 text-center transition-all cursor-pointer min-h-[250px]`}
            >
              <input 
                type="file" 
                ref={fileInputRef} 
                className="hidden" 
                accept="image/*"
                onChange={handleFileUpload}
              />

              {isAnalyzing ? (
                <div className="flex flex-col items-center animate-pulse">
                   <span className="material-symbols-outlined text-5xl text-primary mb-4 animate-spin">cyclone</span>
                   <h4 className="text-lg font-bold text-slate-900">{t('ai.analyzing')}</h4>
                   <p className="text-sm text-slate-500">Extracting SKU data and identifying objects</p>
                </div>
              ) : scanResult ? (
                <div className="w-full flex flex-col md:flex-row gap-8 items-start text-left cursor-default">
                  <div className="w-full md:w-1/3 bg-slate-100 rounded-xl overflow-hidden aspect-video relative">
                    <img src={scanResult.image} alt="Scanned" className="w-full h-full object-cover" />
                    <button onClick={resetScan} className="absolute top-2 right-2 bg-slate-900/80 text-white p-1 rounded-full hover:bg-slate-900">
                      <span className="material-symbols-outlined text-sm">close</span>
                    </button>
                  </div>
                  <div className="flex-1 w-full space-y-4">
                    <div className="flex items-center justify-between">
                      <h4 className="text-lg font-bold text-slate-900">{t('ai.results')}</h4>
                      <span className="px-2 py-1 bg-emerald-100 text-emerald-600 rounded text-xs font-bold uppercase">Success</span>
                    </div>
                    <div className="space-y-2">
                      {scanResult.detected.map((item: any, idx: number) => (
                        <div key={idx} className="flex items-center justify-between p-3 bg-white border border-slate-200 rounded-xl">
                          <div>
                            <p className="font-bold text-slate-800">{item.name}</p>
                            <p className="text-xs text-slate-500">Confidence: {item.confidence} • SKU: {item.sku}</p>
                          </div>
                          <button className="text-primary text-sm font-bold hover:underline flex items-center gap-1">
                            <span className="material-symbols-outlined text-lg">add_circle</span> Add
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ) : (
                <>
                  <div className="size-16 rounded-full bg-primary/10 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                    <span className="material-symbols-outlined text-3xl text-primary">add_a_photo</span>
                  </div>
                  <h4 className="text-lg font-semibold text-slate-900 mb-1">{t('ai.dropPhoto')}</h4>
                  <p className="text-sm text-slate-500 mb-6">Or click to browse files from your device</p>
                  <div className="flex gap-4">
                    <div className="flex items-center gap-2 px-4 py-2 bg-slate-100 rounded-lg text-xs font-bold text-slate-600">
                      <span className="material-symbols-outlined text-sm text-primary">check_circle</span>
                      Multi-object detection
                    </div>
                    <div className="flex items-center gap-2 px-4 py-2 bg-slate-100 rounded-lg text-xs font-bold text-slate-600">
                      <span className="material-symbols-outlined text-sm text-primary">check_circle</span>
                      Price tag recognition
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </section>

        {/* SECTION: PREDICTIVE INSIGHTS */}
        <section>
          <div className="flex items-center gap-2 mb-6">
            <h3 className="text-xl font-bold text-slate-900">{t('ai.insightsTitle')}</h3>
            <div className="px-2 py-0.5 bg-primary/20 text-primary text-[10px] font-black uppercase rounded tracking-tighter">{t('ai.liveAnalysis')}</div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            {/* Revenue Card */}
            <div className="bg-white/80 backdrop-blur-md border border-slate-200/50 p-6 rounded-2xl shadow-sm relative overflow-hidden">
              <div className="absolute top-0 right-0 p-4">
                <span className="material-symbols-outlined text-emerald-500/20 text-5xl">trending_up</span>
              </div>
              <div className="flex items-center gap-3 mb-6">
                <div className="size-10 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-500">
                  <span className="material-symbols-outlined">rocket_launch</span>
                </div>
                <div>
                  <h4 className="font-bold text-slate-900">{t('ai.revenueRisers')}</h4>
                  <p className="text-xs text-slate-500">Projected trending products</p>
                </div>
              </div>
              <div className="space-y-4">
                {insights.filter(i => i.type === 'revenue').map(item => (
                  <div key={item.id} className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-100 transition-all hover:border-emerald-200">
                    <div className="flex items-center gap-3">
                      <div className="size-10 rounded bg-white shadow-sm overflow-hidden flex items-center justify-center">
                        <span className="material-symbols-outlined text-slate-400">image</span>
                      </div>
                      <div>
                        <p className="text-sm font-bold">{item.title}</p>
                        <p className="text-[10px] text-emerald-500 font-bold uppercase">{item.subtitle}</p>
                      </div>
                    </div>
                    <button 
                      onClick={() => handleInsightAction(item.id)}
                      disabled={item.status === 'completed'}
                      className={`text-xs font-bold px-3 py-1.5 rounded-lg transition-all ${
                        item.status === 'completed' 
                        ? 'bg-emerald-100 text-emerald-600' 
                        : 'text-primary hover:bg-primary/10'
                      }`}
                    >
                      {item.status === 'completed' ? 'Order Placed' : item.action}
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* Margin Card */}
            <div className="bg-white/80 backdrop-blur-md border border-slate-200/50 p-6 rounded-2xl shadow-sm relative overflow-hidden">
              <div className="absolute top-0 right-0 p-4">
                <span className="material-symbols-outlined text-amber-500/20 text-5xl">attach_money</span>
              </div>
              <div className="flex items-center gap-3 mb-6">
                <div className="size-10 rounded-xl bg-amber-500/10 flex items-center justify-center text-amber-500">
                  <span className="material-symbols-outlined">balance</span>
                </div>
                <div>
                  <h4 className="font-bold text-slate-900">{t('ai.marginAdjust')}</h4>
                  <p className="text-xs text-slate-500">Dynamic pricing optimization</p>
                </div>
              </div>
              <div className="space-y-4">
                 {insights.filter(i => i.type === 'margin').map(item => (
                    <div key={item.id} className="p-4 rounded-xl border border-primary/20 bg-primary/5">
                      <div className="flex justify-between items-start mb-2">
                        <p className="text-sm font-bold">{item.title}</p>
                        <span className="text-xs font-black text-primary">OPTIMIZE</span>
                      </div>
                      <p className="text-xs text-slate-600 mb-3">{item.subtitle}</p>
                      <div className="flex gap-2">
                        <button 
                          onClick={() => handleInsightAction(item.id)}
                          disabled={item.status === 'completed'}
                          className={`flex-1 py-1.5 text-[10px] font-black rounded-lg transition-all ${
                            item.status === 'completed'
                            ? 'bg-emerald-500 text-white cursor-default'
                            : 'bg-primary text-white hover:bg-primary-dark'
                          }`}
                        >
                          {item.status === 'completed' ? 'Price Updated' : item.action}
                        </button>
                        {item.status !== 'completed' && (
                          <button className="px-3 py-1.5 border border-slate-200 text-slate-600 text-[10px] font-bold rounded-lg bg-white hover:bg-slate-50">
                            Ignore
                          </button>
                        )}
                      </div>
                    </div>
                 ))}
              </div>
            </div>
          </div>
        </section>

        {/* SECTION: STOCK VELOCITY */}
        <section className="bg-white/80 backdrop-blur-md border border-slate-200/50 p-6 rounded-2xl shadow-sm">
          <h4 className="font-bold text-slate-900 mb-4">{t('ai.stockVelocity')}</h4>
          <div className="h-12 w-full flex gap-1">
            <div className="flex-1 bg-emerald-500 rounded-sm hover:scale-105 transition-transform" title="Category A: High Velocity"></div>
            <div className="flex-1 bg-emerald-500/80 rounded-sm hover:scale-105 transition-transform"></div>
            <div className="flex-1 bg-emerald-500/60 rounded-sm hover:scale-105 transition-transform"></div>
            <div className="flex-1 bg-amber-500/40 rounded-sm hover:scale-105 transition-transform"></div>
            <div className="flex-1 bg-primary rounded-sm hover:scale-105 transition-transform"></div>
            <div className="flex-1 bg-primary/80 rounded-sm hover:scale-105 transition-transform"></div>
            <div className="flex-1 bg-red-500/40 rounded-sm hover:scale-105 transition-transform"></div>
            <div className="flex-1 bg-red-500/60 rounded-sm hover:scale-105 transition-transform"></div>
            <div className="flex-1 bg-red-500 rounded-sm hover:scale-105 transition-transform" title="Category D: Dead Stock"></div>
            <div className="flex-1 bg-slate-200 rounded-sm"></div>
            <div className="flex-1 bg-slate-200 rounded-sm"></div>
            <div className="flex-1 bg-slate-200 rounded-sm"></div>
          </div>
          <div className="flex justify-between mt-2 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
            <span>Fast Moving</span>
            <span>Stable</span>
            <span>Critical</span>
            <span>Out of Stock</span>
          </div>
        </section>
      </div>

      {/* CHAT INTERFACE */}
      <div className="absolute bottom-0 left-0 right-0 z-50">
        
        {/* Chat History Overlay (Only shows if there are messages) */}
        {chatHistory.length > 0 && (
          <div className="max-w-4xl mx-auto px-6 mb-2">
             <div className="bg-white/95 backdrop-blur-xl border border-slate-200 shadow-2xl rounded-t-2xl max-h-[40vh] overflow-y-auto p-6 space-y-4 custom-scrollbar">
                {chatHistory.map((msg, idx) => (
                  <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[80%] rounded-2xl p-4 text-sm ${
                      msg.role === 'user' 
                      ? 'bg-slate-100 text-slate-800 rounded-br-none' 
                      : 'bg-primary/10 text-slate-800 border border-primary/20 rounded-bl-none'
                    }`}>
                      {msg.role === 'ai' && (
                         <div className="flex items-center gap-2 mb-1 text-primary text-xs font-bold uppercase tracking-wider">
                           <span className="material-symbols-outlined text-sm">auto_awesome</span> AquaAI
                         </div>
                      )}
                      {msg.text}
                    </div>
                  </div>
                ))}
                {isAiTyping && (
                  <div className="flex justify-start">
                    <div className="bg-white border border-slate-100 rounded-2xl p-4 rounded-bl-none shadow-sm flex gap-1">
                      <span className="size-2 bg-slate-400 rounded-full animate-bounce"></span>
                      <span className="size-2 bg-slate-400 rounded-full animate-bounce" style={{animationDelay: '0.1s'}}></span>
                      <span className="size-2 bg-slate-400 rounded-full animate-bounce" style={{animationDelay: '0.2s'}}></span>
                    </div>
                  </div>
                )}
                <div ref={chatEndRef} />
             </div>
          </div>
        )}

        {/* Input Bar */}
        <div className="bg-gradient-to-t from-background-light via-background-light to-transparent pb-6 px-6 pt-4">
          <div className="max-w-4xl mx-auto pointer-events-auto">
            <form onSubmit={handleChatSubmit} className="relative group">
              <div className="absolute -inset-1 bg-gradient-to-r from-primary via-ai-glow to-primary rounded-2xl blur opacity-30 group-hover:opacity-60 transition duration-1000"></div>
              <div className="relative flex items-center bg-white rounded-2xl border border-primary/30 shadow-2xl p-2 pl-6">
                <span className="material-symbols-outlined text-primary text-2xl mr-4 animate-pulse">auto_awesome</span>
                <input 
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  className="flex-1 bg-transparent border-none focus:ring-0 text-slate-900 placeholder:text-slate-400 text-lg outline-none" 
                  placeholder={t('ai.chatPlaceholder')}
                  type="text" 
                />
                <div className="flex items-center gap-2 pr-2">
                  <button type="button" className="p-3 text-slate-400 hover:text-primary transition-colors">
                    <span className="material-symbols-outlined">mic</span>
                  </button>
                  <button type="submit" disabled={!chatInput.trim() || isAiTyping} className="bg-primary text-white size-12 rounded-xl flex items-center justify-center shadow-lg shadow-primary/20 hover:scale-105 transition-transform disabled:opacity-50 disabled:scale-100">
                    <span className="material-symbols-outlined font-bold">arrow_forward</span>
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      </div>
    </>
  );
}