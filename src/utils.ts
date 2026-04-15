import { normalizePath } from 'obsidian';

/**
 * Normalizes a folder path for consistent use in Obsidian:
 * - Removes leading and trailing slashes.
 * - Uses Obsidian internal path normalization.
 */
export function sanitizeFolderPath(path: string): string {
    if (!path || path.trim() === "") return "";
    
    let sanitized = normalizePath(path.trim());
    
    // Clean paths if slashes remain after normalization
    sanitized = sanitized.replace(/^\/+|\/+$/g, '');
    
    return sanitized;
}

/**
 * Sanitizes a filename to remove invalid characters (\ / : * ? < > |).
 * Replaces them with underscores.
 */
export function sanitizeFileName(name: string): string {
    return name.replace(/[\\/:"*?<>|]/g, '_').trim();
}
