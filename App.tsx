import React, { useState, useEffect, useRef } from 'react';
import { Sparkles, Upload, Image as ImageIcon, Download, ArrowLeft, Wand2, Loader2, X, MessageSquare, HelpCircle, PenTool, Copy, Check, ChevronRight } from 'lucide-react';
import { AppScreen, ImageReference, GeneratedImage } from './types';
import { generateImageEdit, generatePromptsList } from './services/geminiService';
import { Button } from './components/Button';

// Utility to convert blob/file to base64
const fileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = (error) => reject(error);
  });
};

// Recreated Logo based on "MultiPrompt Gen" design (Stacked layers: Pink, Blue, Purple)
const APP_LOGO_SRC = `data:image/svg+xml,%3Csvg width='512' height='512' viewBox='0 0 512 512' fill='none' xmlns='http://www.w3.org/2000/svg'%3E%3Cdefs%3E%3ClinearGradient id='grad1' x1='0%25' y1='0%25' x2='100%25' y2='100%25'%3E%3Cstop offset='0%25' stop-color='%23FF4D9E' /%3E%3Cstop offset='100%25' stop-color='%23FF0055' /%3E%3C/linearGradient%3E%3ClinearGradient id='grad2' x1='0%25' y1='0%25' x2='100%25' y2='100%25'%3E%3Cstop offset='0%25' stop-color='%2300E0FF' /%3E%3Cstop offset='100%25' stop-color='%230066FF' /%3E%3C/linearGradient%3E%3ClinearGradient id='grad3' x1='0%25' y1='0%25' x2='100%25' y2='100%25'%3E%3Cstop offset='0%25' stop-color='%239D50FF' /%3E%3Cstop offset='100%25' stop-color='%236200EA' /%3E%3C/linearGradient%3E%3Cfilter id='glow'%3E%3CfeGaussianBlur stdDeviation='8' result='coloredBlur'/%3E%3CfeMerge%3E%3CfeMergeNode in='coloredBlur'/%3E%3CfeMergeNode in='SourceGraphic'/%3E%3C/feMerge%3E%3C/filter%3E%3C/defs%3E%3C!-- Bottom Layer (Purple) --%3E%3Cpath d='M256 360 L420 280 L256 200 L92 280 Z' fill='url(%23grad3)' opacity='0.8' transform='translate(0, 40)' /%3E%3C!-- Middle Layer (Blue) --%3E%3Cpath d='M256 360 L420 280 L256 200 L92 280 Z' fill='url(%23grad2)' opacity='0.9' transform='translate(0, 0)' /%3E%3C!-- Top Layer (Pink) --%3E%3Cpath d='M256 360 L420 280 L256 200 L92 280 Z' fill='url(%23grad1)' transform='translate(0, -40)' filter='url(%23glow)' /%3E%3C/svg%3E`;

const MAX_PROMPTS = 50;

