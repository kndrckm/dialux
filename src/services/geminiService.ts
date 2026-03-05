import { GoogleGenAI, Type } from "@google/genai";

export interface DialuxRoom {
  roomName: string;
  eWorkplane: string;   // e.g. "256 lx"
  eTarget: string;      // e.g. "100 lx"  (stripped of ≥ and parens)
  aRoom: string;        // e.g. "7.21 m²"
  lpdSpace: string;     // e.g. "9.32 W/m²"
  lpdWorkingPlane: string; // e.g. "10.06 W/m²"
  pageRef: number;       // PDF page number where this room's data appears
}

/**
 * Parse a raw value string into { value, unit }.
 * Handles formats like "256 lx", "7.21 m²", "9.32 W/m²", "(≥ 100 lx)", "100"
 */
export function parseValueUnit(raw: string): { value: string; unit: string } {
  if (!raw || raw === '-') return { value: raw || '', unit: '' };

  // Strip parentheses and ≥/≤ prefixes
  let cleaned = raw.replace(/[()]/g, '').replace(/[≥≤]\s*/g, '').trim();

  // Match number + unit pattern
  const match = cleaned.match(/^([\d.,]+)\s*(.*)$/);
  if (match) {
    return { value: match[1], unit: match[2].trim() };
  }

  return { value: cleaned, unit: '' };
}

export async function processDialuxReport(text: string, apiKey: string): Promise<DialuxRoom[]> {
  if (!text || text.trim().length === 0) {
    throw new Error('No text content extracted from the PDF.');
  }

  const ai = new GoogleGenAI({ apiKey });
  const response = await ai.models.generateContent({
    model: "gemini-3.1-flash-lite-preview",
    contents: [
      {
        role: "user",
        parts: [{
          text: `--- PAGE 3 ---
Room list
Anteroom
Ptotal 67.2 W
ARoom 7.21 m²
Lighting power density 9.32 W/m² = 3.65 W/m²/100 lx (Space)
10.06 W/m² = 3.94 W/m²/100 lx (Working plane)
--- PAGE 5 ---
Working plane (Anteroom)
Ē perpendicular 256 lx
(≥ 100 lx)

--- PAGE 7 ---
Room list
Conference Room
Ptotal 201.6 W
ARoom 32.50 m²
Lighting power density 6.20 W/m² = 1.55 W/m²/100 lx (Space)
6.85 W/m² = 1.71 W/m²/100 lx (Working plane)
--- PAGE 9 ---
Working plane (Conference Room)
Ē perpendicular 400 lx
(≥ 300 lx)` }]
      },
      {
        role: "model",
        parts: [{ text: `[{"roomName":"Anteroom","eWorkplane":"256 lx","eTarget":"100 lx","aRoom":"7.21 m²","lpdSpace":"9.32 W/m²","lpdWorkingPlane":"10.06 W/m²","pageRef":3},{"roomName":"Conference Room","eWorkplane":"400 lx","eTarget":"300 lx","aRoom":"32.50 m²","lpdSpace":"6.20 W/m²","lpdWorkingPlane":"6.85 W/m²","pageRef":7}]` }]
      },
      {
        role: "user",
        parts: [{ text: text }]
      }
    ],
    config: {
      systemInstruction: `You are an expert data extractor for DIALux PDF reports. Extract ONLY these fields per room into a flat JSON array:

- roomName: The room name
- eWorkplane: Ē perpendicular value from Working Plane tables (e.g. "256 lx")
- eTarget: The target lux value. Usually appears as "(≥ 100 lx)". Strip the parentheses and ≥ symbol, output ONLY the number and unit (e.g. "100 lx")
- aRoom: Room area (e.g. "7.21 m²")
- lpdSpace: Lighting Power Density for Space — ONLY the first W/m² value before the "=" sign (e.g. from "9.32 W/m² = 3.65 W/m²/100 lx" output "9.32 W/m²")
- lpdWorkingPlane: Lighting Power Density for Working Plane — ONLY the first W/m² value before the "=" sign
- pageRef: The PDF page number where the room's data first appears (from the "--- PAGE X ---" markers in the input)

Rules:
1. Output rooms in the order they appear in the "Room list" pages.
2. For eTarget, always strip parentheses and ≥/≤ symbols. Output just the number and "lx".
3. For LPD values, extract ONLY the first number before the "=" sign, with "W/m²" unit.
4. The input text has page markers like "--- PAGE 3 ---". Use these to set pageRef to the page where the room first appears in the Room list.
5. If a value is missing, use an empty string.`,
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            roomName: { type: Type.STRING },
            eWorkplane: { type: Type.STRING },
            eTarget: { type: Type.STRING },
            aRoom: { type: Type.STRING },
            lpdSpace: { type: Type.STRING },
            lpdWorkingPlane: { type: Type.STRING },
            pageRef: { type: Type.NUMBER },
          },
          required: ["roomName", "eWorkplane", "eTarget", "aRoom", "lpdSpace", "lpdWorkingPlane", "pageRef"]
        }
      }
    }
  });

  const responseText = response.text;
  if (!responseText) {
    throw new Error('Empty response from AI model.');
  }

  try {
    const parsed = JSON.parse(responseText);
    if (!Array.isArray(parsed)) {
      throw new Error('Response is not an array.');
    }
    return parsed as DialuxRoom[];
  } catch {
    throw new Error('Failed to parse AI response into structured data.');
  }
}
