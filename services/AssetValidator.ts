
export interface ValidationResult {
  ok: boolean;
  error?: string;
  blobUrl?: string;
}

export class AssetValidator {
  static async validateAndPrefetch(url: string): Promise<ValidationResult> {
    try {
      const response = await fetch(url, { mode: 'cors' });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      
      const blob = await response.blob();
      const blobUrl = URL.createObjectURL(blob);
      
      return { ok: true, blobUrl };
    } catch (err: any) {
      return { 
        ok: false, 
        error: `CORS/Access Error: The server hosting this file does not allow programmatic access. (${err.message})` 
      };
    }
  }
}