const App: React.FC = () => {
  const [screen, setScreen] = useState<AppScreen>(AppScreen.SPLASH);
  const [referenceImage, setReferenceImage] = useState<ImageReference | null>(null);
  const [promptsText, setPromptsText] = useState<string>("");
  const [generatedImages, setGeneratedImages] = useState<GeneratedImage[]>([]);
  const [selectedImage, setSelectedImage] = useState<GeneratedImage | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [progress, setProgress] = useState<{current: number, total: number}>({ current: 0, total: 0 });
  
  // Prompt Creation State
  const [promptDescription, setPromptDescription] = useState("");
  const [generatedPromptList, setGeneratedPromptList] = useState<string[]>([]);
  const [isCreatingPrompts, setIsCreatingPrompts] = useState(false);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  const [isAllCopied, setIsAllCopied] = useState(false);

  // Splash Screen Logic
  useEffect(() => {
    if (screen === AppScreen.SPLASH) {
      const timer = setTimeout(() => {
        setScreen(AppScreen.MAIN_MENU);
      }, 4000); 
      return () => clearTimeout(timer);
    }
  }, [screen]);

  // Handlers
  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      try {
        const base64 = await fileToBase64(file);
        setReferenceImage({
          data: base64,
          mimeType: file.type,
        });
      } catch (e) {
        console.error("Error reading file", e);
        alert("Failed to read image file.");
      }
    }
  };

  const handleGenerate = async () => {
    if (!referenceImage || !promptsText.trim()) return;

    const lines = promptsText
      .split('\n')
      .map(line => line.trim())
      .filter(line => line.length > 0);

    if (lines.length === 0) return;
    if (lines.length > MAX_PROMPTS) {
      alert(`Maximum ${MAX_PROMPTS} prompts allowed.`);
      return;
    }

    setScreen(AppScreen.GALLERY);
    setIsGenerating(true);
    setGeneratedImages([]); // Clear previous results
    setProgress({ current: 0, total: lines.length });

    // Process one by one
    for (let i = 0; i < lines.length; i++) {
      const prompt = lines[i];
      try {
        const result = await generateImageEdit(referenceImage.data, referenceImage.mimeType, prompt);
        
        const generatedImage: GeneratedImage = {
          id: Date.now().toString() + i,
          originalPrompt: prompt,
          imageData: `data:${result.mimeType};base64,${result.imageData}`,
          timestamp: Date.now()
        };

        // Append image immediately to state
        setGeneratedImages(prev => [...prev, generatedImage]);
      } catch (error) {
        console.error(`Failed to generate for prompt: ${prompt}`, error);
      }
      setProgress(prev => ({ ...prev, current: i + 1 }));
    }

    setIsGenerating(false);
  };

  const handleCreatePrompts = async () => {
    if (!promptDescription.trim()) return;
    
    setIsCreatingPrompts(true);
    try {
      const prompts = await generatePromptsList(promptDescription);
      setGeneratedPromptList(prompts);
    } catch (error) {
      alert("Failed to create prompts. Please try again.");
    } finally {
      setIsCreatingPrompts(false);
    }
  };

  const copyToClipboard = (text: string, index: number) => {
    navigator.clipboard.writeText(text);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  const copyAllPrompts = () => {
    if (generatedPromptList.length === 0) return;
    const allText = generatedPromptList.join('\n');
    navigator.clipboard.writeText(allText);
    setIsAllCopied(true);
    setTimeout(() => setIsAllCopied(false), 2000);
  };

  const handleDownload = (image: GeneratedImage) => {
    const link = document.createElement('a');
    link.href = image.imageData;
    link.download = `multiprompt-gen-${image.id}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // --- RENDER SCREENS ---

  const renderSplash = () => (
    <div className="flex flex-col items-center justify-center min-h-screen bg-[conic-gradient(at_top_right,_var(--tw-gradient-stops))] from-slate-900 via-purple-900 to-slate-900 animate-fade-in relative overflow-hidden">
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden z-0">
          <div className="absolute top-1/4 left-1/4 w-64 h-64 bg-purple-600/30 rounded-full blur-[100px] animate-pulse"></div>
          <div className="absolute bottom-1/4 right-1/4 w-64 h-64 bg-indigo-600/30 rounded-full blur-[100px] animate-pulse delay-1000"></div>
      </div>

      <div className="relative z-10 flex flex-col items-center p-8 text-center max-w-md">
        <div className="mb-10 relative group">
            <div className="absolute inset-0 bg-white/20 rounded-full blur-3xl opacity-40 group-hover:opacity-60 transition-opacity duration-500"></div>
            <img 
              src={APP_LOGO_SRC} 
              alt="MultiPrompt Gen Logo" 
              className="w-48 h-48 object-contain drop-shadow-2xl animate-float relative z-10"
            />
        </div>
        
        <h1 className="text-4xl md:text-5xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-pink-300 via-white to-purple-300 tracking-tight drop-shadow-lg animate-fade-in-up mb-4">
          MultiPrompt Gen
        </h1>
        
        <p className="text-gray-300 text-lg font-light leading-relaxed animate-fade-in-up delay-150 px-4">
          Generate images from multiple perspectives simultaneously.
        </p>
      </div>
    </div>
  );

  const renderMainMenu = () => (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-gray-900 relative">
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden z-0 pointer-events-none">
          <div className="absolute top-0 right-0 w-96 h-96 bg-purple-900/20 rounded-full blur-[120px]"></div>
          <div className="absolute bottom-0 left-0 w-96 h-96 bg-blue-900/20 rounded-full blur-[120px]"></div>
      </div>

      <div className="w-full max-w-md space-y-6 relative z-10">
        <div className="text-center space-y-4 mb-8">
           <img 
              src={APP_LOGO_SRC} 
              alt="Logo" 
              className="w-24 h-24 object-contain mx-auto drop-shadow-lg mb-4"
            />
           <h1 className="text-4xl font-bold text-white tracking-tight">Welcome Back</h1>
           <p className="text-gray-400">Choose an option to begin.</p>
        </div>

        <div className="space-y-3">
          <Button 
            fullWidth 
            onClick={() => setScreen(AppScreen.HOME)}
            className="!py-5 !text-lg group"
          >
            <div className="bg-white/20 p-2 rounded-full mr-2 group-hover:bg-white/30 transition-colors">
              <Sparkles className="w-5 h-5" />
            </div>
            Generate Images
          </Button>

          <Button 
            fullWidth 
            variant="secondary"
            onClick={() => setScreen(AppScreen.CREATE_PROMPTS)}
            className="!py-5 !text-lg !justify-start pl-8 group hover:border-purple-500/50"
          >
            <div className="bg-purple-500/20 p-2 rounded-full mr-4 group-hover:bg-purple-500/40 transition-colors text-purple-300">
               <MessageSquare className="w-5 h-5" />
            </div>
            Generate Prompts
          </Button>

          <Button 
            fullWidth
            variant="secondary"
            onClick={() => setScreen(AppScreen.HOW_TO_USE)}
            className="!py-5 !text-lg !justify-start pl-8 group hover:border-blue-500/50"
          >
             <div className="bg-blue-500/20 p-2 rounded-full mr-4 group-hover:bg-blue-500/40 transition-colors text-blue-300">
               <HelpCircle className="w-5 h-5" />
            </div>
            How to Use
          </Button>
        </div>
      </div>
    </div>
  );

  const renderCreatePrompts = () => (
    <div className="min-h-screen flex flex-col bg-gray-900 relative">
      {/* Header */}
      <div className="p-6 border-b border-white/10 bg-gray-900/90 backdrop-blur sticky top-0 z-50">
        <div className="flex items-center gap-4 mb-2">
           <button 
            onClick={() => setScreen(AppScreen.MAIN_MENU)} 
            className="p-2 -ml-2 text-gray-400 hover:text-white"
          >
            <ArrowLeft />
          </button>
          <h2 className="text-xl font-bold text-white">Create your prompts</h2>
        </div>
        <div className="bg-purple-900/30 border border-purple-500/20 rounded-lg p-3">
          <p className="text-xs text-purple-200 leading-relaxed font-medium">
            <span className="opacity-70">Example:</span> write 20 prompts with 20 various positions and various backgrounds. A one year old baby girl photoshoot with full hd 4k
          </p>
        </div>
      </div>

      {/* Main Content Area - Prompt List */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {generatedPromptList.length > 0 ? (
          <>
            <div className="flex justify-end mb-2">
              <button 
                onClick={copyAllPrompts}
                className="flex items-center gap-2 text-xs font-medium bg-purple-500/10 text-purple-300 hover:bg-purple-500/20 px-3 py-1.5 rounded-lg border border-purple-500/20 transition-all"
              >
                 {isAllCopied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                 {isAllCopied ? "Copied All" : "Copy All"}
              </button>
            </div>
            {generatedPromptList.map((prompt, idx) => (
              <div key={idx} className="bg-gray-800/50 rounded-xl p-4 border border-white/5 flex gap-3 group hover:border-purple-500/30 transition-all">
                <div className="bg-gray-700/50 h-6 w-6 rounded-full flex items-center justify-center text-xs text-gray-400 flex-shrink-0 mt-0.5">
                  {idx + 1}
                </div>
                <p className="text-gray-200 text-sm flex-1 leading-relaxed">{prompt}</p>
                <button 
                  onClick={() => copyToClipboard(prompt, idx)}
                  className="text-gray-500 hover:text-purple-400 transition-colors self-start"
                >
                  {copiedIndex === idx ? <Check className="w-4 h-4 text-green-400"/> : <Copy className="w-4 h-4"/>}
                </button>
              </div>
            ))}
          </>
        ) : (
          <div className="h-full flex flex-col items-center justify-center text-gray-600 space-y-4 opacity-50 p-8 text-center">
            <PenTool className="w-16 h-16" />
            <p>Enter a description below to let AI write your prompts.</p>
          </div>
        )}
      </div>

      {/* Bottom Input Area */}
      <div className="p-4 bg-gray-900 border-t border-white/10 space-y-4">
        <div className="flex gap-2">
          <div className="flex-1 bg-gray-800 rounded-xl border border-white/10 focus-within:border-purple-500/50 transition-colors">
            <input 
              type="text"
              value={promptDescription}
              onChange={(e) => setPromptDescription(e.target.value)}
              placeholder="Describe what prompts you want..."
              className="w-full h-full bg-transparent border-none outline-none text-white px-4 py-3 placeholder-gray-500"
              onKeyDown={(e) => e.key === 'Enter' && handleCreatePrompts()}
            />
          </div>
          <Button 
            onClick={handleCreatePrompts} 
            disabled={!promptDescription.trim() || isCreatingPrompts}
            className="!px-6 !py-2"
          >
            {isCreatingPrompts ? <Loader2 className="w-5 h-5 animate-spin" /> : "Create"}
          </Button>
        </div>

        {generatedPromptList.length > 0 && (
          <Button fullWidth onClick={() => setScreen(AppScreen.HOME)}>
             Create Image
             <ChevronRight className="w-5 h-5" />
          </Button>
        )}
      </div>
    </div>
  );

  const renderHowToUse = () => (
     <div className="min-h-screen flex flex-col bg-gray-900">
      <div className="p-6 border-b border-white/10 bg-gray-900 sticky top-0 z-50">
         <div className="flex items-center gap-4 mb-2">
           <button 
            onClick={() => setScreen(AppScreen.MAIN_MENU)} 
            className="p-2 -ml-2 text-gray-400 hover:text-white"
          >
            <ArrowLeft />
          </button>
          <h2 className="text-2xl font-bold text-white">How to use</h2>
        </div>
      </div>

      <div className="flex-1 p-6 overflow-y-auto space-y-8">
        
        {/* Step 1 */}
        <div className="space-y-3">
          <div className="flex items-center gap-3 text-purple-400">
            <div className="bg-purple-500/20 p-2 rounded-lg"><PenTool className="w-5 h-5"/></div>
            <h3 className="text-lg font-bold uppercase tracking-wide">Creating Prompt</h3>
          </div>
          <div className="bg-gray-800/50 p-5 rounded-2xl border border-white/5 space-y-4">
            <p className="text-gray-300 leading-relaxed">
              First you have to create a list of prompts that you wish to edit reference image.
            </p>
            <div className="bg-black/30 p-4 rounded-xl border border-purple-500/20">
              <p className="text-sm text-gray-400 mb-2">As an example:</p>
              <p className="text-white font-bold text-sm leading-relaxed">
                "write 20 prompts with 20 various positions and various backgrounds. A one year old baby girl photoshoot with full hd 4k"
              </p>
            </div>
            <p className="text-gray-300 leading-relaxed">
              Then touch on the create button. The app will create you matching prompts according to your description. Next copy the prompts to your clip board.
            </p>
          </div>
        </div>

        {/* Step 2 */}
        <div className="space-y-3">
          <div className="flex items-center gap-3 text-blue-400">
            <div className="bg-blue-500/20 p-2 rounded-lg"><Sparkles className="w-5 h-5"/></div>
            <h3 className="text-lg font-bold uppercase tracking-wide">Generate Images</h3>
          </div>
          <div className="bg-gray-800/50 p-5 rounded-2xl border border-white/5 space-y-4">
             <p className="text-gray-300 leading-relaxed">
               After creating prompt copy prompts and click on the create images button. On next screen upload the reference image from your internal storage that wants to create according to your prompts.
             </p>
             <p className="text-gray-300 leading-relaxed">
               Then click on add prompts button. On next screen paste your prompts that you created and click generate images. Then app will start to generate images according to your prompts. After creating you can download your images by clicking on generated images.
             </p>
          </div>
        </div>
      </div>
    </div>
  );

  const renderHome = () => (
    <div className="min-h-screen flex flex-col p-6 bg-gray-900 relative">
      <div className="flex-1 flex flex-col items-center justify-center w-full max-w-md mx-auto space-y-8">
        
        {/* Added Back Button for Home Screen */}
        <div className="absolute top-6 left-0">
           <button 
              onClick={() => setScreen(AppScreen.MAIN_MENU)} 
              className="p-2 text-gray-400 hover:text-white bg-gray-800/50 rounded-full backdrop-blur-sm"
            >
              <ArrowLeft />
            </button>
        </div>

        <div className="text-center space-y-2">
          <h2 className="text-3xl font-bold text-white">MultiPrompt Gen</h2>
          <p className="text-gray-400">Upload a photo to start your journey</p>
        </div>

        <div className="w-full aspect-[4/5] bg-gray-800/50 rounded-3xl border-2 border-dashed border-gray-600 flex flex-col items-center justify-center relative overflow-hidden group hover:border-purple-500 transition-colors">
          {referenceImage ? (
            <img 
              src={referenceImage.data} 
              alt="Reference" 
              className="absolute inset-0 w-full h-full object-cover"
            />
          ) : (
            <div className="flex flex-col items-center text-gray-500 group-hover:text-purple-400 transition-colors">
              <Upload className="w-12 h-12 mb-4" />
              <p>No image selected</p>
            </div>
          )}
          
          <input 
            type="file" 
            accept="image/*" 
            onChange={handleImageUpload} 
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-20"
          />
          
          {referenceImage && (
             <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity pointer-events-none z-10">
               <p className="text-white font-medium">Tap to change</p>
             </div>
          )}
        </div>

        {referenceImage ? (
          <Button 
            fullWidth 
            onClick={() => setScreen(AppScreen.PROMPTS)}
          >
            Insert Prompts
            <ArrowLeft className="w-5 h-5 rotate-180" />
          </Button>
        ) : (
           <Button fullWidth className="opacity-100 relative overflow-hidden">
             <span className="relative z-10">Upload Reference Image</span>
             <input 
              type="file" 
              accept="image/*" 
              onChange={handleImageUpload} 
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
            />
           </Button>
        )}
      </div>
    </div>
  );

  const renderPrompts = () => (
    <div className="min-h-screen flex flex-col bg-gray-900">
      <div className="p-6 pb-2 border-b border-white/10 flex items-center gap-4 bg-gray-900/90 backdrop-blur sticky top-0 z-50">
        <button 
          onClick={() => setScreen(AppScreen.HOME)} 
          className="p-2 -ml-2 text-gray-400 hover:text-white"
        >
          <ArrowLeft />
        </button>
        <div>
          <h2 className="text-xl font-bold text-white leading-tight">Insert Prompts</h2>
          <p className="text-xs text-purple-400 font-medium">(Maximum {MAX_PROMPTS} Prompts)</p>
        </div>
      </div>

      <div className="flex-1 p-6 flex flex-col gap-6">
        <div className="flex-1 bg-gray-800/50 rounded-2xl p-4 border border-white/10 focus-within:border-purple-500/50 transition-colors shadow-inner">
          <textarea
            value={promptsText}
            onChange={(e) => setPromptsText(e.target.value)}
            placeholder="Separate prompts by lines..."
            className="w-full h-full bg-transparent border-none outline-none text-white placeholder-gray-500 resize-none text-lg leading-relaxed"
            autoFocus
          />
        </div>

        <div className="space-y-4">
          <div className="flex items-center justify-between text-sm text-gray-400 px-2">
            <span>{promptsText.split('\n').filter(l => l.trim()).length} / {MAX_PROMPTS} prompts</span>
          </div>
          <Button 
            fullWidth 
            onClick={handleGenerate}
            disabled={!promptsText.trim()}
          >
            <Wand2 className="w-5 h-5" />
            Generate Images
          </Button>
        </div>
      </div>
    </div>
  );

  const renderGallery = () => (
    <div className="min-h-screen flex flex-col bg-gray-900">
       <div className="p-6 border-b border-white/10 flex items-center justify-between bg-gray-900/90 backdrop-blur sticky top-0 z-50">
        <div>
            <h2 className="text-xl font-bold text-white">Gallery</h2>
            {isGenerating && (
                <p className="text-xs text-purple-400 font-medium animate-pulse">
                    Generating {Math.min(progress.current + 1, progress.total)} of {progress.total}...
                </p>
            )}
        </div>
        <Button 
          variant="secondary" 
          onClick={() => setScreen(AppScreen.HOME)} 
          className="!py-2 !px-4 !text-sm"
          disabled={isGenerating}
        >
          {isGenerating ? <Loader2 className="w-4 h-4 animate-spin"/> : "New"}
        </Button>
      </div>

      <div className="p-4 grid grid-cols-2 gap-4 auto-rows-fr">
        {generatedImages.map((img) => (
          <div 
            key={img.id}
            onClick={() => {
              setSelectedImage(img);
              setScreen(AppScreen.PREVIEW);
            }}
            className="aspect-square rounded-2xl overflow-hidden border border-white/10 shadow-lg relative group cursor-pointer bg-gray-800"
          >
            <img 
              src={img.imageData} 
              alt="Generated" 
              className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-3">
              <p className="text-xs text-white line-clamp-2">{img.originalPrompt}</p>
            </div>
          </div>
        ))}

        {isGenerating && (
             <div className="aspect-square rounded-2xl border-2 border-dashed border-white/10 bg-gray-800/30 flex flex-col items-center justify-center animate-pulse">
                <Loader2 className="w-8 h-8 text-purple-500 animate-spin mb-2" />
                <p className="text-xs text-gray-500">Creating...</p>
             </div>
        )}
      </div>
      
      {generatedImages.length === 0 && !isGenerating && (
         <div className="flex-1 flex flex-col items-center justify-center text-gray-500">
           <ImageIcon className="w-12 h-12 mb-2 opacity-50"/>
           <p>No images generated</p>
         </div>
      )}
    </div>
  );

  const renderPreview = () => {
    if (!selectedImage) return null;

    return (
      <div className="min-h-screen bg-black flex flex-col relative animate-fade-in">
        <div className="absolute top-0 left-0 right-0 p-6 flex justify-between items-start z-20 bg-gradient-to-b from-black/80 to-transparent">
          <button 
            onClick={() => setScreen(AppScreen.GALLERY)}
            className="p-3 bg-white/10 backdrop-blur-md rounded-full text-white hover:bg-white/20"
          >
            <ArrowLeft className="w-6 h-6" />
          </button>
        </div>

        <div className="flex-1 flex items-center justify-center p-4">
          <img 
            src={selectedImage.imageData} 
            alt="Full Preview" 
            className="max-w-full max-h-[80vh] rounded-lg shadow-2xl object-contain"
          />
        </div>

        <div className="p-6 bg-gray-900 rounded-t-3xl border-t border-white/10 space-y-4">
          <div className="max-h-20 overflow-y-auto">
             <h4 className="text-gray-400 text-xs uppercase tracking-wider mb-1">Prompt</h4>
             <p className="text-white text-sm leading-relaxed">{selectedImage.originalPrompt}</p>
          </div>
          
          <Button 
            fullWidth 
            onClick={() => handleDownload(selectedImage)}
          >
            <Download className="w-5 h-5" />
            Download Image
          </Button>
        </div>
      </div>
    );
  };

  return (
    <div className="max-w-md mx-auto min-h-screen bg-black shadow-2xl overflow-hidden relative">
       {/* Background noise/texture overlay for the whole app */}
       <div className="fixed inset-0 pointer-events-none opacity-[0.03]" style={{backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`}}></div>

      {screen === AppScreen.SPLASH && renderSplash()}
      {screen === AppScreen.MAIN_MENU && renderMainMenu()}
      {screen === AppScreen.HOME && renderHome()}
      {screen === AppScreen.CREATE_PROMPTS && renderCreatePrompts()}
      {screen === AppScreen.HOW_TO_USE && renderHowToUse()}
      {screen === AppScreen.PROMPTS && renderPrompts()}
      {screen === AppScreen.GALLERY && renderGallery()}
      {screen === AppScreen.PREVIEW && renderPreview()}
    </div>
  );
};

export default App;