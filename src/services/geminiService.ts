
import { GoogleGenAI, LiveServerMessage, Modality, Type } from "@google/genai";
import { SYSTEM_INSTRUCTION_RAG } from "../constants";
import { logActivityToSheet, incrementOcrCount } from "./driveService";
import { LetterDraft } from "../types";

// Robust environment check that prioritizes Admin-configured key from LocalStorage
const getApiKey = () => {
  const customKey = localStorage.getItem('kmrcl_custom_api_key');
  if (customKey && customKey.length > 10) return customKey;
  return process.env.API_KEY || '';
};

// Singleton instance getter to prevent early initialization errors
let aiInstance: GoogleGenAI | null = null;
const getAiClient = () => {
    // Always recreate if key changes might have happened, or check logic
    // For simplicity, if we need to support dynamic keys effectively, we should instantiate fresh if needed
    // But keeping singleton is better for performance. 
    // If the Admin updates key, they usually refresh or we can force reload.
    if (!aiInstance) {
        aiInstance = new GoogleGenAI({ apiKey: getApiKey() });
    }
    return aiInstance;
}

// Reset client helper (called when Admin saves new key)
export const resetAiClient = () => {
    aiInstance = null;
}

// --- Helper for Safe Generation with Retry ---
const safeGenerateContent = async (options: any) => {
    const ai = getAiClient();
    let attempts = 0;
    const maxAttempts = 3;
    const apiKey = getApiKey();
    if (!apiKey) throw new Error("API Key is missing. Please configure it in Settings.");
    
    while (attempts < maxAttempts) {
        try {
            return await ai.models.generateContent(options);
        } catch (e: any) {
            attempts++;
            if (e.message?.includes('503') || e.message?.includes('429')) {
                if (attempts === maxAttempts) throw e;
                await new Promise(r => setTimeout(r, 500 * Math.pow(2, attempts)));
            } else {
                throw e; 
            }
        }
    }
};

// --- OCR Logic for Scanned PDFs/Images ---
export const performOCR = async (base64Data: string, mimeType: string, highAccuracy: boolean = false): Promise<string> => {
  const apiKey = getApiKey();
  if (!apiKey) return "OCR Error: API Key missing. Please ask Admin to configure it.";

  const model = highAccuracy ? 'gemini-1.5-pro' : 'gemini-1.5-flash';

  try {
    const response = await safeGenerateContent({
      model: model,
      contents: [{
        parts: [
          { 
            inlineData: { 
              mimeType, 
              data: base64Data 
            } 
          },
          { 
            text: `Perform high-fidelity Optical Character Recognition (OCR) on this document. Extract all visible text accurately, maintaining the original structure and formatting as much as possible. If this is a technical document, preserve any formulas, measurements, or technical specifications exactly as they appear.

Please provide:
1. The complete extracted text
2. Any tables or structured data in a readable format
3. Note any text that appears unclear or potentially incorrect

Focus on accuracy and completeness.` 
          }
        ]
      }]
    });
    
    const result = response?.response?.text() || "No text could be extracted from this document.";
    logActivityToSheet('ANALYSIS', `Performed OCR on ${mimeType} file.`);
    incrementOcrCount(); // Updates Dashboard Counter
    return result;
  } catch (error: any) {
    console.error("OCR Error:", error);
    
    // More specific error messages
    if (error.message?.includes('API_KEY')) {
      return "OCR Error: Invalid API key. Please check your Gemini API configuration.";
    } else if (error.message?.includes('QUOTA')) {
      return "OCR Error: API quota exceeded. Please try again later.";
    } else if (error.message?.includes('SAFETY')) {
      return "OCR Error: Content blocked by safety filters. Please try a different document.";
    } else if (error.message?.includes('INVALID_ARGUMENT')) {
      return "OCR Error: Invalid file format or corrupted file. Please try uploading a clear image or PDF.";
    } else {
      return `OCR Error: ${error.message || 'Unknown error occurred during text extraction.'}`;
    }
  }
};

// --- Audio Transcription (Email Dictation) ---
export const transcribeAudio = async (base64Data: string, mimeType: string): Promise<string> => {
  if (!getApiKey()) return "Error: API Key missing.";
  try {
    const response = await safeGenerateContent({
      model: 'gemini-2.5-flash',
      contents: {
        parts: [
          { inlineData: { mimeType, data: base64Data } },
          { text: "Transcribe the following audio accurately. It is a dictation for a professional email. Fix any minor grammar issues and punctuation to make it a coherent sentence or paragraph. Do not add any conversational filler (like 'Okay', 'Um'). Just provide the cleaned transcript text." }
        ]
      }
    });
    return response?.text || "";
  } catch (error) {
    console.error("Transcription Error:", error);
    return "Error transcribing audio.";
  }
};

