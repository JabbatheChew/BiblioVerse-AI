
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { GameMessage, GameState, GameLocation } from './types';
import { getGameUpdate, generateSceneImage } from './services/geminiService';
import Typewriter from './components/Typewriter';

// Ses Efektleri Tanımları
const SFX = {
  SHATTER: 'https://cdn.pixabay.com/audio/2021/08/09/audio_8816743b18.mp3', 
  PAGE: 'https://assets.mixkit.co/active_storage/sfx/2571/2571-preview.mp3', 
  MAGIC: 'https://cdn.pixabay.com/audio/2022/03/15/audio_c3c3951f28.mp3', 
};

// Ortam Sesleri (Loops)
const AMBIENT_TRACKS: Record<string, string> = {
  LIBRARY: 'https://cdn.pixabay.com/audio/2022/03/24/audio_3d1a8e1b36.mp3', 
  FOREST: 'https://cdn.pixabay.com/audio/2022/01/18/audio_6038379c38.mp3', 
  DESERT: 'https://cdn.pixabay.com/audio/2021/08/09/audio_8e8267252f.mp3', 
  SPACE: 'https://cdn.pixabay.com/audio/2022/03/15/audio_2d8b8e1f5a.mp3', 
  MYSTIC: 'https://cdn.pixabay.com/audio/2021/11/25/audio_55e2e4b37d.mp3', 
};

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
}> = ({ items, onClose, onUse }) => {
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-6 animate-fade-in">
      <div 
        className="absolute inset-0 bg-black/90 backdrop-blur-md cursor-pointer" 
        onClick={onClose}
      ></div>
      <div className="relative w-full max-w-md bg-stone-950 border border-white/10 rounded-lg shadow-[0_0_80px_rgba(0,0,0,1)] overflow-hidden">
        <div className="px-6 py-5 border-b border-white/5 flex justify-between items-center bg-stone-900/50">
          <h2 className="font-crimson text-xl font-bold tracking-widest text-stone-100 uppercase">Kadim Heybe</h2>
          <button onClick={onClose} className="text-stone-500 hover:text-white transition-colors p-1">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
          </button>
        </div>
        <div className="p-8 max-h-[50vh] overflow-y-auto no-scrollbar">
          {items.length > 0 ? (
            <div className="grid grid-cols-1 gap-4">
              {items.map((item, idx) => (
                <button 
                  key={idx}
                  onClick={() => {
                    onUse(item);
                    onClose();
                  }}
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
  const [messages, setMessages] = useState<GameMessage[]>([]);
  const [gameState, setGameState] = useState<GameState & { currentPrompt?: string }>({
    location: 'LIBRARY',
    inventory: [],
    currentImage: null,
    isProcessing: false,
    activeBookTitle: undefined,
    currentPrompt: undefined
  });
  const [inputValue, setInputValue] = useState('');
  const [isShattering, setIsShattering] = useState(false);
  const [isInventoryOpen, setIsInventoryOpen] = useState(false);
  const [userInteracted, setUserInteracted] = useState(false);
  
  const scrollRef = useRef<HTMLDivElement>(null);
  const prevLocationRef = useRef<GameLocation>('LIBRARY');
  const ambientAudioRef = useRef<HTMLAudioElement | null>(null);

  const playSound = (url: string, volume: number = 0.4) => {
    const audio = new Audio(url);
    audio.volume = volume;
    audio.play().catch(e => console.warn('SFX block:', e));
  };

  const updateAmbient = (mood?: string) => {
    if (!userInteracted) return;

    let targetTrack = AMBIENT_TRACKS.LIBRARY;
    if (gameState.location === 'STORY_WORLD') {
      targetTrack = AMBIENT_TRACKS.MYSTIC;
      const m = (mood || '').toLowerCase();
      if (m.includes('forest')) targetTrack = AMBIENT_TRACKS.FOREST;
      if (m.includes('desert') || m.includes('wind')) targetTrack = AMBIENT_TRACKS.DESERT;
      if (m.includes('space')) targetTrack = AMBIENT_TRACKS.SPACE;
    }

    if (ambientAudioRef.current?.src === targetTrack) return;

    if (ambientAudioRef.current) {
      const oldAudio = ambientAudioRef.current;
      const fadeOut = setInterval(() => {
        if (oldAudio.volume > 0.05) {
          oldAudio.volume -= 0.05;
        } else {
          oldAudio.pause();
          clearInterval(fadeOut);
        }
      }, 50);
    }

    const newAudio = new Audio(targetTrack);
    newAudio.loop = true;
    newAudio.volume = 0;
    ambientAudioRef.current = newAudio;
    newAudio.play().then(() => {
      const fadeIn = setInterval(() => {
        if (newAudio.volume < 0.3) {
          newAudio.volume += 0.02;
        } else {
          clearInterval(fadeIn);
        }
      }, 100);
    }).catch(e => console.warn("Ambient block:", e));
  };

  useEffect(() => {
    const init = async () => {
      setGameState(prev => ({ ...prev, isProcessing: true }));
      try {
        const res = await getGameUpdate([]);
        let img = null;
        try {
          img = await generateSceneImage(res.scene_image_prompt);
        } catch (e) {
          console.error("Initial image generation failed", e);
        }
        
        setMessages([{ role: 'narrator', content: res.text, timestamp: Date.now() }]);
        setGameState({
          location: res.location,
          inventory: res.inventory,
          currentImage: img,
          isProcessing: false,
          activeBookTitle: res.book_title,
          currentPrompt: res.scene_image_prompt
        });
      } catch (err) {
        setGameState(prev => ({ ...prev, isProcessing: false }));
      }
    };
    init();
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (isInventoryOpen) {
          setIsInventoryOpen(false);
        } else if (gameState.location === 'STORY_WORLD' && !gameState.isProcessing) {
          handleReturnToLibrary();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [gameState.location, gameState.isProcessing, isInventoryOpen]);

  useEffect(() => {
    if (userInteracted) updateAmbient();
  }, [gameState.location, userInteracted]);

  useEffect(() => {
    if (prevLocationRef.current === 'LIBRARY' && gameState.location === 'STORY_WORLD') {
      setIsShattering(true);
      playSound(SFX.SHATTER, 0.8);
      setTimeout(() => setIsShattering(false), 2000);
    }
    prevLocationRef.current = gameState.location;
  }, [gameState.location]);

  useEffect(() => {
    if (scrollRef.current) {
        const targetScroll = scrollRef.current.scrollHeight;
        scrollRef.current.scrollTo({ top: targetScroll, behavior: 'smooth' });
    }
  }, [messages, gameState.isProcessing]);

  const processCommand = async (command: string) => {
    if (!command.trim() || gameState.isProcessing) return;
    if (!userInteracted) setUserInteracted(true);

    const userMsg: GameMessage = { role: 'user', content: command, timestamp: Date.now() };
    setMessages(prev => [...prev, userMsg]);
    setGameState(prev => ({ ...prev, isProcessing: true }));

    try {
      const res = await getGameUpdate([...messages, userMsg]);
      let img = null;
      try {
        img = await generateSceneImage(res.scene_image_prompt);
      } catch (e) {
        console.error("Image generation failed for step", e);
      }
      
      if (img) playSound(SFX.MAGIC, 0.3);
      playSound(SFX.PAGE, 0.2);
      if (res.ambient_mood) updateAmbient(res.ambient_mood);

      setMessages(prev => [...prev, { role: 'narrator', content: res.text, timestamp: Date.now() }]);
      setGameState(prev => ({
        ...prev,
        location: res.location,
        inventory: res.inventory,
        currentImage: img || prev.currentImage,
        activeBookTitle: res.book_title,
        currentPrompt: res.scene_image_prompt,
        isProcessing: false
      }));
    } catch (err) {
      setMessages(prev => [...prev, { role: 'narrator', content: "Mistik bir parazit hikaye akışını kesti... Tekrar fısılda.", timestamp: Date.now() }]);
      setGameState(prev => ({ ...prev, isProcessing: false }));
    }
  };

  const handleCommand = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputValue.trim()) return;
    processCommand(inputValue);
    setInputValue('');
  };

  const handleReturnToLibrary = () => {
    setIsShattering(true);
    playSound(SFX.SHATTER, 0.6);
    processCommand("Kütüphaneye geri dönmek istiyorum.");
    setTimeout(() => setIsShattering(false), 2000);
  };

  return (
    <div className={`h-screen flex flex-col font-inter transition-all duration-1000 overflow-hidden ${gameState.location === 'STORY_WORLD' ? 'bg-[#09050d]' : 'bg-[#0c0a09]'}`}>
      {isShattering && <ShatterEffect />}
      {isInventoryOpen && (
        <InventoryModal 
          items={gameState.inventory} 
          onClose={() => setIsInventoryOpen(false)} 
          onUse={(item) => processCommand(`${item} eşyasını inceliyorum/kullanıyorum.`)}
        />
      )}
      
      <div className="fixed inset-0 pointer-events-none opacity-20 z-0">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(139,92,246,0.1),transparent_80%)]"></div>
        <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/black-paper.png')]"></div>
      </div>

      <header className="z-20 border-b border-white/5 bg-black/70 backdrop-blur-2xl px-5 py-4 flex justify-between items-center flex-shrink-0">
        <div className="flex items-center gap-5">
          <div className={`w-3 h-3 rounded-full transition-all duration-1000 ${gameState.location === 'STORY_WORLD' ? 'bg-purple-500 shadow-[0_0_20px_rgba(168,85,247,0.8)]' : 'bg-amber-600 shadow-[0_0_20px_rgba(217,119,6,0.8)]'}`}></div>
          <div>
            <div className="flex items-center gap-4">
              <h1 className="font-crimson text-xl font-bold tracking-[0.2em] uppercase text-stone-200">
                {gameState.location === 'LIBRARY' ? 'Omni-Library' : (gameState.activeBookTitle || 'Efsunlu Diyar')}
              </h1>
              {gameState.location === 'STORY_WORLD' && (
                <button 
                  onClick={handleReturnToLibrary}
                  disabled={gameState.isProcessing}
                  className="bg-stone-800/40 hover:bg-stone-700/60 border border-white/10 text-[9px] uppercase tracking-[0.2em] px-3 py-1 rounded-sm text-stone-400 hover:text-white transition-all flex items-center gap-2 group disabled:opacity-30"
                >
                  <span className="opacity-40 group-hover:opacity-100 transition-opacity">ESC</span>
                  <span>Kütüphaneye Dön</span>
                </button>
              )}
            </div>
            <p className="text-[9px] text-stone-600 uppercase tracking-[0.4em] font-semibold -mt-0.5">Infinite Story Engine</p>
          </div>
        </div>
        <div className="flex gap-4 items-center">
          <button 
            onClick={() => {
              setIsInventoryOpen(true);
              playSound(SFX.PAGE, 0.4);
            }}
            className="flex items-center gap-3 bg-stone-900/60 hover:bg-stone-800 border border-white/10 hover:border-purple-500/40 px-5 py-2.5 rounded-lg transition-all group shadow-lg"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-stone-500 group-hover:text-purple-400 transition-colors"><path d="M4 20h16a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.93a2 2 0 0 1-1.66-.9l-.82-1.2A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13c0 1.1.9 2 2 2Z"/></svg>
            <span className="text-[11px] uppercase text-stone-400 group-hover:text-stone-100 font-bold tracking-widest">Envanter</span>
            {gameState.inventory.length > 0 && (
              <span className="w-4 h-4 rounded-full bg-purple-600 text-white text-[9px] flex items-center justify-center font-bold animate-pulse">
                {gameState.inventory.length}
              </span>
            )}
          </button>
        </div>
      </header>

      <main className="flex-1 flex flex-col lg:flex-row overflow-hidden relative z-10">
        {/* Enlarge Visual Panel to 70% width on large screens */}
        <section className="w-full lg:w-[70%] h-[50vh] lg:h-full bg-black relative flex items-center justify-center overflow-hidden border-b lg:border-b-0 border-white/5 shadow-2xl">
          {gameState.currentImage && (
            <div 
              className="absolute inset-0 bg-cover bg-center opacity-50 blur-3xl scale-125"
              style={{ backgroundImage: `url(${gameState.currentImage})` }}
            ></div>
          )}
          
          {gameState.currentImage ? (
            <div className="w-full h-full relative flex items-center justify-center group z-10">
              <img 
                src={gameState.currentImage} 
                alt="Scene" 
                className="w-full h-full object-cover animate-fade-in transition-all duration-1000 brightness-[0.8] group-hover:brightness-100" 
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/20 pointer-events-none"></div>
              
              {/* Subtle Prompt Tooltip */}
              {gameState.currentPrompt && (
                <div className="absolute bottom-8 left-8 right-8 bg-black/80 backdrop-blur-xl p-5 rounded-lg opacity-0 group-hover:opacity-100 transition-all duration-500 text-[11px] font-mono text-stone-200 border border-white/10 pointer-events-none transform translate-y-4 group-hover:translate-y-0 shadow-[0_0_50px_rgba(0,0,0,0.9)] max-w-lg">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="w-2 h-2 rounded-full bg-purple-500 shadow-[0_0_10px_rgba(168,85,247,0.8)]"></div>
                    <span className="text-purple-400 font-bold uppercase tracking-[0.2em]">Kadim Tezahür</span>
                  </div>
                  <p className="leading-relaxed text-stone-300 italic">{gameState.currentPrompt}</p>
                </div>
              )}
            </div>
          ) : (
            <div className="flex flex-col items-center gap-5 text-stone-800 z-10">
              <div className="w-12 h-12 border-b-2 border-stone-800 rounded-full animate-spin"></div>
              <p className="font-elite text-xs tracking-[0.4em] uppercase text-stone-700 animate-pulse">Gerçeklik Dokunuyor...</p>
            </div>
          )}
        </section>

        {/* Story Text Panel - 30% width on large screens */}
        <section className="w-full lg:w-[30%] flex flex-col bg-stone-900/5 backdrop-blur-md lg:border-l border-white/10 h-[50vh] lg:h-full relative overflow-hidden">
          {!userInteracted && (
            <div className="absolute inset-0 z-20 bg-black/90 backdrop-blur-xl flex flex-col items-center justify-center p-10 pointer-events-none text-center">
              <div className="w-px h-24 bg-gradient-to-b from-transparent via-purple-500/50 to-transparent mb-10"></div>
              <p className="font-crimson text-white text-2xl tracking-[0.4em] uppercase animate-pulse mb-3 antialiased">
                Omni-Library
              </p>
              <p className="text-stone-600 text-[10px] uppercase tracking-[0.5em] font-light">Kaderini fısılda ve uyan...</p>
            </div>
          )}
          
          <div ref={scrollRef} className="flex-1 overflow-y-auto p-6 lg:p-8 space-y-10 scroll-smooth no-scrollbar">
            {messages.map((msg, i) => (
              <div key={i} className={`fade-in ${msg.role === 'user' ? 'text-stone-400 italic' : 'text-white'}`}>
                {msg.role === 'user' ? (
                  <div className="flex gap-4 items-start justify-end group">
                    <p className="text-[11px] md:text-xs font-inter bg-stone-900/90 px-4 py-3 rounded-xl border border-white/5 shadow-xl max-w-[90%] text-stone-400">{msg.content}</p>
                  </div>
                ) : (
                  <div className="pl-6 border-l-[1px] border-purple-500/20 relative">
                    <div className="font-crimson text-base md:text-lg lg:text-xl leading-[1.7] text-white antialiased tracking-wide font-normal">
                      <Typewriter text={msg.content} speed={15} />
                    </div>
                  </div>
                )}
              </div>
            ))}
            {gameState.isProcessing && (
              <div className="flex items-center gap-4 pl-6 animate-pulse">
                <div className="flex gap-1.5">
                  <div className="w-1 h-1 bg-purple-500 rounded-full animate-bounce"></div>
                  <div className="w-1 h-1 bg-purple-500 rounded-full animate-bounce [animation-delay:-0.15s]"></div>
                  <div className="w-1 h-1 bg-purple-500 rounded-full animate-bounce [animation-delay:-0.3s]"></div>
                </div>
                <span className="text-stone-700 font-elite text-[9px] uppercase tracking-[0.3em] font-bold">Dokuma Sürüyor...</span>
              </div>
            )}
          </div>

          {/* Input Area */}
          <div className="p-4 lg:p-6 bg-black/80 border-t border-white/10 backdrop-blur-3xl relative z-30">
            <form onSubmit={handleCommand} className="relative group w-full mx-auto">
              <input
                type="text" 
                value={inputValue} 
                onChange={(e) => setInputValue(e.target.value)}
                disabled={gameState.isProcessing}
                placeholder={gameState.isProcessing ? "Yollar çiziliyor..." : "Kaderini fısılda..."}
                className="w-full bg-stone-900/60 border border-stone-800 text-white px-6 py-4 rounded-xl outline-none focus:border-purple-500/50 transition-all font-inter placeholder:text-stone-800 text-xs md:text-sm shadow-2xl disabled:opacity-30"
              />
              <button 
                type="submit" 
                disabled={gameState.isProcessing || !inputValue.trim()}
                className={`absolute right-2 top-1/2 -translate-y-1/2 w-9 h-9 rounded-lg flex items-center justify-center transition-all ${gameState.isProcessing || !inputValue.trim() ? 'bg-stone-950 text-stone-800 opacity-20' : 'bg-stone-800 hover:bg-purple-900 text-white shadow-xl active:scale-90'}`}
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m12 19 7-7-7-7"/><path d="M19 12H5"/></svg>
              </button>
            </form>
          </div>
        </section>
      </main>
    </div>
  );
};

export default App;
