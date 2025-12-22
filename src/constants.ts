

export const APP_NAME = "KMRCL Metro Intelligence";
export const APP_VERSION = "2.3.0-stable";

// Updated GAS URL as per user request (Fixed Sync Issue)
export const GOOGLE_SCRIPT_URL = "https://script.google.com/macros/s/AKfycby6XbPuA7XDjIbInBg8-CmBv1Ig7hy5-BuKq6q4ovSJfbDxz3JdkyK08Y9pUI4S2CiZ7A/exec";

// Updated Sheet ID
export const GOOGLE_SHEET_ID = "1fUHu5fb5Z77Aq4cAiK4Zybq-Dpgjf0xlzEDsxIgT9m8";

export const SYSTEM_INSTRUCTION_RAG = `
You are KMRCL's Chief AI Metro Engineer. 
Your task is to analyze metro engineering documents, drawings, and specifications.
- When asked about technical details (voltage, part numbers), be precise.
- If the user asks for a drawing, generate a detailed description of the drawing first, then the system will visualize it.
- You have access to the KMRCL document index.
- Format your answers with clear headings and bullet points using Markdown.
`;

// Explicitly set Admin Code
export const ADMIN_CODE = "9799494321";

export const EMAIL_TONES = [
  "Professional", 
  "Formal", 
  "Diplomatic", 
  "Urgent", 
  "Persuasive", 
  "Empathetic", 
  "Direct", 
  "Appreciative", 
  "Apologetic", 
  "Enthusiastic", 
  "Legalistic",
  "Concise"
];

export const MOCK_FILES = [
  { 
    id: '1', 
    name: 'KMRCL-Rolling-Stock-Specs-v2.pdf', 
    mimeType: 'application/pdf', 
    url: '#', 
    size: '2.4MB', 
    modifiedTime: '2023-10-15',
    description: 'Comprehensive technical specifications for the new rolling stock, including motor capacity, braking systems, and seating arrangements.',
    tags: ['Technical', 'Specs', 'Rolling Stock']
  },
  { 
    id: '2', 
    name: 'Signaling-System-Schematic.png', 
    mimeType: 'image/png', 
    url: '#', 
    size: '4.1MB', 
    modifiedTime: '2023-11-02',
    description: 'High-resolution diagram of the central signaling control unit, track circuits, and interlocking logic flow.',
    tags: ['Drawing', 'Signaling', 'Schematic']
  },
  { 
    id: '3', 
    name: 'Station-Layout-Phase1.docx', 
    mimeType: 'application/vnd.google-apps.document', 
    url: '#', 
    size: '1.2MB', 
    modifiedTime: '2023-12-01',
    description: 'Architectural layout and flow analysis for Phase 1 metro stations, including ticket counters, turnstiles, and emergency exits.',
    tags: ['Architecture', 'Station', 'Phase 1']
  },
  { 
    id: '4', 
    name: 'Power-Distribution-Log.xlsx', 
    mimeType: 'application/vnd.google-apps.spreadsheet', 
    url: '#', 
    size: '850KB', 
    modifiedTime: '2024-01-10',
    description: 'Monthly logs of power consumption, substation load distribution, and transformer efficiency ratings.',
    tags: ['Log', 'Power', 'Maintenance']
  },
  { 
    id: '5', 
    name: 'Safety-Protocols-2024.pdf', 
    mimeType: 'application/pdf', 
    url: '#', 
    size: '3.3MB', 
    modifiedTime: '2024-02-14',
    description: 'Updated safety guidelines for track maintenance personnel, high-voltage handling procedures, and emergency response protocols.',
    tags: ['Safety', 'HR', 'Protocols']
  },
  { 
    id: '6', 
    name: 'Timer-Circuit-Design-555.svg', 
    mimeType: 'image/svg+xml', 
    url: '#', 
    size: '45KB', 
    modifiedTime: '2024-03-20',
    description: 'Standard astable multivibrator circuit using a 555 timer IC with adjustable duty cycle.',
    tags: ['Circuit', 'Schematic', '555 Timer']
  },
];