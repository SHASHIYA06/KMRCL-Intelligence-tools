
import { GOOGLE_SCRIPT_URL, MOCK_FILES } from '../constants';
import { DriveFile, LogEntry } from '../types';

// In-memory store to share state between pages during the session
// Initialize mock files with a root parentId (undefined or 'root')
let localFiles: DriveFile[] = MOCK_FILES.map(f => ({ ...f, parentId: 'root' }));

// Cache for files fetched from API to allow Voice Agent to see them
let cachedApiFiles: DriveFile[] = [];

// Sync Status State
let syncState: { status: 'IDLE' | 'SYNCING' | 'ERROR' | 'SUCCESS'; lastSynced: Date | null; message?: string } = {
    status: 'IDLE',
    lastSynced: null
};

// --- NEW: Real-time System State ---
let systemLogs: { id: number; action: string; time: string; status: 'success' | 'processing' | 'logged' }[] = [
    { id: 1, action: "System Boot Sequence", time: "Just now", status: "success" }
];
let ocrProcessedCount = 0;

export const addToSystemLog = (action: string, status: 'success' | 'processing' | 'logged' = 'logged') => {
    const newLog = {
        id: Date.now(),
        action: action,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
        status: status
    };
    // Keep last 50 logs
    systemLogs = [newLog, ...systemLogs].slice(0, 50);
};

export const getSystemLogs = () => systemLogs;

export const incrementOcrCount = () => {
    ocrProcessedCount++;
    addToSystemLog("OCR Extraction Completed", "success");
};

export const getOcrCount = () => ocrProcessedCount;

export const getDriveSyncStatus = () => syncState;

// Extended Mock Data for Fallback
const FALLBACK_FILES: DriveFile[] = [
  { id: 'f1', name: 'Engineering Drawings', mimeType: 'application/vnd.google-apps.folder', url: '#', modifiedTime: '2024-03-01', parentId: 'root' },
  { id: 'f2', name: 'Safety Reports', mimeType: 'application/vnd.google-apps.folder', url: '#', modifiedTime: '2024-02-28', parentId: 'root' },
  { id: 'f3', name: 'Contractor Invoices', mimeType: 'application/vnd.google-apps.folder', url: '#', modifiedTime: '2024-01-15', parentId: 'root' },
  // Nested files for demo
  { id: 'nested1', name: 'Substation_Alpha_Schematic.pdf', mimeType: 'application/pdf', url: '#', size: '1.5MB', modifiedTime: '2024-03-02', parentId: 'f1', description: 'Schematic for Alpha Sector' },
];

const isValidUrl = (url: string) => {
  try {
    return url.startsWith('http');
  } catch (e) {
    return false;
  }
};

const safeFetch = async (url: string, options?: RequestInit, timeout = 10000): Promise<Response | null> => {
  if (typeof navigator !== 'undefined' && !navigator.onLine) return null;
  if (!isValidUrl(url)) return null;

  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeout);
  try {
    const response = await fetch(url, { ...options, signal: controller.signal });
    clearTimeout(id);
    return response;
  } catch (e) {
    clearTimeout(id);
    console.error("Fetch failed", e);
    return null;
  }
};

const filterValidFiles = (files: DriveFile[]): DriveFile[] => {
    return files.filter(f => {
        // Strict ID check
        if (!f.id) return false;

        const name = f.name?.trim() || '';
        const mime = f.mimeType?.toLowerCase() || '';
        
        // Strict filtering of unwanted files
        if (!name) return false;
        if (name.toLowerCase() === 'unknown file') return false;
        if (name.toLowerCase() === 'untitled') return false;
        if (mime === 'unknown') return false;
        
        // Filter out strict octet-stream unless it has a known extension
        if (mime === 'application/octet-stream' && !name.includes('.')) return false;

        // Filter out Google App Scripts or specialized internal formats that users can't open
        if (mime === 'application/vnd.google-apps.script') return false;
        
        if (name.toLowerCase().startsWith('copy of')) return false; 
        
        return true;
    });
};

