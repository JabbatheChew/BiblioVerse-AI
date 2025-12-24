
import { GoogleGenAI, Type, GenerateContentResponse } from "@google/genai";
import { SYSTEM_INSTRUCTION, INITIAL_PROMPT } from "../constants";
import { AIResponse, GameMessage } from "../types";

const API_KEY = process.env.API_KEY || "";
const ai = new GoogleGenAI({ apiKey: API_KEY });

/**
 * Extracts and attempts to repair truncated JSON from a string.
 */
function extractAndRepairJson(text: string): string {
  let cleaned = text.replace(/```json\s?|```/g, "").trim();
  
  const firstBrace = cleaned.indexOf('{');
  if (firstBrace === -1) return "{}";

  let jsonPart = cleaned.substring(firstBrace);
  
  let openBraces = 0;
  let inString = false;
  let escaped = false;
  let lastValidIndex = -1;

  for (let i = 0; i < jsonPart.length; i++) {
    const char = jsonPart[i];
    
    if (char === '"' && !escaped) {
      inString = !inString;
    }
    
    if (!inString) {
      if (char === '{') openBraces++;
      if (char === '}') {
        openBraces--;
        if (openBraces === 0) {
          lastValidIndex = i;
          break; // Found a complete root object
        }
      }
    }
    
    escaped = char === '\\' && !escaped;
  }

  // If we found a complete object, return it
  if (lastValidIndex !== -1) {
    return jsonPart.substring(0, lastValidIndex + 1);
  }

  // HARD REPAIR: JSON truncated mid-stream
  let repaired = jsonPart;
  if (inString) {
    repaired += '"'; // Close the open string
  }
  
  // Close all open braces
  const neededBraces = Math.max(0, openBraces);
  for (let i = 0; i < neededBraces; i++) {
    // Before closing, check if we need a closing quote for a property value
    repaired += '}';
  }

  return repaired;
}

export async function getGameUpdate(history: GameMessage[]): Promise<AIResponse> {
  const historyWindow = history.slice(-6); // Slightly smaller window for reliability

  const contents = historyWindow.map(msg => ({
    role: msg.role === 'user' ? 'user' : 'model',
    parts: [{ text: msg.content }]
  }));

  if (contents.length === 0) {
    contents.push({ role: 'user', parts: [{ text: INITIAL_PROMPT }] });
  }

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: contents as any,
      config: {
        systemInstruction: SYSTEM_INSTRUCTION + "\n\nKRİTİK: Yanıtın her zaman geçerli bir JSON objesi olmalı. Metin çok uzunsa sonunu anlamlı bir yerde kesip JSON'ı kapat. Asla JSON yapısını yarım bırakma.",
        responseMimeType: 'application/json',
        maxOutputTokens: 1500, // Increased for better cinematic descriptions
        thinkingConfig: { thinkingBudget: 0 }, // Speed priority
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            text: { type: Type.STRING },
            location: { type: Type.STRING, enum: ['LIBRARY', 'STORY_WORLD'] },
            book_title: { type: Type.STRING },
            inventory: { type: Type.ARRAY, items: { type: Type.STRING } },
            scene_image_prompt: { type: Type.STRING },
            narrator_voice_tone: { type: Type.STRING },
            npc: {
              type: Type.OBJECT,
              properties: {
                name: { type: Type.STRING },
                expression: { type: Type.STRING },
                intent: { type: Type.STRING }
              },
              required: ['name', 'expression', 'intent']
            }
          },
          required: ['text', 'location', 'inventory', 'scene_image_prompt']
        }
      }
    });

    const rawText = response.text || "{}";
    const cleanedText = extractAndRepairJson(rawText);
    
    let parsed: any;
    try {
      parsed = JSON.parse(cleanedText);
    } catch (parseError) {
      console.error("JSON repair failed, attempt manual clean", cleanedText);
      // Fallback: If JSON is absolutely mangled, try to extract text property with regex
      const textMatch = rawText.match(/"text"\s*:\s*"(.*?)"/s);
      parsed = {
        text: textMatch ? textMatch[1] + "..." : "Kaderin ipleri koptu, gerçeklik bulanıklaşıyor...",
        location: 'LIBRARY',
        inventory: [],
        scene_image_prompt: "A mystical library collapsing into white light"
      };
    }

    return {
      text: parsed.text || "Sayfalar siliniyor...",
      location: parsed.location || 'LIBRARY',
      inventory: Array.isArray(parsed.inventory) ? parsed.inventory : [],
      scene_image_prompt: parsed.scene_image_prompt || "Mysterious lighting",
      book_title: parsed.book_title,
      narrator_voice_tone: parsed.narrator_voice_tone,
      npc: parsed.npc
    } as AIResponse;

  } catch (e) {
    console.error("Game update API error:", e);
    throw e;
  }
}

export async function generateSceneImage(prompt: string): Promise<string | null> {
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: {
        parts: [{ text: `A cinematic, atmospheric concept art of: ${prompt}. Mysterious lighting, high fantasy or sci-fi aesthetic, hyper-realistic, 4k.` }]
      },
      config: {
        imageConfig: {
          aspectRatio: "16:9"
        }
      }
    });

    const parts = response.candidates?.[0]?.content?.parts;
    if (parts && Array.isArray(parts)) {
      for (const part of parts) {
        if (part.inlineData) {
          return `data:image/png;base64,${part.inlineData.data}`;
        }
      }
    }
    return null;
  } catch (e) {
    console.error("Image generation failed", e);
    return null;
  }
}
