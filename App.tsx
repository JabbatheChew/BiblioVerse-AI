
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { GameMessage, GameState, GameLocation, NPCInteraction } from './types';
import { getGameUpdate, generateSceneImage } from './services/geminiService';
import Typewriter from './components/Typewriter';

const STORAGE_KEY_MESSAGES = 'omni_library_messages';
const STORAGE_KEY_STATE = 'omni_library_state';

const ShatterEffect: React.FC = () => {
  const shards = useMemo(() => {
    return Array.from({ length: 50 }).map((_, i) => ({
      id: i,
      width: Math.random() * 200 + 50,
      height: Math.random() * 200 + 50,
      top: Math.random() * 100,
      left: Math.random() * 100,
      tx: (Math.random() - 0.5) * 1500,
      ty: (Math.random() - 0.5) * 1500,
      rot: (Math.random() - 0.5) * 1440,
      delay: Math.random() * 0.1
    }));
  }, []);

  return (
    <div className="fixed inset-0 z-[100] pointer-events-none overflow-hidden bg-white/10">
      <div className="glitch-overlay animate-glitch-flash"></div>
      {shards.map((s) => (
        <div
          key={s.id}
          className="shard animate-shatter"
          style={{
            width: s.width,
            height: s.height,
            top: `${s.top}%`,
            left: `${s.left}%`,
            '--tw-translate-x': `${s.tx}px`,
            '--tw-translate-y': `${s.ty}px`,
            '--tw-rotate': `${s.rot}deg`,
            animationDelay: `${s.delay}s`,
          } as React.CSSProperties}
        />
      ))}
    </div>
  );
};

