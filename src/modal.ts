import { App, Modal, Setting, TFile, AbstractInputSuggest } from 'obsidian';
import ObjectsPlugin from './main';
import { sanitizeFolderPath } from './utils';

/**
 * Modal for entering a title for a new or linked note.
 */
export class TitleModal extends Modal {
    private result: string = "";
    private onSubmit: (result: string) => void;
    private targetFolder: string;
    private plugin: ObjectsPlugin;
    private isClosed: boolean = false;

    /**
     * @param app Obsidian App instance
     * @param plugin Reference to the main plugin
     * @param targetFolder Target folder for file search/creation
     * @param onSubmit Callback function on successful input
     */
    constructor(app: App, plugin: ObjectsPlugin, targetFolder: string, onSubmit: (result: string) => void) {
        super(app);
        this.plugin = plugin;
        this.targetFolder = targetFolder;
        this.onSubmit = onSubmit;
    }

    /**
     * Creates the modal UI.
     */
    onOpen() {
        const { contentEl } = this;

        new Setting(contentEl)
            .setName('Enter note title')
            .setHeading();

        const inputSetting = new Setting(contentEl)
            .setName('Title')
            .addText((text) => {
                text.setPlaceholder('My new note')
                    .setValue(this.result)
                    .onChange((value) => {
                        this.result = value;
                    });
                
                // Add autocompletion for existing files
                new FileSuggest(this.app, text.inputEl, this.plugin, this.targetFolder);

                // Allow submission via Enter key
                text.inputEl.addEventListener('keydown', (e) => {
                    if (e.key === 'Enter') {
                        // Small delay to allow potential suggestion selection to finish
                        setTimeout(() => this.submit(), 100);
                    }
                });

                // Focus the input field immediately
                text.inputEl.focus();
            });
        
        // Hide the "Title" label to keep it clean, as heading is enough
        inputSetting.infoEl.remove();

        new Setting(contentEl)
            .addButton((btn) =>
                btn
                    .setButtonText('Create or link')
                    .setCta()
                    .onClick(() => this.submit())
            )
            .addButton((btn) =>
                btn.setButtonText('Cancel').onClick(() => this.close())
            );
    }

    /**
     * Validates input and executes the submit callback.
     */
    private submit() {
        if (this.isClosed) return;

        const trimmed = this.result.trim();
        if (trimmed.length > 0) {
            this.onSubmit(trimmed);
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
        private targetFolder: string
    ) {
        super(app, inputEl);
    }

    /**
     * Filters all markdown files based on the target folder and query.
     */
    getSuggestions(query: string): TFile[] {
        const lowerCaseQuery = query.toLowerCase();
        const files = this.app.vault.getMarkdownFiles();
        const normalizedTarget = sanitizeFolderPath(this.targetFolder);

        return files.filter(file => {
            const folderPath = file.parent ? sanitizeFolderPath(file.parent.path) : '';
            // Check if file is in target folder or if no target folder (Vault Root) is defined
            const isInFolder = normalizedTarget === '' || folderPath === normalizedTarget;
            const matchesQuery = file.basename.toLowerCase().includes(lowerCaseQuery);
            return isInFolder && matchesQuery;
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