// Updated to accept folderId filtering
export const fetchDriveFiles = async (folderId: string = 'root'): Promise<DriveFile[]> => {
  let fetchedFiles: DriveFile[] = [];
  let useFallback = true;
  
  // Update Sync Status
  syncState = { ...syncState, status: 'SYNCING' };
  
  // 1. Try fetching from Real Google Drive
  try {
    // Check for custom URL override in localStorage
    const customUrl = localStorage.getItem('kmrcl_script_url');
    const targetUrl = customUrl || GOOGLE_SCRIPT_URL;

    if (isValidUrl(targetUrl)) {
        console.log(`Fetching from Drive: ${targetUrl} (Folder: ${folderId})`);
        
        // Ensure credentials: 'omit' to handle GAS CORS quirks
        // 'action=listFiles' is the expected param by the GAS backend
        const response = await safeFetch(`${targetUrl}?action=listFiles&folderId=${folderId}`, {
            method: 'GET',
            credentials: 'omit',
            headers: { 'Accept': 'application/json' }
        });

        if (response && response.ok) {
            const data = await response.json();
            // The script might return { files: [...] } or just [...]
            const rawFiles = data.files || data; 
            
            if (Array.isArray(rawFiles)) {
                fetchedFiles = filterValidFiles(rawFiles);
                console.log(`Fetched ${fetchedFiles.length} valid files from Drive API.`);
                useFallback = false;
                syncState = { status: 'SUCCESS', lastSynced: new Date() };
                addToSystemLog(`Synced ${fetchedFiles.length} files from Drive`, "success");
            } else {
                 console.warn("Drive API returned non-array format:", data);
                 syncState = { ...syncState, status: 'ERROR', message: 'Invalid Format' };
            }
        } else {
            console.warn("Drive Fetch response not OK", response?.status);
            syncState = { ...syncState, status: 'ERROR', message: `HTTP ${response?.status}` };
        }
    } else {
        syncState = { ...syncState, status: 'IDLE', message: 'No API URL' };
    }
  } catch (error) {
    console.error("Drive Fetch Error:", error);
    syncState = { ...syncState, status: 'ERROR', message: 'Network Error' };
  }

  // 2. Process Real Files (if any)
  if (!useFallback) {
       const processedFetchedFiles = fetchedFiles.map(f => ({
          ...f,
          // Ensure mandatory fields
          id: f.id || Math.random().toString(36),
          name: f.name || 'Untitled Document',
          mimeType: f.mimeType || 'application/octet-stream',
          url: f.url || '#',
          size: f.size || '-',
          // Standardize date format to YYYY-MM-DD for reliable filtering
          modifiedTime: f.modifiedTime ? new Date(f.modifiedTime).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
          parentId: folderId // Assign current requested folder as parent context
      }));

      // UPDATE GLOBAL CACHE for Voice Search visibility
      // We perform a merge to keep existing cached files if they aren't in this folder,
      // but overwrite ones that match IDs.
      processedFetchedFiles.forEach(pf => {
          const idx = cachedApiFiles.findIndex(c => c.id === pf.id);
          if (idx >= 0) cachedApiFiles[idx] = pf;
          else cachedApiFiles.push(pf);
      });
      
      // Combine with any locally uploaded files for this session
      const uploadsOnly = localFiles.filter(f => f.parentId === folderId && f.tags?.includes('Uploaded'));
      
      // We return the live API files + any temp local uploads
      return [...processedFetchedFiles, ...uploadsOnly];
  }

  // 3. Fallback to Mocks (only if API failed or no files found and it's the root)
  // We keep mock files only if we are in 'root' and API failed to simulate the app experience
  const allMockFiles = [...FALLBACK_FILES, ...localFiles];
  const relevantMockFiles = allMockFiles.filter(f => {
      if (folderId === 'root') return f.parentId === 'root' || !f.parentId;
      return f.parentId === folderId;
  });

  return relevantMockFiles;
};

// New Helper: Get all known files (flat list) for AI context
export const getAllKnownFiles = (): DriveFile[] => {
    const allFilesMap = new Map<string, DriveFile>();
    [...cachedApiFiles, ...localFiles, ...FALLBACK_FILES].forEach(f => {
        if (f.id && !f.mimeType.includes('folder')) allFilesMap.set(f.id, f);
    });
    return Array.from(allFilesMap.values());
};

export const findBestMatchingFile = (query: string): DriveFile | null => {
    if (!query) return null;
    const cleanQuery = query.toLowerCase().trim().replace(/[-_]/g, ' ').replace(/\s+/g, ' '); 
    
    const allFiles = getAllKnownFiles();
    
    // Helper to strip extension (e.g. "report.pdf" -> "report")
    const getNameWithoutExt = (name: string) => name.replace(/\.[^/.]+$/, "").toLowerCase().replace(/[-_]/g, ' ');

    // 1. Exact Name Match (insensitive)
    let match = allFiles.find(f => f.name.toLowerCase() === cleanQuery);

    // 2. Name without extension match (e.g. "Safety Protocols" matches "Safety Protocols.pdf")
    if (!match) {
        match = allFiles.find(f => getNameWithoutExt(f.name) === cleanQuery);
    }

    // 3. Contains Query (in name or description)
    if (!match) {
        match = allFiles.find(f => f.name.toLowerCase().replace(/[-_]/g, ' ').includes(cleanQuery));
    }
    
    // 4. Word overlap (Smart Keyword Match - IMPROVED)
    if (!match) {
        const queryWords = cleanQuery.split(' ').filter(w => w.length > 2); 
        if (queryWords.length > 0) {
            let bestCandidate: DriveFile | null = null;
            let maxMatches = 0;

            allFiles.forEach(f => {
                const fName = f.name.toLowerCase().replace(/[-_]/g, ' ');
                // Count how many query words appear in file name
                const matches = queryWords.filter(qw => fName.includes(qw)).length;
                
                // Boost score if the query word starts with the file name part
                let score = matches * 10; 
                if (fName.startsWith(cleanQuery)) score += 20;

                if (score > maxMatches) {
                    maxMatches = score;
                    bestCandidate = f;
                }
            });
            
            if (bestCandidate && maxMatches > 0) {
                 match = bestCandidate;
            }
        }
    }

    return match || null;
};

