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
     *
     * When Templater is available and a template is provided, delegates to its
     * create_new_note_from_template API. This guarantees that <% %> tags are
     * processed regardless of the user's "Trigger Templater on new file creation"
     * setting. Otherwise falls back to manual creation with the basic
     * {{title}} / {{date}} / {{time}} placeholders.
     */
    async createNoteFromTemplate(
        templateFile: TFile | null,
        folderPath: string,
        fileName: string,
        propertyKey?: string,
        propertyValue?: string
    ): Promise<TFile | null> {
        const api = this.getApi();
        const sanitizedFolder = sanitizeFolderPath(folderPath);
        let newFile: TFile | null = null;

        // Path A: Templater + template -> delegate so <% %> is always expanded.
        // open_new_note=false because the suggester opens the file itself.
        if (api && templateFile) {
            try {
                newFile = await api.create_new_note_from_template(
                    templateFile,
                    sanitizedFolder,
                    fileName,
                    false
                );
            } catch (e) {
                console.warn('Objects: Templater API failed, falling back to manual creation:', e);
                newFile = null;
            }
        }

        // Path B: fallback (no Templater, no template, or Templater threw).
        if (!newFile) {
            const newNotePath = normalizePath(sanitizedFolder ? `${sanitizedFolder}/${fileName}.md` : `${fileName}.md`);
            let content = "";
            if (templateFile) {
                content = await this.app.vault.read(templateFile);
            }
            content = this.replacePlaceholders(content, fileName);
            try {
                newFile = await this.app.vault.create(newNotePath, content);
            } catch (error) {
                console.warn(`Objects: Failed to create file at "${newNotePath}":`, error);
                return null;
            }
        }

        if (newFile && propertyKey && propertyValue) {
            try {
                await this.app.fileManager.processFrontMatter(newFile, (frontmatter) => {
                    frontmatter[propertyKey] = propertyValue;
                });
            } catch (e) {
                console.warn("Objects: Failed to add frontmatter properties:", e);
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