// --- Structured Data Analysis (Excel/CSV) ---
export const analyzeStructuredData = async (dataContext: string, fileName: string) => {
  if (!getApiKey()) return null;
  
  const prompt = `
    You are a Senior Data Analyst for a Metro Rail Corporation.
    Analyze the following tabular data (extracted from ${fileName}).
    
    Data Context (JSON format):
    ${dataContext.substring(0, 30000)} 
    
    Tasks:
    1. Summarize the data content and purpose.
    2. Extract key metrics/KPIs (Totals, Averages, Counts, Dates).
    3. Identify any anomalies, errors, discrepancies, or outliers (e.g., missing values, unusually high costs, expired dates).
    4. Provide specific recommendations based on the findings.
    
    Output strictly as valid JSON with the following structure:
    {
      "summary": "Detailed executive summary...",
      "specs": [{"label": "Total Revenue", "value": "$1.2M"}, {"label": "Record Count", "value": "150"}],
      "warnings": ["Row 15: Missing date", "Row 42: Cost exceeds threshold"],
      "recommendations": ["Review vendor contracts for X", "Standardize date formats"]
    }
  `;

  try {
     const response = await safeGenerateContent({
      model: 'gemini-2.5-flash',
      contents: { parts: [{ text: prompt }] },
      config: { responseMimeType: 'application/json' }
    });
    
    const text = response?.text || '{}';
    logActivityToSheet('ANALYSIS', `Analyzed structured data: ${fileName}`);
    return JSON.parse(text);
  } catch (e) {
    console.error("Analysis Error:", e);
    return { summary: "Error analyzing data.", specs: [], warnings: ["AI processing failed"], recommendations: [] };
  }
};

// --- General AI Search ---
export const generateGeneralResponse = async (prompt: string, history: { role: string; parts: { text: string }[] }[]) => {
  if (!getApiKey()) return "Error: API Key missing.";
  try {
     const ai = getAiClient();
     const chat = ai.chats.create({
      model: 'gemini-2.5-flash',
      config: {
        systemInstruction: "You are a highly intelligent, general-purpose AI assistant...",
      },
      history: history.map(h => ({ role: h.role, parts: h.parts })),
    });
    const result = await chat.sendMessage({ message: prompt });
    // Log the interaction
    logActivityToSheet('CHAT', `[GENERAL] User: ${prompt} | Bot: ${result.text.substring(0, 50)}...`);
    return result.text;
  } catch (e) {
    console.error("General AI Error", e);
    return "Error in General AI Mode.";
  }
};

// --- Email Writer ---
export const generateEmailDraft = async (to: string, topic: string, keyPoints: string, tone: string) => {
  if (!getApiKey()) return "Error: API Key missing.";
  try {
    const prompt = `You are an expert executive communications assistant. Enhance the following email draft to be professional, impactful, and include strategic KPIs where relevant.
    
    Drafting Details:
    - To: ${to}
    - Topic: ${topic}
    - Key Points/Voice Notes: ${keyPoints}
    - Desired Tone: ${tone}

    Output the full email body ready to send.`; 
    const response = await safeGenerateContent({
      model: 'gemini-2.5-flash',
      contents: { parts: [{ text: prompt }] }
    });
    const draft = response?.text || "Failed to generate email.";
    logActivityToSheet('EMAIL_DRAFT', `Drafted email to ${to} about ${topic}`);
    return draft;
  } catch (e) {
    return "Error generating email.";
  }
};

