
import { get, set, del, keys } from 'idb-keyval';
import { Project, Asset } from '../types';

export interface ProjectMetadata {
  id: string;
  name: string;
  lastModified: number;
  assetCount: number;
}

export interface SavedProject {
  id: string;
  name: string;
  lastModified: number;
  project: Project;
  assets: Asset[];
}

/**
 * ProjectPersistenceService handles saving and loading projects from IndexedDB.
 * This allows for "Recent Projects" and "Auto-save" functionality.
 */
export class ProjectPersistenceService {
  private static readonly RECENT_PROJECTS_KEY = 'nexus-recent-projects';

  /**
   * Saves a project to IndexedDB.
   */
  public static async saveProject(project: Project, assets: Asset[]): Promise<void> {
    try {
      const savedProject: SavedProject = {
        id: project.id,
        name: project.name,
        lastModified: Date.now(),
        project,
        // We save assets but we strip the audioBuffer as it can't be serialized
        assets: assets.map(a => ({ ...a, audioBuffer: undefined }))
      };

      await set(`project-${project.id}`, savedProject);
      
      // Update recent projects list
      await this.addToRecentList(project.id, project.name, assets.length);
      
      console.log(`[ProjectPersistenceService] Saved project: ${project.name} (${project.id})`);
    } catch (error) {
      console.error(`[ProjectPersistenceService] Error saving project:`, error);
      throw error;
    }
  }

  /**
   * Loads a project from IndexedDB.
   */
  public static async loadProject(id: string): Promise<SavedProject | undefined> {
    try {
      const project = await get(`project-${id}`);
      return project as SavedProject;
    } catch (error) {
      console.error(`[ProjectPersistenceService] Error loading project ${id}:`, error);
      return undefined;
    }
  }

  /**
   * Gets the list of recent projects.
   */
  public static async getRecentProjects(): Promise<ProjectMetadata[]> {
    try {
      const list = (await get(this.RECENT_PROJECTS_KEY) || []) as any[];
      // Ensure assetCount is present for metadata
      return list.map(p => ({
        ...p,
        assetCount: p.assetCount || 0
      })) as ProjectMetadata[];
    } catch (error) {
      console.error(`[ProjectPersistenceService] Error getting recent projects:`, error);
      return [];
    }
  }

  /**
   * Deletes a project from IndexedDB.
   */
  public static async deleteProject(id: string): Promise<void> {
    try {
      await del(`project-${id}`);
      const list = await this.getRecentProjects();
      const newList = list.filter(p => p.id !== id);
      await set(this.RECENT_PROJECTS_KEY, newList);
      console.log(`[ProjectPersistenceService] Deleted project: ${id}`);
    } catch (error) {
      console.error(`[ProjectPersistenceService] Error deleting project ${id}:`, error);
    }
  }

  private static async addToRecentList(id: string, name: string, assetCount: number = 0): Promise<void> {
    const list = await this.getRecentProjects();
    const existingIndex = list.findIndex(p => p.id === id);
    
    const entry: ProjectMetadata = { id, name, lastModified: Date.now(), assetCount };
    
    if (existingIndex > -1) {
      list.splice(existingIndex, 1);
    }
    
    list.unshift(entry);
    
    // Keep only last 10 projects
    const limitedList = list.slice(0, 10);
    await set(this.RECENT_PROJECTS_KEY, limitedList);
  }
}
