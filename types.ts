
export type GameLocation = 'LIBRARY' | 'STORY_WORLD';

export interface GameMessage {
  role: 'user' | 'narrator';
  content: string;
  timestamp: number;
}

export interface NPCInteraction {
  name: string;
  expression: string; // e.g., "Gülümseyen", "Kızgın", "Endişeli"
  intent: string; // e.g., "Sana bir görev vermek istiyor", "Seni uyarıyor"
}

export interface GameState {
  location: GameLocation;
  inventory: string[];
  currentImage: string | null;
  isProcessing: boolean;
  activeBookTitle?: string;
  activeNPC?: NPCInteraction;
}

export interface AIResponse {
  text: string;
  location: GameLocation;
  inventory: string[];
  scene_image_prompt: string;
  narrator_voice_tone: string;
  book_title?: string;
  ambient_mood?: string;
  sfx_trigger?: string;
  npc?: NPCInteraction;
}
