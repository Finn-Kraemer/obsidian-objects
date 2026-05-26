import { App, Modal, TextComponent, TFile, AbstractInputSuggest, getAllTags, Setting } from 'obsidian';
import ObjectsPlugin from './main';
import { TriggerTemplateMapping } from './types';
import { sanitizeFolderPath } from './utils';

/**
 * Modal for entering a title for a new or linked note.
 */
export class TitleModal extends Modal {
    private result: string = "";
    private openNote: boolean = true;
    private onSubmit: (result: string, openNote: boolean) => void;
    private mapping: TriggerTemplateMapping;
    private plugin: ObjectsPlugin;
    private isClosed: boolean = false;

    /**
     * @param app Obsidian App instance
     * @param plugin Reference to the main plugin
     * @param mapping The trigger mapping being used
     * @param onSubmit Callback function on successful input (returns title and openNote flag)
     */
    constructor(app: App, plugin: ObjectsPlugin, mapping: TriggerTemplateMapping, onSubmit: (result: string, openNote: boolean) => void) {
        super(app);
        this.plugin = plugin;
        this.mapping = mapping;
        this.onSubmit = onSubmit;
        this.openNote = plugin.settings.openNewNote;
    }

    /**
     * Creates the modal UI.
     */
    onOpen() {
        const { contentEl, titleEl } = this;

        // Set the modal title
        titleEl.setText('Create or link note');

        contentEl.createDiv({ text: 'Enter note title:', cls: 'objects-modal-description' });
        
        const inputContainer = contentEl.createDiv({ cls: 'objects-modal-input-container' });

        const textComponent = new TextComponent(inputContainer);
        const inputEl = textComponent.inputEl;
        
        inputEl.addClass('objects-modal-input');
        inputEl.placeholder = 'My new note';
        inputEl.value = this.result;
        
        textComponent.onChange((value) => {
            this.result = value;
        });

        // Add autocompletion for existing files
        new FileSuggest(this.app, inputEl, this.plugin, this.mapping);

        // Allow submission via Enter key
        inputEl.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                // Small delay to allow potential suggestion selection to finish
                activeWindow.setTimeout(() => this.submit(), 100);
            }
        });

        // Use a small delay for focus to ensure modal is centered and stable
        // This prevents the suggester from miscalculating its position
        activeWindow.setTimeout(() => {
            if (!this.isClosed) {
                inputEl.focus();
            }
        }, 50);

        new Setting(contentEl)
            .setName('Open note after creation')
            .addToggle(toggle => toggle
                .setValue(this.openNote)
                .onChange(value => {
                    this.openNote = value;
                })
            );

        // Buttons container using standard Obsidian class
        const buttonContainer = contentEl.createDiv({ cls: 'modal-button-container' });

        const submitBtn = buttonContainer.createEl('button', { 
            text: 'Create or link', 
            cls: 'mod-cta' 
        });
        submitBtn.addEventListener('click', () => this.submit());

        const cancelBtn = buttonContainer.createEl('button', { text: 'Cancel' });
        cancelBtn.addEventListener('click', () => this.close());
    }

    /**
     * Validates input and executes the submit callback.
     */
    private submit() {
        if (this.isClosed) return;

        const trimmed = this.result.trim();
        if (trimmed.length > 0) {
            this.onSubmit(trimmed, this.openNote);
            this.close();
        }
    }

    /**
     * Cleans up the modal on close.
     */
    onClose() {
        this.isClosed = true;
        this.contentEl.empty();
    }
}

/**
 * Internal suggester that suggests existing markdown files in the target folder.
 */
class FileSuggest extends AbstractInputSuggest<TFile> {
    constructor(
        app: App, 
        private inputEl: HTMLInputElement, 
        private plugin: ObjectsPlugin, 
        private mapping: TriggerTemplateMapping
    ) {
        super(app, inputEl);
    }

    /**
     * Filters all markdown files based on the target folder and query.
     */
    getSuggestions(query: string): TFile[] {
        const lowerCaseQuery = query.toLowerCase();
        const files = this.app.vault.getMarkdownFiles();
        
        const folder = this.mapping.outputPath || this.plugin.settings.defaultOutputPath;
        const normalizedTarget = sanitizeFolderPath(folder);
        const { propertyKey, propertyValue } = this.mapping;
        const { useProperties, archiveTag, archivePropertyKey, archivePropertyValue } = this.plugin.settings;

        // Pre-normalize archive tag for comparison
        const normalizedArchiveTag = archiveTag ? archiveTag.replace(/^#/, '').toLowerCase() : null;

        return files.filter(file => {
            const cache = this.app.metadataCache.getFileCache(file);

            // 1. Filter out archived notes
            if (cache) {
                // Check tag
                if (normalizedArchiveTag) {
                    const tags = getAllTags(cache);
                    if (tags && tags.some(tag => tag.replace(/^#/, '').toLowerCase() === normalizedArchiveTag)) {
                        return false;
                    }
                }

                // Check property
                if (archivePropertyKey && archivePropertyValue) {
                    const frontmatter = cache.frontmatter as Record<string, unknown> | undefined;
                    if (frontmatter) {
                        const val = frontmatter[archivePropertyKey];
                        if (val !== undefined && (typeof val === 'string' || typeof val === 'number' || typeof val === 'boolean') && String(val).toLowerCase() === archivePropertyValue.toLowerCase()) {
                            return false;
                        }
                    }
                }
            }

            // 2. Filter by folder if defined
            if (normalizedTarget !== '') {
                const folderPath = file.parent ? sanitizeFolderPath(file.parent.path) : '';
                if (folderPath !== normalizedTarget) return false;
            }

            // 3. Filter by mapping property if defined AND feature is enabled
            if (useProperties && propertyKey && propertyValue) {
                const frontmatter = cache?.frontmatter as Record<string, unknown> | undefined;
                if (!frontmatter) return false;
                
                const val = frontmatter[propertyKey];
                // Support both exact match and tag match (if value starts with #)
                if (val !== undefined && (typeof val === 'string' || typeof val === 'number' || typeof val === 'boolean') && String(val).toLowerCase() !== propertyValue.toLowerCase()) {
                    return false;
                }
            }

            // 4. Filter by query
            const matchesQuery = file.basename.toLowerCase().includes(lowerCaseQuery);
            return matchesQuery;
        }).slice(0, 10); // Limit to 10 suggestions
    }

    renderSuggestion(file: TFile, el: HTMLElement) {
        el.setText(file.basename);
    }

    selectSuggestion(file: TFile) {
        this.inputEl.value = file.basename;
        this.inputEl.dispatchEvent(new Event('input'));
        this.close();
    }
}
