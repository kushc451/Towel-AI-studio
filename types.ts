
export interface ImageFile {
  id: string;
  url: string;
  base64: string;
  name: string;
}

export interface AppState {
  subjectTowels: ImageFile[];
  referenceTowel: ImageFile | null;
  resultImages: ImageFile[];
  selectedResultId: string | null;
  isProcessing: boolean;
  error: string | null;
  mode: 'professionalize' | 'edit';
  lastPrompt: string;
}

export enum ModelType {
  FLASH = 'gemini-2.5-flash-image',
  PRO = 'gemini-3-pro-image-preview'
}
