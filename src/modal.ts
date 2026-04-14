import { App, Modal, Setting, TFile, AbstractInputSuggest } from 'obsidian';
import ObsidianObjectsPlugin from './main';

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
                
                // Add Suggestions
                new FileSuggest(this.app, text.inputEl, this.plugin, this.targetFolder);

                text.inputEl.addEventListener('keydown', (e) => {
                    if (e.key === 'Enter') {
                        // We don't prevent default here to allow suggestion selection if needed,
                        // but selectSuggestion will handle the submission.
                        // Actually, to be safe with your previous fix:
                        if (e.key === 'Enter') {
                             // If a suggestion is NOT being selected, we submit.
                             // AbstractInputSuggest handles its own enter.
                             // To avoid double submission or conflicting enters:
                             setTimeout(() => {
                                 if (this.app.workspace.activeLeaf) { // Check if still open
                                     this.submit();
                                 }
                             }, 100);
                        }
                    }
                });

                // Autofocus
                setTimeout(() => text.inputEl.focus(), 0);
            });

        new Setting(contentEl)
            .addButton((btn) =>
                btn
                    .setButtonText('Create / Link')
                    .setCta()
                    .onClick(() => {
                        this.submit();
                    })
            )
            .addButton((btn) =>
                btn.setButtonText('Cancel').onClick(() => {
                    this.close();
                })
            );
    }

    private submit() {
        if (this.result && this.result.trim().length > 0) {
            this.onSubmit(this.result.trim());
            this.close();
        }
    }

    onClose() {
        const { contentEl } = this;
        contentEl.empty();
    }
}

class FileSuggest extends AbstractInputSuggest<TFile> {
    private inputEl: HTMLInputElement;

    constructor(app: App, inputEl: HTMLInputElement, private plugin: ObsidianObjectsPlugin, private targetFolder: string) {
        super(app, inputEl);
        this.inputEl = inputEl;
    }

    getSuggestions(query: string): TFile[] {
        const lowerCaseQuery = query.toLowerCase();
        const files = this.app.vault.getMarkdownFiles();
        const normalizedTarget = this.targetFolder ? this.targetFolder.replace(/\/$/, '') : '';

        return files.filter(file => {
            const folderPath = file.parent ? file.parent.path : '';
            const isInFolder = normalizedTarget === '' || folderPath === normalizedTarget;
            const matchesQuery = file.basename.toLowerCase().includes(lowerCaseQuery);
            return isInFolder && matchesQuery;
        }).slice(0, 10); // Limit to 10 suggestions for performance
    }

    renderSuggestion(file: TFile, el: HTMLElement) {
        el.setText(file.basename);
    }

    selectSuggestion(file: TFile) {
        this.inputEl.value = file.basename;
        (this.inputEl as any).trigger("input");
        this.close();
    }
}
