import {
    App,
    Editor,
    EditorPosition,
    EditorSuggest,
    EditorSuggestContext,
    EditorSuggestTriggerInfo,
    MarkdownView,
    normalizePath,
    Notice,
    Plugin,
    PluginSettingTab,
    Setting,
    TFile,
    AbstractInputSuggest,
    debounce, // Import the debounce function
} from 'obsidian';

// INTERFACES
interface TriggerTemplateMapping {
    trigger: string;
    templateName: string;
    outputPath?: string;
}

interface MyPluginSettings {
    templateFolder: string;
    triggerTemplates: TriggerTemplateMapping[];
    defaultOutputPath: string;
}

// DEFAULT SETTINGS
const DEFAULT_SETTINGS: MyPluginSettings = {
    templateFolder: 'Templates',
    triggerTemplates: [
        { trigger: '@project', templateName: 'project', outputPath: 'Projects/' },
        { trigger: '@atomic', templateName: 'atomic', outputPath: 'Zettelkasten/' },
        { trigger: '@person', templateName: 'person' }
    ],
    defaultOutputPath: '',
};

// MAIN PLUGIN CLASS
export default class TemplateTriggerPlugin extends Plugin {
    settings: MyPluginSettings;
    private templaterApi: any;

    async onload() {
        console.log('Template Trigger Plugin: Loading...');
        await this.loadSettings();
        this.addSettingTab(new SettingsTab(this.app, this));

        this.app.workspace.onLayoutReady(() => {
            this.templaterApi = (this.app as any).plugins.plugins['templater-obsidian'];
            
            if (this.templaterApi) {
                console.log('Template Trigger Plugin: Templater plugin found and ready.');
                this.registerEditorSuggest(new TriggerSuggest(this.app, this));
                new Notice('Template Trigger Plugin is active.', 2000);
            } else {
                const message = 'Template Trigger Plugin: The "Templater" plugin is not active. Please install and enable it.';
                new Notice(message, 10000);
                console.error(message);
            }
        });
    }

    async loadSettings() {
        this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
    }

    async saveSettings() {
        await this.saveData(this.settings);
    }

    getTemplater() {
        if (!this.templaterApi) {
             this.templaterApi = (this.app as any).plugins.plugins['templater-obsidian'];
        }
        return this.templaterApi;
    }
}

// EDITOR SUGGESTER
class TriggerSuggest extends EditorSuggest<TriggerTemplateMapping> {
    private plugin: TemplateTriggerPlugin;

    constructor(app: App, plugin: TemplateTriggerPlugin) {
        super(app);
        this.plugin = plugin;
    }

    onTrigger(cursor: EditorPosition, editor: Editor): EditorSuggestTriggerInfo | null {
        const line = editor.getLine(cursor.line).substring(0, cursor.ch);
        // Cleaned up regex to only capture relevant characters
        const match = line.match(/(?:^|\s)([\w\s]+)@(\w*)$/);

        if (match) {
            const matchStart = line.lastIndexOf(match[1]);
            return {
                start: { line: cursor.line, ch: matchStart },
                end: cursor,
                query: match[2],
            };
        }
        return null;
    }

    getSuggestions(context: EditorSuggestContext): TriggerTemplateMapping[] {
        const query = context.query.toLowerCase();
        return this.plugin.settings.triggerTemplates.filter(t =>
            t.trigger.toLowerCase().startsWith('@' + query)
        );
    }

    renderSuggestion(suggestion: TriggerTemplateMapping, el: HTMLElement) {
        el.setText(suggestion.trigger);
    }

