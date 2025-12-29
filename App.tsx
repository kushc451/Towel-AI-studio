
import React, { useState, useEffect, useMemo } from 'react';
import ImageUploader from './components/ImageUploader';
import { geminiService } from './services/geminiService';
import { AppState, ImageFile } from './types';

const App: React.FC = () => {
  const [state, setState] = useState<AppState>({
    subjectTowels: [],
    referenceTowel: null,
    resultImages: [],
    selectedResultId: null,
    isProcessing: false,
    error: null,
    mode: 'professionalize',
    lastPrompt: '',
  });

  const [useProModel, setUseProModel] = useState(false);
  const [hasProAccess, setHasProAccess] = useState(false);
  const [editingPrompt, setEditingPrompt] = useState('');
  const [processingProgress, setProcessingProgress] = useState({ current: 0, total: 0 });

  const activeImage = useMemo(() => {
    return state.resultImages.find(img => img.id === state.selectedResultId) || null;
  }, [state.resultImages, state.selectedResultId]);

  useEffect(() => {
    const checkAccess = async () => {
      if (window.aistudio?.hasSelectedApiKey) {
        const hasKey = await window.aistudio.hasSelectedApiKey();
        setHasProAccess(hasKey);
      }
    };
    checkAccess();
  }, []);

  const handleProAccessRequest = async () => {
    if (window.aistudio?.openSelectKey) {
      await window.aistudio.openSelectKey();
      setHasProAccess(true);
      setUseProModel(true);
    }
  };

  const handleProfessionalizeBatch = async () => {
    if (state.subjectTowels.length === 0 || !state.referenceTowel) return;

    setState(prev => ({ ...prev, isProcessing: true, error: null, mode: 'professionalize' }));
    setProcessingProgress({ current: 0, total: state.subjectTowels.length });
    
    const newResults: ImageFile[] = [];

    try {
      for (let i = 0; i < state.subjectTowels.length; i++) {
        setProcessingProgress(p => ({ ...p, current: i + 1 }));
        const subject = state.subjectTowels[i];
        
        const resultBase64 = await geminiService.professionalizeTowel(
          subject.base64,
          state.referenceTowel.base64,
          useProModel
        );
        
        const newImage: ImageFile = {
          id: Math.random().toString(36).substr(2, 9),
          url: resultBase64,
          base64: resultBase64,
          name: `Pro-${subject.name || 'towel'}-${new Date().getTime()}.png`
        };
        newResults.unshift(newImage);
      }

      setState(prev => ({ 
        ...prev, 
        resultImages: [...newResults, ...prev.resultImages],
        selectedResultId: newResults[0].id,
        isProcessing: false,
      }));
    } catch (err: any) {
      console.error(err);
      let errorMsg = "An error occurred while processing.";
      if (err.message?.includes("Requested entity was not found")) {
        setHasProAccess(false);
        errorMsg = "API Key error. Please re-select your professional API key.";
      }
      setState(prev => ({ ...prev, error: errorMsg, isProcessing: false }));
    }
  };

  const handleRefine = async () => {
    if (!activeImage || !editingPrompt) return;
    setState(prev => ({ ...prev, isProcessing: true, error: null, mode: 'edit' }));
    
    try {
      const resultBase64 = await geminiService.editImage(
        activeImage.base64,
        editingPrompt,
        useProModel
      );

      const newImage: ImageFile = {
        id: Math.random().toString(36).substr(2, 9),
        url: resultBase64,
        base64: resultBase64,
        name: `Refined-${new Date().getTime()}.png`
      };

      setState(prev => ({ 
        ...prev, 
        resultImages: [newImage, ...prev.resultImages],
        selectedResultId: newImage.id,
        isProcessing: false,
        lastPrompt: editingPrompt
      }));
      setEditingPrompt('');
    } catch (err: any) {
      console.error(err);
      setState(prev => ({ ...prev, error: "Failed to apply refinement.", isProcessing: false }));
    }
  };

  const downloadAll = () => {
    state.resultImages.forEach((img, index) => {
      setTimeout(() => {
        const link = document.createElement('a');
        link.href = img.url;
        link.download = img.name;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      }, index * 300);
    });
  };

  const removeResult = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setState(prev => {
      const filtered = prev.resultImages.filter(img => img.id !== id);
      return {
        ...prev,
        resultImages: filtered,
        selectedResultId: prev.selectedResultId === id ? (filtered[0]?.id || null) : prev.selectedResultId
      };
    });
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 pb-20">
      <header className="bg-white border-b border-slate-200 sticky top-0 z-30 px-6 py-4 flex items-center justify-between shadow-sm">
        <div className="flex items-center space-x-3">
          <div className="bg-indigo-600 p-2 rounded-lg text-white">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </div>
          <h1 className="text-xl font-bold tracking-tight">TowelStudio <span className="text-indigo-600">Pro</span></h1>
        </div>

        <div className="flex items-center space-x-4">
          <div className="flex items-center bg-slate-100 rounded-full px-4 py-1.5 space-x-2">
            <span className="text-xs font-semibold text-slate-600 uppercase">Quality:</span>
            <button 
              onClick={() => setUseProModel(false)}
              className={`text-xs px-2 py-0.5 rounded-full transition-all ${!useProModel ? 'bg-white shadow-sm text-indigo-600 font-bold' : 'text-slate-400'}`}
            >
              Standard
            </button>
            <button 
              onClick={() => hasProAccess ? setUseProModel(true) : handleProAccessRequest()}
              className={`text-xs px-2 py-0.5 rounded-full transition-all ${useProModel ? 'bg-white shadow-sm text-indigo-600 font-bold' : 'text-slate-400'}`}
            >
              High-Res (Pro)
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 pt-10">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          <div className="lg:col-span-4 space-y-6">
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
              <h2 className="text-lg font-bold mb-4 flex items-center">
                <span className="w-6 h-6 rounded-full bg-slate-100 flex items-center justify-center text-xs mr-2 text-slate-600">1</span>
                Input Configuration
              </h2>
              
              <div className="space-y-6">
                <ImageUploader 
                  label="Subject Towels" 
                  images={state.subjectTowels} 
                  onUpload={(files) => setState(prev => ({ ...prev, subjectTowels: [...prev.subjectTowels, ...files] }))}
                  onRemove={(id) => setState(prev => ({ ...prev, subjectTowels: prev.subjectTowels.filter(t => t.id !== id) }))}
                  placeholder="Upload subject towels"
                  multiple={true}
                />

                <ImageUploader 
                  label="Reference Scene" 
                  images={state.referenceTowel ? [state.referenceTowel] : []} 
                  onUpload={(files) => setState(prev => ({ ...prev, referenceTowel: files[0] }))}
                  onRemove={() => setState(prev => ({ ...prev, referenceTowel: null }))}
                  placeholder="The scene with hanger"
                  multiple={false}
                />
              </div>

              <button
                disabled={state.subjectTowels.length === 0 || !state.referenceTowel || state.isProcessing}
                onClick={handleProfessionalizeBatch}
                className={`w-full mt-6 py-4 rounded-xl font-bold flex items-center justify-center transition-all shadow-lg
                  ${state.subjectTowels.length === 0 || !state.referenceTowel || state.isProcessing 
                    ? 'bg-slate-100 text-slate-400 cursor-not-allowed shadow-none' 
                    : 'bg-indigo-600 text-white hover:bg-indigo-700 active:scale-95 shadow-indigo-200'}`}
              >
                {state.isProcessing && state.mode === 'professionalize' ? (
                  <span className="flex flex-col items-center">
                    <span className="flex items-center">
                      <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Processing {processingProgress.current} / {processingProgress.total}
                    </span>
                  </span>
                ) : `Generate ${state.subjectTowels.length > 0 ? state.subjectTowels.length : ''} Pro Images`}
              </button>
            </div>

            {activeImage && (
              <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 animate-in fade-in slide-in-from-left-4 duration-300">
                <h2 className="text-lg font-bold mb-4 flex items-center">
                  <span className="w-6 h-6 rounded-full bg-slate-100 flex items-center justify-center text-xs mr-2 text-slate-600">2</span>
                  Refine Active
                </h2>
                <div className="space-y-4">
                  <textarea 
                    value={editingPrompt}
                    onChange={(e) => setEditingPrompt(e.target.value)}
                    placeholder="e.g., 'Make it look fluffier', 'Adjust shadows'..."
                    className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 outline-none resize-none"
                    rows={2}
                  />
                  <button
                    disabled={!editingPrompt || state.isProcessing}
                    onClick={handleRefine}
                    className={`w-full py-3 rounded-xl font-semibold text-sm transition-all
                      ${!editingPrompt || state.isProcessing 
                        ? 'bg-slate-100 text-slate-400 cursor-not-allowed' 
                        : 'bg-slate-800 text-white hover:bg-slate-900 active:scale-95'}`}
                  >
                    {state.isProcessing && state.mode === 'edit' ? "Applying..." : "Apply Prompt"}
                  </button>
                </div>
              </div>
            )}
          </div>

          <div className="lg:col-span-8 space-y-6">
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 min-h-[600px] flex flex-col">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-slate-800">Visual Studio</h2>
                {state.resultImages.length > 0 && (
                  <button 
                    onClick={downloadAll}
                    className="px-4 py-2 bg-indigo-50 text-indigo-700 rounded-lg text-sm font-bold hover:bg-indigo-100 transition-colors flex items-center"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                    </svg>
                    Batch Download ({state.resultImages.length})
                  </button>
                )}
              </div>

              <div className="flex-1 relative bg-slate-100 rounded-xl overflow-hidden flex items-center justify-center border border-slate-200">
                {activeImage ? (
                  <div className="relative w-full h-full flex items-center justify-center p-8">
                    <img 
                      src={activeImage.url} 
                      alt="Active Result" 
                      className="max-w-full max-h-full object-contain shadow-2xl rounded-lg animate-in zoom-in-95 duration-500"
                    />
                    {state.isProcessing && (
                      <div className="absolute inset-0 bg-white/60 backdrop-blur-sm flex flex-col items-center justify-center">
                        <div className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
                        <p className="mt-4 text-indigo-900 font-bold uppercase tracking-widest text-[10px]">AI Rendering...</p>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center text-center p-12 text-slate-400">
                    <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center mb-4 shadow-sm">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                    </div>
                    <p className="font-bold">No images generated</p>
                    <p className="text-sm mt-1">Upload subjects and reference to start.</p>
                  </div>
                )}
              </div>

              {state.resultImages.length > 0 && (
                <div className="mt-6">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest">Gallery</h3>
                    <span className="text-xs text-slate-400 font-medium">{state.resultImages.length} items</span>
                  </div>
                  <div className="flex space-x-3 overflow-x-auto pb-4">
                    {state.resultImages.map((img) => (
                      <div 
                        key={img.id}
                        onClick={() => setState(prev => ({ ...prev, selectedResultId: img.id }))}
                        className={`relative group flex-shrink-0 w-20 h-20 rounded-lg overflow-hidden border-2 cursor-pointer transition-all
                          ${state.selectedResultId === img.id ? 'border-indigo-600 ring-2 ring-indigo-50 shadow-md scale-105' : 'border-transparent hover:border-indigo-300'}`}
                      >
                        <img src={img.url} className="w-full h-full object-cover" alt="History" />
                        <button 
                          onClick={(e) => removeResult(img.id, e)}
                          className="absolute top-1 right-1 p-0.5 bg-black/60 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-600"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                          </svg>
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {state.error && (
                <div className="mt-4 p-4 bg-red-50 border border-red-100 rounded-xl flex items-start space-x-3 text-red-700">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mt-0.5" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                  <p className="text-xs font-medium">{state.error}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default App;
