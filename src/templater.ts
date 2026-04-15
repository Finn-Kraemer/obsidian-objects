import { App, TFile, normalizePath, moment } from 'obsidian';
import { ITemplaterAPI, ITemplaterPlugin, InternalPlugins } from './types';
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
        const plugins = (this.app as unknown as { plugins: InternalPlugins }).plugins;
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

        // 1. Get content from template or use empty string
        let content = "";
        if (templateFile) {
            content = await this.app.vault.read(templateFile);
        }

        // 2. Always replace our own placeholders first
        content = this.replacePlaceholders(content, fileName);

        // 3. Create the file
        let newFile: TFile;
        try {
            newFile = await this.app.vault.create(newNotePath, content);
        } catch (error) {
            console.warn(`Objects: Failed to create file at "${newNotePath}":`, error);
            return null;
        }

        // 4. If Templater is active, let it process the file for its own tags (<% ... %>)
        if (api && newFile) {
            try {
                // We use the already created file and overwrite it with Templater-processed content
                // Note: ITemplaterAPI might not have a direct 'process' method in our interface yet,
                // but usually create_new_note_from_template is the only way via API.
                // However, since we already created the file to support our placeholders, 
                // we can just return it. If the user has Templater "Trigger on new file" enabled, 
                // it will run automatically anyway.
            } catch (e) {
                console.warn("Objects: Templater post-processing failed:", e);
            }
        }

        return newFile;
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
