import { App, TFile, normalizePath, moment } from 'obsidian';
import { ITemplaterAPI, ITemplaterPlugin } from './types';
import { sanitizeFolderPath } from './utils';

export class TemplaterHandler {
    private app: App;

    constructor(app: App) {
        this.app = app;
    }

    /**
     * Tries to get the Templater API if the plugin is enabled.
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
     * Uses Templater if available, otherwise falls back to a basic replacement engine.
     */
    async createNoteFromTemplate(templateFile: TFile | null, folderPath: string, fileName: string): Promise<TFile | null> {
        const api = this.getApi();
        const sanitizedFolder = sanitizeFolderPath(folderPath);
        const newNotePath = normalizePath(sanitizedFolder ? `${sanitizedFolder}/${fileName}.md` : `${fileName}.md`);

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
            // Only log errors, as per guidelines
            console.error(`Objects: Failed to create file at "${newNotePath}":`, error);
            return null;
        }
    }

    /**
     * Basic placeholder replacement for {{title}}, {{date}}, {{time}}
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
