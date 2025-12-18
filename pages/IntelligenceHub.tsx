import React, { useState, useRef, useEffect } from 'react';
import { Send, Image as ImageIcon, Loader2, Bot, User as UserIcon, Cpu, Mic, Square, Paperclip, X, Headphones, FileText, Download, Zap, ExternalLink, Search as SearchIcon, Mail, Globe, Layers, Plus, Sparkles, Monitor, ArrowRight, ScanLine, Info, FileSignature, Printer, Lock } from 'lucide-react';
import { generateEngineeringResponse, generateMetroDrawing, performOCR, generateGeneralResponse, generateEmailDraft, generateOfficialLetter, transcribeAudio } from '../services/geminiService';
import { logActivityToSheet, searchDriveFiles, fetchDriveFiles } from '../services/driveService';
import { ChatMessage, DriveFile, CircuitComponent, AiMode, LetterDraft, User } from '../types';
import { ThreeDCard } from '../components/ThreeDCard';
import { CircuitViewer } from '../components/CircuitViewer';
import { EMAIL_TONES } from '../constants';
import { authService } from '../services/authService';

interface IntelligenceHubProps {
    preSelectedFile?: DriveFile | null;
    voiceEmailDraft?: {to: string, topic: string, keyPoints: string} | null;
    onDraftConsumed?: () => void;
}

