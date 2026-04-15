import { normalizePath } from 'obsidian';

/**
 * Normalizes a folder path to ensure consistency:
 * - No leading slashes
 * - No trailing slashes
 * - Proper Obsidian path format
 */
export function sanitizeFolderPath(path: string): string {
    if (!path || path.trim() === "") return "";
    
    let sanitized = normalizePath(path.trim());
    
    // Remove leading/trailing slashes if they persist after normalization
    sanitized = sanitized.replace(/^\/+|\/+$/g, '');
    
    return sanitized;
}

/**
 * Sanitizes a filename to remove invalid characters
 */
export function sanitizeFileName(name: string): string {
    return name.replace(/[\\/:"*?<>|]/g, '_').trim();
}
