
export enum FileType {
  PDF = 'PDF',
  DOCX = 'DOCX',
  XLSX = 'XLSX',
  IMAGE = 'IMAGE',
  JSON = 'JSON',
  FOLDER = 'FOLDER',
  UNKNOWN = 'UNKNOWN'
}

export interface DriveFile {
  id: string;
  name: string;
  mimeType: string;
  url: string;
  size?: string;
  modifiedTime?: string;
  parentId?: string;
  description?: string;
  icon?: string;
  tags?: string[]; // Added for filtering
  fileData?: string; // Base64 content for local processing
}

export interface SearchResult {
  id: string;
  fileName: string;
  snippet: string;
  relevance: number;
  metadata?: Record<string, any>;
}

export interface CircuitComponent {
  designator: string; // e.g. R1, C1, U1
  type: string;       // e.g. Resistor, Capacitor
  value: string;      // e.g. 10k, 100uF
  description?: string;
}

export type AiMode = 'ENGINEERING' | 'GENERAL' | 'EMAIL' | 'LETTER';

export interface ChatMessage {
  id: string;
  role: 'user' | 'model' | 'system';
  content: string;
  timestamp: number;
  attachments?: string[]; // base64
  retrievedFiles?: DriveFile[]; // RAG results
  circuitComponents?: CircuitComponent[]; // Extracted circuit data
  isThinking?: boolean;
  mode?: AiMode;
  resolution?: 'STANDARD' | 'HD' | '4K'; // Export resolution preference
}

export interface EmailDraft {
  to: string;
  subject: string;
  body: string;
  tone: string;
}

export interface LetterDraft {
  refNo: string;
  date: string;
  recipient: string; // The full "To" address block
  attn: string;
  subject: string;
  reference: string;
  bodyPoints: string;
  signatoryName: string;
  signatoryDesignation: string;
  isBemlFormat: boolean;
  cc: string;
}

export interface AnalysisStats {
  totalFiles: number;
  processedFiles: number;
  warnings: number;
  lastSync: string;
}

export interface VoiceCommand {
  type: 'SELECT_FILE' | 'START_ANALYSIS';
  payload: any;
  id: string;
}

export interface LogEntry {
  timestamp: string;
  query?: string; // Legacy
  user: string;
  type: 'SEARCH' | 'ANALYSIS' | 'UPLOAD' | 'VOICE_COMMAND' | 'CHAT' | 'EMAIL_DRAFT';
  details: string;
}

export interface SystemSettings {
  ragEnabled: boolean;
  vectorDbUrl: string;
  k8sClusterStatus: 'healthy' | 'degraded' | 'offline';
  dockerContainerCount: number;
  mcpServerEnabled: boolean;
  theme: 'neon' | 'cyber' | 'minimal';
}

export interface FilterState {
  type: string;
  startDate: string;
  endDate: string;
  minSizeMB: number;
  tags: string[];
}

// --- AUTHENTICATION & PERMISSIONS TYPES ---

export type UserRole = 'ADMIN' | 'USER';

export interface UserPermissions {
    driveBrowser: boolean;
    docAnalysis: boolean;
    intelligenceHub: {
        metroRag: boolean;
        general: boolean;
        email: boolean;
        letter: boolean;
    };
}

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  mobile?: string;
  password?: string;
  lastLogin?: string;
  permissions: UserPermissions; // New granular permissions
}

export interface AuthContextType {
  user: User | null;
  login: (user: User) => void;
  logout: () => void;
}