export const IntelligenceHub: React.FC<IntelligenceHubProps> = ({ preSelectedFile, voiceEmailDraft, onDraftConsumed }) => {
  // Permission Logic
  const currentUser = authService.getCurrentUser();
  const isAdmin = currentUser?.role === 'ADMIN';
  const perms = currentUser?.permissions?.intelligenceHub;
  
  // Determine default mode based on first available permission
  const getDefaultMode = (): AiMode => {
      if (isAdmin) return 'ENGINEERING';
      if (perms?.metroRag) return 'ENGINEERING';
      if (perms?.general) return 'GENERAL';
      if (perms?.email) return 'EMAIL';
      if (perms?.letter) return 'LETTER';
      return 'ENGINEERING'; // Fallback, will be blocked by UI anyway
  };

  const [mode, setMode] = useState<AiMode>(getDefaultMode());
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome',
      role: 'system',
      content: 'KMRCL Intelligence v2.3 Online. Select a mode to begin.',
      timestamp: Date.now()
    }
  ]);
  const [input, setInput] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  
  // OCR State
  const [enableOCR, setEnableOCR] = useState(false);
  const [ocrHighAccuracy, setOcrHighAccuracy] = useState(false);
  
  // File Context State
  const [contextFiles, setContextFiles] = useState<DriveFile[]>([]);
  const [availableFiles, setAvailableFiles] = useState<DriveFile[]>([]);
  const [showFileSelector, setShowFileSelector] = useState(false);
  const [isLoadingFiles, setIsLoadingFiles] = useState(false);

  // Voice Feedback
  const [voiceToast, setVoiceToast] = useState<string | null>(null);

  // Email State
  const [emailDraft, setEmailDraft] = useState({ to: '', subject: '', tone: 'Professional', keyPoints: '' });
  const [isDictating, setIsDictating] = useState(false);
  
  // Letter State
  const [letterDraft, setLetterDraft] = useState<LetterDraft>({
    refNo: 'BEML/RS(3R)/PM/2025/001',
    date: new Date().toISOString().split('T')[0],
    recipient: '',
    attn: '',
    subject: '',
    reference: '',
    bodyPoints: '',
    signatoryName: '',
    signatoryDesignation: '',
    isBemlFormat: true,
    cc: ''
  });
  
  // Resolution State
  const [resolution, setResolution] = useState<'STANDARD' | 'HD' | '4K'>('STANDARD');

  const [pendingAttachment, setPendingAttachment] = useState<{
    type: 'image' | 'audio' | 'pdf';
    data: string; // base64
    mimeType: string;
    name: string;
  } | null>(null);

  const scrollRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const dictationRecorderRef = useRef<MediaRecorder | null>(null);

  // Load available files for selector
  useEffect(() => {
    const loadFiles = async () => {
        setIsLoadingFiles(true);
        const files = await fetchDriveFiles();
        setAvailableFiles(files);
        setIsLoadingFiles(false);
    };
    loadFiles();
  }, []);

  // Effect: Handle Pre-selected File from Drive Browser or Voice
  useEffect(() => {
    if (preSelectedFile) {
        setContextFiles(prev => {
            if (prev.find(f => f.id === preSelectedFile.id)) return prev;
            return [...prev, preSelectedFile];
        });
        setMode('ENGINEERING');
        setVoiceToast(`VOICE AGENT ADDED: ${preSelectedFile.name}`);
        setTimeout(() => setVoiceToast(null), 4000);
    }
  }, [preSelectedFile]);

  // Effect: Handle Voice Email Draft
  useEffect(() => {
    if (voiceEmailDraft) {
        setMode('EMAIL');
        setEmailDraft({
            to: voiceEmailDraft.to,
            subject: voiceEmailDraft.topic,
            keyPoints: voiceEmailDraft.keyPoints,
            tone: 'Professional'
        });
        
        if (voiceEmailDraft.topic && voiceEmailDraft.keyPoints) {
            setTimeout(() => {
                handleEmailGenerate(voiceEmailDraft.to, voiceEmailDraft.topic, voiceEmailDraft.keyPoints);
            }, 500);
        }
        
        if (onDraftConsumed) onDraftConsumed();
    }
  }, [voiceEmailDraft]);

  // Effect: Auto-scroll
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isProcessing]);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      const chunks: BlobPart[] = [];
      recorder.ondataavailable = (e) => { if (e.data.size > 0) chunks.push(e.data); };
      recorder.onstop = () => {
        const blob = new Blob(chunks, { type: 'audio/webm' });
        const reader = new FileReader();
        reader.onloadend = () => {
          setPendingAttachment({
            type: 'audio',
            data: (reader.result as string).split(',')[1],
            mimeType: 'audio/webm',
            name: 'Voice Command.webm'
          });
        };
        reader.readAsDataURL(blob);
        stream.getTracks().forEach(track => track.stop());
      };
      recorder.start();
      mediaRecorderRef.current = recorder;
      setIsRecording(true);
    } catch (err) {
      console.error("Microphone access denied:", err);
    }
  };

  const toggleDictation = async () => {
    if (isDictating) {
        // STOP Dictation
        dictationRecorderRef.current?.stop();
        setIsDictating(false);
    } else {
        // START Dictation with noise cancellation
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ 
                audio: { 
                    echoCancellation: true, 
                    noiseSuppression: true, 
                    autoGainControl: true 
                } 
            });
            const recorder = new MediaRecorder(stream);
            const chunks: BlobPart[] = [];
            
            recorder.ondataavailable = (e) => { if (e.data.size > 0) chunks.push(e.data); };
            recorder.onstop = async () => {
                const blob = new Blob(chunks, { type: 'audio/webm' });
                const reader = new FileReader();
                reader.onloadend = async () => {
                    const base64 = (reader.result as string).split(',')[1];
                    setVoiceToast("Processing clear voice notes...");
                    const text = await transcribeAudio(base64, 'audio/webm');
                    
                    if (text) {
                        setEmailDraft(prev => ({
                            ...prev,
                            // Append new dictation to existing notes
                            keyPoints: prev.keyPoints ? `${prev.keyPoints}\n\n[Dictated]: ${text}` : text
                        }));
                        setVoiceToast(null);
                    }
                };
                reader.readAsDataURL(blob);
                stream.getTracks().forEach(track => track.stop());
            };
            
            recorder.start();
            dictationRecorderRef.current = recorder;
            setIsDictating(true);
        } catch (err) {
            console.error("Microphone error for dictation:", err);
            setVoiceToast("Microphone Error");
            setTimeout(() => setVoiceToast(null), 2000);
        }
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const reader = new FileReader();
      reader.onload = () => {
        const base64 = (reader.result as string).split(',')[1];
        let type: 'image' | 'audio' | 'pdf' = 'image';
        if (file.type.includes('audio')) type = 'audio';
        if (file.type.includes('pdf')) {
            type = 'pdf';
            setEnableOCR(true); 
        }
        if (file.type.includes('image')) {
            setEnableOCR(true); 
        }

        setPendingAttachment({
          type,
          data: base64,
          mimeType: file.type,
          name: file.name
        });
      };
      reader.readAsDataURL(file);
    }
  };

  const toggleContextFile = (file: DriveFile) => {
    setContextFiles(prev => {
        const exists = prev.find(f => f.id === file.id);
        if (exists) return prev.filter(f => f.id !== file.id);
        return [...prev, file];
    });
  };

  const switchToEmailDraft = () => {
      let draftContext = '';
      if (input.trim()) {
          draftContext += `Context from chat input: ${input}\n`;
      }
      if (contextFiles.length > 0) {
          draftContext += `Regarding attached files: ${contextFiles.map(f => f.name).join(', ')}`;
      }
      
      setEmailDraft(prev => ({
          ...prev,
          keyPoints: draftContext || prev.keyPoints
      }));
      setMode('EMAIL');
      setInput(''); 
  };

  // Helper to extract content from files for the AI
  const extractFileContent = async (file: DriveFile): Promise<string> => {
      // If no file data (mock file not uploaded), we can only provide metadata
      if (!file.fileData) return `[File Metadata: ${file.name} - ${file.description || 'No Description'}]`;

      // Handle Excel / CSV
      if (file.name.endsWith('.xlsx') || file.name.endsWith('.xls') || file.name.endsWith('.csv')) {
          try {
              if ((window as any).XLSX) {
                  const wb = (window as any).XLSX.read(file.fileData, { type: 'base64' });
                  const ws = wb.Sheets[wb.SheetNames[0]];
                  const csv = (window as any).XLSX.utils.sheet_to_csv(ws);
                  // Limit content to avoid token limits, take first 5000 chars or reasonable amount
                  return `[FILE CONTENT: ${file.name}]\n${csv.substring(0, 15000)}\n[END FILE CONTENT]`;
              }
          } catch (e) {
              console.error("Excel parse error", e);
              return `[Error parsing Excel file: ${file.name}]`;
          }
      }

      // Handle JSON
      if (file.name.endsWith('.json')) {
          try {
             return `[FILE CONTENT: ${file.name}]\n${atob(file.fileData)}\n[END FILE CONTENT]`;
          } catch (e) { return `[Error decoding JSON]`; }
      }

      // Fallback for others (Binary files that AI might not handle directly as text, handled via attachments usually)
      return `[File Attached: ${file.name} (${file.mimeType})]`;
  };

  const handleSend = async () => {
    if (mode === 'EMAIL') {
        handleEmailGenerate(emailDraft.to, emailDraft.subject, emailDraft.keyPoints);
        return;
    }
    
    if (mode === 'LETTER') {
        handleLetterGenerate();
        return;
    }

    if ((!input.trim() && !pendingAttachment) || isProcessing) return;
    const currentInput = input;
    const currentAttachment = pendingAttachment;

    setInput('');
    setPendingAttachment(null);
    setIsProcessing(true);

    const userMsg: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: currentInput || (currentAttachment ? `Uploaded ${currentAttachment.name}` : ''),
      timestamp: Date.now(),
      attachments: currentAttachment ? [`data:${currentAttachment.mimeType};base64,${currentAttachment.data}`] : undefined,
      mode: mode,
      resolution: resolution 
    };
    setMessages(prev => [...prev, userMsg]);
    
    // Explicitly call the upgraded logger
    logActivityToSheet(mode === 'GENERAL' ? 'CHAT' : 'ANALYSIS', `[${mode}] Input: ${currentInput}`);

    try {
      let responseText = '';
      let extractedComponents: CircuitComponent[] | undefined = undefined;
      let retrievedDocs: DriveFile[] | undefined = undefined;

      // --- GENERAL AI MODE ---
      if (mode === 'GENERAL') {
          if (currentInput.toLowerCase().includes('visualize') || currentInput.toLowerCase().includes('drawing') || currentInput.toLowerCase().includes('design')) {
             setMessages(prev => [...prev, { id: 'gen-img', role: 'model', content: 'Generative Design Engine Active...', timestamp: Date.now(), isThinking: true }]);
             const imgUrl = await generateMetroDrawing(currentInput);
             setMessages(prev => prev.filter(m => m.id !== 'gen-img'));
             
             if (imgUrl) {
                const imgMsg: ChatMessage = { id: Date.now().toString(), role: 'model', content: 'Design concept generated.', timestamp: Date.now(), attachments: [imgUrl] };
                setMessages(prev => [...prev, imgMsg]);
                setIsProcessing(false);
                return;
             }
          }
          
          setMessages(prev => [...prev, { id: 'thinking', role: 'model', content: 'Consulting General Knowledge Base...', timestamp: Date.now(), isThinking: true }]);
          const history = messages.filter(m => m.role !== 'system').map(m => ({ role: m.role, parts: [{ text: m.content }] }));
          responseText = await generateGeneralResponse(currentInput, history);
      } 
      
      // --- ENGINEERING RAG MODE ---
      else {
          let contextData: string[] = [];
          let contextSource: 'USER_SELECTION' | 'AUTO_SEARCH' = 'AUTO_SEARCH';

          // 1. Prioritize User-Selected Files & Extract Content
          if (contextFiles.length > 0) {
              setMessages(prev => [...prev, { id: 'reading-files', role: 'model', content: 'Reading and parsing selected files...', timestamp: Date.now(), isThinking: true }]);
              
              const fileContents = await Promise.all(contextFiles.map(f => extractFileContent(f)));
              contextData = fileContents;
              contextSource = 'USER_SELECTION';
              
              setMessages(prev => prev.filter(m => m.id !== 'reading-files'));
          } 
          // 2. Auto-Search Retrieval Fallback
          else {
              setMessages(prev => [...prev, { id: 'searching', role: 'model', content: 'Searching KMRCL Secure Index...', timestamp: Date.now(), isThinking: true }]);
              
              const results = await searchDriveFiles(currentInput);
              setMessages(prev => prev.filter(m => m.id !== 'searching'));
              
              if (results.length > 0) {
                  retrievedDocs = results.slice(0, 3);
                  // For auto-search, we might not have fileData loaded, so we send descriptions/links
                  // Unless we fetch them. For now, we assume metadata level RAG for auto-search results.
                  contextData = retrievedDocs.map(f => `File: ${f.name}\nDescription: ${f.description}\nLink: ${f.url}`);
                  contextSource = 'AUTO_SEARCH';
              } else if (['circuit', 'diagram', 'schematic', 'drawing', 'schematic'].some(kw => currentInput.toLowerCase().includes(kw))) {
                  contextData.push("NO matching files were found in the index. Proceed to generate a synthetic diagram.");
              }
          }

          setMessages(prev => [...prev, { id: 'thinking', role: 'model', content: 'Analyzing Engineering Data...', timestamp: Date.now(), isThinking: true }]);
          
          const history = messages.filter(m => m.role !== 'system').map(m => ({ role: m.role, parts: [{ text: m.content }] }));
          const attachmentPayload = currentAttachment ? { mimeType: currentAttachment.mimeType, data: currentAttachment.data } : null;

          if (currentAttachment && (currentAttachment.mimeType.includes('pdf') || currentAttachment.mimeType.includes('image'))) {
             if (enableOCR || currentInput.toLowerCase().includes('scan') || currentInput.toLowerCase().includes('extract')) {
                 setMessages(prev => [...prev, { id: 'ocr-proc', role: 'model', content: `Running Optical Character Recognition (${ocrHighAccuracy ? 'High Accuracy' : 'Fast'})...`, timestamp: Date.now(), isThinking: true }]);
                 const ocrText = await performOCR(currentAttachment.data, currentAttachment.mimeType, ocrHighAccuracy);
                 setMessages(prev => prev.filter(m => m.id !== 'ocr-proc'));
                 contextData.push(`OCR RESULT FROM ATTACHMENT:\n${ocrText}`);
             }
          }

          const rawResponse = await generateEngineeringResponse(currentInput, history, attachmentPayload, contextData, contextSource);
          
          const startTag = '<<<COMPONENTS>>>';
          const endTag = '<<<END_COMPONENTS>>>';
          if (rawResponse.includes(startTag)) {
             try {
                const parts = rawResponse.split(startTag);
                const jsonStr = parts[1].split(endTag)[0].trim();
                extractedComponents = JSON.parse(jsonStr);
                responseText = parts[0] + "\n" + (parts[1].split(endTag)[1] || '');
             } catch (e) { 
                 responseText = rawResponse; 
             }
          } else {
             responseText = rawResponse;
          }
      }

      setMessages(prev => prev.filter(m => m.id !== 'thinking'));
      
      const botMsg: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'model',
        content: responseText,
        timestamp: Date.now(),
        retrievedFiles: retrievedDocs,
        circuitComponents: extractedComponents,
        mode: mode,
        resolution: resolution
      };
      setMessages(prev => [...prev, botMsg]);

    } catch (error) {
      console.error("Chat Error", error);
      setMessages(prev => prev.filter(m => m.id !== 'thinking' && m.id !== 'gen-img' && m.id !== 'ocr-proc' && m.id !== 'reading-files'));
      setMessages(prev => [...prev, { id: Date.now().toString(), role: 'model', content: "System Error: Unable to process request. Please check API connection.", timestamp: Date.now() }]);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleEmailGenerate = async (to: string, subject: string, keyPoints: string) => {
    if (!to || !keyPoints) return;
    setIsProcessing(true);
    setMessages(prev => [...prev, { id: 'thinking', role: 'model', content: 'Drafting Professional Email with KPIs...', timestamp: Date.now(), isThinking: true }]);
    
    const draft = await generateEmailDraft(to, subject, keyPoints, emailDraft.tone);
    
    setMessages(prev => prev.filter(m => m.id !== 'thinking'));
    setMessages(prev => [...prev, { 
        id: Date.now().toString(), 
        role: 'model', 
        content: draft, 
        timestamp: Date.now(), 
        mode: 'EMAIL' 
    }]);
    setIsProcessing(false);
  };
  
  const handleLetterGenerate = async () => {
    if (!letterDraft.recipient || !letterDraft.bodyPoints) return;
    setIsProcessing(true);
    setMessages(prev => [...prev, { id: 'thinking', role: 'model', content: 'Drafting Official Letter...', timestamp: Date.now(), isThinking: true }]);
    
    const draft = await generateOfficialLetter(letterDraft);
    
    setMessages(prev => prev.filter(m => m.id !== 'thinking'));
    setMessages(prev => [...prev, { 
        id: Date.now().toString(), 
        role: 'model', 
        content: draft, 
        timestamp: Date.now(), 
        mode: 'LETTER' 
    }]);
    setIsProcessing(false);
  };

  const renderMessageContent = (msg: ChatMessage) => {
    // ... (existing renderer logic) ...
    const content = msg.content;
    
    if (msg.mode === 'LETTER' && msg.role === 'model') {
        const isBeml = letterDraft.isBemlFormat;
        return (
            <div className={`text-black p-8 font-serif bg-white shadow-2xl relative max-w-2xl mx-auto ${isBeml ? 'border-t-8 border-blue-900' : ''}`}>
                {/* BEML HEADER */}
                {isBeml && (
                    <div className="text-center mb-4">
                        <div className="flex items-center justify-between mb-2">
                             <div className="text-left w-1/4 opacity-50"><ScanLine size={32}/></div>
                             <div className="flex-1">
                                <h1 className="text-2xl font-bold text-blue-900 tracking-wider">बी ई एम एल लिमिटेड</h1>
                                <h1 className="text-2xl font-bold text-blue-900 tracking-wider">BEML LIMITED</h1>
                                <p className="text-xs text-gray-600 font-sans">Schedule 'A' Company under Ministry of Defence, Govt. of India</p>
                             </div>
                             <div className="text-right w-1/4 opacity-50"><ScanLine size={32}/></div>
                        </div>
                        <div className="w-full py-1 bg-gradient-to-r from-blue-200 via-purple-200 to-blue-200 text-center border-t border-b border-gray-300">
                            <p className="text-[10px] font-bold text-blue-900 uppercase tracking-widest">Defence & Aerospace | Mining & Construction | Rail & Metro</p>
                        </div>
                    </div>
                )}
                
                {/* LETTER META */}
                <div className="flex justify-between text-sm font-bold text-gray-700 mb-6 font-sans">
                    <div>{letterDraft.refNo}</div>
                    <div>Date: {letterDraft.date}</div>
                </div>
                
                {/* CONTENT */}
                <div className="whitespace-pre-wrap text-sm leading-relaxed text-gray-800">
                    {content}
                </div>
                
                {/* BEML FOOTER */}
                {isBeml && (
                    <div className="mt-12 pt-4 border-t-2 border-blue-900 flex justify-between text-[10px] text-blue-900 font-sans">
                        <div className="w-1/2 pr-4 border-r border-gray-300">
                            <strong className="block mb-1">Corporate Office:</strong>
                            BEML Soudha, 23/1, 4th. Main, S R Nagar,<br/>
                            Bangalore - 560027.<br/>
                            Tel: 1800 425 2365
                        </div>
                        <div className="w-1/2 pl-4">
                            <strong className="block mb-1">Bangalore Complex:</strong>
                            P. B. No. 7501, New Thippasandra Post,<br/>
                            Bangalore - 560075<br/>
                            Ph: 080-25242413
                        </div>
                    </div>
                )}
                
                {/* PRINT BUTTON OVERLAY */}
                <button 
                    onClick={() => {
                        const win = window.open('', '', 'width=800,height=600');
                        win?.document.write(`<html><head><title>Print Letter</title><script src="https://cdn.tailwindcss.com"></script></head><body>${document.querySelector('.letter-preview')?.innerHTML || 'Error'}</body></html>`);
                        win?.print();
                    }}
                    className="absolute top-2 right-2 p-2 bg-gray-100 hover:bg-gray-200 text-gray-600 rounded-full print:hidden shadow"
                    title="Print / Save PDF"
                >
                    <Printer size={16}/>
                </button>
            </div>
        );
    }

    if (content.includes('<svg') && content.includes('</svg>')) {
        const parts = content.split(/(<svg[\s\S]*?<\/svg>)/g);
        return parts.map((part, i) => {
            if (part.trim().startsWith('<svg')) {
                return (
                    <CircuitViewer 
                      key={i} 
                      svgContent={part} 
                      components={msg.circuitComponents}
                      resolution={msg.resolution} 
                    />
                );
            }
            return <p key={i} className="whitespace-pre-wrap break-words">{part}</p>;
        });
    }
    return <p className="whitespace-pre-wrap break-words">{content}</p>;
  };

  return (
    <div className="h-full flex flex-col gap-4 relative">
      
      {voiceToast && (
          <div className="absolute top-16 left-1/2 transform -translate-x-1/2 z-50 flex items-center bg-neonBlue/10 border border-neonBlue/50 text-neonBlue px-4 py-2 rounded-full shadow-lg backdrop-blur-md animate-fade-in">
              <Mic size={16} className="mr-2 animate-pulse"/>
              <span className="text-sm font-bold uppercase tracking-wider">{voiceToast}</span>
          </div>
      )}

      {/* HEADER & MODE SWITCHER */}
      <div className="flex flex-col md:flex-row justify-between items-center gap-4 bg-white/5 p-4 rounded-xl border border-white/10 shrink-0">
        <h2 className="text-xl font-bold text-white flex items-center">
            {mode === 'ENGINEERING' && <Layers className="mr-2 text-neonBlue"/>}
            {mode === 'GENERAL' && <Globe className="mr-2 text-neonPurple"/>}
            {mode === 'EMAIL' && <Mail className="mr-2 text-green-400"/>}
            {mode === 'LETTER' && <FileSignature className="mr-2 text-yellow-400"/>}
            {mode === 'ENGINEERING' ? 'Engineering Hub' : mode === 'GENERAL' ? 'General AI' : mode === 'EMAIL' ? 'Email Assistant' : 'Official Letter Generator'}
        </h2>
        
        <div className="flex p-1 bg-black/40 rounded-lg border border-white/10 overflow-x-auto">
            {(isAdmin || perms?.metroRag) && (
                <button onClick={() => setMode('ENGINEERING')} className={`px-4 py-1.5 rounded-md text-xs font-bold transition-all whitespace-nowrap ${mode === 'ENGINEERING' ? 'bg-neonBlue text-black shadow-lg' : 'text-gray-400 hover:text-white'}`}>METRO RAG</button>
            )}
            {(isAdmin || perms?.general) && (
                <button onClick={() => setMode('GENERAL')} className={`px-4 py-1.5 rounded-md text-xs font-bold transition-all whitespace-nowrap ${mode === 'GENERAL' ? 'bg-neonPurple text-white shadow-lg' : 'text-gray-400 hover:text-white'}`}>GENERAL</button>
            )}
            {(isAdmin || perms?.email) && (
                <button onClick={() => setMode('EMAIL')} className={`px-4 py-1.5 rounded-md text-xs font-bold transition-all whitespace-nowrap ${mode === 'EMAIL' ? 'bg-green-500 text-black shadow-lg' : 'text-gray-400 hover:text-white'}`}>EMAIL</button>
            )}
            {(isAdmin || perms?.letter) && (
                <button onClick={() => setMode('LETTER')} className={`px-4 py-1.5 rounded-md text-xs font-bold transition-all whitespace-nowrap ${mode === 'LETTER' ? 'bg-yellow-400 text-black shadow-lg' : 'text-gray-400 hover:text-white'}`}>LETTER</button>
            )}
        </div>
      </div>

      {/* MAIN CONTENT AREA */}
      <ThreeDCard className="flex-1 overflow-hidden h-full flex flex-col" depth={2}>
        <div className="h-full glass-panel rounded-2xl p-4 flex flex-col relative overflow-hidden">
          
          {/* PERMISSION CHECK BLOCKER */}
          {((mode === 'ENGINEERING' && !isAdmin && !perms?.metroRag) ||
            (mode === 'GENERAL' && !isAdmin && !perms?.general) ||
            (mode === 'EMAIL' && !isAdmin && !perms?.email) ||
            (mode === 'LETTER' && !isAdmin && !perms?.letter)) ? (
                <div className="h-full flex flex-col items-center justify-center text-gray-500">
                    <Lock className="w-16 h-16 mb-4 opacity-50 text-red-400" />
                    <h3 className="text-xl font-bold text-white mb-2">Access Restricted</h3>
                    <p className="text-sm">You do not have permission to access the <strong>{mode}</strong> module.</p>
                    <p className="text-xs mt-2">Please contact your System Administrator.</p>
                </div>
            ) : (
             <>
             {/* ... Render Mode Content ... */}
             {mode === 'EMAIL' ? (
                /* EMAIL FORM CONTENT */
                <div className="flex-1 overflow-y-auto p-4 space-y-6 custom-scrollbar">
                    {/* ... (Keep existing email form code exactly as is) ... */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <label className="text-xs text-gray-400">Recipient (To)</label>
                            <input value={emailDraft.to} onChange={e => setEmailDraft({...emailDraft, to: e.target.value})} className="w-full bg-black/40 border border-white/10 rounded-lg p-3 text-white focus:border-green-500/50 outline-none" placeholder="client@example.com" />
                        </div>
                        <div className="space-y-2">
                            <label className="text-xs text-gray-400">Subject / Topic</label>
                            <input value={emailDraft.subject} onChange={e => setEmailDraft({...emailDraft, subject: e.target.value})} className="w-full bg-black/40 border border-white/10 rounded-lg p-3 text-white focus:border-green-500/50 outline-none" placeholder="Project Update..." />
                        </div>
                    </div>
                    
                    <div className="space-y-2">
                        <label className="text-xs text-gray-400">Tone Selector (12+ Options)</label>
                        <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto custom-scrollbar p-1">
                            {EMAIL_TONES.map(t => (
                                <button key={t} onClick={() => setEmailDraft({...emailDraft, tone: t})} className={`px-3 py-1.5 text-xs rounded border transition-all ${emailDraft.tone === t ? 'bg-green-500/20 border-green-500 text-green-400 shadow-[0_0_10px_rgba(34,197,94,0.3)]' : 'bg-white/5 border-white/10 text-gray-400 hover:bg-white/10 hover:text-white'}`}>{t}</button>
                            ))}
                        </div>
                    </div>

                    <div className="space-y-2">
                        <div className="flex justify-between items-center">
                            <label className="text-xs text-gray-400">Key Points / Voice Dictation</label>
                            <button 
                                onClick={toggleDictation}
                                className={`flex items-center text-xs font-bold px-2 py-1 rounded-md transition-all ${isDictating ? 'bg-red-500/20 text-red-400 animate-pulse' : 'bg-white/10 text-gray-300 hover:text-white'}`}
                            >
                                <Mic size={12} className="mr-1"/>
                                {isDictating ? 'STOP RECORDING' : 'DICTATE NOTES'}
                            </button>
                        </div>
                        <textarea value={emailDraft.keyPoints} onChange={e => setEmailDraft({...emailDraft, keyPoints: e.target.value})} className="w-full h-32 bg-black/40 border border-white/10 rounded-lg p-3 text-white focus:border-green-500/50 outline-none" placeholder="Dictate or type rough notes here. The AI will expand them into a full professional email with KPIs." />
                    </div>

                    <button onClick={() => handleEmailGenerate(emailDraft.to, emailDraft.subject, emailDraft.keyPoints)} disabled={isProcessing} className="w-full py-3 bg-gradient-to-r from-green-500 to-emerald-600 text-black font-bold rounded-xl hover:shadow-[0_0_20px_rgba(34,197,94,0.3)] transition-all flex items-center justify-center">
                        {isProcessing ? <Loader2 className="animate-spin mr-2"/> : <Sparkles className="mr-2"/>} Enhance & Generate Email
                    </button>

                    <div className="space-y-4 mt-8">
                        {messages.filter(m => m.mode === 'EMAIL' && m.role === 'model').map(msg => (
                            <div key={msg.id} className="bg-white/5 border border-white/10 p-4 rounded-xl relative group animate-fade-in">
                                <pre className="whitespace-pre-wrap font-sans text-sm text-gray-300">{msg.content}</pre>
                                <button onClick={() => navigator.clipboard.writeText(msg.content)} className="absolute top-2 right-2 p-2 bg-black/50 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity hover:text-green-400"><FileText size={14}/></button>
                            </div>
                        ))}
                    </div>
                </div>
            ) : mode === 'LETTER' ? (
                /* LETTER FORM CONTENT */
                <div className="flex-1 flex gap-6 overflow-hidden">
                    {/* ... (Keep existing letter form code) ... */}
                    <div className="w-1/3 overflow-y-auto custom-scrollbar p-2 space-y-4 border-r border-white/10">
                        <h3 className="text-sm font-bold text-yellow-400 uppercase tracking-wider mb-4">Letter Details</h3>
                        
                        {/* Letter Inputs - Truncated for brevity but logic remains same */}
                        <div className="space-y-1"><label className="text-[10px] text-gray-500 uppercase">Ref No</label><input value={letterDraft.refNo} onChange={e => setLetterDraft({...letterDraft, refNo: e.target.value})} className="w-full bg-black/40 border border-white/10 rounded p-2 text-xs text-white" /></div>
                        <div className="space-y-1"><label className="text-[10px] text-gray-500 uppercase">Date</label><input type="date" value={letterDraft.date} onChange={e => setLetterDraft({...letterDraft, date: e.target.value})} className="w-full bg-black/40 border border-white/10 rounded p-2 text-xs text-white" /></div>
                        <div className="space-y-1"><label className="text-[10px] text-gray-500 uppercase">Recipient Address Block</label><textarea value={letterDraft.recipient} onChange={e => setLetterDraft({...letterDraft, recipient: e.target.value})} className="w-full h-20 bg-black/40 border border-white/10 rounded p-2 text-xs text-white" placeholder="The Project Manager, KMRCL..." /></div>
                        <div className="space-y-1"><label className="text-[10px] text-gray-500 uppercase">Kind Attn</label><input value={letterDraft.attn} onChange={e => setLetterDraft({...letterDraft, attn: e.target.value})} className="w-full bg-black/40 border border-white/10 rounded p-2 text-xs text-white" /></div>
                        <div className="space-y-1"><label className="text-[10px] text-gray-500 uppercase">Subject</label><input value={letterDraft.subject} onChange={e => setLetterDraft({...letterDraft, subject: e.target.value})} className="w-full bg-black/40 border border-white/10 rounded p-2 text-xs text-white" /></div>
                        <div className="space-y-1"><label className="text-[10px] text-gray-500 uppercase">Reference Lines</label><textarea value={letterDraft.reference} onChange={e => setLetterDraft({...letterDraft, reference: e.target.value})} className="w-full h-16 bg-black/40 border border-white/10 rounded p-2 text-xs text-white" placeholder="(1) Letter dated..." /></div>
                        <div className="space-y-1"><label className="text-[10px] text-gray-500 uppercase">Content Points / Body</label><textarea value={letterDraft.bodyPoints} onChange={e => setLetterDraft({...letterDraft, bodyPoints: e.target.value})} className="w-full h-32 bg-black/40 border border-white/10 rounded p-2 text-xs text-white focus:border-yellow-400" placeholder="State the facts and request..." /></div>
                        
                        <div className="grid grid-cols-2 gap-2">
                             <div className="space-y-1"><label className="text-[10px] text-gray-500 uppercase">Signatory Name</label><input value={letterDraft.signatoryName} onChange={e => setLetterDraft({...letterDraft, signatoryName: e.target.value})} className="w-full bg-black/40 border border-white/10 rounded p-2 text-xs text-white" /></div>
                            <div className="space-y-1"><label className="text-[10px] text-gray-500 uppercase">Designation</label><input value={letterDraft.signatoryDesignation} onChange={e => setLetterDraft({...letterDraft, signatoryDesignation: e.target.value})} className="w-full bg-black/40 border border-white/10 rounded p-2 text-xs text-white" /></div>
                        </div>

                        <div className="space-y-1"><label className="text-[10px] text-gray-500 uppercase">CC</label><input value={letterDraft.cc} onChange={e => setLetterDraft({...letterDraft, cc: e.target.value})} className="w-full bg-black/40 border border-white/10 rounded p-2 text-xs text-white" /></div>
                        <div className="flex items-center space-x-2 pt-2 border-t border-white/10"><input type="checkbox" checked={letterDraft.isBemlFormat} onChange={e => setLetterDraft({...letterDraft, isBemlFormat: e.target.checked})} className="rounded bg-black/40 border-white/20 text-yellow-400 focus:ring-0"/><span className="text-xs text-gray-300">Use BEML Official Letterhead</span></div>
                        <button onClick={handleLetterGenerate} disabled={isProcessing} className="w-full py-3 bg-yellow-500 hover:bg-yellow-400 text-black font-bold rounded-xl transition-all shadow-lg shadow-yellow-500/20">{isProcessing ? <Loader2 className="animate-spin mx-auto"/> : 'GENERATE LETTER'}</button>
                    </div>

                    <div className="flex-1 bg-gray-900 rounded-xl overflow-y-auto custom-scrollbar relative p-4 flex items-start justify-center">
                         {messages.filter(m => m.mode === 'LETTER' && m.role === 'model').length > 0 ? (
                             <div className="w-full letter-preview">{messages.filter(m => m.mode === 'LETTER' && m.role === 'model').map(msg => (<div key={msg.id} className="mb-8">{renderMessageContent(msg)}</div>))}</div>
                         ) : (
                             <div className="text-center mt-20 text-gray-500"><FileSignature size={48} className="mx-auto mb-4 opacity-20"/><p>Fill the form and click generate to create an official letter.</p></div>
                         )}
                    </div>
                </div>
            ) : (
                /* CHAT / RAG MODES */
                <>
                <div className="flex-1 overflow-y-auto space-y-6 pr-2 scrollbar-hide pb-20" ref={scrollRef}>
                    {messages.filter(m => m.mode === undefined || m.mode === mode).map((msg) => (
                    <div key={msg.id} className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'} animate-fade-in`}>
                        <div className={`max-w-[85%] rounded-2xl p-4 shadow-lg backdrop-blur-sm ${
                        msg.role === 'user' 
                            ? 'bg-gradient-to-r from-neonBlue/20 to-blue-600/20 text-blue-100 rounded-tr-none border border-neonBlue/30' 
                            : msg.role === 'system'
                            ? 'bg-white/5 text-gray-400 border border-white/10 text-sm italic'
                            : 'bg-gradient-to-r from-neonPurple/20 to-purple-900/20 text-purple-100 rounded-tl-none border border-neonPurple/30'
                        }`}>
                        <div className="flex items-center space-x-2 mb-2 opacity-70 text-xs font-mono font-bold">
                            {msg.role === 'user' ? <UserIcon size={12} /> : <Bot size={12} />}
                            <span>{msg.role.toUpperCase()}</span>
                        </div>
                        
                        {msg.isThinking ? (
                            <div className="flex items-center space-x-2 text-neonBlue animate-pulse">
                            <Cpu size={16} />
                            <span className="text-sm font-mono">{msg.content}</span>
                            </div>
                        ) : (
                            <div className="prose prose-invert prose-sm max-w-none">
                            {renderMessageContent(msg)}
                            </div>
                        )}

                        {/* Retrieval Cards */}
                        {msg.retrievedFiles && msg.retrievedFiles.length > 0 && (
                            <div className="mt-3 grid grid-cols-1 gap-2">
                                <p className="text-xs font-bold text-neonBlue opacity-80">SOURCES:</p>
                                {msg.retrievedFiles.map(f => (
                                    <div key={f.id} className="flex items-center p-2 bg-black/30 rounded border border-white/10 text-xs hover:bg-white/10 transition-colors cursor-pointer">
                                        <FileText size={12} className="mr-2 text-gray-400" />
                                        <span className="truncate">{f.name}</span>
                                        <ExternalLink size={10} className="ml-auto opacity-50"/>
                                    </div>
                                ))}
                            </div>
                        )}

                        {msg.attachments && (
                            <div className="flex flex-col gap-2 mt-3">
                            {msg.attachments.map((src, idx) => src.startsWith('data:audio') 
                                ? <audio key={idx} controls src={src} className="w-full h-8" />
                                : <img key={idx} src={src} alt="att" className="rounded-lg border border-white/20 shadow-lg max-h-64 object-contain bg-black/50" />
                            )}
                            </div>
                        )}
                        </div>
                    </div>
                    ))}
                </div>

                {/* INPUT AREA */}
                <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black via-black/90 to-transparent pt-10">
                    {/* File Context Bar (Only for RAG) */}
                    {mode === 'ENGINEERING' && (
                        <div className="flex items-center justify-between mb-2">
                            {contextFiles.length > 0 ? (
                                <div className="flex items-center gap-2 overflow-x-auto pb-2 custom-scrollbar">
                                    <span className="text-[10px] text-neonBlue font-bold uppercase shrink-0">Manual Context:</span>
                                    {contextFiles.map(f => (
                                        <div key={f.id} className="flex items-center bg-neonBlue/20 text-neonBlue border border-neonBlue/50 px-2 py-1 rounded text-xs whitespace-nowrap animate-fade-in transition-all hover:bg-neonBlue/30">
                                            <FileText size={10} className="mr-1"/> <span className="max-w-[150px] truncate">{f.name}</span>
                                            <button onClick={() => toggleContextFile(f)} className="ml-2 hover:text-white"><X size={10}/></button>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="text-[10px] text-gray-500 italic">
                                    <span className="flex items-center"><Sparkles size={10} className="mr-1"/> Auto-Search Active (No files manually selected)</span>
                                </div>
                            )}
                        </div>
                    )}
                    
                    {/* Attachment Preview with OCR Toggle */}
                    {pendingAttachment && (
                        <div className="flex items-center justify-between bg-white/5 border border-white/10 rounded-lg p-2 mb-2 animate-fade-in">
                            <div className="flex items-center space-x-2 overflow-hidden">
                                {pendingAttachment.type === 'image' || pendingAttachment.type === 'pdf' ? (
                                    <ImageIcon size={16} className="text-purple-400 shrink-0" />
                                ) : (
                                    <Headphones size={16} className="text-pink-400 shrink-0" />
                                )}
                                <span className="text-xs text-gray-300 truncate max-w-[150px]">{pendingAttachment.name}</span>
                            </div>
                            
                            {(pendingAttachment.type === 'image' || pendingAttachment.type === 'pdf') && (
                                <div className="flex items-center space-x-2">
                                    <button 
                                        onClick={() => setEnableOCR(!enableOCR)}
                                        className={`flex items-center space-x-1 px-2 py-1 rounded transition-all border ${
                                            enableOCR ? 'bg-neonBlue/20 border-neonBlue text-neonBlue' : 'bg-white/5 border-white/5 text-gray-500'
                                        }`}
                                        title="Toggle Automatic Text Extraction"
                                    >
                                        <ScanLine size={12} />
                                        <span className="text-[10px] font-bold">OCR {enableOCR ? 'ON' : 'OFF'}</span>
                                    </button>
                                    
                                    {enableOCR && (
                                        <label className="flex items-center space-x-1 cursor-pointer" title="Enable High Accuracy">
                                            <input 
                                                type="checkbox" 
                                                checked={ocrHighAccuracy} 
                                                onChange={(e) => setOcrHighAccuracy(e.target.checked)} 
                                                className="form-checkbox h-3 w-3 text-neonPurple rounded bg-white/5 border-gray-600 focus:ring-offset-0 focus:ring-0"
                                            />
                                            <span className={`text-[10px] font-bold ${ocrHighAccuracy ? 'text-neonPurple' : 'text-gray-500'}`}>HI-RES</span>
                                        </label>
                                    )}
                                </div>
                            )}

                            <button onClick={() => { setPendingAttachment(null); setEnableOCR(false); setOcrHighAccuracy(false); }} className="p-1 hover:text-red-400">
                                <X size={14} />
                            </button>
                        </div>
                    )}

                    {/* File Selector Modal */}
                    {showFileSelector && (
                        <div className="absolute bottom-20 left-4 right-4 bg-gray-900 border border-white/20 rounded-xl p-4 shadow-2xl max-h-60 overflow-y-auto z-50">
                            <div className="flex justify-between mb-2 text-xs font-bold text-gray-400 uppercase">
                                <span>Select Context Files</span>
                                <button onClick={() => setShowFileSelector(false)}><X size={14}/></button>
                            </div>
                            {isLoadingFiles ? (
                                <div className="text-center py-4 text-gray-400 flex items-center justify-center">
                                    <Loader2 className="animate-spin mr-2 w-4 h-4" /> Loading Drive Files...
                                </div>
                            ) : availableFiles.length === 0 ? (
                                <div className="text-center py-4 text-gray-500 italic">No files found via API.</div>
                            ) : (
                                availableFiles.map(f => (
                                    <div key={f.id} onClick={() => toggleContextFile(f)} className={`p-2 flex items-center cursor-pointer hover:bg-white/5 rounded ${contextFiles.find(cf => cf.id === f.id) ? 'text-neonBlue' : 'text-gray-300'}`}>
                                        <div className={`w-3 h-3 border rounded mr-2 flex items-center justify-center ${contextFiles.find(cf => cf.id === f.id) ? 'bg-neonBlue border-neonBlue' : 'border-gray-500'}`}></div>
                                        <span className="text-sm truncate">{f.name}</span>
                                    </div>
                                ))
                            )}
                        </div>
                    )}

                    <div className="flex items-center space-x-3">
                        <button onClick={() => fileInputRef.current?.click()} className="p-3 rounded-xl bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white transition-all" disabled={isRecording} title="Attach File">
                            <Paperclip size={20} />
                            <input ref={fileInputRef} type="file" className="hidden" accept="image/*,audio/*,.pdf" onChange={handleFileUpload} />
                        </button>

                        {mode === 'ENGINEERING' && (
                            <button onClick={() => setShowFileSelector(!showFileSelector)} className={`p-3 rounded-xl transition-all ${contextFiles.length > 0 ? 'bg-neonBlue/20 text-neonBlue' : 'bg-white/5 text-gray-400'}`} title="Select Files for Context">
                                <Plus size={20} />
                            </button>
                        )}

                        {(input.trim() || contextFiles.length > 0) && (
                            <button onClick={switchToEmailDraft} className="p-3 rounded-xl bg-green-500/10 hover:bg-green-500/20 text-green-400 border border-green-500/30 transition-all flex items-center" title="Draft Email">
                                <Mail size={20} />
                                <span className="hidden md:inline ml-2 text-xs font-bold">Draft</span>
                            </button>
                        )}

                        <div className="flex-1 relative group">
                            <div className="absolute -inset-0.5 bg-gradient-to-r from-neonBlue to-neonPurple rounded-xl opacity-20 group-hover:opacity-40 transition duration-500 blur"></div>
                            <input
                                type="text"
                                value={input}
                                onChange={(e) => setInput(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                                placeholder={mode === 'GENERAL' ? "Ask general questions..." : "Ask about Metro systems..."}
                                className="relative w-full bg-black/80 border border-white/10 rounded-xl py-3 px-4 focus:outline-none focus:border-neonBlue/50 text-white placeholder-gray-500 transition-all pr-24"
                                disabled={isProcessing || isRecording}
                            />
                            
                            <div className="absolute right-2 top-1.5 z-10">
                                <select 
                                    value={resolution}
                                    onChange={(e) => setResolution(e.target.value as any)}
                                    className="bg-white/10 text-xs text-gray-300 rounded border border-white/10 py-1.5 px-2 outline-none hover:bg-white/20 transition-colors cursor-pointer"
                                    title="Target Export Resolution"
                                >
                                    <option value="STANDARD">SD</option>
                                    <option value="HD">HD</option>
                                    <option value="4K">4K</option>
                                </select>
                            </div>
                        </div>

                        <button onClick={handleSend} disabled={isProcessing || isRecording || (!input.trim() && !pendingAttachment)} className={`p-3 rounded-xl transition-all transform hover:scale-110 shadow-lg ${isProcessing ? 'bg-gray-700' : 'bg-gradient-to-r from-neonBlue to-blue-600 text-white shadow-blue-500/20'}`}>
                            {isProcessing ? <Loader2 size={20} className="animate-spin" /> : <Send size={20} />}
                        </button>
                    </div>
                </div>
                </>
            )}
            </>
          )}
        </div>
      </ThreeDCard>
    </div>
  );
};