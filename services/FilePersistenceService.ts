
import { get, set, del, keys } from 'idb-keyval';

/**
 * FilePersistenceService handles the storage and retrieval of large files
 * (video, audio, images) in the browser's IndexedDB.
 * This allows assets to survive page refreshes even when blob: URLs expire.
 */
export class FilePersistenceService {
  private static readonly STORE_NAME = 'nexus-assets';

  /**
   * Saves a File or Blob to IndexedDB.
   */
  public static async saveFile(id: string, file: File | Blob): Promise<void> {
    try {
      await set(id, file);
      console.log(`[FilePersistenceService] Saved file: ${id}`);
    } catch (error) {
      console.error(`[FilePersistenceService] Error saving file ${id}:`, error);
      throw error;
    }
  }

  /**
   * Retrieves a File or Blob from IndexedDB.
   */
  public static async getFile(id: string): Promise<File | Blob | undefined> {
    try {
      const file = await get(id);
      if (file) {
        console.log(`[FilePersistenceService] Retrieved file: ${id}`);
      }
      return file;
    } catch (error) {
      console.error(`[FilePersistenceService] Error retrieving file ${id}:`, error);
      return undefined;
    }
  }

  /**
   * Removes a file from IndexedDB.
   */
  public static async deleteFile(id: string): Promise<void> {
    try {
      await del(id);
      console.log(`[FilePersistenceService] Deleted file: ${id}`);
    } catch (error) {
      console.error(`[FilePersistenceService] Error deleting file ${id}:`, error);
    }
  }

  /**
   * Clears all stored files.
   */
  public static async clearAll(): Promise<void> {
    try {
      const allKeys = await keys();
      for (const key of allKeys) {
        await del(key);
      }
      console.log('[FilePersistenceService] Cleared all files');
    } catch (error) {
      console.error('[FilePersistenceService] Error clearing files:', error);
    }
  }
}
