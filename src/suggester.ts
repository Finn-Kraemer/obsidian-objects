import { 
    App, 
    Editor, 
    EditorPosition, 
    EditorSuggest, 
    EditorSuggestContext, 
    EditorSuggestTriggerInfo, 
    normalizePath, 
    Notice, 
    TFile 
} from 'obsidian';
import ObjectsPlugin from './main';
import { TriggerTemplateMapping } from './types';
import { TitleModal } from './modal';
import { sanitizeFolderPath, sanitizeFileName } from './utils';

export class TriggerSuggest extends EditorSuggest<TriggerTemplateMapping> {
    private plugin: ObjectsPlugin;

    constructor(app: App, plugin: ObjectsPlugin) {
        super(app);
        this.plugin = plugin;
    }

    onTrigger(cursor: EditorPosition, editor: Editor): EditorSuggestTriggerInfo | null {
        const line = editor.getLine(cursor.line).substring(0, cursor.ch);
        const match = line.match(/(?:^|\s)@(\w*)$/);

        if (!match) return null;

        const query = match[1];
        const triggerStart = cursor.ch - (query.length + 1);
        
        return {
            start: { line: cursor.line, ch: triggerStart },
            end: cursor,
            query: query,
        };
    }

    getSuggestions(context: EditorSuggestContext): TriggerTemplateMapping[] {
        const query = context.query.toLowerCase();
        return this.plugin.settings.triggerTemplates.filter(t =>
            t.enabled && t.trigger.toLowerCase().startsWith('@' + query)
        );
    }

    renderSuggestion(suggestion: TriggerTemplateMapping, el: HTMLElement) {
        el.setText(suggestion.trigger);
    }

    async selectSuggestion(suggestion: TriggerTemplateMapping, evt: MouseEvent | KeyboardEvent) {
        const context = this.context;
        if (!context) return;

        const folder = suggestion.outputPath || this.plugin.settings.defaultOutputPath;
        const targetFolder = sanitizeFolderPath(folder);

        new TitleModal(this.app, this.plugin, targetFolder, async (title) => {
            await this.handleNoteCreation(suggestion, title, context);
        }).open();
    }

    /**
     * Handles the full logic of creating a note or linking to an existing one.
     */
    private async handleNoteCreation(
        suggestion: TriggerTemplateMapping, 
        title: string, 
        context: EditorSuggestContext
    ) {
        const editor = context.editor;
        const sanitizedTitle = sanitizeFileName(title);
        const sourcePath = this.app.workspace.getActiveFile()?.path || '';

        // 1. Try to find an existing file (anywhere in the vault or at target path)
        const existingFile = this.findExistingFile(sanitizedTitle, suggestion);
        
        if (existingFile) {
            this.insertLinkAndFocus(editor, existingFile, sourcePath, title, context);
            new Notice(`Linked to existing note: "${existingFile.basename}"`);
            return;
        }

        // 2. Resolve template (don't stop if missing, just warn)
        const templateFile = await this.getTemplateFile(suggestion);
        if (!templateFile && suggestion.templateName) {
             new Notice(`Template "${suggestion.templateName}" not found. Creating note without template.`, 3000);
        }

        try {
            const folder = suggestion.outputPath || this.plugin.settings.defaultOutputPath;
            const targetFolder = sanitizeFolderPath(folder);

            // 3. Ensure folder exists
            if (targetFolder && !this.app.vault.getAbstractFileByPath(targetFolder)) {
                await this.app.vault.createFolder(targetFolder);
            }

            // 4. Create and Link
            const newFile = await this.plugin.templater.createNoteFromTemplate(
                templateFile, 
                targetFolder, 
                sanitizedTitle
            );
            
            if (newFile) {
                this.insertLinkAndFocus(editor, newFile, sourcePath, title, context);
                this.app.workspace.openLinkText(newFile.path, '', true);
                new Notice(`Created new note: "${newFile.basename}"`);
            } else {
                new Notice("Error: Failed to create the file.", 5000);
            }
        } catch (e) {
            console.error("Objects: Error during creation flow:", e);
            new Notice("Error creating note. See console for details.");
        }
    }

    /**
     * Looks for an existing file. 
     * First checks the specific target path, then searches the entire vault by name.
     */
    private findExistingFile(title: string, suggestion: TriggerTemplateMapping): TFile | null {
        const folder = suggestion.outputPath || this.plugin.settings.defaultOutputPath;
        const targetFolder = sanitizeFolderPath(folder);
        const specificPath = normalizePath(targetFolder ? `${targetFolder}/${title}.md` : `${title}.md`);

        // Check specific location first
        const fileAtTable = this.app.vault.getAbstractFileByPath(specificPath);
        if (fileAtTable instanceof TFile) return fileAtTable;

        // Fallback: search anywhere in the vault
        return this.app.metadataCache.getFirstLinkpathDest(title, "");
    }

    private async getTemplateFile(suggestion: TriggerTemplateMapping): Promise<TFile | null> {
        const templateName = suggestion.templateName?.trim();
        if (!templateName) return null;

        const templateFolder = sanitizeFolderPath(this.plugin.settings.templateFolder);
        const templatePath = normalizePath(templateFolder ? `${templateFolder}/${templateName}.md` : `${templateName}.md`);
        const file = this.app.vault.getAbstractFileByPath(templatePath);
        
        return file instanceof TFile ? file : null;
    }

    private insertLinkAndFocus(editor: Editor, file: TFile, sourcePath: string, alias: string, context: EditorSuggestContext) {
        let link = this.app.fileManager.generateMarkdownLink(file, sourcePath, '', alias).trim();
        editor.replaceRange(link, context.start, context.end);
        
        const newCursorPos = {
            line: context.start.line,
            ch: context.start.ch + link.length
        };
        editor.setCursor(newCursorPos);
        editor.focus();
    }
}
