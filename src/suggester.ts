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
import ObsidianObjectsPlugin from './main';
import { TriggerTemplateMapping } from './types';
import { TitleModal } from './modal';
import { sanitizeFolderPath, sanitizeFileName } from './utils';

export class TriggerSuggest extends EditorSuggest<TriggerTemplateMapping> {
    private plugin: ObsidianObjectsPlugin;

    constructor(app: App, plugin: ObsidianObjectsPlugin) {
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
        const folder = suggestion.outputPath || this.plugin.settings.defaultOutputPath;
        const targetFolder = sanitizeFolderPath(folder);
        const newNotePath = normalizePath(targetFolder ? `${targetFolder}/${sanitizedTitle}.md` : `${sanitizedTitle}.md`);

        const existingFile = this.app.vault.getAbstractFileByPath(newNotePath);
        const sourcePath = this.app.workspace.getActiveFile()?.path || '';

        // 1. Check for existing file
        if (existingFile instanceof TFile) {
            this.insertLinkAndFocus(editor, existingFile, sourcePath, title, context);
            new Notice(`Linked to existing note: "${existingFile.basename}"`);
            return;
        }

        // 2. Resolve template
        const templateFile = await this.getTemplateFile(suggestion);
        if (!templateFile && suggestion.templateName) {
             new Notice(`Template "${suggestion.templateName}" not found.`, 5000);
             return;
        }

        try {
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
            console.error("Obsidian Objects: Error during creation flow:", e);
            new Notice("Error creating note. See console for details.");
        }
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