// --- Official Letter Generator ---
export const generateOfficialLetter = async (details: LetterDraft) => {
  if (!getApiKey()) return "Error: API Key missing.";
  
  const systemPrompt = `You are a Senior Administrative Officer responsible for drafting official corporate letters for BEML Limited or Metro authorities.
  
  Format Requirements:
  - DO NOT include the Header or Footer in the text output (these are handled by the letterhead renderer).
  - DO NOT include "Ref No" or "Date" at the top (handled by renderer).
  - Start directly with the "To" address block if provided, then "Kind Attn", then "Dear Sir/Madam".
  - Subject line should be bold or clearly marked as "Sub:".
  - Reference lines should be marked as "Ref:".
  - The body should be strictly formal, legalistic, and professional.
  - Paragraphs should be numbered A, B, C or 1, 2, 3 if complex.
  - End with "Yours Faithfully", followed by the Signatory Name and Designation.
  
  Input Details:
  - Recipient: ${details.recipient}
  - Attn: ${details.attn}
  - Subject: ${details.subject}
  - References: ${details.reference}
  - Key Content Points: ${details.bodyPoints}
  - Signatory: ${details.signatoryName}, ${details.signatoryDesignation}
  - CC: ${details.cc}
  `;

  try {
    const response = await safeGenerateContent({
      model: 'gemini-2.5-flash',
      contents: { parts: [{ text: "Generate the official letter body based on the instructions." }] },
      config: {
        systemInstruction: systemPrompt
      }
    });
    const draft = response?.text || "Failed to generate letter.";
    logActivityToSheet('CHAT', `Drafted Official Letter: ${details.subject}`);
    return draft;
  } catch (e) {
    return "Error generating letter.";
  }
};

// --- RAG & Chat Logic ---
export const generateEngineeringResponse = async (
  prompt: string, 
  history: { role: string; parts: { text: string }[] }[],
  attachment?: { mimeType: string; data: string } | null,
  contextFiles: string[] = [],
  contextSource: 'USER_SELECTION' | 'AUTO_SEARCH' = 'AUTO_SEARCH'
) => {
  if (!getApiKey()) return "Error: API Key is missing.";

  try {
    const ai = getAiClient();
    const model = 'gemini-2.5-flash';
    const messageParts: any[] = [];
    
    // Augmented System Instruction
    const augmentedInstruction = `${SYSTEM_INSTRUCTION_RAG}
    
    If the user asks to find specific circuits or drawings (e.g. "Find 555 timer circuits"):
    1. Check the provided context for relevant files.
    2. If found, describe them.
    3. If NOT found in context, explicitly state "No relevant files found in the index" and then proceed to GENERATE the schematic/design using your internal knowledge.
    
    When generating circuit schematics:
    - You must output an SVG representation wrapped in <svg> tags.
    - Assign meaningful 'id' attributes to components (e.g., id="R1", id="C1").
    - Connect components with lines using class="wire".
    - Immediately after the </svg> tag, output a strictly valid JSON block enclosed in <<<COMPONENTS>>> and <<<END_COMPONENTS>>> listing the components used.
    Example JSON structure:
    <<<COMPONENTS>>>
    [
      {"designator": "R1", "type": "Resistor", "value": "10k", "description": "Pull-up resistor"},
      {"designator": "U1", "type": "IC", "value": "NE555", "description": "Timer IC"}
    ]
    <<<END_COMPONENTS>>>
    `;

    if (contextFiles.length > 0) {
      const label = contextSource === 'USER_SELECTION' 
        ? "USER SELECTED CONTEXT (High Priority - Focus strictly on these files):" 
        : "AUTOMATICALLY RETRIEVED CONTEXT (Use if relevant to query):";
      messageParts.push({ text: `${label}\n${contextFiles.join('\n---\n')}\n\n` });
    }
    if (attachment) {
      messageParts.push({ inlineData: attachment });
    }
    if (prompt) {
      messageParts.push({ text: prompt });
    }

    const chat = ai.chats.create({
      model,
      config: { systemInstruction: augmentedInstruction, temperature: 0.2 },
      history: history.map(h => ({ role: h.role, parts: h.parts })),
    });

    const payload = messageParts.length === 1 && messageParts[0].text ? messageParts[0].text : messageParts;
    const result = await chat.sendMessage({ message: payload });
    
    // Log Activity
    logActivityToSheet('CHAT', `[ENGINEERING] User: ${prompt} | Context: ${contextSource} (${contextFiles.length} files)`);

    return result.text;
  } catch (error) {
    console.error("Gemini Chat Error:", error);
    return "Error connecting to AI service.";
  }
};

export const generateMetroDrawing = async (description: string) => {
  if (!getApiKey()) return null;
  try {
    const response = await safeGenerateContent({
      model: 'gemini-2.5-flash-image',
      contents: { parts: [{ text: `Technical engineering drawing: ${description}` }] },
    });
    for (const part of response.candidates?.[0]?.content?.parts || []) {
      if (part.inlineData) return `data:image/png;base64,${part.inlineData.data}`;
    }
    return null;
  } catch (error) {
    return null;
  }
};

