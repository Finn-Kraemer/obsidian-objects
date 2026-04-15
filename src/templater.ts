import { App, TFile, normalizePath, moment } from 'obsidian';
import { ITemplaterAPI, ITemplaterPlugin } from './types';
import { sanitizeFolderPath } from './utils';

/**
 * Handles note creation.
 * Uses primarily the Templater API, but provides a fallback system if Templater is not active.
 */
export class TemplaterHandler {
    private app: App;

    constructor(app: App) {
        this.app = app;
    }

    /**
     * Tries to get the Templater API if the plugin is enabled.
     * @returns The Templater API or null if the plugin is not active.
     */
    getApi(): ITemplaterAPI | null {
        const plugins = (this.app as any).plugins;
        if (!plugins || !plugins.enabledPlugins.has('templater-obsidian')) {
            return null;
        }
        const plugin = plugins.plugins['templater-obsidian'] as ITemplaterPlugin | undefined;
        return plugin?.templater || null;
    }

    /**
     * Creates a new note from a template.
     */
    async createNoteFromTemplate(templateFile: TFile | null, folderPath: string, fileName: string): Promise<TFile | null> {
        const api = this.getApi();
        const sanitizedFolder = sanitizeFolderPath(folderPath);
        const newNotePath = normalizePath(sanitizedFolder ? `${sanitizedFolder}/${fileName}.md` : `${fileName}.md`);

        // Preferred method: Templater API
        if (api && templateFile) {
            return await api.create_new_note_from_template(templateFile, sanitizedFolder, fileName, false);
        }

        // --- Fallback logic (Templater missing or no template provided) ---
        let content = "";
        if (templateFile) {
            content = await this.app.vault.read(templateFile);
            content = this.replacePlaceholders(content, fileName);
        }

        try {
            return await this.app.vault.create(newNotePath, content);
        } catch (error) {
            console.error(`Objects: Failed to create file at "${newNotePath}":`, error);
            return null;
        }
    }

    /**
     * Basic placeholder replacement for the fallback system.
     * Supports {{title}}, {{date}} (YYYY-MM-DD), and {{time}} (HH:mm).
     */
    private replacePlaceholders(content: string, title: string): string {
        const now = moment();
        const replacements: Record<string, string> = {
            '{{title}}': title,
            '{{date}}': now.format("YYYY-MM-DD"),
            '{{time}}': now.format("HH:mm"),
        };

        let result = content;
        for (const [placeholder, value] of Object.entries(replacements)) {
            result = result.split(placeholder).join(value);
        }
        return result;
    }
}
