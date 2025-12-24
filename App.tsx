
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { GameMessage, GameState, GameLocation, NPCInteraction } from './types';
import { getGameUpdate, generateSceneImage } from './services/geminiService';
import Typewriter from './components/Typewriter';

// Genişletilmiş Ses Efektleri (Anlık SFX)
const SFX: Record<string, string> = {
  SHATTER: 'https://cdn.pixabay.com/audio/2021/08/09/audio_8816743b18.mp3', 
  PAGE: 'https://assets.mixkit.co/active_storage/sfx/2571/2571-preview.mp3', 
  MAGIC: 'https://cdn.pixabay.com/audio/2022/03/15/audio_c3c3951f28.mp3',
  sword_clash: 'https://assets.mixkit.co/active_storage/sfx/2085/2085-preview.mp3',
  magic_sparkle: 'https://assets.mixkit.co/active_storage/sfx/1118/1118-preview.mp3',
  ship_creak: 'https://assets.mixkit.co/active_storage/sfx/1089/1089-preview.mp3',
  futuristic_hum: 'https://assets.mixkit.co/active_storage/sfx/2558/2558-preview.mp3',
  heavy_door: 'https://assets.mixkit.co/active_storage/sfx/1077/1077-preview.mp3',
  rain_start: 'https://assets.mixkit.co/active_storage/sfx/2505/2505-preview.mp3',
  thunder: 'https://cdn.pixabay.com/audio/2021/08/09/audio_417b705e4d.mp3',
  wolf_howl: 'https://cdn.pixabay.com/audio/2022/03/15/audio_2d8b8e1f5a.mp3'
};

