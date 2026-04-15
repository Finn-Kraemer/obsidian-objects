import { App, Modal, Setting, TFile, AbstractInputSuggest } from 'obsidian';
import ObsidianObjectsPlugin from './main';
import { sanitizeFolderPath } from './utils';

export class TitleModal extends Modal {
    private result: string = "";
    private onSubmit: (result: string) => void;
    private targetFolder: string;
    private plugin: ObsidianObjectsPlugin;

    constructor(app: App, plugin: ObsidianObjectsPlugin, targetFolder: string, onSubmit: (result: string) => void) {
        super(app);
        this.plugin = plugin;
        this.targetFolder = targetFolder;
        this.onSubmit = onSubmit;
    }

    onOpen() {
        const { contentEl } = this;
        contentEl.createEl('h2', { text: 'Enter Note Title' });

        const setting = new Setting(contentEl)
            .setName('Title')
            .addText((text) => {
                text.setPlaceholder('My new note')
                    .setValue(this.result)
                    .onChange((value) => {
                        this.result = value;
                    });
                
                new FileSuggest(this.app, text.inputEl, this.plugin, this.targetFolder);

                text.inputEl.addEventListener('keydown', (e) => {
                    if (e.key === 'Enter') {
                        // Small delay to allow potential suggestion selection to finish
                        setTimeout(() => this.submit(), 100);
                    }
                });

                // Focus input immediately
                text.inputEl.focus();
            });

        new Setting(contentEl)
            .addButton((btn) =>
                btn
                    .setButtonText('Create / Link')
                    .setCta()
                    .onClick(() => this.submit())
            )
            .addButton((btn) =>
                btn.setButtonText('Cancel').onClick(() => this.close())
            );
    }

    private submit() {
        if (!this.app.workspace.activeLeaf) return; // Modal already closed

        const trimmed = this.result.trim();
        if (trimmed.length > 0) {
            this.onSubmit(trimmed);
            this.close();
        }
    }

    onClose() {
        this.contentEl.empty();
    }
}

class FileSuggest extends AbstractInputSuggest<TFile> {
    constructor(
        app: App, 
        private inputEl: HTMLInputElement, 
        private plugin: ObsidianObjectsPlugin, 
        private targetFolder: string
    ) {
        super(app, inputEl);
    }

    getSuggestions(query: string): TFile[] {
        const lowerCaseQuery = query.toLowerCase();
        const files = this.app.vault.getMarkdownFiles();
        const normalizedTarget = sanitizeFolderPath(this.targetFolder);

        return files.filter(file => {
            const folderPath = file.parent ? sanitizeFolderPath(file.parent.path) : '';
            const isInFolder = normalizedTarget === '' || folderPath === normalizedTarget;
            const matchesQuery = file.basename.toLowerCase().includes(lowerCaseQuery);
            return isInFolder && matchesQuery;
        }).slice(0, 10);
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
