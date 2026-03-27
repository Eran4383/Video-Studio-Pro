
import React, { useEffect, useState } from 'react';
import { useProjectStore } from '../../store/useProjectStore';
import { ProjectPersistenceService, ProjectMetadata } from '../../services/ProjectPersistenceService';
import { FilePersistenceService } from '../../services/FilePersistenceService';
import { 
  FolderOpen, 
  Plus, 
  Trash2, 
  Clock, 
  HardDrive, 
  Download, 
  Upload, 
  FileVideo, 
  Music, 
  Image as ImageIcon,
  ChevronRight,
  Search,
  LayoutGrid,
  List as ListIcon,
  MoreVertical,
  AlertCircle
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { format } from 'date-fns';

interface ProjectDashboardProps {
  onClose: () => void;
}

export const ProjectDashboard: React.FC<ProjectDashboardProps> = ({ onClose }) => {
  const store = useProjectStore();
  const [recentProjects, setRecentProjects] = useState<ProjectMetadata[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [storageStats, setStorageStats] = useState<{ used: string, count: number }>({ used: '0 MB', count: 0 });

  const fetchProjects = async () => {
    setIsLoading(true);
    try {
      const projects = await ProjectPersistenceService.getRecentProjects();
      setRecentProjects(projects);
      
      // Calculate storage stats (rough estimate)
      // This is hard to do accurately without iterating all keys, but we can show count
      setStorageStats({
        used: 'Calculating...',
        count: projects.length
      });
      
      // Try to get actual storage usage if browser supports it
      if (navigator.storage && navigator.storage.estimate) {
        const estimate = await navigator.storage.estimate();
        if (estimate.usage) {
          const mb = (estimate.usage / (1024 * 1024)).toFixed(1);
          setStorageStats(prev => ({ ...prev, used: `${mb} MB` }));
        }
      }
    } catch (err) {
      console.error("Failed to fetch projects:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchProjects();
  }, []);

  const handleCreateNew = () => {
    if (window.confirm("Create a new project? Any unsaved changes to the current project will be lost.")) {
      // Reset store to default
      // Note: We might need a resetProject action in the store
      window.location.reload(); // Simplest way to reset everything for now
    }
  };

  const handleLoadProject = async (id: string) => {
    try {
      const projectData = await ProjectPersistenceService.loadProject(id);
      if (projectData) {
        store.loadProjectData(projectData.project, projectData.assets);
        onClose();
      }
    } catch (err) {
      alert("Failed to load project: " + err);
    }
  };

  const handleDeleteProject = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (window.confirm("Are you sure you want to delete this project and all its associated assets from browser storage?")) {
      await ProjectPersistenceService.deleteProject(id);
      await fetchProjects();
    }
  };

  const handleImportFromFile = async () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      
      try {
        const text = await file.text();
        const data = JSON.parse(text);
        if (data.project && data.assets) {
          store.loadProjectData(data.project, data.assets);
          onClose();
        } else {
          alert("Invalid project file format.");
        }
      } catch (err) {
        alert("Failed to parse project file: " + err);
      }
    };
    input.click();
  };

  const filteredProjects = recentProjects.filter(p => 
    p.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[100] bg-[#080808] flex flex-col font-inter"
    >
      {/* Header */}
      <header className="h-16 border-b border-zinc-800/50 bg-[#121212] flex items-center justify-between px-8">
        <div className="flex items-center gap-4">
          <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center text-[10px] font-black">NX</div>
          <h2 className="text-lg font-black tracking-tighter uppercase">Project Dashboard</h2>
        </div>
        
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 bg-zinc-900/50 border border-zinc-800 rounded-full px-4 py-1.5">
            <HardDrive size={14} className="text-zinc-500" />
            <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">
              Storage: {storageStats.used} ({storageStats.count} Projects)
            </span>
          </div>
          <button 
            onClick={onClose}
            className="text-zinc-500 hover:text-white transition-colors p-2"
          >
            <Plus size={24} className="rotate-45" />
          </button>
        </div>
      </header>

      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar */}
        <aside className="w-64 border-r border-zinc-800/50 bg-[#0c0c0c] p-6 flex flex-col gap-8">
          <div className="flex flex-col gap-2">
            <button 
              onClick={handleCreateNew}
              className="w-full flex items-center gap-3 bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-3 rounded-xl font-bold text-sm transition-all active:scale-95 shadow-lg shadow-indigo-600/20"
            >
              <Plus size={18} /> New Project
            </button>
            <button 
              onClick={handleImportFromFile}
              className="w-full flex items-center gap-3 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 px-4 py-3 rounded-xl font-bold text-sm transition-all"
            >
              <Upload size={18} /> Import File
            </button>
          </div>

          <nav className="flex flex-col gap-1">
            <h3 className="text-[10px] font-black text-zinc-600 uppercase tracking-[0.2em] mb-2 px-4">Library</h3>
            <button className="flex items-center gap-3 px-4 py-2.5 rounded-lg bg-indigo-500/10 text-indigo-400 font-bold text-sm">
              <Clock size={18} /> Recent Projects
            </button>
            <button className="flex items-center gap-3 px-4 py-2.5 rounded-lg text-zinc-500 hover:bg-zinc-800/50 hover:text-zinc-300 font-bold text-sm transition-all">
              <FolderOpen size={18} /> Templates
            </button>
            <button className="flex items-center gap-3 px-4 py-2.5 rounded-lg text-zinc-500 hover:bg-zinc-800/50 hover:text-zinc-300 font-bold text-sm transition-all">
              <Trash2 size={18} /> Trash
            </button>
          </nav>

          <div className="mt-auto p-4 bg-zinc-900/30 rounded-2xl border border-zinc-800/50">
            <div className="flex items-center gap-2 mb-2">
              <AlertCircle size={14} className="text-indigo-400" />
              <span className="text-[10px] font-bold text-zinc-400 uppercase">Pro Tip</span>
            </div>
            <p className="text-[11px] text-zinc-500 leading-relaxed">
              Projects saved to browser storage are local to this device. Export as .json to share or backup.
            </p>
          </div>
        </aside>

        {/* Main Content */}
        <main className="flex-1 flex flex-col bg-[#080808] p-8 overflow-y-auto">
          <div className="max-w-6xl mx-auto w-full">
            <div className="flex items-center justify-between mb-8">
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500" size={18} />
                <input 
                  type="text" 
                  placeholder="Search projects..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-zinc-900/50 border border-zinc-800 rounded-xl pl-12 pr-4 py-2.5 text-sm focus:outline-none focus:border-indigo-500/50 transition-all"
                />
              </div>

              <div className="flex items-center gap-2 bg-zinc-900/50 p-1 rounded-lg border border-zinc-800">
                <button 
                  onClick={() => setViewMode('grid')}
                  className={`p-1.5 rounded-md transition-all ${viewMode === 'grid' ? 'bg-zinc-800 text-white shadow-sm' : 'text-zinc-500 hover:text-zinc-300'}`}
                >
                  <LayoutGrid size={18} />
                </button>
                <button 
                  onClick={() => setViewMode('list')}
                  className={`p-1.5 rounded-md transition-all ${viewMode === 'list' ? 'bg-zinc-800 text-white shadow-sm' : 'text-zinc-500 hover:text-zinc-300'}`}
                >
                  <ListIcon size={18} />
                </button>
              </div>
            </div>

            {isLoading ? (
              <div className="flex flex-col items-center justify-center py-20 gap-4">
                <div className="w-10 h-10 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
                <span className="text-sm font-bold text-zinc-500 uppercase tracking-widest">Loading Projects...</span>
              </div>
            ) : filteredProjects.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-32 border-2 border-dashed border-zinc-800 rounded-3xl bg-zinc-900/10">
                <div className="w-16 h-16 bg-zinc-900 rounded-2xl flex items-center justify-center text-zinc-700 mb-6">
                  <FolderOpen size={32} />
                </div>
                <h3 className="text-lg font-bold text-zinc-300 mb-2">No projects found</h3>
                <p className="text-zinc-500 text-sm mb-8">Start by creating a new project or importing an existing one.</p>
                <button 
                  onClick={handleCreateNew}
                  className="bg-indigo-600 hover:bg-indigo-500 text-white px-8 py-3 rounded-xl font-bold text-sm transition-all active:scale-95"
                >
                  Create Your First Project
                </button>
              </div>
            ) : viewMode === 'grid' ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {filteredProjects.map((project) => (
                  <motion.div 
                    key={project.id}
                    layoutId={project.id}
                    onClick={() => handleLoadProject(project.id)}
                    className="group relative bg-[#121212] border border-zinc-800/50 rounded-2xl overflow-hidden hover:border-indigo-500/50 transition-all cursor-pointer hover:shadow-2xl hover:shadow-indigo-500/5"
                  >
                    <div className="aspect-video bg-zinc-900 flex items-center justify-center relative overflow-hidden">
                      {/* Placeholder for project thumbnail if we had one */}
                      <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                      <FileVideo size={40} className="text-zinc-800 group-hover:text-indigo-500/20 transition-colors" />
                      
                      <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button 
                          onClick={(e) => handleDeleteProject(project.id, e)}
                          className="p-2 bg-black/50 backdrop-blur-md text-zinc-400 hover:text-red-400 rounded-lg transition-colors"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>
                    
                    <div className="p-5">
                      <div className="flex items-start justify-between mb-1">
                        <h4 className="font-bold text-zinc-200 truncate pr-4">{project.name}</h4>
                        <ChevronRight size={16} className="text-zinc-700 group-hover:text-indigo-500 transition-colors" />
                      </div>
                      <div className="flex items-center gap-3 text-[10px] font-bold text-zinc-500 uppercase tracking-wider">
                        <span className="flex items-center gap-1">
                          <Clock size={12} /> {format(project.lastModified, 'MMM d, HH:mm')}
                        </span>
                        <span className="w-1 h-1 bg-zinc-800 rounded-full" />
                        <span>{project.assetCount} Assets</span>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            ) : (
              <div className="bg-[#121212] border border-zinc-800/50 rounded-2xl overflow-hidden">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-zinc-800/50 text-[10px] font-black text-zinc-500 uppercase tracking-widest">
                      <th className="px-6 py-4">Project Name</th>
                      <th className="px-6 py-4">Last Modified</th>
                      <th className="px-6 py-4">Assets</th>
                      <th className="px-6 py-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredProjects.map((project) => (
                      <tr 
                        key={project.id}
                        onClick={() => handleLoadProject(project.id)}
                        className="group hover:bg-zinc-800/30 transition-colors cursor-pointer border-b border-zinc-800/30 last:border-0"
                      >
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 bg-zinc-900 rounded-lg flex items-center justify-center text-zinc-600 group-hover:text-indigo-400 transition-colors">
                              <FileVideo size={16} />
                            </div>
                            <span className="font-bold text-zinc-200">{project.name}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-xs text-zinc-500 font-medium">
                          {format(project.lastModified, 'MMMM d, yyyy HH:mm')}
                        </td>
                        <td className="px-6 py-4">
                          <span className="text-[10px] font-bold bg-zinc-900 text-zinc-400 px-2 py-1 rounded-md border border-zinc-800">
                            {project.assetCount} FILES
                          </span>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <button 
                              onClick={(e) => handleDeleteProject(project.id, e)}
                              className="p-2 text-zinc-600 hover:text-red-400 hover:bg-red-400/10 rounded-lg transition-all"
                            >
                              <Trash2 size={16} />
                            </button>
                            <button className="p-2 text-zinc-600 hover:text-white hover:bg-zinc-800 rounded-lg transition-all">
                              <MoreVertical size={16} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </main>
      </div>
    </motion.div>
  );
};
