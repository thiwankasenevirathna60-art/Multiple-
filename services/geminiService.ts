import { GoogleGenAI } from "@google/genai";
import { GeminiImageResult } from "../types";

// Maps to "nano banana" as per instructions
const IMAGE_MODEL_NAME = 'gemini-2.5-flash-image';
// Model for text generation
const TEXT_MODEL_NAME = 'gemini-2.5-flash';

/**
 * Generates an image based on a reference image and a text prompt.
 * Uses the Gemini 2.5 Flash Image model.
 */
export const generateImageEdit = async (
  referenceImageBase64: string,
  referenceMimeType: string,
  prompt: string
): Promise<GeminiImageResult> => {
  try {
    // Initialize client here to ensure we use the latest API Key if it changed
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

    // Strip the data:image/...;base64, prefix if present for the API call
    const cleanBase64 = referenceImageBase64.replace(/^data:image\/(png|jpeg|jpg|webp);base64,/, '');

    const response = await ai.models.generateContent({
      model: IMAGE_MODEL_NAME,
      contents: {
        parts: [
          {
            inlineData: {
              data: cleanBase64,
              mimeType: referenceMimeType,
            },
          },
          {
            text: prompt,
          },
        ],
      },
    });

    // Extract the image from the response
    // The response may contain multiple parts, we look for inlineData
    if (response.candidates && response.candidates[0].content && response.candidates[0].content.parts) {
      for (const part of response.candidates[0].content.parts) {
        if (part.inlineData && part.inlineData.data) {
          return {
            imageData: part.inlineData.data,
            mimeType: part.inlineData.mimeType || 'image/png',
          };
        }
      }
    }

    throw new Error("No image data found in response");
  } catch (error) {
    console.error("Gemini API Error:", error);
    throw error;
  }
};

/**
 * Generates a list of image prompts based on a user description.
 */
export const generatePromptsList = async (description: string): Promise<string[]> => {
  try {
    // Initialize client here to ensure we use the latest API Key if it changed
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

    const prompt = `You are a creative assistant for an AI image generator. 
    The user wants a list of image prompts based on this description: "${description}".
    Generate a list of specific, detailed, and creative image prompts.
    Return ONLY the prompts, separated by new lines. Do not include numbering (like 1. or -) at the start of lines.`;

    const response = await ai.models.generateContent({
      model: TEXT_MODEL_NAME,
      contents: prompt,
    });

    const text = response.text || "";
    // Split by new line and filter empty strings
    return text.split('\n').map(line => line.trim()).filter(line => line.length > 0);
  } catch (error) {
    console.error("Gemini Text API Error:", error);
    throw error;
  }
};