// --- Gemini Live (Voice Agent) ---
const voiceTools = [
  {
    functionDeclarations: [
      {
        name: "selectDocument",
        description: "Select a document from the list for analysis by name.",
        parameters: { type: Type.OBJECT, properties: { fileName: { type: Type.STRING } }, required: ["fileName"] }
      },
      {
        name: "startAnalysis",
        description: "Start the analysis process and export the report.",
        parameters: { type: Type.OBJECT, properties: { format: { type: Type.STRING } }, required: ["format"] }
      },
      {
        name: "draftEmail",
        description: "Draft an email based on voice commands.",
        parameters: {
          type: Type.OBJECT,
          properties: {
             to: { type: Type.STRING },
             topic: { type: Type.STRING },
             keyPoints: { type: Type.STRING }
          },
          required: ["topic"]
        }
      }
    ]
  }
];

export class VoiceAgentService {
  private sessionPromise: Promise<any> | null = null;
  private inputAudioContext: AudioContext | null = null;
  private outputAudioContext: AudioContext | null = null;
  private nextStartTime = 0;
  private sources = new Set<AudioBufferSourceNode>();
  private mediaStream: MediaStream | null = null;
  
  public onTranscriptionUpdate: ((user: string, model: string) => void) | null = null;
  public onStatusChange: ((status: string) => void) | null = null;
  public onToolCall: ((name: string, args: any) => Promise<any>) | null = null;

  async connect(userName: string = 'Engineer', availableFiles: string[] = []) {
    if (!getApiKey()) throw new Error("API Key missing");

    try {
        this.onStatusChange?.('connecting');
        
        const ai = getAiClient();
        
        // Initialize audio contexts with proper error handling
        try {
          this.inputAudioContext = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
          this.outputAudioContext = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
        } catch (audioError) {
          console.error("Audio context initialization failed:", audioError);
          throw new Error("Audio not supported in this browser");
        }
        
        // Request microphone access with better error handling
        try {
          this.mediaStream = await navigator.mediaDevices.getUserMedia({ 
              audio: {
                  echoCancellation: true,
                  noiseSuppression: true,
                  autoGainControl: true,
                  sampleRate: 16000
              } 
          });
        } catch (micError) {
          console.error("Microphone access denied:", micError);
          throw new Error("Microphone access required for voice agent");
        }
        
        // Inject available files into the system instruction for RAG-like awareness
        const fileListContext = availableFiles.length > 0 
            ? `\n\n[SYSTEM CONTEXT]\nThe following documents are available in the secure drive. If the user asks to open/analyze/select a file, try to match it to one of these exact names and call the "selectDocument" tool with the exact filename:\n${availableFiles.join('\n')}\n[END CONTEXT]` 
            : "";

        this.sessionPromise = ai.live.connect({
        model: 'gemini-2.0-flash-exp',
        callbacks: {
            onopen: () => {
                this.onStatusChange?.('connected');
                this.startAudioStream(this.mediaStream!);
                logActivityToSheet('VOICE_COMMAND', 'Voice Session Started');
            },
            onmessage: (msg) => this.handleMessage(msg),
            onclose: () => {
                this.onStatusChange?.('idle');
                this.cleanup();
                logActivityToSheet('VOICE_COMMAND', 'Voice Session Ended', userName);
            },
            onerror: (e) => { 
                console.error("Voice session error:", e); 
                this.onStatusChange?.('error');
                this.cleanup();
            }
        },
        config: {
            responseModalities: [Modality.AUDIO],
            speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Kore' } } },
            systemInstruction: `You are VOID, an AI assistant for KMRCL Metro Intelligence. Address the user as "${userName}". The admin is "Shashi". Be helpful, concise, and professional. ${fileListContext}`,
            inputAudioTranscription: {},
            outputAudioTranscription: {},
            tools: voiceTools,
        }
        });
        
        await this.sessionPromise;
        return this.sessionPromise;
    } catch (e: any) {
        this.onStatusChange?.('error');
        this.cleanup();
        throw new Error(`Voice connection failed: ${e.message}`);
    }
  }

  private startAudioStream(stream: MediaStream) {
    if (!this.inputAudioContext || !stream) return;
    
    try {
      const source = this.inputAudioContext.createMediaStreamSource(stream);
      const processor = this.inputAudioContext.createScriptProcessor(4096, 1, 1);
      
      processor.onaudioprocess = (e) => {
        const inputData = e.inputBuffer.getChannelData(0);
        const b64Data = this.pcmToB64(inputData);
        this.sessionPromise?.then(session => {
          session.sendRealtimeInput({ media: { mimeType: 'audio/pcm;rate=16000', data: b64Data } });
        }).catch(err => {
          console.error("Audio stream error:", err);
        });
      };
      
      source.connect(processor);
      processor.connect(this.inputAudioContext.destination);
    } catch (error) {
      console.error("Audio stream setup failed:", error);
      this.onStatusChange?.('error');
    }
  }