export const searchDriveFiles = async (query: string): Promise<DriveFile[]> => {
  addToSystemLog(`Searching for: ${query}`, "processing");
  // First, try to search using the API if possible
  let apiResults: DriveFile[] = [];
  try {
      const customUrl = localStorage.getItem('kmrcl_script_url');
      const targetUrl = customUrl || GOOGLE_SCRIPT_URL;
      if (isValidUrl(targetUrl)) {
         const response = await safeFetch(`${targetUrl}?action=search&query=${encodeURIComponent(query)}`, { credentials: 'omit' });
         if (response && response.ok) {
             const data = await response.json();
             const rawResults = data.results || data;
             if (Array.isArray(rawResults)) {
                 apiResults = filterValidFiles(rawResults);
                 // Cache these results too
                 apiResults.forEach(pf => {
                    const idx = cachedApiFiles.findIndex(c => c.id === pf.id);
                    if (idx >= 0) cachedApiFiles[idx] = pf;
                    else cachedApiFiles.push(pf);
                });
             }
         }
      }
  } catch (e) {
      // Fallback
  }

  // Local Search Fallback
  const allFiles = [...FALLBACK_FILES, ...localFiles, ...cachedApiFiles];
  const localResults = allFiles.filter(f => 
    f.name.toLowerCase().includes(query.toLowerCase()) || 
    (f.description && f.description.toLowerCase().includes(query.toLowerCase())) ||
    (f.tags && f.tags.some(t => t.toLowerCase().includes(query.toLowerCase())))
  );

  // Remove duplicates by ID
  const combined = [...apiResults, ...localResults];
  const unique = Array.from(new Map(combined.map(item => [item.id, item])).values());

  return unique;
};

// Renamed and upgraded logging function
export const logActivityToSheet = async (
    activityType: 'SEARCH' | 'VOICE_COMMAND' | 'CHAT' | 'ANALYSIS' | 'EMAIL_DRAFT', 
    details: string, 
    user: string = 'Engineer'
) => {
  // Update internal system log for dashboard visualization
  addToSystemLog(`${activityType}: ${details.substring(0, 30)}...`, "logged");

  if (typeof navigator !== 'undefined' && !navigator.onLine) return;
  
  const customUrl = localStorage.getItem('kmrcl_script_url');
  const targetUrl = customUrl || GOOGLE_SCRIPT_URL;
  if (!isValidUrl(targetUrl)) return;

  try {
    const payload = JSON.stringify({
        action: 'log_activity', // Generic action handler in script
        timestamp: new Date().toISOString(),
        type: activityType,
        details: details,
        user: user
    });

    console.log(`Logging to Sheet: [${activityType}] ${details}`);

    // Use no-cors for POST to Google Scripts
    fetch(targetUrl, {
        method: 'POST',
        mode: 'no-cors', 
        headers: { 'Content-Type': 'text/plain' },
        body: payload
    }).catch(e => console.error("Log failed silently", e));
  } catch (e) {
    // Ignore
  }
};

// Backwards compatibility alias
export const logSearchToSheet = (query: string, details: string = '') => {
    return logActivityToSheet('SEARCH', `Query: ${query} | ${details}`);
};

export const createFolder = async (name: string, parentId: string = 'root'): Promise<boolean> => {
    const newFolder: DriveFile = {
        id: `folder-${Date.now()}`,
        name: name,
        mimeType: 'application/vnd.google-apps.folder',
        url: '#',
        modifiedTime: new Date().toISOString().split('T')[0],
        size: '-',
        description: 'Created by User',
        parentId: parentId
    };
    localFiles.unshift(newFolder);
    logActivityToSheet('ANALYSIS', `Created Folder: ${name}`);
    addToSystemLog(`Created Folder: ${name}`, "success");
    return true;
};

