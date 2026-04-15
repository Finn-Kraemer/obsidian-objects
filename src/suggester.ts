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

/**
 * Editor suggester that reacts to the '@' character and suggests defined templates.
 */
export class TriggerSuggest extends EditorSuggest<TriggerTemplateMapping> {
    private plugin: ObjectsPlugin;

    constructor(app: App, plugin: ObjectsPlugin) {
        super(app);
        this.plugin = plugin;
    }

    /**
     * Checks if the suggester should be triggered at the current cursor position.
     * Trigger: '@' at the start of a line or after a space.
     */
    onTrigger(cursor: EditorPosition, editor: Editor): EditorSuggestTriggerInfo | null {
        const line = editor.getLine(cursor.line).substring(0, cursor.ch);
        
        // Match '@' followed by word characters at the end of the line so far
        const match = /@(\w*)$/.exec(line);
        if (!match) return null;

        const query = match[1];
        const triggerStart = line.lastIndexOf('@');
        
        // Ensure there is a space before @ or it's at the start of the line
        if (triggerStart > 0 && line.charAt(triggerStart - 1) !== ' ') {
            return null;
        }

        return {
            start: { line: cursor.line, ch: triggerStart },
            end: cursor,
            query: query,
        };
    }

    /**
     * Provides matching mapping suggestions based on previous input.
     */
    getSuggestions(context: EditorSuggestContext): TriggerTemplateMapping[] {
        const query = context.query.toLowerCase();
        return this.plugin.settings.triggerTemplates.filter(t =>
            t.enabled && t.trigger.toLowerCase().startsWith('@' + query)
        );
    }

    renderSuggestion(suggestion: TriggerTemplateMapping, el: HTMLElement) {
        el.setText(suggestion.trigger);
    }

    /**
     * Called when a suggestion is selected.
     * Opens the modal for title entry.
     */
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
     * Central logic for creating a new note or linking to an existing one.
     */
    private async handleNoteCreation(
        suggestion: TriggerTemplateMapping, 
        title: string, 
        context: EditorSuggestContext
    ) {
        const editor = context.editor;
        const sanitizedTitle = sanitizeFileName(title);
        const sourcePath = this.app.workspace.getActiveFile()?.path || '';

        // 1. Search for existing file (first in target path, then in entire vault)
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

            // 3. Ensure target folder exists
            if (targetFolder && !this.app.vault.getAbstractFileByPath(targetFolder)) {
                await this.app.vault.createFolder(targetFolder);
            }

            // 4. Create and link via TemplaterHandler
            const newFile = await this.plugin.templater.createNoteFromTemplate(
                templateFile, 
                targetFolder, 
                sanitizedTitle
            );
            
            if (newFile) {
                this.insertLinkAndFocus(editor, newFile, sourcePath, title, context);
                // Open newly created file in a new tab (pane)
                this.app.workspace.openLinkText(newFile.path, '', true);
                new Notice(`Created new note: "${newFile.basename}"`);
            } else {
                new Notice("Error: Failed to create file.", 5000);
            }
        } catch (e) {
            console.error("Objects: Error in creation process:", e);
            new Notice("Error creating note. See console for details.");
        }
    }

    /**
     * Looks for a file. First exactly in the target path, then via MetadataCache in the entire vault.
     */
    private findExistingFile(title: string, suggestion: TriggerTemplateMapping): TFile | null {
        const folder = suggestion.outputPath || this.plugin.settings.defaultOutputPath;
        const targetFolder = sanitizeFolderPath(folder);
        const specificPath = normalizePath(targetFolder ? `${targetFolder}/${title}.md` : `${title}.md`);

        // Check exact path first
        const fileAtTable = this.app.vault.getAbstractFileByPath(specificPath);
        if (fileAtTable instanceof TFile) return fileAtTable;

        // Fallback: search anywhere in the vault via first link match
        return this.app.metadataCache.getFirstLinkpathDest(title, "");
    }

    /**
     * Tries to load the configured template as a TFile.
     */
    private async getTemplateFile(suggestion: TriggerTemplateMapping): Promise<TFile | null> {
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
    private insertLinkAndFocus(editor: Editor, file: TFile, sourcePath: string, alias: string, context: EditorSuggestContext) {
        // Generate a clean markdown link (considering Obsidian settings)
        let link = this.app.fileManager.generateMarkdownLink(file, sourcePath, '', alias).trim();
        editor.replaceRange(link, context.start, context.end);
        
        // Set cursor behind the newly inserted link
        const newCursorPos = {
            line: context.start.line,
            ch: context.start.ch + link.length
        };
        editor.setCursor(newCursorPos);
        editor.focus();
    }
}
