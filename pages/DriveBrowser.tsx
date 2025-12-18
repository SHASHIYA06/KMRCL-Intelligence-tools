
import React, { useEffect, useState, useMemo } from 'react';
import { Folder, Download, RefreshCw, UploadCloud, Search, Image, Table, FileText, AlertCircle, MessageSquare, Filter, Calendar, Hash, X, ChevronDown, ChevronUp, Trash2, Clock, Home, ChevronRight, FolderPlus, Database } from 'lucide-react';
import { DriveFile, FilterState, User } from '../types';
import { fetchDriveFiles, uploadFileToDrive, downloadFile, deleteFile, createFolder } from '../services/driveService';
import { ThreeDCard } from '../components/ThreeDCard';

interface DriveBrowserProps {
  onChatWithFile?: (file: DriveFile) => void;
  currentUser?: User;
}

export const DriveBrowser: React.FC<DriveBrowserProps> = ({ onChatWithFile, currentUser }) => {
  const [files, setFiles] = useState<DriveFile[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  
  // Folder Navigation State
  const [currentFolder, setCurrentFolder] = useState<DriveFile | null>(null); // null = root
  const [folderStack, setFolderStack] = useState<DriveFile[]>([]); // For breadcrumbs

  // Advanced Filter State
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState<FilterState>({
    type: 'ALL',
    startDate: '',
    endDate: '',
    minSizeMB: 0,
    tags: []
  });

  // Expanded card state for previews
  const [expandedFileId, setExpandedFileId] = useState<string | null>(null);

  const isAdmin = currentUser?.role === 'ADMIN';

  useEffect(() => { 
      loadFiles(); 
      loadRecentSearches();
  }, [currentFolder]); // Reload when folder changes

  const loadFiles = async () => {
    setLoading(true);
    const folderId = currentFolder ? currentFolder.id : 'root';
    const data = await fetchDriveFiles(folderId);
    setFiles(data);
    setLoading(false);
  };

  const loadRecentSearches = () => {
      try {
          const saved = localStorage.getItem('kmrcl_recent_searches');
          if (saved) {
              setRecentSearches(JSON.parse(saved));
          }
      } catch (e) {
          console.error("Failed to load recent searches", e);
      }
  };

  const saveSearchToHistory = (query: string) => {
      if (!query.trim()) return;
      const normalized = query.trim();
      setRecentSearches(prev => {
          const updated = [normalized, ...prev.filter(q => q !== normalized)].slice(0, 5);
          localStorage.setItem('kmrcl_recent_searches', JSON.stringify(updated));
          return updated;
      });
  };

  const clearSearchHistory = () => {
      setRecentSearches([]);
      localStorage.removeItem('kmrcl_recent_searches');
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setUploading(true);
      await uploadFileToDrive(e.target.files[0], currentFolder ? currentFolder.id : 'root');
      await loadFiles();
      setUploading(false);
    }
  };

  const handleCreateFolder = async () => {
      if (!isAdmin) return;
      const name = prompt("Enter folder name:");
      if (name) {
          await createFolder(name, currentFolder ? currentFolder.id : 'root');
          await loadFiles();
      }
  };

  const handleDelete = async (file: DriveFile) => {
    if (!isAdmin) return;
    if (window.confirm(`Are you sure you want to delete "${file.name}"?`)) {
        await deleteFile(file.id);
        setFiles(prev => prev.filter(f => f.id !== file.id));
    }
  };

  // Navigation Logic
  const enterFolder = (folder: DriveFile) => {
      setFolderStack(prev => [...prev, folder]);
      setCurrentFolder(folder);
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
  };

  // Helper to parse "2.4MB" to bytes for comparison
  const parseFileSize = (sizeStr?: string): number => {
    if (!sizeStr) return 0;
    const num = parseFloat(sizeStr.replace(/[^\d.]/g, ''));
    if (sizeStr.includes('KB')) return num * 1024;
    if (sizeStr.includes('MB')) return num * 1024 * 1024;
    if (sizeStr.includes('GB')) return num * 1024 * 1024 * 1024;
    return num;
  };

  const getFileIcon = (mime: string) => {
    if (mime.includes('folder')) return <Folder className="w-8 h-8 text-yellow-400 drop-shadow-lg" />;
    if (mime.includes('image')) return <Image className="w-8 h-8 text-purple-400 drop-shadow-lg" />;
    if (mime.includes('pdf')) return <FileText className="w-8 h-8 text-red-400 drop-shadow-lg" />;
    if (mime.includes('sheet')) return <Table className="w-8 h-8 text-green-400 drop-shadow-lg" />;
    return <FileText className="w-8 h-8 text-blue-400 drop-shadow-lg" />;
  };

  const allTags = useMemo(() => {
    const tags = new Set<string>();
    files.forEach(f => f.tags?.forEach(t => tags.add(t)));
    return Array.from(tags);
  }, [files]);

  const toggleTagFilter = (tag: string) => {
    setFilters(prev => ({
        ...prev,
        tags: prev.tags.includes(tag) 
            ? prev.tags.filter(t => t !== tag)
            : [...prev.tags, tag]
    }));
  };

  const filteredFiles = useMemo(() => {
    return files.filter(file => {
      // 1. Text Search
      if (searchQuery) {
          const lowerQ = searchQuery.toLowerCase();
          if (!file.name.toLowerCase().includes(lowerQ) && !file.description?.toLowerCase().includes(lowerQ)) return false;
      }

      // 2. Type Filter
      if (filters.type !== 'ALL') {
         if (filters.type === 'FOLDER' && !file.mimeType.includes('folder')) return false;
         if (filters.type === 'PDF' && !file.mimeType.includes('pdf')) return false;
         if (filters.type === 'IMAGE' && !file.mimeType.includes('image')) return false;
         if (filters.type === 'DOCS' && !file.mimeType.includes('document') && !file.mimeType.includes('sheet')) return false;
      }

      // 3. Date Range
      if (filters.startDate || filters.endDate) {
          // File date is in YYYY-MM-DD format (from standardized service)
          const fileDate = new Date(file.modifiedTime || 0);
          if (filters.startDate && fileDate < new Date(filters.startDate)) return false;
          if (filters.endDate && fileDate > new Date(filters.endDate)) return false;
      }

      // 4. File Size (Min)
      if (filters.minSizeMB > 0) {
          const bytes = parseFileSize(file.size);
          const minBytes = filters.minSizeMB * 1024 * 1024;
          if (bytes < minBytes) return false;
      }

      // 5. Tags
      if (filters.tags.length > 0) {
          const fileTags = file.tags || [];
          const hasTags = filters.tags.every(t => fileTags.includes(t));
          if (hasTags === false) return false;
      }

      return true;
    });
  }, [files, searchQuery, filters]);

  const resetFilters = () => {
      setFilters({ type: 'ALL', startDate: '', endDate: '', minSizeMB: 0, tags: [] });
      setSearchQuery('');
  };

  // --- Active Filter Helpers ---
  const hasActiveFilters = useMemo(() => {
      return filters.type !== 'ALL' || 
             filters.startDate !== '' || 
             filters.endDate !== '' || 
             filters.minSizeMB > 0 || 
             filters.tags.length > 0;
  }, [filters]);

  const clearFilterType = () => setFilters(prev => ({ ...prev, type: 'ALL' }));
  const clearFilterDate = () => setFilters(prev => ({ ...prev, startDate: '', endDate: '' }));
  const clearFilterSize = () => setFilters(prev => ({ ...prev, minSizeMB: 0 }));
  const removeTagFilter = (tag: string) => setFilters(prev => ({ ...prev, tags: prev.tags.filter(t => t !== tag) }));

  return (
    <div className="space-y-6 h-full flex flex-col">
      {/* Controls */}
      <div className="flex flex-col space-y-4">
        <div className="flex justify-between items-center">
          <h2 className="text-2xl font-bold text-white flex items-center">
             <span className="bg-clip-text text-transparent bg-gradient-to-r from-white to-gray-400">Drive Explorer</span>
             {!isAdmin && <span className="ml-3 text-xs bg-gray-700 text-gray-300 px-2 py-1 rounded border border-gray-600">READ ONLY</span>}
          </h2>
          <div className="flex space-x-3">
             <button onClick={loadFiles} className="p-2 rounded-lg bg-white/5 hover:bg-white/10 transition-colors border border-white/10">
              <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
            </button>
            
            {isAdmin && (
                <>
                <button onClick={handleCreateFolder} className="flex items-center px-3 py-2 rounded-lg bg-neonBlue/10 hover:bg-neonBlue/20 text-neonBlue border border-neonBlue/30 transition-colors" title="New Folder">
                    <FolderPlus className="w-5 h-5 mr-2" />
                    <span className="text-sm font-bold">New Folder</span>
                </button>
                <label className={`flex items-center space-x-2 px-4 py-2 rounded-lg cursor-pointer transition-all border border-neonBlue/30 ${uploading ? 'bg-gray-800' : 'bg-neonBlue/10 hover:bg-neonBlue/20 text-neonBlue'}`}>
                    <UploadCloud className="w-5 h-5" />
                    <span className="text-sm font-bold">{uploading ? 'Uploading...' : 'Upload to Drive'}</span>
                    <input type="file" className="hidden" onChange={handleFileUpload} disabled={uploading} />
                </label>
                </>
            )}
          </div>
        </div>
        
        {/* Breadcrumbs */}
        <div className="flex items-center space-x-2 text-sm text-gray-400 bg-black/40 p-2 rounded-lg border border-white/5">
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

        {/* Search & Filter Bar */}
        <div className="flex flex-col md:flex-row gap-4">
          <div className="relative flex-1 group">
            <div className="absolute -inset-0.5 bg-gradient-to-r from-neonBlue to-purple-600 rounded-xl opacity-20 group-hover:opacity-40 blur transition duration-500"></div>
            <div className="relative bg-black/80 rounded-xl flex items-center px-4 border border-white/10">
                <Search className="w-5 h-5 text-gray-400 mr-3" />
                <input 
                  type="text" 
                  placeholder={`Search in ${currentFolder ? currentFolder.name : 'All Files'}...`}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && saveSearchToHistory(searchQuery)}
                  className="w-full bg-transparent py-3 text-white focus:outline-none placeholder-gray-500"
                />
            </div>
          </div>
          <button 
            onClick={() => setShowFilters(!showFilters)}
            className={`px-4 py-2 rounded-lg border flex items-center transition-all ${showFilters || hasActiveFilters ? 'bg-neonBlue/20 border-neonBlue text-neonBlue' : 'bg-white/5 border-white/10 text-gray-300 hover:bg-white/10'}`}
          >
             <Filter className="w-4 h-4 mr-2" />
             Filters
             {hasActiveFilters && <span className="ml-2 w-2 h-2 rounded-full bg-neonBlue animate-pulse"></span>}
             {showFilters ? <ChevronUp className="w-4 h-4 ml-2"/> : <ChevronDown className="w-4 h-4 ml-2"/>}
          </button>
        </div>
        
        {/* Active Filter Chips */}
        {hasActiveFilters && (
            <div className="flex flex-wrap gap-2 items-center px-1 animate-fade-in">
                <span className="text-xs text-gray-500 font-bold uppercase mr-2">Active:</span>
                
                {filters.type !== 'ALL' && (
                    <div className="flex items-center px-2 py-1 rounded-md bg-neonBlue/10 border border-neonBlue/30 text-xs text-neonBlue">
                        <span>Type: {filters.type}</span>
                        <button onClick={clearFilterType} className="ml-2 hover:text-white"><X className="w-3 h-3"/></button>
                    </div>
                )}

                {(filters.startDate || filters.endDate) && (
                    <div className="flex items-center px-2 py-1 rounded-md bg-purple-500/10 border border-purple-500/30 text-xs text-purple-400">
                        <span>Date: {filters.startDate || '...'} - {filters.endDate || '...'}</span>
                        <button onClick={clearFilterDate} className="ml-2 hover:text-white"><X className="w-3 h-3"/></button>
                    </div>
                )}

                {filters.minSizeMB > 0 && (
                    <div className="flex items-center px-2 py-1 rounded-md bg-green-500/10 border border-green-500/30 text-xs text-green-400">
                        <span>&gt; {filters.minSizeMB}MB</span>
                        <button onClick={clearFilterSize} className="ml-2 hover:text-white"><X className="w-3 h-3"/></button>
                    </div>
                )}

                {filters.tags.map(tag => (
                    <div key={tag} className="flex items-center px-2 py-1 rounded-md bg-white/10 border border-white/20 text-xs text-gray-300">
                        <span>#{tag}</span>
                        <button onClick={() => removeTagFilter(tag)} className="ml-2 hover:text-white"><X className="w-3 h-3"/></button>
                    </div>
                ))}

                <button onClick={resetFilters} className="text-xs text-red-400 hover:text-red-300 underline ml-2">Clear All</button>
            </div>
        )}

        {/* Recent Searches & Advanced Filters */}
        {recentSearches.length > 0 && (
            <div className="flex items-center space-x-2 animate-fade-in px-1 overflow-x-auto pb-1 scrollbar-hide">
                <span className="text-[10px] text-gray-500 uppercase tracking-wider font-bold whitespace-nowrap">Recent:</span>
                <div className="flex gap-2">
                    {recentSearches.map((term, idx) => (
                        <button key={idx} onClick={() => { setSearchQuery(term); saveSearchToHistory(term); }} className="flex items-center px-2 py-1 rounded-md bg-white/5 hover:bg-white/10 text-xs text-gray-400 hover:text-white border border-white/5 transition-all group whitespace-nowrap">
                            <Clock className="w-3 h-3 mr-1 text-gray-600 group-hover:text-neonBlue" />
                            {term}
                        </button>
                    ))}
                    <button onClick={clearSearchHistory} className="p-1 hover:bg-red-500/10 rounded text-gray-600 hover:text-red-400 transition-colors"><X className="w-3 h-3"/></button>
                </div>
            </div>
        )}
        
        {showFilters && (
            <div className="glass-panel p-6 rounded-xl animate-fade-in border-t border-neonBlue/30">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                    {/* Type Filter */}
                    <div className="space-y-2">
                        <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">File Type</label>
                        <select value={filters.type} onChange={(e) => setFilters({...filters, type: e.target.value})} className="w-full bg-black/40 border border-white/10 rounded-lg p-2 text-sm text-white focus:border-neonBlue outline-none">
                            <option value="ALL">All Files</option>
                            <option value="FOLDER">Folders</option>
                            <option value="PDF">PDF Documents</option>
                            <option value="DOCS">Word / Excel</option>
                            <option value="IMAGE">Images</option>
                        </select>
                    </div>

                    {/* Date Range */}
                    <div className="space-y-2">
                        <label className="text-xs font-bold text-gray-400 uppercase tracking-wider flex items-center"><Calendar className="w-3 h-3 mr-1"/> Modified Date</label>
                        <div className="flex gap-2">
                            <input type="date" value={filters.startDate} onChange={(e) => setFilters({...filters, startDate: e.target.value})} className="w-full bg-black/40 border border-white/10 rounded-lg p-2 text-xs text-gray-300 focus:border-neonBlue outline-none" />
                            <input type="date" value={filters.endDate} onChange={(e) => setFilters({...filters, endDate: e.target.value})} className="w-full bg-black/40 border border-white/10 rounded-lg p-2 text-xs text-gray-300 focus:border-neonBlue outline-none" />
                        </div>
                    </div>

                    {/* Size Filter */}
                    <div className="space-y-2">
                         <label className="text-xs font-bold text-gray-400 uppercase tracking-wider flex items-center"><Database className="w-3 h-3 mr-1"/> Min Size (MB)</label>
                         <div className="flex items-center gap-3">
                            <input type="range" min="0" max="500" step="5" value={filters.minSizeMB} onChange={(e) => setFilters({...filters, minSizeMB: parseFloat(e.target.value)})} className="w-full h-1 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-neonBlue" />
                            <span className="text-sm font-mono text-neonBlue w-12">{filters.minSizeMB}</span>
                         </div>
                    </div>

                    {/* Tags */}
                    <div className="space-y-2">
                        <label className="text-xs font-bold text-gray-400 uppercase tracking-wider flex items-center"><Hash className="w-3 h-3 mr-1"/> Tags</label>
                        <div className="flex flex-wrap gap-1 max-h-20 overflow-y-auto custom-scrollbar">
                            {allTags.length === 0 && <span className="text-xs text-gray-600 italic">No tags available</span>}
                            {allTags.map(tag => (
                                <button key={tag} onClick={() => toggleTagFilter(tag)} className={`px-2 py-1 rounded text-[10px] border transition-all ${filters.tags.includes(tag) ? 'bg-neonBlue/20 border-neonBlue text-neonBlue' : 'bg-white/5 border-white/5 text-gray-400 hover:text-white'}`}>
                                    {tag}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="flex justify-end mt-4 pt-4 border-t border-white/10 col-span-1 md:col-span-4">
                        <button onClick={resetFilters} className="text-xs text-gray-400 hover:text-white flex items-center"><X className="w-3 h-3 mr-1" /> Clear All Filters</button>
                    </div>
                </div>
            </div>
        )}
      </div>

      {/* Grid View */}
      <div className="flex-1 overflow-y-auto pb-10 custom-scrollbar">
        {files.length === 0 && !loading ? (
             <div className="h-64 flex flex-col items-center justify-center text-gray-500 border-2 border-dashed border-white/10 rounded-2xl">
                <Folder className="w-12 h-12 mb-4 opacity-20" />
                <p>This folder is empty.</p>
                {isAdmin && <button onClick={handleCreateFolder} className="mt-2 text-neonBlue hover:underline text-sm">Create New Folder</button>}
             </div>
        ) : filteredFiles.length === 0 ? (
             <div className="h-64 flex flex-col items-center justify-center text-gray-500">
                <Filter className="w-12 h-12 mb-4 opacity-20" />
                <p>No matches found.</p>
                <button onClick={resetFilters} className="mt-2 text-neonBlue hover:underline text-sm">Reset Filters</button>
             </div>
        ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {filteredFiles.map((file) => {
                const isExpanded = expandedFileId === file.id;
                return (
                <ThreeDCard key={file.id} className="h-full" depth={10}>
                <div 
                    onClick={() => { if (file.mimeType.includes('folder')) enterFolder(file); }}
                    className={`glass-panel rounded-2xl h-full flex flex-col justify-between group hover:bg-white/10 hover:border-neonBlue/40 hover:shadow-[0_0_25px_rgba(0,243,255,0.15)] transition-all duration-500 cursor-pointer relative overflow-hidden backdrop-blur-md ${isExpanded ? 'row-span-2' : ''}`}
                >
                    <div className="p-5 flex-1 flex flex-col relative z-10">
                        <div className="flex justify-between items-start mb-4">
                             <div className="p-3 bg-black/20 rounded-xl border border-white/5 group-hover:border-neonBlue/30 transition-colors shadow-inner">
                                {getFileIcon(file.mimeType)}
                             </div>
                            <div className="flex space-x-1 opacity-0 group-hover:opacity-100 transition-opacity duration-300 transform translate-x-2 group-hover:translate-x-0">
                                {/* Preview Toggle */}
                                {['image', 'pdf'].some(t => file.mimeType.includes(t)) && (
                                    <button onClick={(e) => { e.stopPropagation(); setExpandedFileId(isExpanded ? null : file.id); }} className={`p-2 rounded-lg transition-all ${isExpanded ? 'bg-neonBlue text-black' : 'text-gray-400 hover:text-white bg-white/5 hover:bg-neonBlue/20'}`} title="Preview">
                                        <ChevronDown className={`w-4 h-4 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                                    </button>
                                )}
                                
                                {onChatWithFile && !file.mimeType.includes('folder') && (
                                    <button onClick={(e) => { e.stopPropagation(); onChatWithFile(file); }} className="text-gray-400 hover:text-white bg-white/5 p-2 rounded-lg hover:bg-neonPurple/20 hover:text-neonPurple transition-all" title="Chat">
                                        <MessageSquare className="w-4 h-4" />
                                    </button>
                                )}
                                <button onClick={(e) => { e.stopPropagation(); downloadFile(file); }} className="text-gray-400 hover:text-white bg-white/5 p-2 rounded-lg hover:bg-neonBlue/20 hover:text-neonBlue transition-all" title="Download">
                                    <Download className="w-4 h-4" />
                                </button>
                                {isAdmin && (
                                    <button onClick={(e) => { e.stopPropagation(); handleDelete(file); }} className="text-gray-400 hover:text-red-400 bg-white/5 p-2 rounded-lg hover:bg-red-500/20 transition-all" title="Delete">
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                )}
                            </div>
                        </div>
                    
                        <div className="relative z-10">
                            <h4 className="text-gray-100 font-medium truncate mb-1 group-hover:text-white transition-colors" title={file.name}>{file.name}</h4>
                            <div className="flex flex-wrap gap-1 mb-2">
                                {file.tags?.map((tag, i) => (
                                    <span key={i} className="text-[10px] px-1.5 py-0.5 rounded bg-white/5 text-gray-500 group-hover:bg-neonBlue/10 group-hover:text-neonBlue transition-colors">{tag}</span>
                                ))}
                            </div>
                        </div>

                        {/* PREVIEW SECTION */}
                        {isExpanded && (
                            <div className="mt-4 mb-2 rounded-lg bg-black/40 border border-white/10 overflow-hidden animate-fade-in flex items-center justify-center min-h-[150px]">
                                {file.mimeType.includes('image') ? (
                                    <img src={file.url === '#' ? `https://placehold.co/400x300/1e1e1e/FFF?text=${encodeURIComponent(file.name)}` : file.url} alt="Preview" className="w-full h-full object-cover" />
                                ) : (
                                    <div className="text-center p-4">
                                        <FileText className="w-12 h-12 mx-auto text-gray-600 mb-2"/>
                                        <p className="text-xs text-gray-400">Preview not available for this file type.</p>
                                    </div>
                                )}
                            </div>
                        )}
                        
                        <div className="mt-auto flex justify-between items-center text-xs text-gray-500 font-mono group-hover:text-gray-400 transition-colors">
                            <span>{file.size || (file.mimeType.includes('folder') ? 'DIR' : '-')}</span>
                            <span>{file.modifiedTime}</span>
                        </div>
                    </div>
                </div>
                </ThreeDCard>
            )})}
            </div>
        )}
      </div>
    </div>
  );
};
