import { App, Editor, EditorPosition, normalizePath, Notice, TFile } from 'obsidian';
import ObjectsPlugin from './main';
import { TriggerTemplateMapping } from './types';
import { sanitizeFolderPath, sanitizeFileName } from './utils';

/**
 * Creates a new note (or links an existing one) for a mapping and replaces
 * an editor range with the resulting link.
 * Shared by the trigger suggester and the "convert selection" command.
 */
export class ObjectCreator {
    constructor(private app: App, private plugin: ObjectsPlugin) {}

    /**
     * Central logic for creating a new note or linking to an existing one.
     * The text between `start` and `end` is replaced with the link.
     */
    async createOrLink(
        suggestion: TriggerTemplateMapping,
        title: string,
        openNote: boolean,
        editor: Editor,
        start: EditorPosition,
        end: EditorPosition
    ) {
        const sanitizedTitle = sanitizeFileName(title);
        const sourcePath = this.app.workspace.getActiveFile()?.path || '';

        // 1. Search for existing file (first in target path, then in entire vault)
        const existingFile = this.findExistingFile(sanitizedTitle, suggestion);

        if (existingFile) {
            this.insertLinkAndFocus(editor, existingFile, sourcePath, title, start, end);
            new Notice(`Linked to existing note: "${existingFile.basename}"`);
            return;
        }

        // 2. Resolve template (don't stop if missing, just warn)
        const templateFile = this.getTemplateFile(suggestion);
        if (!templateFile && suggestion.templateName) {
             new Notice(`Template "${suggestion.templateName}" not found. Creating note without template.`, 3000);
        }

        try {
            const folder = suggestion.outputPath || this.plugin.settings.defaultOutputPath;
            const targetFolder = sanitizeFolderPath(folder);

            // 3. Ensure target folder exists
            if (targetFolder && !this.app.vault.getAbstractFileByPath(targetFolder)) {
                await this.app.vault.createFolder(targetFolder);
            }

            // 4. Create and link via TemplaterHandler
            const useProperties = this.plugin.settings.useProperties;
            const newFile = await this.plugin.templater.createNoteFromTemplate(
                templateFile,
                targetFolder,
                sanitizedTitle,
                useProperties ? suggestion.propertyKey : undefined,
                useProperties ? suggestion.propertyValue : undefined
            );

            if (newFile) {
                this.insertLinkAndFocus(editor, newFile, sourcePath, title, start, end);

                // Open newly created file in a new tab (pane) if configured
                if (openNote) {
                    await this.app.workspace.openLinkText(newFile.path, '', true);
                }

                new Notice(`Created new note: "${newFile.basename}"`);
            } else {
                new Notice("Error: failed to create file.", 5000);
            }
        } catch (e) {
            console.warn("Objects: Error in creation process:", e);
            new Notice("Error creating note. See console for details.");
        }
    }

    /**
     * Looks for a file. First exactly in the target path; only falls back to a vault-wide
     * lookup when no target folder is configured. With a target folder set, a vault-wide
     * fallback could match a homonymous note in an unrelated folder and link to the wrong one.
     */
    private findExistingFile(title: string, suggestion: TriggerTemplateMapping): TFile | null {
        const folder = suggestion.outputPath || this.plugin.settings.defaultOutputPath;
        const targetFolder = sanitizeFolderPath(folder);
        const specificPath = normalizePath(targetFolder ? `${targetFolder}/${title}.md` : `${title}.md`);

        const fileAtTable = this.app.vault.getAbstractFileByPath(specificPath);
        if (fileAtTable instanceof TFile) return fileAtTable;

        if (!targetFolder) {
            return this.app.metadataCache.getFirstLinkpathDest(title, "");
        }
        return null;
    }

    /**
     * Tries to load the configured template as a TFile.
     */
    private getTemplateFile(suggestion: TriggerTemplateMapping): TFile | null {
        const templateName = suggestion.templateName?.trim();
        if (!templateName) return null;

        const templateFolder = sanitizeFolderPath(this.plugin.settings.templateFolder);
        const templatePath = normalizePath(templateFolder ? `${templateFolder}/${templateName}.md` : `${templateName}.md`);
        const file = this.app.vault.getAbstractFileByPath(templatePath);

        return file instanceof TFile ? file : null;
    }

    /**
     * Inserts the markdown link into the editor and sets the focus.
     */
    private insertLinkAndFocus(editor: Editor, file: TFile, sourcePath: string, alias: string, start: EditorPosition, end: EditorPosition) {
        // Generate a clean markdown link (considering Obsidian settings)
        const link = this.app.fileManager.generateMarkdownLink(file, sourcePath, '', alias).trim();
        editor.replaceRange(link, start, end);

        // Set cursor behind the newly inserted link
        const newCursorPos = {
            line: start.line,
            ch: start.ch + link.length
        };
        editor.setCursor(newCursorPos);
        editor.focus();
    }
}