    async selectSuggestion(suggestion: TriggerTemplateMapping, evt: MouseEvent | KeyboardEvent) {
        const context = this.context;
        if (!context) return;
        const editor = context.editor;

        const templater = this.plugin.getTemplater();
        if (!templater?.templater?.create_new_note_from_template) {
            new Notice('Error: Required Templater function not found.', 5000);
            return;
        }

        // --- STEP 1: Extract information ---
        const originalInput = editor.getRange(context.start, context.end);
        const parts = originalInput.replace(/@\w*$/, '').trim().split(/\s+/);
        const title = parts.pop() || '';
        const precedingText = parts.join(' ') + (parts.length > 0 ? ' ' : '');

        if (!title) {
            new Notice('Please provide a title before the trigger.', 3000);
            return;
        }

        // --- STEP 2: Prepare paths and template ---
        const sanitizedTitle = title.replace(/[\\/:"*?<>|]/g, '_');
        const templatePath = normalizePath(`${this.plugin.settings.templateFolder}/${suggestion.templateName}.md`);
        const templateFile = this.app.vault.getAbstractFileByPath(templatePath);

        if (!(templateFile instanceof TFile)) {
            new Notice(`Template "${templatePath}" not found.`, 4000);
            return;
        }
        
        const folder = suggestion.outputPath ?? this.plugin.settings.defaultOutputPath;
        const finalFolderPath = folder ? normalizePath(folder) : '';
        const newNotePath = normalizePath(finalFolderPath ? `${finalFolderPath}/${sanitizedTitle}.md` : `${sanitizedTitle}.md`);

        // --- STEP 3: Create file (if it doesn't exist) ---
        let newFile: TFile | null = this.app.vault.getAbstractFileByPath(newNotePath) as TFile;
        const fileExisted = !!newFile;

        if (!fileExisted) {
            try {
                if (finalFolderPath && !this.app.vault.getAbstractFileByPath(finalFolderPath)) {
                    await this.app.vault.createFolder(finalFolderPath);
                }
                // Create note WITHOUT opening it immediately (important!)
                newFile = await templater.templater.create_new_note_from_template(templateFile, finalFolderPath, sanitizedTitle, false);
            } catch (e) {
                console.error("Template Trigger Plugin: Error creating note via Templater:", e);
                new Notice("Error creating note. See console for details.");
                return;
            }
        } else {
             new Notice(`Note "${newNotePath}" already exists. Creating a link.`);
        }
        
        if (!newFile) {
            new Notice("Error: File could not be created or found.", 5000);
            return;
        }
        
        // --- STEP 4: Replace text in the original editor ---
        const link = this.app.fileManager.generateMarkdownLink(newFile, '', '', title);
        editor.replaceRange(precedingText + link, context.start, context.end);
        
        // --- STEP 5: Manually open the new note ---
        if (!fileExisted) {
            this.app.workspace.openLinkText(newFile.path, '', true);
        }
    }
}

// SETTINGS TAB
class SettingsTab extends PluginSettingTab {
    plugin: TemplateTriggerPlugin;
    constructor(app: App, plugin: TemplateTriggerPlugin) {
        super(app, plugin);
        this.plugin = plugin;
    }

    display(): void {
        const { containerEl } = this;
        containerEl.empty();
        containerEl.createEl('h2', { text: 'Template Trigger Settings' });

        // OPTIMIZATION: Debounced save to avoid frequent disk writes.
        const debouncedSave = debounce(() => this.plugin.saveSettings(), 500, true);

        new Setting(containerEl)
            .setName('Templater Status')
            .setDesc(this.createStatusFragment(!!this.plugin.getTemplater()));

        containerEl.createEl('h3', { text: 'Folders & Paths' });

        new Setting(containerEl)
            .setName('Template Folder')
            .setDesc('The folder where all your template (.md) files are stored.')
            .addText(text => text
                .setPlaceholder('e.g., Templates')
                .setValue(this.plugin.settings.templateFolder)
                .onChange((value) => {
                    this.plugin.settings.templateFolder = value;
                    debouncedSave();
                }));
        
        new Setting(containerEl)
            .setName('Default Output Path')
            .setDesc('Optional: The global default folder for new notes.')
            .addText(text => text
                .setPlaceholder('e.g., Inbox/')
                .setValue(this.plugin.settings.defaultOutputPath)
                .onChange((value) => {
                    this.plugin.settings.defaultOutputPath = value;
                    debouncedSave();
                }));

        containerEl.createEl('h3', { text: 'Trigger → Template Mappings' });

        this.plugin.settings.triggerTemplates.forEach((mapping, index) => {
            const setting = new Setting(containerEl)
                .setClass("trigger-template-setting")
                .addText(text => text
                    .setPlaceholder('@trigger')
                    .setValue(mapping.trigger)
                    .onChange((value) => {
                        this.plugin.settings.triggerTemplates[index].trigger = value.startsWith('@') ? value : '@' + value;
                        debouncedSave();
                    }))
                .addText(text => {
                    new TemplateSuggest(this.app, text.inputEl, this.plugin);
                    text.setPlaceholder('Template filename')
                        .setValue(mapping.templateName)
                        .onChange((value) => {
                            this.plugin.settings.triggerTemplates[index].templateName = value.replace(/\.md$/, '');
                            debouncedSave();
                        });
                })
                .addText(text => text
                    .setPlaceholder('Specific output path (optional)')
                    .setValue(mapping.outputPath || '')
                    .onChange((value) => {
                        this.plugin.settings.triggerTemplates[index].outputPath = value;
                        debouncedSave();
                    }))
                .addExtraButton(btn => btn
                    .setIcon('trash')
                    .setTooltip('Delete')
                    .onClick(async () => {
                        this.plugin.settings.triggerTemplates.splice(index, 1);
                        await this.plugin.saveSettings(); // Save immediately on delete
                        this.display();
                    }));
            setting.nameEl.setText(`Trigger #${index + 1}`);
        });

        new Setting(containerEl)
            .addButton(btn => btn
                .setButtonText('Add new mapping')
                .setCta()
                .onClick(async () => {
                    this.plugin.settings.triggerTemplates.push({ trigger: '@', templateName: '' });
                    await this.plugin.saveSettings(); // Save immediately on add
                    this.display();
                }));
    }

    private createStatusFragment(isAvailable: boolean): DocumentFragment {
        const fragment = document.createDocumentFragment();
        const statusSpan = fragment.createEl('span');

        if (isAvailable) {
            statusSpan.textContent = '✔ Available';
            statusSpan.style.color = 'var(--color-green)';
            fragment.append('The Templater plugin was found successfully. ', statusSpan);
        } else {
            statusSpan.textContent = '✖ Not Found';
            statusSpan.style.color = 'var(--color-red)';
            fragment.append('WARNING: The Templater plugin is not active. ', statusSpan);
        }
        return fragment;
    }
}

// HELPER CLASS FOR TEMPLATE SUGGESTIONS IN SETTINGS
class TemplateSuggest extends AbstractInputSuggest<TFile> {
    constructor(app: App, private inputEl: HTMLInputElement, private plugin: TemplateTriggerPlugin) {
        super(app, inputEl);
    }
    getSuggestions(query: string): TFile[] {
        const templateFolder = this.plugin.settings.templateFolder;
        if (!templateFolder) return [];
        const lowerCaseQuery = query.toLowerCase();
        // This filtering is already very efficient.
        return this.app.vault.getMarkdownFiles().filter(file => 
            file.path.startsWith(templateFolder + '/') && 
            file.basename.toLowerCase().includes(lowerCaseQuery)
        );
    }
    renderSuggestion(file: TFile, el: HTMLElement) {
        el.setText(file.basename);
    }
    selectSuggestion(file: TFile) {
        this.inputEl.value = file.basename;
        this.inputEl.trigger("input");
        this.close();
    }
}