const InventoryModal: React.FC<{ 
  items: string[], 
  onClose: () => void, 
  onUse: (item: string) => void 
}> = ({ items = [], onClose, onUse }) => {
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-6 animate-fade-in">
      <div className="absolute inset-0 bg-black/95 backdrop-blur-md cursor-pointer" onClick={onClose}></div>
      <div className="relative w-full max-w-md bg-stone-950 border border-white/10 rounded-xl shadow-[0_0_100px_rgba(0,0,0,1)] overflow-hidden">
        <div className="px-6 py-5 border-b border-white/5 flex justify-between items-center bg-stone-900/50">
          <h2 className="font-crimson text-xl font-bold tracking-widest text-stone-100 uppercase">Kadim Heybe</h2>
          <button onClick={onClose} className="text-stone-500 hover:text-white transition-colors p-2">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
          </button>
        </div>
        <div className="p-8 max-h-[50vh] overflow-y-auto no-scrollbar">
          {items && items.length > 0 ? (
            <div className="grid grid-cols-1 gap-4">
              {items.map((item, idx) => (
                <button 
                  key={idx}
                  onClick={() => { onUse(item); onClose(); }}
                  className="group flex items-center justify-between w-full p-5 bg-stone-900/40 hover:bg-purple-900/20 border border-white/5 hover:border-purple-500/30 rounded-lg transition-all transform active:scale-[0.98]"
                >
                  <span className="font-elite text-sm text-stone-200 group-hover:text-purple-200 transition-colors uppercase tracking-wider">{item}</span>
                  <div className="w-8 h-8 rounded-full border border-white/10 flex items-center justify-center text-stone-600 group-hover:text-purple-400 group-hover:border-purple-500/40 transition-all">
                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/></svg>
                  </div>
                </button>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <p className="font-crimson text-stone-600 italic text-xl">Heyben şu an boş...</p>
            </div>
          )}
        </div>
        <div className="p-5 bg-stone-900/30 border-t border-white/5 text-center">
          <p className="text-[10px] uppercase tracking-[0.2em] text-stone-700 font-bold">Kullanmak için eşyaya tıkla</p>
        </div>
      </div>
    </div>
  );
};

const App: React.FC = () => {
  const [isStarted, setIsStarted] = useState(false);
  const [hasSave, setHasSave] = useState(false);
  const [messages, setMessages] = useState<GameMessage[]>([]);
  const [gameState, setGameState] = useState<GameState & { currentPrompt?: string }>({
    location: 'LIBRARY',
    inventory: [],
    currentImage: null,
    isProcessing: false,
    activeBookTitle: undefined,
    currentPrompt: undefined,
    activeNPC: undefined
  });
  const [inputValue, setInputValue] = useState('');
  const [isShattering, setIsShattering] = useState(false);
  const [isInventoryOpen, setIsInventoryOpen] = useState(false);
  const [typingSpeed, setTypingSpeed] = useState(15);
  
  const scrollRef = useRef<HTMLDivElement>(null);
  const prevLocationRef = useRef<GameLocation>('LIBRARY');

  // Load game from localStorage on mount
  useEffect(() => {
    const savedMessages = localStorage.getItem(STORAGE_KEY_MESSAGES);
    const savedState = localStorage.getItem(STORAGE_KEY_STATE);
    
    if (savedMessages && savedState) {
      setHasSave(true);
    }
  }, []);

  // Save game to localStorage whenever messages or gameState change
  useEffect(() => {
    if (isStarted && messages.length > 0) {
      localStorage.setItem(STORAGE_KEY_MESSAGES, JSON.stringify(messages));
      // Filter out isProcessing to prevent loading in a stuck state
      const { isProcessing, ...stateToSave } = gameState;
      localStorage.setItem(STORAGE_KEY_STATE, JSON.stringify(stateToSave));
    }
  }, [messages, gameState, isStarted]);

  const initGame = async (isNewGame: boolean = true) => {
    if (!isNewGame) {
      const savedMessages = localStorage.getItem(STORAGE_KEY_MESSAGES);
      const savedState = localStorage.getItem(STORAGE_KEY_STATE);
      
      if (savedMessages && savedState) {
        setMessages(JSON.parse(savedMessages));
        setGameState({ ...JSON.parse(savedState), isProcessing: false });
        setIsStarted(true);
        return;
      }
    }

    // New game logic
    localStorage.removeItem(STORAGE_KEY_MESSAGES);
    localStorage.removeItem(STORAGE_KEY_STATE);
    setMessages([]);
    setIsStarted(true);
    setGameState(prev => ({ ...prev, isProcessing: true, location: 'LIBRARY', inventory: [], currentImage: null }));
    
    try {
      const res = await getGameUpdate([]);
      const img = await generateSceneImage(res.scene_image_prompt);
      setMessages([{ role: 'narrator', content: res.text || "...", timestamp: Date.now() }]);
      setGameState(prev => ({
        ...prev,
        location: res.location || 'LIBRARY',
        inventory: Array.isArray(res.inventory) ? res.inventory : [],
        currentImage: img,
        activeBookTitle: res.book_title,
        currentPrompt: res.scene_image_prompt,
        activeNPC: res.npc,
        isProcessing: false
      }));
    } catch (err) {
      console.error(err);
      setMessages([{ role: 'narrator', content: "Kütüphane kapıları mühürlü gibi... Bir şeyler ters gitti. Lütfen sayfayı yenile.", timestamp: Date.now() }]);
      setGameState(prev => ({ ...prev, isProcessing: false }));
    }
  };

  const handleResetGame = () => {
    if (window.confirm("Bütün ilerlemen silinecek ve kütüphanenin girişine döneceksin. Emin misin?")) {
      initGame(true);
    }
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (isInventoryOpen) setIsInventoryOpen(false);
        else if (gameState.location === 'STORY_WORLD' && !gameState.isProcessing) handleReturnToLibrary();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [gameState.location, gameState.isProcessing, isInventoryOpen]);

  useEffect(() => {
    if (prevLocationRef.current === 'LIBRARY' && gameState.location === 'STORY_WORLD') {
      setIsShattering(true);
      setTimeout(() => setIsShattering(false), 2000);
    }
    prevLocationRef.current = gameState.location;
  }, [gameState.location]);

  useEffect(() => {
    if (scrollRef.current) {
        scrollRef.current.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
    }
  }, [messages, gameState.isProcessing]);

  const processCommand = async (command: string) => {
    if (!command.trim() || gameState.isProcessing) return;

    const userMsg: GameMessage = { role: 'user', content: command, timestamp: Date.now() };
    setMessages(prev => [...prev, userMsg]);
    setGameState(prev => ({ ...prev, isProcessing: true }));

    try {
      const res = await getGameUpdate([...messages, userMsg]);
      
      generateSceneImage(res.scene_image_prompt).then(img => {
        if (img) {
          setGameState(s => ({ ...s, currentImage: img }));
        }
      });
      
      setMessages(prev => [...prev, { role: 'narrator', content: res.text || "Kaderin fısıltısı yarım kaldı...", timestamp: Date.now() }]);
      setGameState(prev => ({
        ...prev,
        location: res.location || 'LIBRARY',
        inventory: Array.isArray(res.inventory) ? res.inventory : [],
        activeBookTitle: res.book_title,
        currentPrompt: res.scene_image_prompt,
        activeNPC: res.npc,
        isProcessing: false
      }));
    } catch (err) {
      console.error("Command processing failed:", err);
      setMessages(prev => [...prev, { role: 'narrator', content: "Kaderin ipleri düğümlendi... Gerçeklik sarsılıyor. Lütfen tekrar dene.", timestamp: Date.now() }]);
      setGameState(prev => ({ ...prev, isProcessing: false }));
    }
  };

  const handleCommand = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputValue.trim() || gameState.isProcessing) return;
    const cmd = inputValue;
    setInputValue('');
    processCommand(cmd);
  };

  const handleReturnToLibrary = () => {
    if (gameState.isProcessing) return;
    setIsShattering(true);
    processCommand("Kütüphaneye geri dönmek istiyorum.");
    setTimeout(() => setIsShattering(false), 2000);
  };

  if (!isStarted) {
    return (
      <div className="h-screen bg-black flex flex-col items-center justify-center relative overflow-hidden">
        <div className="absolute inset-0 z-0">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(168,85,247,0.1),transparent_70%)] animate-pulse"></div>
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-purple-900/5 blur-[120px] rounded-full"></div>
        </div>
        <div className="z-10 text-center space-y-12 max-w-2xl px-8">
          <div className="space-y-4">
            <p className="text-purple-500 font-elite text-xs tracking-[0.8em] uppercase animate-fade-in opacity-80">Infinite Story Engine</p>
            <h1 className="font-crimson text-6xl md:text-8xl text-stone-100 font-bold tracking-tighter animate-fade-in [animation-delay:200ms] leading-none">OMNI-LIBRARY</h1>
            <div className="w-24 h-0.5 bg-gradient-to-r from-transparent via-purple-500/50 to-transparent mx-auto mt-6"></div>
          </div>
          <p className="font-crimson text-stone-400 text-lg md:text-xl leading-relaxed italic animate-fade-in [animation-delay:400ms]">
            Sonsuz kütüphanenin hikayeleri seni bekliyor. <br className="hidden md:block"/> Kitapların arasındaki gizli geçitleri keşfetmeye hazır mısın?
          </p>
          
          <div className="flex flex-col sm:flex-row gap-6 justify-center items-center animate-fade-in [animation-delay:600ms]">
            {hasSave ? (
              <>
                <button onClick={() => initGame(false)} className="group relative px-10 py-4 bg-purple-600/20 border border-purple-500/40 hover:border-purple-400 rounded-full transition-all duration-500 overflow-hidden">
                   <div className="absolute inset-0 bg-purple-600/10 group-hover:bg-purple-600/20 transition-all duration-500"></div>
                   <span className="relative z-10 text-stone-100 font-inter text-xs font-bold tracking-[0.3em] uppercase">Maceraya Devam Et</span>
                </button>
                <button onClick={() => initGame(true)} className="group px-8 py-3 bg-transparent border border-stone-800 hover:border-stone-600 rounded-full transition-all">
                   <span className="text-stone-500 group-hover:text-stone-300 font-inter text-[10px] font-bold tracking-[0.2em] uppercase">Yeni Başlangıç</span>
                </button>
              </>
            ) : (
              <button onClick={() => initGame(true)} className="group relative px-12 py-5 bg-transparent border border-purple-500/30 hover:border-purple-400 rounded-full transition-all duration-500 overflow-hidden">
                <div className="absolute inset-0 bg-purple-600/10 group-hover:bg-purple-600/20 transition-all duration-500 scale-x-0 group-hover:scale-x-100 origin-left"></div>
                <span className="relative z-10 text-stone-200 font-inter text-sm font-bold tracking-[0.4em] uppercase group-hover:text-white transition-colors">Maceraya Başla</span>
                <div className="absolute -inset-px border border-purple-500/50 opacity-0 group-hover:opacity-100 group-hover:blur-md transition-all duration-700 rounded-full"></div>
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  const inventoryCount = Array.isArray(gameState.inventory) ? gameState.inventory.length : 0;

  return (
    <div className={`h-screen flex flex-col font-inter transition-all duration-1000 overflow-hidden ${gameState.location === 'STORY_WORLD' ? 'bg-[#09050d]' : 'bg-[#0c0a09]'}`}>
      {isShattering && <ShatterEffect />}
      {isInventoryOpen && <InventoryModal items={gameState.inventory || []} onClose={() => setIsInventoryOpen(false)} onUse={(item) => processCommand(`${item} eşyasını kullanıyorum.`)} />}
      <header className="z-20 border-b border-white/5 bg-black/80 backdrop-blur-2xl px-6 py-4 flex justify-between items-center flex-shrink-0">
        <div className="flex items-center gap-5">
          <div className={`w-3 h-3 rounded-full ${gameState.location === 'STORY_WORLD' ? 'bg-purple-500 shadow-[0_0_20px_rgba(168,85,247,0.8)]' : 'bg-amber-600 shadow-[0_0_20px_rgba(217,119,6,0.8)]'}`}></div>
          <div>
            <div className="flex items-center gap-4">
              <h1 className="font-crimson text-xl font-bold tracking-[0.2em] uppercase text-stone-200 truncate max-w-[150px] md:max-w-none">{gameState.location === 'LIBRARY' ? 'Omni-Library' : (gameState.activeBookTitle || 'Efsunlu Diyar')}</h1>
              {gameState.location === 'STORY_WORLD' && (
                <button onClick={handleReturnToLibrary} disabled={gameState.isProcessing} className="bg-stone-800/40 hover:bg-stone-700/60 border border-white/10 text-[10px] uppercase tracking-[0.2em] px-4 py-1.5 rounded text-stone-400 hover:text-white transition-all disabled:opacity-30">Kütüphaneye Dön</button>
              )}
            </div>
          </div>
        </div>
        <div className="flex gap-4 md:gap-6 items-center">
          <div className="hidden sm:flex items-center gap-3 bg-stone-900/40 px-4 py-2 rounded-lg border border-white/5">
             <span className="text-[9px] uppercase tracking-widest text-stone-500 font-bold">Hız</span>
             <div className="flex gap-1">
                {[{ label: 'Ağır', val: 40 }, { label: 'Normal', val: 15 }, { label: 'Hızlı', val: 5 }].map((s) => (
                  <button key={s.label} onClick={() => setTypingSpeed(s.val)} className={`text-[9px] uppercase px-2 py-0.5 rounded transition-all font-elite ${typingSpeed === s.val ? 'bg-purple-900/50 text-purple-300 border border-purple-500/30' : 'text-stone-600 hover:text-stone-400'}`}>{s.label}</button>
                ))}
             </div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => { setIsInventoryOpen(true); }} className="flex items-center gap-3 bg-stone-900/60 hover:bg-stone-800 border border-white/10 px-4 md:px-6 py-2.5 rounded-lg group">
              <span className="hidden md:inline text-[12px] uppercase text-stone-400 group-hover:text-stone-100 font-bold tracking-widest">Envanter</span>
              <svg className="md:hidden text-stone-400" xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20 20H4V4h16v16zM4 9h16M9 4v16"/></svg>
              {inventoryCount > 0 && <span className="w-5 h-5 rounded-full bg-purple-600 text-white text-[10px] flex items-center justify-center font-bold animate-pulse">{inventoryCount}</span>}
            </button>
            <button onClick={handleResetGame} className="p-2.5 bg-stone-900/60 hover:bg-red-900/20 border border-white/10 rounded-lg text-stone-500 hover:text-red-400 transition-all" title="Oyunu Sıfırla">
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/></svg>
            </button>
          </div>
        </div>
      </header>
      <main className="flex-1 flex flex-col lg:flex-row overflow-hidden relative z-10">
        <section className="w-full lg:w-[60%] h-[35vh] lg:h-full bg-black relative flex items-center justify-center overflow-hidden border-b lg:border-b-0 lg:border-r border-white/5">
          {gameState.currentImage ? (
            <div className="w-full h-full relative flex items-center justify-center animate-fade-in transition-all">
              <img src={gameState.currentImage} alt="Scene" className="w-full h-full object-cover brightness-[0.7]" />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent"></div>
              {gameState.currentPrompt && (
                <div className="absolute bottom-6 left-6 right-6 p-4 bg-black/60 backdrop-blur-md rounded-lg opacity-0 hover:opacity-100 transition-opacity border border-white/10 pointer-events-none hidden md:block">
                  <p className="text-[10px] font-mono text-stone-400 leading-tight italic">{gameState.currentPrompt}</p>
                </div>
              )}
            </div>
          ) : (
            <div className="flex flex-col items-center gap-4 text-stone-800 animate-pulse">
              <div className="w-12 h-12 border-b-2 border-purple-500/60 rounded-full animate-spin"></div>
              <p className="font-elite text-xs tracking-[0.4em] uppercase text-stone-700">Gerçeklik Dokunuyor...</p>
            </div>
          )}
        </section>
        <section className="w-full lg:w-[40%] flex flex-col bg-[#080707] h-[65vh] lg:h-full relative overflow-hidden">
          {gameState.activeNPC && (
            <div className="px-8 py-3 bg-purple-900/10 border-b border-purple-500/10 animate-fade-in flex items-center justify-between flex-shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-2 h-2 rounded-full bg-purple-400 animate-pulse"></div>
                <div className="flex flex-col">
                  <span className="text-[10px] uppercase tracking-widest text-purple-300 font-bold">{gameState.activeNPC.name}</span>
                  <span className="text-[8px] uppercase tracking-widest text-stone-500 italic">{gameState.activeNPC.expression}</span>
                </div>
              </div>
              <div className="text-[8px] uppercase tracking-widest text-purple-500/40 font-mono text-right max-w-[120px]">{gameState.activeNPC.intent}</div>
            </div>
          )}
          <div ref={scrollRef} className="flex-1 overflow-y-auto p-6 md:p-10 space-y-10 no-scrollbar">
            {messages.map((msg, i) => (
              <div key={i} className={`fade-in ${msg.role === 'user' ? 'text-stone-400' : 'text-white'}`}>
                {msg.role === 'user' ? (
                  <div className="flex justify-end"><p className="text-xs bg-stone-900/50 px-4 py-3 rounded-xl border border-white/5 italic">"{msg.content}"</p></div>
                ) : (
                  <div className="pl-6 border-l border-purple-500/20 font-crimson text-lg leading-relaxed antialiased tracking-wide">
                    <Typewriter text={msg.content || ""} speed={typingSpeed} />
                  </div>
                )}
              </div>
            ))}
            {gameState.isProcessing && (
              <div className="flex items-center gap-4 pl-6 animate-pulse">
                <div className="flex gap-1.5"><div className="w-2 h-2 bg-purple-500 rounded-full animate-bounce"></div><div className="w-2 h-2 bg-purple-500 rounded-full animate-bounce [animation-delay:-0.15s]"></div><div className="w-2 h-2 bg-purple-500 rounded-full animate-bounce [animation-delay:-0.3s]"></div></div>
                <span className="text-stone-700 font-elite text-[10px] uppercase tracking-[0.4em]">Kader Örülüyor...</span>
              </div>
            )}
          </div>
          <div className="p-6 md:p-8 bg-black/95 border-t border-white/5 relative z-30 flex-shrink-0">
            <form onSubmit={handleCommand} className="relative group">
              <textarea
                rows={1}
                value={inputValue}
                onChange={(e) => { setInputValue(e.target.value); e.target.style.height = 'auto'; e.target.style.height = `${e.target.scrollHeight}px`; }}
                onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleCommand(e as any); } }}
                disabled={gameState.isProcessing}
                placeholder={gameState.activeNPC ? `${gameState.activeNPC.name} ile konuş...` : "Kaderini fısılda..."}
                className="w-full bg-stone-900/30 border border-stone-800/50 text-stone-200 px-5 py-4 pr-12 rounded-xl outline-none focus:border-purple-500/30 transition-all font-inter placeholder:text-stone-800 text-sm resize-none max-h-32 overflow-y-auto"
              />
              <button type="submit" disabled={gameState.isProcessing || !inputValue.trim()} className="absolute right-3 bottom-4 w-8 h-8 rounded-lg bg-stone-800/50 flex items-center justify-center text-stone-500 hover:text-white disabled:opacity-20 transition-all">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="m12 19 7-7-7-7"/><path d="M19 12H5"/></svg>
              </button>
            </form>
          </div>
        </section>
      </main>
    </div>
  );
};

export default App;
