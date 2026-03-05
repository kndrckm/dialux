import { GoogleGenAI, Type } from "@google/genai";


export interface DialuxData {
  roomName: string;
  luminaires: {
    model: string;
    quantity: number;
    flux: string;
    power: string;
  }[];
  lightingResults: {
    surface: string;
    averageLux: string;
    targetLux?: string;
    minLux?: string;
    maxLux?: string;
    uniformity?: string;
    targetUniformity?: string;
    lpd?: string; // Lighting Power Density
  }[];
  dimensions?: {
    length: string;
    width: string;
    height: string;
  };
  spaceLPD?: string; // Overall space Lighting Power Density
}

export async function processDialuxReport(text: string): Promise<DialuxData> {
  try {
    if (!text || text.trim().length < 50) {
      throw new Error('The extracted text is too short or empty. The PDF might be image-based (scanned) without OCR.');
    }

    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || '' });
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: [
        {
          role: "user",
          parts: [{ text: `Room list
Anteroom
Ptotal 67.2 W
ARoom 7.21 m²
Lighting power density 9.32 W/m² = 3.65 W/m²/100 lx (Space)
10.06 W/m² = 3.94 W/m²/100 lx (Working plane)
...
Working plane (Anteroom)
256 lx
211 lx
(≥ 100 lx)
288 lx
0.82
(≥ 0.25)
0.73` }]
        },
        {
          role: "model",
          parts: [{ text: `{"roomName": "Anteroom", "luminaires": [{"model": "Easy - General Lighting - 153mm - RL60.39-0163 mm - warm white - ON-OFF electronic - 16.8W 1870lm - 3500K - CRI 90 - White/Aluminium", "quantity": 4, "flux": "1350 Im", "power": "16.8 W"}], "lightingResults": [{"surface": "Anteroom", "averageLux": "256 lx", "targetLux": "(≥ 100 lx)", "minLux": "211 lx", "maxLux": "288 lx", "uniformity": "0.82", "targetUniformity": "(≥ 0.25)", "lpd": "10.06 W/m² = 3.94 W/m²/100 lx"}], "spaceLPD": "9.32 W/m² = 3.65 W/m²/100 lx"}` }]
        },
        {
          role: "user",
          parts: [{ text: text }]
        }
      ],
      config: {
        systemInstruction: `You are an expert data extractor parsing DIALux PDF reports. Extract lighting design data into structured JSON.

Rules:
1. Source Locators: Prioritize data from pages containing "Room list", "Working planes", or "Calculation objects".
2. Strict Ordering: Output the rooms in the exact order they first appear in the "Room list" pages, ignoring the alphabetical order of the final calculation tables.
3. Surface Names: For names like "Working plane (Room Name)", strip the wrapper to output just "Room Name".
4. Table Logic: In the Working Planes table, cells often contain multiple lines. The highest lux value is typically Ē (averageLux), the lowest is Emin (minLux), and values in parentheses are Targets (e.g., "(≥ 100 lx)").
5. LPD Formatting: Extract the complete calculation string for Lighting Power Density (e.g., "9.32 W/m² = 3.65 W/m²/100 lx").
6. Noise Reduction: Completely ignore lone "X" characters used in DIALux to indicate failed targets. If a target is missing, leave the JSON field null or empty.`,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            roomName: { type: Type.STRING },
            luminaires: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  model: { type: Type.STRING },
                  quantity: { type: Type.NUMBER },
                  flux: { type: Type.STRING },
                  power: { type: Type.STRING }
                },
                required: ["model", "quantity"]
              }
            },
            lightingResults: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  surface: { type: Type.STRING },
                  averageLux: { type: Type.STRING },
                  targetLux: { type: Type.STRING },
                  minLux: { type: Type.STRING },
                  maxLux: { type: Type.STRING },
                  uniformity: { type: Type.STRING },
                  targetUniformity: { type: Type.STRING },
                  lpd: { type: Type.STRING }
                },
                required: ["surface", "averageLux"]
              }
            },
            dimensions: {
              type: Type.OBJECT,
              properties: {
                length: { type: Type.STRING },
                width: { type: Type.STRING },
                height: { type: Type.STRING }
              }
            },
            spaceLPD: { type: Type.STRING }
          },
          required: ["roomName", "luminaires", "lightingResults"]
        }
      }
    });

    if (!response.text) {
      throw new Error('AI returned an empty response.');
    }

    try {
      const result = JSON.parse(response.text);
      return result as DialuxData;
    } catch (parseError) {
      console.error('JSON Parse Error:', parseError, 'Raw text:', response.text);
      throw new Error('Failed to parse AI response into structured data.');
    }
  } catch (error: any) {
    console.error('Gemini Service Error:', error);
    if (error.message?.includes('API key')) {
      throw new Error('Gemini API key is missing or invalid.');
    }
    if (error.message?.includes('quota')) {
      throw new Error('Gemini API quota exceeded. Please try again later.');
    }
    throw error;
  }
}
