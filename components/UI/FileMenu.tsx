import React, { useState, useRef, useEffect } from 'react';
import { useProjectStore } from '../../store/useProjectStore';
import { FolderOpen, Save, FilePlus, AlertTriangle, X, SaveAll } from 'lucide-react';

interface FileMenuProps {
  store: ReturnType<typeof useProjectStore>;
}

export const FileMenu = ({ store }: FileMenuProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [alertMessage, setAlertMessage] = useState<string | null>(null);
  
  const menuRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleNewProjectClick = () => {
    setShowConfirmModal(true);
    setIsOpen(false);
  };

  const confirmNewProject = () => {
    store.resetProject();
    setShowConfirmModal(false);
  };

  const handleQuickSave = async () => {
    const data = JSON.stringify({ project: store.project, assets: store.assets }, null, 2);
    
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
    const data = JSON.stringify({ project: store.project, assets: store.assets }, null, 2);
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

  const handleFallbackLoadProject = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    readFile(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
    setIsOpen(false);
  };

  return (
    <>
      <div className="relative" ref={menuRef}>
        <button 
          className={`px-3 py-1 text-[11px] font-bold transition-colors ${isOpen ? 'text-white bg-zinc-800/50 rounded' : 'text-zinc-500 hover:text-white'}`}
          onClick={() => setIsOpen(!isOpen)}
        >
          File
        </button>

        {isOpen && (
          <div className="absolute top-full left-0 mt-1 w-48 bg-[#1a1a1a] border border-zinc-800 rounded-lg shadow-xl py-1 z-50">
            <button 
              onClick={handleNewProjectClick}
              className="w-full text-left px-4 py-2 text-xs text-zinc-300 hover:bg-indigo-600 hover:text-white flex items-center gap-2 transition-colors"
            >
              <FilePlus size={14} /> New Project
            </button>
            
            <button 
              onClick={handleQuickSave}
              className="w-full text-left px-4 py-2 text-xs text-zinc-300 hover:bg-indigo-600 hover:text-white flex items-center gap-2 transition-colors"
            >
              <Save size={14} /> Save
            </button>

            <button 
              onClick={handleSaveAsProject}
              className="w-full text-left px-4 py-2 text-xs text-zinc-300 hover:bg-indigo-600 hover:text-white flex items-center gap-2 transition-colors"
            >
              <SaveAll size={14} /> Save As...
            </button>
            
            <button 
              onClick={handleOpenProjectClick}
              className="w-full text-left px-4 py-2 text-xs text-zinc-300 hover:bg-indigo-600 hover:text-white flex items-center gap-2 transition-colors"
            >
              <FolderOpen size={14} /> Open Project...
            </button>
            
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
