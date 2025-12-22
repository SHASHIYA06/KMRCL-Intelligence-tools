
import React, { useState, useEffect } from 'react';
import { FileText, Download, CheckCircle, AlertTriangle, Mic, Plus, FolderPlus, Grid, List, UploadCloud, ScanLine, X, Copy, Cpu, Activity, Folder, ChevronRight, Home, Table, FileSpreadsheet } from 'lucide-react';
import { fetchDriveFiles, createFolder, uploadFileToDrive } from '../services/driveService';
import { performOCR, analyzeStructuredData } from '../services/geminiService';
import { VoiceCommand, DriveFile } from '../types';

declare global {
    interface Window {
        XLSX: any;
    }
}

interface DocAnalysisProps {
  voiceCommand?: VoiceCommand | null;
  onToggleVoice?: () => void;
}

interface AnalysisResult {
    summary: string;
    specs: { label: string; value: string }[];
    warnings: string[];
    recommendations?: string[];
}

export const DocAnalysis: React.FC<DocAnalysisProps> = ({ voiceCommand, onToggleVoice }) => {
  const [activeTab, setActiveTab] = useState<'analysis' | 'ocr'>('analysis');
  const [selectedFiles, setSelectedFiles] = useState<string[]>([]);
  const [lastProcessedCommandId, setLastProcessedCommandId] = useState<string>('');
  const [files, setFiles] = useState<DriveFile[]>([]);
  const [loading, setLoading] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  
  // Real Analysis State
  const [rawFileContent, setRawFileContent] = useState<any[]>([]); // JSON representation of Excel/CSV
  const [currentFileName, setCurrentFileName] = useState<string>('');
  
  // Folder Navigation State
  const [currentFolder, setCurrentFolder] = useState<DriveFile | null>(null); // null = root
  const [folderStack, setFolderStack] = useState<DriveFile[]>([]); // For breadcrumbs

  // Dynamic Extraction State
  const [extractionPreview, setExtractionPreview] = useState<AnalysisResult | null>(null);

  // OCR State
  const [ocrFile, setOcrFile] = useState<File | null>(null);
  const [ocrResult, setOcrResult] = useState('');
  const [isProcessingOcr, setIsProcessingOcr] = useState(false);
  const [ocrPreview, setOcrPreview] = useState<string | null>(null);

  // Load files when folder changes
  useEffect(() => {
      loadFiles();
  }, [currentFolder]);

  const loadFiles = async () => {
      setLoading(true);
      const folderId = currentFolder ? currentFolder.id : 'root';
      const data = await fetchDriveFiles(folderId);
      setFiles(data);
      setLoading(false);
  };

  // --- Real File Handling ---
  const handleImportForAnalysis = async (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files && e.target.files[0]) {
          const file = e.target.files[0];
          setCurrentFileName(file.name);
          setExtractionPreview(null);
          setRawFileContent([]);

          if (file.name.endsWith('.xlsx') || file.name.endsWith('.xls') || file.name.endsWith('.csv')) {
              readSpreadsheet(file);
          } else {
              // For other files, we just use metadata/simulated content for now in this demo
              // or handle via OCR tab
              alert("For PDF/Images, please use the OCR Workbench tab. This uploader is optimized for Excel/CSV data analysis.");
          }
      }
  };

  const readSpreadsheet = (file: File) => {
      const reader = new FileReader();
      reader.onload = (evt) => {
          try {
              const bstr = evt.target?.result;
              if (window.XLSX) {
                  const wb = window.XLSX.read(bstr, { type: 'binary' });
                  const wsname = wb.SheetNames[0];
                  const ws = wb.Sheets[wsname];
                  const data = window.XLSX.utils.sheet_to_json(ws, { header: 1 });
                  
                  // Convert array of arrays to array of objects for better processing
                  if (data.length > 1) {
                      const headers = data[0] as string[];
                      const rows = data.slice(1) as any[][];
                      const jsonData = rows.map(row => {
                          const obj: any = {};
                          headers.forEach((header, index) => {
                              obj[header || `Column_${index + 1}`] = row[index] || '';
                          });
                          return obj;
                      });
                      setRawFileContent(jsonData);
                      
                      // Trigger Analysis immediately
                      runAIAnalysis(jsonData, file.name);
                  } else {
                      alert("The Excel file appears to be empty or has no data rows.");
                  }
              } else {
                  alert("Excel processor not loaded. Please refresh the page and try again.");
              }
          } catch (error) {
              console.error("Excel reading error:", error);
              alert("Error reading Excel file. Please ensure it's a valid .xlsx or .xls file.");
          }
      };
      reader.onerror = () => {
          alert("Error reading file. Please try again.");
      };
      reader.readAsBinaryString(file);
  };

  const runAIAnalysis = async (data: any[], fileName: string) => {
      setAnalyzing(true);
      const dataStr = JSON.stringify(data.slice(0, 100)); // Send first 100 rows to AI for context
      const result = await analyzeStructuredData(dataStr, fileName);
      setExtractionPreview(result);
      setAnalyzing(false);
  };

  // Handle Voice Commands
  useEffect(() => {
    if (voiceCommand && voiceCommand.id !== lastProcessedCommandId) {
      setLastProcessedCommandId(voiceCommand.id);
      if (voiceCommand.type === 'START_ANALYSIS') {
        if (rawFileContent.length > 0) {
             generateExcelReport();
        } else {
             alert("Please upload an Excel/CSV file first to analyze.");
        }
      }
    }
  }, [voiceCommand, lastProcessedCommandId, files, rawFileContent]);

  const generateExcelReport = () => {
    if (!window.XLSX || !extractionPreview || rawFileContent.length === 0) return;

    // 1. Prepare Summary Sheet Data
    const summaryData = [
        ["Analysis Report", currentFileName],
        ["Generated By", "KMRCL AI Intelligence"],
        ["Date", new Date().toLocaleString()],
        [],
        ["EXECUTIVE SUMMARY"],
        [extractionPreview.summary],
        [],
        ["KEY METRICS / SPECS"],
        ...extractionPreview.specs.map(s => [s.label, s.value]),
        [],
        ["WARNINGS & ANOMALIES"],
        ...extractionPreview.warnings.map(w => ["⚠️ " + w]),
        [],
        ["RECOMMENDATIONS"],
        ...(extractionPreview.recommendations || []).map(r => ["✅ " + r])
    ];

    // 2. Create Workbook
    const wb = window.XLSX.utils.book_new();
    
    // 3. Add Summary Sheet
    const wsSummary = window.XLSX.utils.aoa_to_sheet(summaryData);
    window.XLSX.utils.book_append_sheet(wb, wsSummary, "AI Analysis Report");

    // 4. Add Raw Data Sheet
    const wsRaw = window.XLSX.utils.json_to_sheet(rawFileContent);
    window.XLSX.utils.book_append_sheet(wb, wsRaw, "Source Data");

    // 5. Save File
    window.XLSX.writeFile(wb, `KMRCL_Analysis_${currentFileName.split('.')[0]}_Report.xlsx`);
  };

  const handleCreateFolder = async () => {
      const name = prompt("Enter new folder name:");
      if (name) {
          await createFolder(name, currentFolder ? currentFolder.id : 'root');
          await loadFiles();
      }
  };

  const handleOcrUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files && e.target.files[0]) {
          const file = e.target.files[0];
          setOcrFile(file);
          setOcrResult('');
          const reader = new FileReader();
          reader.onload = () => {
              setOcrPreview(reader.result as string);
          };
          reader.readAsDataURL(file);
      }
  };

  const runOcrExtraction = async () => {
      if (!ocrFile) return;
      setIsProcessingOcr(true);
      setOcrResult('');
      
      try {
          const reader = new FileReader();
          reader.onload = async () => {
              try {
                  const dataUrl = reader.result as string;
                  const base64 = dataUrl.split(',')[1];
                  
                  if (!base64) {
                      throw new Error("Failed to convert file to base64");
                  }
                  
                  const text = await performOCR(base64, ocrFile.type, true);
                  setOcrResult(text);
              } catch (error: any) {
                  console.error("OCR processing error:", error);
                  setOcrResult(`OCR Error: ${error.message || 'Failed to process document'}`);
              } finally {
                  setIsProcessingOcr(false);
              }
          };
          
          reader.onerror = () => {
              setOcrResult("Error: Failed to read the uploaded file.");
              setIsProcessingOcr(false);
          };
          
          reader.readAsDataURL(ocrFile);
      } catch (error: any) {
          console.error("OCR setup error:", error);
          setOcrResult(`Setup Error: ${error.message}`);
          setIsProcessingOcr(false);
      }
  };

  // Navigation Logic
  const enterFolder = (folder: DriveFile) => {
      setFolderStack(prev => [...prev, folder]);
      setCurrentFolder(folder);
      setSelectedFiles([]); 
  };

  const navigateToBreadcrumb = (index: number) => {
      if (index === -1) {
          setFolderStack([]);
          setCurrentFolder(null);
      } else {
          const newStack = folderStack.slice(0, index + 1);
          setFolderStack(newStack);
          setCurrentFolder(newStack[newStack.length - 1]);
      }
      setSelectedFiles([]);
  };

  const handleToggleFile = (id: string) => {
      // For this demo version, since we can't easily "read" mock files from Drive without real backend,
      // we just select them visually. The real power is in the "Import for Analysis" button above.
      setSelectedFiles(prev => prev.includes(id) ? prev.filter(f => f !== id) : [...prev, id]);
  };

  return (
    <div className="h-full flex flex-col space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-white">Document Analysis</h2>
          <p className="text-xs text-gray-400 mt-1">AI-driven extraction for technical and legal documents.</p>
        </div>
        <div className="flex items-center space-x-3">
             <div className="flex bg-black/40 rounded-lg p-1 border border-white/10 mr-4">
                <button 
                    onClick={() => setActiveTab('analysis')}
                    className={`px-3 py-1.5 text-xs font-bold rounded-md transition-all ${activeTab === 'analysis' ? 'bg-neonBlue text-black' : 'text-gray-400 hover:text-white'}`}
                >
                    Excel/Data Analyst
                </button>
                <button 
                    onClick={() => setActiveTab('ocr')}
                    className={`px-3 py-1.5 text-xs font-bold rounded-md transition-all ${activeTab === 'ocr' ? 'bg-neonPurple text-white' : 'text-gray-400 hover:text-white'}`}
                >
                    OCR Workbench
                </button>
             </div>

            <button 
                onClick={onToggleVoice}
                className="p-2 rounded-full bg-gradient-to-r from-neonPurple to-pink-600 hover:shadow-[0_0_15px_rgba(188,19,254,0.5)] transition-all animate-pulse-slow"
                title="Activate Voice Commands"
            >
                <Mic className="w-5 h-5 text-white" />
            </button>
        </div>
      </div>

      {activeTab === 'analysis' ? (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 h-full overflow-hidden animate-fade-in">
            {/* File Selection / Import */}
            <div className="glass-panel rounded-2xl p-6 overflow-y-auto flex flex-col">
                <div className="flex justify-between items-center mb-6">
                    <h3 className="text-lg font-semibold text-gray-300 flex items-center">
                        <FileSpreadsheet className="mr-2 text-green-400"/> Data Import
                    </h3>
                </div>
                
                {/* Main Action: Upload for Analysis */}
                <div className="mb-6">
                    <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-white/20 rounded-xl cursor-pointer bg-white/5 hover:bg-white/10 hover:border-neonBlue/50 transition-all group">
                        <div className="flex flex-col items-center justify-center pt-5 pb-6">
                            <UploadCloud className="w-8 h-8 mb-2 text-gray-400 group-hover:text-neonBlue" />
                            <p className="mb-1 text-sm text-gray-400"><span className="font-semibold text-white">Click to analyze</span> Excel or CSV</p>
                            <p className="text-xs text-gray-500">Supports .xlsx, .xls, .csv</p>
                        </div>
                        <input type="file" className="hidden" accept=".csv, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet, application/vnd.ms-excel" onChange={handleImportForAnalysis} />
                    </label>
                </div>

                <div className="border-t border-white/10 pt-4">
                     <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">Drive Repository (Reference Only)</h4>
                     {/* Breadcrumbs */}
                    <div className="flex items-center space-x-2 text-sm text-gray-400 bg-black/40 p-2 rounded-lg border border-white/5 mb-2">
                        <button onClick={() => navigateToBreadcrumb(-1)} className="hover:text-neonBlue flex items-center">
                            <Home className="w-4 h-4 mr-1"/> Root
                        </button>
                        {folderStack.map((folder, idx) => (
                            <div key={folder.id} className="flex items-center">
                                <ChevronRight className="w-4 h-4 mx-1 text-gray-600"/>
                                <button onClick={() => navigateToBreadcrumb(idx)} className={`hover:text-neonBlue ${idx === folderStack.length - 1 ? 'text-white font-bold' : ''}`}>
                                    {folder.name}
                                </button>
                            </div>
                        ))}
                    </div>

                    <div className="space-y-2 max-h-64 overflow-y-auto custom-scrollbar">
                        {loading ? <div className="text-center text-xs text-gray-500">Loading...</div> : files.map(file => (
                             <div 
                                key={file.id} 
                                onClick={() => file.mimeType.includes('folder') ? enterFolder(file) : handleToggleFile(file.id)}
                                className="flex items-center p-2 rounded bg-white/5 hover:bg-white/10 cursor-pointer"
                            >
                                {file.mimeType.includes('folder') ? <Folder className="w-4 h-4 mr-2 text-yellow-500"/> : <FileText className="w-4 h-4 mr-2 text-gray-400"/>}
                                <span className="text-xs text-gray-300 truncate flex-1">{file.name}</span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Analysis Preview */}
            <div className="glass-panel rounded-2xl p-6 overflow-y-auto relative">
                <div className="flex justify-between items-center mb-4">
                    <h3 className="text-lg font-semibold text-gray-300">
                        {analyzing ? 'Analyzing Data...' : 'Insights & Report'}
                    </h3>
                    <div className="flex space-x-2">
                        {extractionPreview && (
                            <button 
                                onClick={generateExcelReport}
                                className="px-4 py-2 rounded-lg bg-green-600 hover:bg-green-500 text-white shadow-lg shadow-green-600/20 text-xs font-bold flex items-center transition-all animate-fade-in"
                            >
                                <Download className="w-4 h-4 mr-2" />
                                Download Report (.xlsx)
                            </button>
                        )}
                    </div>
                </div>
                
                {analyzing ? (
                    <div className="h-64 flex flex-col items-center justify-center">
                        <Activity className="w-16 h-16 text-neonBlue animate-spin mb-6" />
                        <h4 className="text-xl font-bold text-white mb-2">AI Processing</h4>
                        <p className="text-neonBlue animate-pulse text-sm">Identifying anomalies and calculating KPIs...</p>
                    </div>
                ) : extractionPreview ? (
                    <div className="space-y-6 animate-fade-in">
                        
                        <div className="p-4 rounded-xl bg-black/20 border border-white/10">
                            <h4 className="text-neonBlue font-mono text-sm mb-3 font-bold border-b border-white/10 pb-2">EXECUTIVE SUMMARY</h4>
                            <p className="text-sm text-gray-300 leading-relaxed italic">"{extractionPreview.summary}"</p>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                             {extractionPreview.specs.map((spec, i) => (
                                 <div key={i} className="bg-white/5 p-3 rounded-lg border border-white/5">
                                     <span className="text-xs text-gray-500 block mb-1 uppercase tracking-wider">{spec.label}</span>
                                     <span className="text-lg font-bold text-white">{spec.value}</span>
                                 </div>
                             ))}
                        </div>

                        {extractionPreview.warnings && extractionPreview.warnings.length > 0 && (
                            <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20">
                                <h4 className="text-red-400 font-mono text-sm mb-3 flex items-center font-bold">
                                    <AlertTriangle className="w-4 h-4 mr-2" />
                                    ANOMALIES DETECTED
                                </h4>
                                <ul className="space-y-2">
                                    {extractionPreview.warnings.map((w, i) => (
                                        <li key={i} className="flex items-start text-sm text-gray-300">
                                            <span className="mr-2 text-red-500">•</span> {w}
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        )}

                        {extractionPreview.recommendations && extractionPreview.recommendations.length > 0 && (
                             <div className="p-4 rounded-xl bg-green-500/10 border border-green-500/20">
                                <h4 className="text-green-400 font-mono text-sm mb-3 flex items-center font-bold">
                                    <CheckCircle className="w-4 h-4 mr-2" />
                                    AI RECOMMENDATIONS
                                </h4>
                                <ul className="space-y-2">
                                    {extractionPreview.recommendations.map((r, i) => (
                                        <li key={i} className="flex items-start text-sm text-gray-300">
                                            <span className="mr-2 text-green-500">→</span> {r}
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        )}
                        
                        <div className="mt-6 pt-4 border-t border-white/10">
                            <h4 className="text-xs text-gray-500 mb-2">Raw Data Preview</h4>
                            <div className="bg-black/40 rounded-lg p-2 overflow-x-auto">
                                <table className="w-full text-left text-xs text-gray-400 whitespace-nowrap">
                                    <thead>
                                        <tr>
                                            {rawFileContent.length > 0 && Object.keys(rawFileContent[0]).map(key => (
                                                <th key={key} className="p-2 border-b border-white/10">{key}</th>
                                            ))}
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {rawFileContent.slice(0, 5).map((row, idx) => (
                                            <tr key={idx} className="border-b border-white/5">
                                                {Object.values(row).map((val: any, vIdx) => (
                                                    <td key={vIdx} className="p-2">{String(val)}</td>
                                                ))}
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                                {rawFileContent.length > 5 && <p className="text-center p-2 text-gray-600 italic">... {rawFileContent.length - 5} more rows ...</p>}
                            </div>
                        </div>

                    </div>
                ) : (
                    <div className="h-full flex flex-col items-center justify-center text-gray-500 border border-dashed border-white/10 rounded-xl bg-black/20">
                        <Table className="w-12 h-12 mb-4 opacity-20" />
                        <p>Import an Excel file to see AI Insights here.</p>
                    </div>
                )}
            </div>
          </div>
      ) : (
          <div className="h-full flex flex-col md:flex-row gap-6 animate-fade-in">
              {/* OCR Uploader */}
              <div className="w-full md:w-1/3 glass-panel rounded-2xl p-6 flex flex-col">
                   <h3 className="text-xl font-bold text-white mb-4 flex items-center"><ScanLine className="mr-2 text-neonPurple"/> OCR Scanner</h3>
                   <p className="text-sm text-gray-400 mb-6">Upload a scanned PDF or Image to extract raw text.</p>
                   
                   <div className="flex-1 flex flex-col justify-center items-center border-2 border-dashed border-white/10 rounded-xl hover:border-neonPurple/50 hover:bg-white/5 transition-all p-8 relative">
                       {ocrFile ? (
                           <div className="text-center w-full">
                               {ocrPreview && ocrFile.type.includes('image') && (
                                   <img src={ocrPreview} alt="Preview" className="h-32 mx-auto rounded-lg mb-4 object-contain" />
                               )}
                               <p className="text-white font-medium mb-1 truncate px-2">{ocrFile.name}</p>
                               <p className="text-xs text-gray-500 mb-4">{(ocrFile.size / 1024 / 1024).toFixed(2)} MB</p>
                               <button onClick={() => {setOcrFile(null); setOcrPreview(null); setOcrResult('');}} className="absolute top-2 right-2 p-1 bg-red-500/20 text-red-400 rounded-full hover:bg-red-500/40"><X size={14}/></button>
                           </div>
                       ) : (
                           <>
                            <UploadCloud className="w-12 h-12 text-gray-500 mb-4" />
                            <span className="text-sm text-gray-300">Drag & drop to upload</span>
                            <span className="text-xs text-gray-500 mt-2">PDF, PNG, JPG</span>
                           </>
                       )}
                       <input type="file" accept=".pdf,image/*" className="absolute inset-0 opacity-0 cursor-pointer" onChange={handleOcrUpload} disabled={!!ocrFile} />
                   </div>

                   <button 
                       onClick={runOcrExtraction}
                       disabled={!ocrFile || isProcessingOcr}
                       className="w-full mt-6 py-3 bg-neonPurple text-white font-bold rounded-xl shadow-lg shadow-purple-500/20 hover:bg-purple-600 transition-all flex items-center justify-center disabled:opacity-50"
                   >
                       {isProcessingOcr ? 'Scanning Document...' : 'Extract Text'}
                   </button>
              </div>

              {/* OCR Result Viewer */}
              <div className="flex-1 glass-panel rounded-2xl p-6 flex flex-col relative">
                  <h3 className="text-lg font-bold text-gray-300 mb-4">Extraction Results</h3>
                  {isProcessingOcr ? (
                      <div className="flex-1 flex flex-col items-center justify-center">
                          <div className="w-16 h-16 border-4 border-neonPurple border-t-transparent rounded-full animate-spin mb-4"></div>
                          <p className="text-neonPurple animate-pulse">Analyzing visual data...</p>
                      </div>
                  ) : ocrResult ? (
                      <div className="flex-1 relative">
                          <textarea 
                              className="w-full h-full bg-black/30 border border-white/10 rounded-xl p-4 text-sm text-gray-300 font-mono resize-none focus:outline-none focus:border-neonPurple/50 custom-scrollbar"
                              value={ocrResult}
                              readOnly
                          />
                          <button 
                              onClick={() => navigator.clipboard.writeText(ocrResult)}
                              className="absolute top-4 right-4 p-2 bg-black/50 hover:bg-white/10 text-gray-400 hover:text-white rounded-lg transition-colors"
                              title="Copy to Clipboard"
                          >
                              <Copy size={16} />
                          </button>
                      </div>
                  ) : (
                      <div className="flex-1 flex flex-col items-center justify-center text-gray-500 border border-white/5 rounded-xl bg-black/20">
                          <FileText className="w-12 h-12 mb-4 opacity-20" />
                          <p>No text extracted yet.</p>
                      </div>
                  )}
              </div>
          </div>
      )}
    </div>
  );
};