  private async handleMessage(message: LiveServerMessage) {
    try {
      // Audio Playback
      const audioData = message.serverContent?.modelTurn?.parts?.[0]?.inlineData?.data;
      if (audioData && this.outputAudioContext) {
        this.nextStartTime = Math.max(this.nextStartTime, this.outputAudioContext.currentTime);
        const audioBuffer = await this.decodeAudio(audioData, this.outputAudioContext);
        const source = this.outputAudioContext.createBufferSource();
        source.buffer = audioBuffer;
        source.connect(this.outputAudioContext.destination);
        source.start(this.nextStartTime);
        this.nextStartTime += audioBuffer.duration;
        this.sources.add(source);
        source.onended = () => this.sources.delete(source);
      }

      // Transcription Updates
      if (message.serverContent?.outputTranscription?.text || message.serverContent?.inputTranscription?.text) {
          const uText = message.serverContent?.inputTranscription?.text || '';
          const mText = message.serverContent?.outputTranscription?.text || '';
          
          if (uText.length > 5) logActivityToSheet('VOICE_COMMAND', `User Said: ${uText}`);
          
          this.onTranscriptionUpdate?.(uText, mText);
      }

      // Tool Calls
      if (message.toolCall) {
        for (const fc of message.toolCall.functionCalls) {
          logActivityToSheet('VOICE_COMMAND', `Tool Executed: ${fc.name}`, 'System');
          let result = { status: 'ok', message: 'Action executed' };
          if (this.onToolCall) {
            try { 
              result = await this.onToolCall(fc.name, fc.args); 
            } catch (e: any) { 
              result = { status: 'error', message: e.message }; 
            }
          }
          this.sessionPromise?.then(session => {
            session.sendToolResponse({ functionResponses: [{ id: fc.id, name: fc.name, response: { result } }] });
          });
        }
      }
    } catch (error) {
      console.error("Message handling error:", error);
    }
  }

  private cleanup() {
    // Stop all audio sources
    this.sources.forEach(s => {
      try { s.stop(); } catch (e) { /* ignore */ }
    });
    this.sources.clear();
    
    // Close audio contexts
    if (this.inputAudioContext) {
      this.inputAudioContext.close().catch(e => console.error("Input audio context close error:", e));
      this.inputAudioContext = null;
    }
    if (this.outputAudioContext) {
      this.outputAudioContext.close().catch(e => console.error("Output audio context close error:", e));
      this.outputAudioContext = null;
    }
    
    // Stop media stream
    if (this.mediaStream) {
      this.mediaStream.getTracks().forEach(track => track.stop());
      this.mediaStream = null;
    }
  }

  async disconnect() {
    this.cleanup();
    if (this.sessionPromise) {
      try {
        const session = await this.sessionPromise;
        if (session && session.close) {
          session.close();
        }
      } catch (e) {
        console.error("Session close error:", e);
      }
      this.sessionPromise = null;
    }
  }

  private pcmToB64(data: Float32Array): string {
    const l = data.length;
    const int16 = new Int16Array(l);
    for (let i = 0; i < l; i++) { int16[i] = Math.max(-32768, Math.min(32767, data[i] * 32768)); }
    let binary = '';
    const bytes = new Uint8Array(int16.buffer);
    const len = bytes.byteLength;
    for (let i = 0; i < len; i++) { binary += String.fromCharCode(bytes[i]); }
    return btoa(binary);
  }

  private decode(base64: string): Uint8Array {
    const binaryString = atob(base64);
    const len = binaryString.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) { bytes[i] = binaryString.charCodeAt(i); }
    return bytes;
  }

  private async decodeAudio(base64: string, ctx: AudioContext): Promise<AudioBuffer> {
    const data = this.decode(base64);
    const dataInt16 = new Int16Array(data.buffer);
    const buffer = ctx.createBuffer(1, dataInt16.length, 24000);
    const channelData = buffer.getChannelData(0);
    for (let i = 0; i < dataInt16.length; i++) { channelData[i] = dataInt16[i] / 32768.0; }
    return buffer;
  }
}
