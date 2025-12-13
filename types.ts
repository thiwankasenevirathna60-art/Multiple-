export enum AppScreen {
  SPLASH = 'SPLASH',
  MAIN_MENU = 'MAIN_MENU',
  HOME = 'HOME', // This is the Reference Image Upload screen
  PROMPTS = 'PROMPTS',
  PROCESSING = 'PROCESSING',
  GALLERY = 'GALLERY',
  PREVIEW = 'PREVIEW',
  CREATE_PROMPTS = 'CREATE_PROMPTS',
  HOW_TO_USE = 'HOW_TO_USE'
}

export interface GeneratedImage {
  id: string;
  originalPrompt: string;
  imageData: string; // Base64
  timestamp: number;
}

export interface ImageReference {
  data: string; // Base64
  mimeType: string;
}

// Helper type for the Gemini response parsing
export interface GeminiImageResult {
  imageData: string;
  mimeType: string;
}