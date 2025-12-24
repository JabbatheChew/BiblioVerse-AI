
import { GoogleGenAI, Type, GenerateContentResponse } from "@google/genai";
import { SYSTEM_INSTRUCTION, INITIAL_PROMPT } from "../constants";
import { AIResponse, GameMessage } from "../types";

const API_KEY = process.env.API_KEY || "";
const ai = new GoogleGenAI({ apiKey: API_KEY });

export async function getGameUpdate(history: GameMessage[]): Promise<AIResponse> {
  const contents = history.map(msg => ({
    role: msg.role === 'user' ? 'user' : 'model',
    parts: [{ text: msg.content }]
  }));

  if (contents.length === 0) {
    contents.push({ role: 'user', parts: [{ text: INITIAL_PROMPT }] });
  }

  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: contents as any,
    config: {
      systemInstruction: SYSTEM_INSTRUCTION,
      responseMimeType: 'application/json',
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          text: { type: Type.STRING },
          location: { type: Type.STRING, enum: ['LIBRARY', 'STORY_WORLD'] },
          book_title: { type: Type.STRING },
          inventory: { type: Type.ARRAY, items: { type: Type.STRING } },
          scene_image_prompt: { type: Type.STRING },
          narrator_voice_tone: { type: Type.STRING },
          ambient_mood: { type: Type.STRING }
        },
        required: ['text', 'location', 'inventory', 'scene_image_prompt']
      }
    }
  });

  try {
    return JSON.parse(response.text || "{}") as AIResponse;
  } catch (e) {
    console.error("JSON parse error", e);
    throw new Error("AI responded with invalid format.");
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

    for (const part of response.candidates?.[0]?.content?.parts || []) {
      if (part.inlineData) {
        return `data:image/png;base64,${part.inlineData.data}`;
      }
    }
    return null;
  } catch (e) {
    console.error("Image generation failed", e);
    return null;
  }
}
