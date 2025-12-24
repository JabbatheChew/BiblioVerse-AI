
export type GameLocation = 'LIBRARY' | 'STORY_WORLD';

export interface GameMessage {
  role: 'user' | 'narrator';
  content: string;
  timestamp: number;
}

export interface GameState {
  location: GameLocation;
  inventory: string[];
  currentImage: string | null;
  isProcessing: boolean;
  activeBookTitle?: string;
}

export interface AIResponse {
  text: string;
  location: GameLocation;
  inventory: string[];
  scene_image_prompt: string;
  narrator_voice_tone: string;
  book_title?: string;
  ambient_mood?: string;
}
