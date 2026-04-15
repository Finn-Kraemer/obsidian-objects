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
import { TriggerTemplateMapping } from './settings';
import { TitleModal } from './modal';

export class TriggerSuggest extends EditorSuggest<TriggerTemplateMapping> {
    private plugin: ObsidianObjectsPlugin;

    constructor(app: App, plugin: ObsidianObjectsPlugin) {
        super(app);
        this.plugin = plugin;
    }

    onTrigger(cursor: EditorPosition, editor: Editor): EditorSuggestTriggerInfo | null {
        const line = editor.getLine(cursor.line).substring(0, cursor.ch);
        const match = line.match(/(?:^|\s)@(\w*)$/);

        if (match) {
            const query = match[1];
            // Find the start of '@' correctly. match[0] might contain a leading space.
            const triggerStart = line.length - (query.length + 1);
            
            return {
                start: { line: cursor.line, ch: triggerStart },
                end: cursor,
                query: query,
            };
        }
        return null;
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
        const editor = context.editor;

        const folder = suggestion.outputPath ?? this.plugin.settings.defaultOutputPath;
        const finalFolderPath = folder ? normalizePath(folder) : '';

        new TitleModal(this.app, this.plugin, finalFolderPath, async (title) => {
            await this.createNote(suggestion, title, context, editor);
        }).open();
    }

    private async createNote(
        suggestion: TriggerTemplateMapping, 
        title: string, 
        context: EditorSuggestContext, 
        editor: Editor
    ) {
        const sanitizedTitle = title.replace(/[\\/:"*?<>|]/g, '_');
        const folder = suggestion.outputPath ?? this.plugin.settings.defaultOutputPath;
        const finalFolderPath = folder ? normalizePath(folder) : '';
        const newNotePath = normalizePath(finalFolderPath ? `${finalFolderPath}/${sanitizedTitle}.md` : `${sanitizedTitle}.md`);

        // 1. Check if the file already exists at the target path
        const existingFile = this.app.vault.getAbstractFileByPath(newNotePath);
        const activeFile = this.app.workspace.getActiveFile();
        const sourcePath = activeFile ? activeFile.path : '';
        
        if (existingFile instanceof TFile) {
            // File exists - create link and stop
            let link = this.app.fileManager.generateMarkdownLink(existingFile, sourcePath, '', title);
            link = link.trim(); // Ensure no trailing newlines
            
            editor.focus();
            editor.replaceRange(link, context.start, context.end);
            
            // Set cursor to end of link
            editor.setCursor({
                line: context.start.line,
                ch: context.start.ch + link.length
            });
            
            new Notice(`Linked to existing note: "${existingFile.basename}"`);
            return;
        }
// 2. File doesn't exist - Proceed with creation
let templateFile: TFile | null = null;
const templateName = suggestion.templateName?.trim();

if (templateName) {
    const templateFolder = this.plugin.settings.templateFolder?.trim();
    const templatePath = normalizePath(templateFolder ? `${templateFolder}/${templateName}.md` : `${templateName}.md`);
    const abstractTemplate = this.app.vault.getAbstractFileByPath(templatePath);
    
    if (abstractTemplate instanceof TFile) {
        templateFile = abstractTemplate;
    } else {
        new Notice(`Template file not found at: ${templatePath}`, 5000);
        return;
    }
}

try {
    // Create folder if it doesn't exist
    if (finalFolderPath && !this.app.vault.getAbstractFileByPath(finalFolderPath)) {
        await this.app.vault.createFolder(finalFolderPath);
    }

    // 3. Create note using either Templater or fallback
    const newFile = await this.plugin.templater.createNoteFromTemplate(
        templateFile, 
        finalFolderPath, 
        sanitizedTitle
    );
            
            if (newFile) {
                let link = this.app.fileManager.generateMarkdownLink(newFile, sourcePath, '', title);
                link = link.trim();

                editor.focus();
                editor.replaceRange(link, context.start, context.end);
                
                // Set cursor to end of link
                editor.setCursor({
                    line: context.start.line,
                    ch: context.start.ch + link.length
                });
                
                // Open the newly created note
                this.app.workspace.openLinkText(newFile.path, '', true);
                new Notice(`Created new note: "${newFile.basename}"`);
            } else {
                new Notice("Error: Failed to create the file.", 5000);
            }
        } catch (e) {
            console.error("Obsidian Objects: Error in creation flow:", e);
            new Notice("Error creating note. See console for details.");
        }
    }
}