export const uploadFileToDrive = async (file: File, parentId: string = 'root'): Promise<boolean> => {
  return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = async () => {
          const base64 = (reader.result as string).split(',')[1];
          
          const newFile: DriveFile = {
              id: `local-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
              name: file.name,
              mimeType: file.type || 'application/octet-stream',
              url: '#',
              size: `${(file.size / 1024 / 1024).toFixed(2)} MB`,
              modifiedTime: new Date().toISOString().split('T')[0],
              description: 'Uploaded via Web Interface',
              tags: ['Uploaded'],
              parentId: parentId,
              fileData: base64 // Store content for Client-side AI processing
          };
          
          localFiles.unshift(newFile);
          logActivityToSheet('ANALYSIS', `Uploaded File: ${file.name} (${file.size} bytes)`);
          addToSystemLog(`Uploaded ${file.name}`, "success");

          // Try to sync with backend if available
          if (typeof navigator !== 'undefined' && navigator.onLine) {
              const customUrl = localStorage.getItem('kmrcl_script_url');
              const targetUrl = customUrl || GOOGLE_SCRIPT_URL;

              if (isValidUrl(targetUrl)) {
                  try {
                      fetch(targetUrl, {
                          method: 'POST',
                          mode: 'no-cors',
                          headers: { 'Content-Type': 'text/plain' },
                          body: JSON.stringify({
                              action: 'upload',
                              name: file.name,
                              mimeType: file.type,
                              data: base64,
                              parentId: parentId
                          })
                      }).catch(e => console.error("Cloud sync failed"));
                  } catch (e) { }
              }
          }
          resolve(true);
      };
      reader.readAsDataURL(file);
  });
};

export const downloadFile = (file: DriveFile) => {
  logActivityToSheet('ANALYSIS', `Downloaded File: ${file.name}`);
  if (file.url === '#' || !file.url.startsWith('http')) {
    // If we have local fileData, create a blob from it
    if (file.fileData) {
        const byteCharacters = atob(file.fileData);
        const byteNumbers = new Array(byteCharacters.length);
        for (let i = 0; i < byteCharacters.length; i++) {
            byteNumbers[i] = byteCharacters.charCodeAt(i);
        }
        const byteArray = new Uint8Array(byteNumbers);
        const blob = new Blob([byteArray], { type: file.mimeType });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = file.name;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
        return;
    }

    const dummyContent = `KMRCL SECURE DOCUMENT\n\nFile: ${file.name}\nDescription: ${file.description || 'No description'}\nID: ${file.id}\n\n[Content simulated for download]`;
    const blob = new Blob([dummyContent], { type: 'text/plain' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = file.name;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
  } else {
    window.open(file.url, '_blank');
  }
};

export const deleteFile = async (fileId: string): Promise<boolean> => {
    const file = localFiles.find(f => f.id === fileId);
    if (file) logActivityToSheet('ANALYSIS', `Deleted File: ${file.name}`);
    
    localFiles = localFiles.filter(f => f.id !== fileId);
    cachedApiFiles = cachedApiFiles.filter(f => f.id !== fileId); // Also remove from cache
    return new Promise((resolve) => {
        setTimeout(() => {
            console.log(`Deleting file ${fileId}`);
            resolve(true);
        }, 800);
    });
};

export const getFileStats = async (forceRefresh = false) => {
    // Try to get real stats first based on what we've fetched + local
    const allFiles = [...cachedApiFiles, ...localFiles];
    if (allFiles.length > 0 && !forceRefresh) {
        const total = allFiles.length;
        const pdfs = allFiles.filter(f => f.mimeType.includes('pdf')).length;
        const images = allFiles.filter(f => f.mimeType.includes('image')).length;
        const sheets = allFiles.filter(f => f.mimeType.includes('sheet') || f.mimeType.includes('excel')).length;
        const folders = allFiles.filter(f => f.mimeType.includes('folder')).length;
        const docs = total - pdfs - images - sheets - folders;
        return { total, distribution: { pdfs, images, sheets, folders, docs } };
    }
    
    try {
        // Fetch files (implicitly updates syncState)
        const files = await fetchDriveFiles('root');
        const total = files.length;
        const pdfs = files.filter(f => f.mimeType.includes('pdf')).length;
        const images = files.filter(f => f.mimeType.includes('image')).length;
        const sheets = files.filter(f => f.mimeType.includes('sheet') || f.mimeType.includes('excel')).length;
        const folders = files.filter(f => f.mimeType.includes('folder')).length;
        const docs = total - pdfs - images - sheets - folders;
        return { total, distribution: { pdfs, images, sheets, folders, docs } };
    } catch(e) {
        return { total: 0, distribution: { pdfs: 0, images: 0, sheets: 0, folders: 0, docs: 0 } };
    }
};
