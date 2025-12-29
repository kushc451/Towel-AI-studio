
import React, { useRef } from 'react';
import { ImageFile } from '../types';

interface ImageUploaderProps {
  label: string;
  images: ImageFile[];
  onUpload: (files: ImageFile[]) => void;
  onRemove: (id: string) => void;
  placeholder?: string;
  multiple?: boolean;
}

const ImageUploader: React.FC<ImageUploaderProps> = ({ 
  label, 
  images, 
  onUpload, 
  onRemove,
  placeholder = "Upload images",
  multiple = false
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    // Fix: Explicitly cast to File[] to avoid 'unknown' type inference errors in the map callback
    const files = Array.from(e.target.files || []) as File[];
    if (files.length > 0) {
      const newImages: ImageFile[] = await Promise.all(
        files.map(file => new Promise<ImageFile>((resolve) => {
          const reader = new FileReader();
          reader.onload = (event) => {
            const base64 = event.target?.result as string;
            resolve({
              id: Math.random().toString(36).substr(2, 9),
              url: URL.createObjectURL(file),
              base64: base64,
              name: file.name
            });
          };
          reader.readAsDataURL(file);
        }))
      );
      onUpload(newImages);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  return (
    <div className="flex flex-col space-y-2">
      <label className="text-sm font-semibold text-gray-700 uppercase tracking-wider">{label}</label>
      
      {/* Grid of existing images */}
      {images.length > 0 && (
        <div className="grid grid-cols-2 gap-2 mb-2">
          {images.map(img => (
            <div key={img.id} className="relative aspect-square rounded-lg overflow-hidden border border-slate-200 shadow-sm group">
              <img src={img.url} alt="Uploaded" className="w-full h-full object-cover" />
              <button 
                onClick={() => onRemove(img.id)}
                className="absolute top-1 right-1 p-1 bg-white/80 hover:bg-white text-red-600 rounded-full shadow-sm opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Upload button - hidden if not multiple and already has an image */}
      {(!images.length || multiple) && (
        <div 
          className="relative h-24 rounded-xl border-2 border-dashed border-gray-300 bg-gray-50 hover:border-indigo-400 hover:bg-gray-100 transition-all duration-200 overflow-hidden flex items-center justify-center cursor-pointer"
          onClick={() => fileInputRef.current?.click()}
        >
          <div className="flex flex-col items-center p-4 text-center">
            <div className="w-8 h-8 mb-1 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
            </div>
            <p className="text-xs font-medium text-gray-600">{placeholder}</p>
          </div>
          <input 
            type="file" 
            ref={fileInputRef}
            onChange={handleFileChange}
            accept="image/*"
            multiple={multiple}
            className="hidden"
          />
        </div>
      )}
    </div>
  );
};

export default ImageUploader;