// Genişletilmiş Ortam Sesleri (Loops)
const AMBIENT_TRACKS: Record<string, string> = {
  LIBRARY: 'https://cdn.pixabay.com/audio/2022/03/24/audio_3d1a8e1b36.mp3', 
  FOREST: 'https://cdn.pixabay.com/audio/2022/01/18/audio_6038379c38.mp3', 
  DESERT: 'https://cdn.pixabay.com/audio/2021/08/09/audio_8e8267252f.mp3', 
  SPACE: 'https://cdn.pixabay.com/audio/2022/03/15/audio_b299e56726.mp3', 
  MYSTIC: 'https://cdn.pixabay.com/audio/2021/11/25/audio_55e2e4b37d.mp3',
  OCEAN: 'https://cdn.pixabay.com/audio/2022/03/09/audio_0ec70c1e7f.mp3',
  CYBERPUNK: 'https://cdn.pixabay.com/audio/2022/03/20/audio_51d45c50c5.mp3',
  DUNGEON: 'https://cdn.pixabay.com/audio/2022/03/24/audio_73e721d003.mp3',
  WINTER: 'https://cdn.pixabay.com/audio/2021/08/09/audio_6891eb5877.mp3'
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
        className="absolute inset-0 bg-black/95 backdrop-blur-md cursor-pointer" 
        onClick={onClose}
      ></div>
      <div className="relative w-full max-w-md bg-stone-950 border border-white/10 rounded-xl shadow-[0_0_100px_rgba(0,0,0,1)] overflow-hidden">
        <div className="px-6 py-5 border-b border-white/5 flex justify-between items-center bg-stone-900/50">
          <h2 className="font-crimson text-xl font-bold tracking-widest text-stone-100 uppercase">Kadim Heybe</h2>
          <button onClick={onClose} className="text-stone-500 hover:text-white transition-colors p-2">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
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
    currentPrompt: undefined,
    activeNPC: undefined
  });
  const [inputValue, setInputValue] = useState('');
  const [isShattering, setIsShattering] = useState(false);
  const [isInventoryOpen, setIsInventoryOpen] = useState(false);
  const [userInteracted, setUserInteracted] = useState(false);
  const [typingSpeed, setTypingSpeed] = useState(15);
  
  const scrollRef = useRef<HTMLDivElement>(null);
  const prevLocationRef = useRef<GameLocation>('LIBRARY');
  const ambientAudioRef = useRef<HTMLAudioElement | null>(null);

  const playSound = (urlOrKey: string, volume: number = 0.4) => {
    const url = SFX[urlOrKey] || urlOrKey;
    const audio = new Audio(url);
    audio.volume = volume;
    audio.play().catch(e => console.warn('Sound block:', e));
  };

  const updateAmbient = (mood?: string) => {
    if (!userInteracted) return;

    let targetTrack = AMBIENT_TRACKS.LIBRARY;
    
    if (gameState.location === 'STORY_WORLD' || mood) {
      const m = (mood || '').toLowerCase();
      if (m.includes('whispers') || m.includes('library')) targetTrack = AMBIENT_TRACKS.LIBRARY;
      else if (m.includes('forest')) targetTrack = AMBIENT_TRACKS.FOREST;
      else if (m.includes('desert')) targetTrack = AMBIENT_TRACKS.DESERT;
      else if (m.includes('space')) targetTrack = AMBIENT_TRACKS.SPACE;
      else if (m.includes('mystic')) targetTrack = AMBIENT_TRACKS.MYSTIC;
      else if (m.includes('ocean') || m.includes('waves')) targetTrack = AMBIENT_TRACKS.OCEAN;
      else if (m.includes('cyberpunk') || m.includes('city')) targetTrack = AMBIENT_TRACKS.CYBERPUNK;
      else if (m.includes('dungeon') || m.includes('ancient')) targetTrack = AMBIENT_TRACKS.DUNGEON;
      else if (m.includes('winter') || m.includes('blizzard')) targetTrack = AMBIENT_TRACKS.WINTER;
      else targetTrack = AMBIENT_TRACKS.MYSTIC;
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
          currentPrompt: res.scene_image_prompt,
          activeNPC: res.npc
        });
        if (res.ambient_mood) updateAmbient(res.ambient_mood);
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
      playSound('SHATTER', 0.8);
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
      
      if (img) playSound('MAGIC', 0.3);
      if (res.sfx_trigger) playSound(res.sfx_trigger, 0.5);
      else playSound('PAGE', 0.2);
      
      if (res.ambient_mood) updateAmbient(res.ambient_mood);

      setMessages(prev => [...prev, { role: 'narrator', content: res.text, timestamp: Date.now() }]);
      setGameState(prev => ({
        ...prev,
        location: res.location,
        inventory: res.inventory,
        currentImage: img || prev.currentImage,
        activeBookTitle: res.book_title,
        currentPrompt: res.scene_image_prompt,
        activeNPC: res.npc,
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
    playSound('SHATTER', 0.6);
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

      <header className="z-20 border-b border-white/5 bg-black/80 backdrop-blur-2xl px-6 py-4 flex justify-between items-center flex-shrink-0">
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
                  className="bg-stone-800/40 hover:bg-stone-700/60 border border-white/10 text-[10px] uppercase tracking-[0.2em] px-4 py-1.5 rounded text-stone-400 hover:text-white transition-all flex items-center gap-2 group disabled:opacity-30"
                >
                  <span className="opacity-40 group-hover:opacity-100 transition-opacity">ESC</span>
                  <span>Kütüphaneye Dön</span>
                </button>
              )}
            </div>
            <p className="text-[9px] text-stone-600 uppercase tracking-[0.5em] font-semibold -mt-0.5">Infinite Story Engine</p>
          </div>
        </div>
        
        <div className="flex gap-6 items-center">
          <div className="flex items-center gap-3 bg-stone-900/40 px-4 py-2 rounded-lg border border-white/5">
             <span className="text-[9px] uppercase tracking-widest text-stone-500 font-bold">Hız</span>
             <div className="flex gap-1">
                {[
                  { label: 'Ağır', val: 40 },
                  { label: 'Normal', val: 15 },
                  { label: 'Hızlı', val: 5 }
                ].map((s) => (
                  <button
                    key={s.label}
                    onClick={() => setTypingSpeed(s.val)}
                    className={`text-[9px] uppercase px-2 py-0.5 rounded transition-all font-elite ${typingSpeed === s.val ? 'bg-purple-900/50 text-purple-300 border border-purple-500/30' : 'text-stone-600 hover:text-stone-400'}`}
                  >
                    {s.label}
                  </button>
                ))}
             </div>
          </div>

          <button 
            onClick={() => {
              setIsInventoryOpen(true);
              playSound('PAGE', 0.4);
            }}
            className="flex items-center gap-3 bg-stone-900/60 hover:bg-stone-800 border border-white/10 hover:border-purple-500/40 px-6 py-2.5 rounded-lg transition-all group shadow-lg"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-stone-500 group-hover:text-purple-400 transition-colors"><path d="M4 20h16a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.93a2 2 0 0 1-1.66-.9l-.82-1.2A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13c0 1.1.9 2 2 2Z"/></svg>
            <span className="text-[12px] uppercase text-stone-400 group-hover:text-stone-100 font-bold tracking-widest">Envanter</span>
            {gameState.inventory.length > 0 && (
              <span className="w-5 h-5 rounded-full bg-purple-600 text-white text-[10px] flex items-center justify-center font-bold animate-pulse shadow-[0_0_10px_rgba(168,85,247,0.5)]">
                {gameState.inventory.length}
              </span>
            )}
          </button>
        </div>
      </header>

      <main className="flex-1 flex flex-col lg:flex-row overflow-hidden relative z-10">
        <section className="w-full lg:w-[75%] h-[55vh] lg:h-full bg-black relative flex items-center justify-center overflow-hidden">
          {gameState.currentImage && (
            <div 
              className="absolute inset-0 bg-cover bg-center opacity-40 blur-3xl scale-125 transition-all duration-1000"
              style={{ backgroundImage: `url(${gameState.currentImage})` }}
            ></div>
          )}
          
          {gameState.currentImage ? (
            <div className="w-full h-full relative flex items-center justify-center group z-10">
              <img 
                src={gameState.currentImage} 
                alt="Scene" 
                className="w-full h-full object-cover animate-fade-in transition-all duration-1000 brightness-[0.8] group-hover:brightness-100 object-center" 
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent opacity-70 pointer-events-none"></div>
              <div className="absolute inset-0 shadow-[inset_0_0_200px_rgba(0,0,0,0.9)] pointer-events-none"></div>
              
              {gameState.currentPrompt && (
                <div className="absolute bottom-10 left-10 right-10 bg-black/80 backdrop-blur-3xl p-6 rounded-2xl opacity-0 group-hover:opacity-100 transition-all duration-700 text-[11px] font-mono text-stone-200 border border-white/10 pointer-events-none transform translate-y-8 group-hover:translate-y-0 shadow-[0_0_100px_rgba(0,0,0,1)] max-w-3xl">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="w-2.5 h-2.5 rounded-full bg-purple-500 shadow-[0_0_20px_rgba(168,85,247,0.9)]"></div>
                    <span className="text-purple-400 font-bold uppercase tracking-[0.4em]">Kadim Tezahür</span>
                  </div>
                  <p className="leading-relaxed text-stone-300 italic tracking-wider font-medium opacity-90">{gameState.currentPrompt}</p>
                </div>
              )}
            </div>
          ) : (
            <div className="flex flex-col items-center gap-6 text-stone-800 z-10 animate-pulse">
              <div className="w-16 h-16 border-b-2 border-purple-500/60 rounded-full animate-spin"></div>
              <p className="font-elite text-sm tracking-[0.6em] uppercase text-stone-700">Gerçeklik Dokunuyor...</p>
            </div>
          )}
        </section>

        <section className="w-full lg:w-[25%] flex flex-col bg-[#080707] lg:border-l border-white/5 h-[45vh] lg:h-full relative overflow-hidden shadow-[-20px_0_50px_rgba(0,0,0,1)]">
          {/* Active NPC Indicator */}
          {gameState.activeNPC && (
            <div className="px-6 py-4 bg-purple-900/20 border-b border-purple-500/20 animate-fade-in flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-2 h-2 rounded-full bg-purple-400 animate-pulse"></div>
                <div className="flex flex-col">
                  <span className="text-[10px] uppercase tracking-widest text-purple-300 font-bold">{gameState.activeNPC.name}</span>
                  <span className="text-[8px] uppercase tracking-widest text-stone-500 italic">{gameState.activeNPC.expression}</span>
                </div>
              </div>
              <div className="text-[8px] uppercase tracking-[0.2em] text-purple-500/60 font-mono text-right max-w-[100px]">
                {gameState.activeNPC.intent}
              </div>
            </div>
          )}

          {!userInteracted && (
            <div className="absolute inset-0 z-20 bg-black/95 backdrop-blur-xl flex flex-col items-center justify-center p-12 pointer-events-none text-center">
              <div className="w-px h-32 bg-gradient-to-b from-transparent via-purple-500/50 to-transparent mb-12"></div>
              <p className="font-crimson text-white text-3xl tracking-[0.5em] uppercase animate-pulse mb-4 antialiased">
                Omni-Library
              </p>
              <p className="text-stone-600 text-[11px] uppercase tracking-[0.6em] font-light">Kaderini fısılda ve uyan...</p>
            </div>
          )}
          
          <div ref={scrollRef} className="flex-1 overflow-y-auto p-6 lg:p-8 lg:pt-10 space-y-10 scroll-smooth no-scrollbar">
            {messages.map((msg, i) => (
              <div key={i} className={`fade-in transition-all duration-500 ${msg.role === 'user' ? 'text-stone-400 italic' : 'text-white'}`}>
                {msg.role === 'user' ? (
                  <div className="flex gap-4 items-start justify-end group">
                    <div className="max-w-[95%]">
                      <p className="text-[11px] font-inter bg-stone-900/90 px-4 py-3 rounded-xl border border-white/5 shadow-2xl text-stone-400 leading-relaxed">{msg.content}</p>
                    </div>
                  </div>
                ) : (
                  <div className="pl-6 border-l-2 border-purple-500/20 relative group">
                    <div className="absolute -left-0.5 top-0 w-0.5 h-16 bg-gradient-to-b from-purple-500 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
                    <div className="font-crimson text-base md:text-lg lg:text-xl leading-[1.8] text-white antialiased tracking-wide font-normal">
                      <Typewriter text={msg.content} speed={typingSpeed} />
                    </div>
                  </div>
                )}
              </div>
            ))}
            {gameState.isProcessing && (
              <div className="flex items-center gap-5 pl-6 animate-pulse">
                <div className="flex gap-2">
                  <div className="w-2 h-2 bg-purple-500 rounded-full animate-bounce"></div>
                  <div className="w-2 h-2 bg-purple-500 rounded-full animate-bounce [animation-delay:-0.15s]"></div>
                  <div className="w-2 h-2 bg-purple-500 rounded-full animate-bounce [animation-delay:-0.3s]"></div>
                </div>
                <span className="text-stone-700 font-elite text-[10px] uppercase tracking-[0.4em] font-bold">Kader Örülüyor...</span>
              </div>
            )}
          </div>

          <div className="p-6 lg:p-8 bg-black/95 border-t border-white/5 backdrop-blur-3xl relative z-30">
            <form onSubmit={handleCommand} className="relative group w-full mx-auto">
              <input
                type="text" 
                value={inputValue} 
                onChange={(e) => setInputValue(e.target.value)}
                disabled={gameState.isProcessing}
                placeholder={gameState.isProcessing ? "Gerçeklik bükülüyor..." : (gameState.activeNPC ? `${gameState.activeNPC.name} ile konuş...` : "Kaderini fısılda...")}
                className="w-full bg-stone-900/60 border border-stone-800 text-stone-100 px-6 py-4 rounded-xl outline-none focus:border-purple-500/50 focus:ring-1 focus:ring-purple-500/10 transition-all font-inter placeholder:text-stone-800 text-sm shadow-2xl disabled:opacity-30"
              />
              <button 
                type="submit" 
                disabled={gameState.isProcessing || !inputValue.trim()}
                className={`absolute right-2 top-1/2 -translate-y-1/2 w-10 h-10 rounded-xl flex items-center justify-center transition-all ${gameState.isProcessing || !inputValue.trim() ? 'bg-stone-950 text-stone-800 opacity-20' : 'bg-stone-800 hover:bg-purple-800 text-white shadow-xl active:scale-90 hover:shadow-purple-500/20'}`}
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m12 19 7-7-7-7"/><path d="M19 12H5"/></svg>
              </button>
            </form>
            <div className="mt-4 text-center">
              <p className="text-[9px] uppercase tracking-[0.6em] text-stone-700 font-bold opacity-40">Maceranı burada fısılda</p>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
};

export default App;
