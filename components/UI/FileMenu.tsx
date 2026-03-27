import React, { useState, useRef, useEffect } from 'react';
import { useProjectStore } from '../../store/useProjectStore';
import { FolderOpen, Save, FilePlus, AlertTriangle, X, SaveAll, Clock, Trash2, HardDrive, LayoutGrid, ChevronDown } from 'lucide-react';
import { ProjectPersistenceService } from '../../services/ProjectPersistenceService';

interface FileMenuProps {
  store: ReturnType<typeof useProjectStore>;
  onOpenDashboard?: () => void;
  headless?: boolean;
}

export const FileMenu = ({ store, onOpenDashboard, headless }: FileMenuProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [alertMessage, setAlertMessage] = useState<string | null>(null);
  const [recentProjects, setRecentProjects] = useState<{ id: string, name: string, lastModified: number }[]>([]);
  const [showRecentProjects, setShowRecentProjects] = useState(false);
  
  const menuRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (headless) {
      fetchRecentProjects();
    }
  }, [headless]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setShowRecentProjects(false);
      }
    };
    if (!headless) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [headless]);

  const fetchRecentProjects = async () => {
    const projects = await ProjectPersistenceService.getRecentProjects();
    setRecentProjects(projects);
  };

  const handleNewProjectClick = () => {
    setShowConfirmModal(true);
    setIsOpen(false);
  };

  const confirmNewProject = () => {
    store.resetProject();
    setShowConfirmModal(false);
  };

  const handleSaveToBrowser = async () => {
    try {
      await ProjectPersistenceService.saveProject(store.project, store.assets);
      setIsOpen(false);
      // Optional: show toast
    } catch (err) {
      setAlertMessage('Failed to save project to browser storage.');
    }
  };

  const handleQuickSave = async () => {
    // Also save to browser for safety
    handleSaveToBrowser();

    const data = JSON.stringify({ project: store.project, assets: store.assets.map(a => ({ ...a, audioBuffer: undefined })) }, null, 2);
    
    if ('showSaveFilePicker' in window && store.fileHandle) {
      try {
        const writable = await store.fileHandle.createWritable();
        await writable.write(data);
        await writable.close();
        setIsOpen(false);
        return;
      } catch (err) {
        console.warn('Quick save failed, falling back to Save As', err);
      }
    }
    
    handleSaveAsProject();
  };

  const handleSaveAsProject = async () => {
    const data = JSON.stringify({ project: store.project, assets: store.assets.map(a => ({ ...a, audioBuffer: undefined })) }, null, 2);
    const defaultFilename = `${store.project.name.replace(/\s+/g, '_')}.kvg`;

    let useFallback = true;

    if ('showSaveFilePicker' in window) {
      try {
        const handle = await (window as any).showSaveFilePicker({
          suggestedName: defaultFilename,
          types: [{
            description: 'Kinetic Video Generator Project',
            accept: { 'application/json': ['.kvg'] },
          }],
        });
        store.setFileHandle(handle);
        const writable = await handle.createWritable();
        await writable.write(data);
        await writable.close();
        setIsOpen(false);
        useFallback = false;
      } catch (err: any) {
        if (err.name === 'AbortError') {
          useFallback = false;
        } else {
          console.warn('File System Access API failed, falling back to download', err);
        }
      }
    }

    if (useFallback) {
      const blob = new Blob([data], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = defaultFilename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      setIsOpen(false);
    }
  };

  const readFile = (file: File) => {
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const data = JSON.parse(event.target?.result as string);
        if (data.project && data.assets) {
          store.loadProjectData(data.project, data.assets);
        } else {
          setAlertMessage('Invalid project file format. Missing project or assets data.');
        }
      } catch (err) {
        console.error('Failed to parse project file:', err);
        setAlertMessage('Failed to load project file. The file might be corrupted.');
      }
    };
    reader.readAsText(file);
  };

  const handleOpenProjectClick = async () => {
    let useFallback = true;
    if ('showOpenFilePicker' in window) {
      try {
        const [handle] = await (window as any).showOpenFilePicker({
          types: [{
            description: 'Kinetic Video Generator Project',
            accept: { 'application/json': ['.kvg', '.json'] },
          }],
        });
        const file = await handle.getFile();
        store.setFileHandle(handle);
        readFile(file);
        setIsOpen(false);
        useFallback = false;
      } catch (err: any) {
        if (err.name === 'AbortError') {
          useFallback = false;
        } else {
          console.warn('File System Access API failed, falling back to input', err);
        }
      }
    }
    
    if (useFallback) {
      fileInputRef.current?.click();
    }
  };

  const handleLoadRecent = async (id: string) => {
    const saved = await ProjectPersistenceService.loadProject(id);
    if (saved) {
      store.loadProjectData(saved.project, saved.assets);
      setIsOpen(false);
      setShowRecentProjects(false);
    } else {
      setAlertMessage('Could not find project in browser storage.');
    }
  };

  const handleDeleteRecent = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    await ProjectPersistenceService.deleteProject(id);
    fetchRecentProjects();
  };

  const handleFallbackLoadProject = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    readFile(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
    setIsOpen(false);
  };

  if (headless) {
    return (
      <div className="flex flex-col py-1">
        <button 
          onClick={handleNewProjectClick}
          className="w-full text-left px-4 py-2 text-xs text-zinc-300 hover:bg-indigo-600 hover:text-white flex items-center gap-2 transition-colors rounded-xl"
        >
          <FilePlus size={14} /> New Project
        </button>
        
        <div className="h-px bg-zinc-800 my-1 mx-2" />

        <button 
          onClick={handleSaveToBrowser}
          className="w-full text-left px-4 py-2 text-xs text-zinc-300 hover:bg-indigo-600 hover:text-white flex items-center justify-between transition-colors rounded-xl"
        >
          <div className="flex items-center gap-2">
            <HardDrive size={14} /> Save to Browser
          </div>
          <span className="text-[10px] text-zinc-500">Auto</span>
        </button>

        <button 
          onClick={handleQuickSave}
          className="w-full text-left px-4 py-2 text-xs text-zinc-300 hover:bg-indigo-600 hover:text-white flex items-center gap-2 transition-colors rounded-xl"
        >
          <Save size={14} /> Save to File
        </button>

        <button 
          onClick={handleSaveAsProject}
          className="w-full text-left px-4 py-2 text-xs text-zinc-300 hover:bg-indigo-600 hover:text-white flex items-center gap-2 transition-colors rounded-xl"
        >
          <SaveAll size={14} /> Save As...
        </button>
        
        <div className="h-px bg-zinc-800 my-1 mx-2" />

        <button 
          onClick={handleOpenProjectClick}
          className="w-full text-left px-4 py-2 text-xs text-zinc-300 hover:bg-indigo-600 hover:text-white flex items-center gap-2 transition-colors rounded-xl"
        >
          <FolderOpen size={14} /> Open File...
        </button>

        <div className="relative group/recent">
          <button 
            className="w-full text-left px-4 py-2 text-xs text-zinc-300 hover:bg-zinc-800 flex items-center justify-between transition-colors rounded-xl"
          >
            <div className="flex items-center gap-2">
              <Clock size={14} /> Recent Projects
            </div>
            <span className="text-[10px]">›</span>
          </button>
          
          <div className="absolute left-full top-0 ml-1 w-64 bg-[#1a1a1a] border border-zinc-800 rounded-2xl shadow-2xl py-1 max-h-[400px] overflow-y-auto opacity-0 pointer-events-none group-hover/recent:opacity-100 group-hover/recent:pointer-events-auto transition-all z-[110]">
            {recentProjects.length === 0 ? (
              <div className="px-4 py-3 text-xs text-zinc-500 italic">No recent projects</div>
            ) : (
              recentProjects.map(p => (
                <div 
                  key={p.id}
                  onClick={() => handleLoadRecent(p.id)}
                  className="group px-4 py-2 text-xs text-zinc-300 hover:bg-indigo-600 hover:text-white flex items-center justify-between cursor-pointer transition-colors"
                >
                  <div className="flex flex-col overflow-hidden">
                    <span className="truncate font-medium">{p.name}</span>
                    <span className="text-[9px] text-zinc-500 group-hover:text-indigo-200">
                      {new Date(p.lastModified).toLocaleString()}
                    </span>
                  </div>
                  <button 
                    onClick={(e) => handleDeleteRecent(e, p.id)}
                    className="p-1.5 opacity-0 group-hover:opacity-100 hover:bg-red-500/20 rounded-md text-zinc-500 hover:text-red-400 transition-all"
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
        
        <button 
          onClick={() => {
            onOpenDashboard?.();
            setIsOpen(false);
          }}
          className="w-full text-left px-4 py-2 text-xs text-zinc-300 hover:bg-indigo-600 hover:text-white flex items-center gap-2 transition-colors rounded-xl"
        >
          <LayoutGrid size={14} /> Manage Projects...
        </button>

        <input 
          type="file" 
          ref={fileInputRef} 
          onChange={handleFallbackLoadProject} 
          accept=".kvg,.json" 
          className="hidden" 
        />

        {/* Modals are still needed */}
        {showConfirmModal && (
          <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-[200]">
            <div className="bg-[#1a1a1a] border border-zinc-800 rounded-xl p-6 max-w-sm w-full shadow-2xl">
              <div className="flex items-center gap-3 text-orange-400 mb-4">
                <AlertTriangle size={24} />
                <h3 className="text-lg font-bold text-white">Start New Project?</h3>
              </div>
              <p className="text-sm text-zinc-400 mb-6">
                Are you sure you want to start a new project? Any unsaved changes will be lost.
              </p>
              <div className="flex justify-end gap-3">
                <button onClick={() => setShowConfirmModal(false)} className="px-4 py-2 text-xs font-bold text-zinc-400 hover:text-white transition-colors">CANCEL</button>
                <button onClick={confirmNewProject} className="px-4 py-2 text-xs font-bold bg-orange-500 hover:bg-orange-400 text-white rounded-lg transition-colors">START NEW PROJECT</button>
              </div>
            </div>
          </div>
        )}

        {alertMessage && (
          <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-[200]">
            <div className="bg-[#1a1a1a] border border-zinc-800 rounded-xl p-6 max-w-sm w-full shadow-2xl">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3 text-red-400">
                  <AlertTriangle size={24} />
                  <h3 className="text-lg font-bold text-white">Error</h3>
                </div>
                <button onClick={() => setAlertMessage(null)} className="text-zinc-500 hover:text-white"><X size={20} /></button>
              </div>
              <p className="text-sm text-zinc-400 mb-6">{alertMessage}</p>
              <div className="flex justify-end">
                <button onClick={() => setAlertMessage(null)} className="px-4 py-2 text-xs font-bold bg-zinc-800 hover:bg-zinc-700 text-white rounded-lg transition-colors">OK</button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <>
      <div className="relative" ref={menuRef}>
        <button 
          className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl transition-all ${isOpen ? 'text-white bg-zinc-800' : 'text-zinc-400 hover:text-white hover:bg-zinc-800'}`}
          onClick={() => {
            if (!isOpen) fetchRecentProjects();
            setIsOpen(!isOpen);
            setShowRecentProjects(false);
          }}
        >
          <FolderOpen size={14} />
          <span className="text-[10px] font-bold uppercase tracking-wider">File Operations</span>
          <ChevronDown size={10} className={`ml-auto transition-transform ${isOpen ? 'rotate-180' : ''}`} />
        </button>

        {isOpen && (
          <div className="absolute top-full left-0 mt-1 w-56 bg-[#1a1a1a] border border-zinc-800 rounded-2xl shadow-2xl py-1 z-50 backdrop-blur-xl">
            <button 
              onClick={handleNewProjectClick}
              className="w-full text-left px-4 py-2 text-xs text-zinc-300 hover:bg-indigo-600 hover:text-white flex items-center gap-2 transition-colors"
            >
              <FilePlus size={14} /> New Project
            </button>
            
            <div className="h-px bg-zinc-800 my-1" />

            <button 
              onClick={handleSaveToBrowser}
              className="w-full text-left px-4 py-2 text-xs text-zinc-300 hover:bg-indigo-600 hover:text-white flex items-center justify-between transition-colors"
            >
              <div className="flex items-center gap-2">
                <HardDrive size={14} /> Save to Browser
              </div>
              <span className="text-[10px] text-zinc-500">Auto</span>
            </button>

            <button 
              onClick={handleQuickSave}
              className="w-full text-left px-4 py-2 text-xs text-zinc-300 hover:bg-indigo-600 hover:text-white flex items-center gap-2 transition-colors"
            >
              <Save size={14} /> Save to File
            </button>

            <button 
              onClick={handleSaveAsProject}
              className="w-full text-left px-4 py-2 text-xs text-zinc-300 hover:bg-indigo-600 hover:text-white flex items-center gap-2 transition-colors"
            >
              <SaveAll size={14} /> Save As...
            </button>
            
            <div className="h-px bg-zinc-800 my-1" />

            <button 
              onClick={handleOpenProjectClick}
              className="w-full text-left px-4 py-2 text-xs text-zinc-300 hover:bg-indigo-600 hover:text-white flex items-center gap-2 transition-colors"
            >
              <FolderOpen size={14} /> Open File...
            </button>

            <button 
              onMouseEnter={() => setShowRecentProjects(true)}
              className={`w-full text-left px-4 py-2 text-xs flex items-center justify-between transition-colors ${showRecentProjects ? 'bg-zinc-800 text-white' : 'text-zinc-300 hover:bg-zinc-800'}`}
            >
              <div className="flex items-center gap-2">
                <Clock size={14} /> Recent Projects
              </div>
              <span className="text-[10px]">›</span>
            </button>
            
            <button 
              onClick={() => {
                onOpenDashboard?.();
                setIsOpen(false);
              }}
              className="w-full text-left px-4 py-2 text-xs text-zinc-300 hover:bg-indigo-600 hover:text-white flex items-center gap-2 transition-colors"
            >
              <LayoutGrid size={14} /> Manage Projects...
            </button>
            
            {showRecentProjects && (
              <div className="absolute left-full top-0 ml-1 w-64 bg-[#1a1a1a] border border-zinc-800 rounded-lg shadow-2xl py-1 max-h-[400px] overflow-y-auto">
                {recentProjects.length === 0 ? (
                  <div className="px-4 py-3 text-xs text-zinc-500 italic">No recent projects</div>
                ) : (
                  recentProjects.map(p => (
                    <div 
                      key={p.id}
                      onClick={() => handleLoadRecent(p.id)}
                      className="group px-4 py-2 text-xs text-zinc-300 hover:bg-indigo-600 hover:text-white flex items-center justify-between cursor-pointer transition-colors"
                    >
                      <div className="flex flex-col overflow-hidden">
                        <span className="truncate font-medium">{p.name}</span>
                        <span className="text-[9px] text-zinc-500 group-hover:text-indigo-200">
                          {new Date(p.lastModified).toLocaleString()}
                        </span>
                      </div>
                      <button 
                        onClick={(e) => handleDeleteRecent(e, p.id)}
                        className="p-1.5 opacity-0 group-hover:opacity-100 hover:bg-red-500/20 rounded-md text-zinc-500 hover:text-red-400 transition-all"
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                  ))
                )}
              </div>
            )}

            <input 
              type="file" 
              ref={fileInputRef} 
              onChange={handleFallbackLoadProject} 
              accept=".kvg,.json" 
              className="hidden" 
            />
          </div>
        )}
      </div>

      {/* Confirmation Modal */}
      {showConfirmModal && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-[100]">
          <div className="bg-[#1a1a1a] border border-zinc-800 rounded-xl p-6 max-w-sm w-full shadow-2xl">
            <div className="flex items-center gap-3 text-orange-400 mb-4">
              <AlertTriangle size={24} />
              <h3 className="text-lg font-bold text-white">Start New Project?</h3>
            </div>
            <p className="text-sm text-zinc-400 mb-6">
              Are you sure you want to start a new project? Any unsaved changes will be lost.
            </p>
            <div className="flex justify-end gap-3">
              <button 
                onClick={() => setShowConfirmModal(false)}
                className="px-4 py-2 text-xs font-bold text-zinc-400 hover:text-white transition-colors"
              >
                CANCEL
              </button>
              <button 
                onClick={confirmNewProject}
                className="px-4 py-2 text-xs font-bold bg-orange-500 hover:bg-orange-400 text-white rounded-lg transition-colors"
              >
                START NEW PROJECT
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Alert Modal */}
      {alertMessage && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-[100]">
          <div className="bg-[#1a1a1a] border border-zinc-800 rounded-xl p-6 max-w-sm w-full shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3 text-red-400">
                <AlertTriangle size={24} />
                <h3 className="text-lg font-bold text-white">Error</h3>
              </div>
              <button onClick={() => setAlertMessage(null)} className="text-zinc-500 hover:text-white">
                <X size={20} />
              </button>
            </div>
            <p className="text-sm text-zinc-400 mb-6">
              {alertMessage}
            </p>
            <div className="flex justify-end">
              <button 
                onClick={() => setAlertMessage(null)}
                className="px-4 py-2 text-xs font-bold bg-zinc-800 hover:bg-zinc-700 text-white rounded-lg transition-colors"
              >
                OK
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
