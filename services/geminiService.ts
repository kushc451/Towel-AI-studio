
import { GoogleGenAI, GenerateContentResponse } from "@google/genai";
import { ModelType } from "../types";

export class GeminiService {
  private ai: GoogleGenAI;

  constructor() {
    // Fix: Always use process.env.API_KEY directly as specified in guidelines
    this.ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  }

  /**
   * Professionalize the subject towel based on the reference towel.
   */
  async professionalizeTowel(
    subjectBase64: string,
    referenceBase64: string,
    usePro: boolean = false
  ): Promise<string> {
    const model = usePro ? ModelType.PRO : ModelType.FLASH;
    
    // Fix: Create a fresh instance for each call and use process.env.API_KEY directly
    const aiInstance = new GoogleGenAI({ apiKey: process.env.API_KEY });

    const subjectPart = {
      inlineData: {
        mimeType: 'image/png',
        data: subjectBase64.split(',')[1] || subjectBase64,
      },
    };

    const referencePart = {
      inlineData: {
        mimeType: 'image/png',
        data: referenceBase64.split(',')[1] || referenceBase64,
      },
    };

    const prompt = `
      Task: Create a professional product image for an ecommerce store by merging a subject product into a reference scene.
      
      Input 1 (Subject): A towel that may have creases or wrinkles.
      Input 2 (Reference): A scene featuring a towel on a hanger with a specific background.
      
      Instructions:
      1. Replace the towel in the Reference image with the Subject towel.
      2. Keep the EXACT hanger and the EXACT background from the Reference image.
      3. Do NOT fold the Subject towel; display it hung straight or draped naturally as it appears in the Reference image, but without any complex origami-style folding.
      4. Remove all creases, wrinkles, and imperfections from the Subject towel to make it look smooth and high-end.
      5. CRITICAL: Maintain the exact color, material texture, and overall lighting of the original Subject towel. 
      6. Ensure the Subject towel is seamlessly integrated into the Reference background and hung perfectly on the Reference hanger.
      7. Output ONLY the resulting composite image.
    `;

    const response: GenerateContentResponse = await aiInstance.models.generateContent({
      model,
      contents: { 
        parts: [
          subjectPart, 
          referencePart, 
          { text: prompt }
        ] 
      },
      config: usePro ? {
        imageConfig: {
          aspectRatio: "1:1",
          imageSize: "1K"
        }
      } : {}
    });

    return this.extractImageUrlFromResponse(response);
  }

  /**
   * Refine or edit an existing image with a text prompt.
   */
  async editImage(
    imageBase64: string,
    textPrompt: string,
    usePro: boolean = false
  ): Promise<string> {
    const model = usePro ? ModelType.PRO : ModelType.FLASH;
    // Fix: Create a fresh instance for each call and use process.env.API_KEY directly
    const aiInstance = new GoogleGenAI({ apiKey: process.env.API_KEY });

    const imagePart = {
      inlineData: {
        mimeType: 'image/png',
        data: imageBase64.split(',')[1] || imageBase64,
      },
    };

    const prompt = `
      Edit the provided image based on this request: "${textPrompt}".
      Ensure the core product (the towel) remains consistent in color and quality unless the prompt specifically asks to change it.
    `;

    const response: GenerateContentResponse = await aiInstance.models.generateContent({
      model,
      contents: { 
        parts: [
          imagePart, 
          { text: prompt }
        ] 
      },
      config: usePro ? {
        imageConfig: {
          aspectRatio: "1:1",
          imageSize: "1K"
        }
      } : {}
    });

    return this.extractImageUrlFromResponse(response);
  }

  private extractImageUrlFromResponse(response: GenerateContentResponse): string {
    const candidates = response.candidates;
    if (!candidates || candidates.length === 0) {
      throw new Error("No candidates found in response");
    }

    const parts = candidates[0].content.parts;
    for (const part of parts) {
      if (part.inlineData) {
        return `data:image/png;base64,${part.inlineData.data}`;
      }
    }

    throw new Error("No image data found in the response parts.");
  }
}

export const geminiService = new GeminiService();
