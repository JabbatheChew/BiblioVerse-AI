
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
  const [userInteracted, setUserInteracted] = useState(false);
  
  const scrollRef = useRef<HTMLDivElement>(null);
  const prevLocationRef = useRef<GameLocation>('LIBRARY');
  const ambientAudioRef = useRef<HTMLAudioElement | null>(null);

  const playSound = (url: string, volume: number = 0.4) => {
    const audio = new Audio(url);
    audio.volume = volume;
    audio.play().catch(e => console.log('SFX block:', e));
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
    }).catch(e => console.log("Ambient block:", e));
  };

  useEffect(() => {
    const init = async () => {
      setGameState(prev => ({ ...prev, isProcessing: true }));
      try {
        const res = await getGameUpdate([]);
        const img = await generateSceneImage(res.scene_image_prompt);
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
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages]);

  const handleCommand = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputValue.trim() || gameState.isProcessing) return;
    if (!userInteracted) setUserInteracted(true);

    const userMsg: GameMessage = { role: 'user', content: inputValue, timestamp: Date.now() };
    setMessages(prev => [...prev, userMsg]);
    setInputValue('');
    setGameState(prev => ({ ...prev, isProcessing: true }));

    try {
      const res = await getGameUpdate([...messages, userMsg]);
      const img = await generateSceneImage(res.scene_image_prompt);
      
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
      setMessages(prev => [...prev, { role: 'narrator', content: "Mistik bir parazit hikaye akışını kesti... Tekrar dene.", timestamp: Date.now() }]);
      setGameState(prev => ({ ...prev, isProcessing: false }));
    }
  };

  return (
    <div className={`h-screen flex flex-col font-inter transition-all duration-1000 overflow-hidden ${gameState.location === 'STORY_WORLD' ? 'bg-[#09050d]' : 'bg-[#0c0a09]'}`}>
      {isShattering && <ShatterEffect />}
      
      <div className="fixed inset-0 pointer-events-none opacity-25 z-0">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(139,92,246,0.15),transparent_80%)]"></div>
        <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/black-paper.png')]"></div>
      </div>

      <header className="z-10 border-b border-white/5 bg-black/60 backdrop-blur-xl px-4 py-3 flex justify-between items-center flex-shrink-0">
        <div className="flex items-center gap-3">
          <div className={`w-2.5 h-2.5 rounded-full transition-all duration-1000 ${gameState.location === 'STORY_WORLD' ? 'bg-purple-500 shadow-[0_0_15px_rgba(168,85,247,0.8)]' : 'bg-amber-600 shadow-[0_0_15px_rgba(217,119,6,0.8)]'}`}></div>
          <div>
            <h1 className="font-crimson text-lg font-bold tracking-[0.1em] uppercase text-stone-300">
              {gameState.location === 'LIBRARY' ? 'Omni-Library' : (gameState.activeBookTitle || 'Efsunlu Diyar')}
            </h1>
            <p className="text-[8px] text-stone-600 uppercase tracking-[0.3em] font-medium -mt-0.5">Infinite Story Engine</p>
          </div>
        </div>
        <div className="flex gap-4 items-center">
          <div className="flex flex-col items-end">
            <span className="text-[9px] uppercase text-stone-500 font-bold tracking-widest">Envanter</span>
            <div className="flex gap-1.5 mt-0.5 overflow-x-auto max-w-[150px] no-scrollbar">
              {gameState.inventory.length > 0 ? (
                gameState.inventory.map((item, idx) => (
                  <span key={idx} className="whitespace-nowrap bg-stone-900 text-stone-400 text-[9px] px-2 py-0.5 rounded-sm border border-stone-800 font-elite">
                    {item}
                  </span>
                ))
              ) : <span className="text-[9px] text-stone-700 italic">Boş</span>}
            </div>
          </div>
        </div>
      </header>

      <main className="flex-1 flex flex-col lg:flex-row overflow-hidden relative z-10">
        {/* Balanced Visual Panel - Reduced padding to make image feel larger */}
        <section className="w-full lg:w-1/2 h-[45vh] lg:h-full bg-black relative flex items-center justify-center p-2 lg:p-4 overflow-hidden shadow-inner">
          {gameState.currentImage ? (
            <div className="w-full h-full relative flex items-center justify-center group">
              <img 
                src={gameState.currentImage} 
                alt="Scene" 
                className="max-h-full max-w-full object-contain rounded-sm shadow-2xl animate-fade-in transition-all duration-1000 ring-1 ring-white/5" 
              />
              <div className="absolute inset-0 ring-1 ring-inset ring-white/5 rounded-sm pointer-events-none"></div>
              
              {/* Visual Prompt Tooltip - Subtle design */}
              {gameState.currentPrompt && (
                <div className="absolute bottom-4 left-4 right-4 bg-black/70 backdrop-blur-md p-3 rounded opacity-0 group-hover:opacity-100 transition-all duration-300 text-[9px] font-mono text-stone-400 border border-white/5 pointer-events-none transform translate-y-1 group-hover:translate-y-0">
                  <span className="text-purple-400 font-bold uppercase tracking-wider mr-1">Prompt:</span>
                  {gameState.currentPrompt}
                </div>
              )}
            </div>
          ) : (
            <div className="flex flex-col items-center gap-4 text-stone-800">
              <div className="w-10 h-10 border-b-2 border-stone-800 rounded-full animate-spin"></div>
              <p className="font-elite text-[10px] tracking-widest uppercase">Gerçeklik Dokunuyor...</p>
            </div>
          )}
        </section>

        {/* Balanced Text Panel - Reduced text size for better information density */}
        <section className="w-full lg:w-1/2 flex flex-col bg-stone-900/10 backdrop-blur-sm lg:border-l border-white/5 h-[55vh] lg:h-full relative shadow-2xl">
          {!userInteracted && (
            <div className="absolute inset-0 z-20 bg-black/80 backdrop-blur-md flex flex-col items-center justify-center p-12 pointer-events-none text-center">
              <div className="w-px h-16 bg-gradient-to-b from-transparent via-purple-500/50 to-transparent mb-8"></div>
              <p className="font-crimson text-stone-300 text-xl tracking-[0.3em] uppercase animate-pulse mb-2 antialiased">
                Omni-Library
              </p>
              <p className="text-stone-600 text-[9px] uppercase tracking-[0.4em] font-light">Maceranı fısılda...</p>
            </div>
          )}
          
          <div ref={scrollRef} className="flex-1 overflow-y-auto p-5 lg:p-10 lg:pt-12 space-y-8 scroll-smooth no-scrollbar">
            {messages.map((msg, i) => (
              <div key={i} className={`fade-in ${msg.role === 'user' ? 'text-stone-400 italic' : 'text-stone-200'}`}>
                {msg.role === 'user' ? (
                  <div className="flex gap-3 items-start justify-end group">
                    <p className="text-xs md:text-sm font-inter bg-stone-900/60 px-4 py-2 rounded-xl border border-white/5 shadow-md">{msg.content}</p>
                    <span className="text-stone-700 text-[10px] mt-2 font-bold">&lt;</span>
                  </div>
                ) : (
                  <div className="pl-6 border-l-[1px] border-stone-800/40 relative">
                    <div className="font-crimson text-lg md:text-xl leading-[1.6] text-stone-300 antialiased">
                      <Typewriter text={msg.content} speed={10} />
                    </div>
                  </div>
                )}
              </div>
            ))}
            {gameState.isProcessing && (
              <div className="flex items-center gap-4 pl-6">
                <div className="flex gap-1.5">
                  <div className="w-1 h-1 bg-purple-500/80 rounded-full animate-bounce"></div>
                  <div className="w-1 h-1 bg-purple-500/80 rounded-full animate-bounce [animation-delay:-0.15s]"></div>
                  <div className="w-1 h-1 bg-purple-500/80 rounded-full animate-bounce [animation-delay:-0.3s]"></div>
                </div>
                <span className="text-stone-700 font-elite text-[9px] uppercase tracking-[0.2em]">Ciltler Karıştırılıyor...</span>
              </div>
            )}
          </div>

          {/* Optimized Input Area - Smaller and sleeker */}
          <div className="p-4 lg:p-8 bg-black/60 border-t border-white/5 backdrop-blur-2xl">
            <form onSubmit={handleCommand} className="relative group max-w-2xl mx-auto">
              <input
                type="text" 
                value={inputValue} 
                onChange={(e) => setInputValue(e.target.value)}
                disabled={gameState.isProcessing}
                placeholder={gameState.isProcessing ? "Yollar çiziliyor..." : "Bir komut fısılda..."}
                className="w-full bg-stone-900/30 border border-stone-800/60 text-stone-200 px-6 py-4 rounded-full outline-none focus:border-purple-500/30 focus:ring-1 focus:ring-purple-500/10 transition-all font-inter placeholder:text-stone-800 text-sm md:text-base shadow-xl"
              />
              <button 
                type="submit" 
                disabled={gameState.isProcessing}
                className={`absolute right-2 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full flex items-center justify-center transition-all ${gameState.isProcessing ? 'bg-stone-950 text-stone-800 opacity-50' : 'bg-stone-800 hover:bg-stone-700 text-white shadow-lg'}`}
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m12 19 7-7-7-7"/><path d="M19 12H5"/></svg>
              </button>
            </form>
          </div>
        </section>
      </main>
    </div>
  );
};

export default App;
