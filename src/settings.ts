import { App, PluginSettingTab, Setting, TFile, AbstractInputSuggest, debounce, TFolder } from 'obsidian';
import ObjectsPlugin from './main';
import { TriggerTemplateMapping } from './types';
import { sanitizeFolderPath } from './utils';

/**
 * Manages the UI for the plugin settings.
 */
export class SettingsTab extends PluginSettingTab {
    private readonly plugin: ObjectsPlugin;
    private readonly debouncedSave: () => void;

    constructor(app: App, plugin: ObjectsPlugin) {
        super(app, plugin);
        this.plugin = plugin;
        // Debounce saving to improve performance during rapid typing
        this.debouncedSave = debounce(() => { void this.plugin.saveSettings(); }, 500, true);
    }

    /**
     * Renders the entire settings page.
     */
    display(): void {
        const { containerEl } = this;
        containerEl.empty();

        this.renderStatus(containerEl);
        this.renderGeneralConfig(containerEl);
        this.renderTriggerMappings(containerEl);
        this.renderFooter(containerEl);
    }

    /**
     * Displays the status of integrations (e.g., Templater).
     */
    private renderStatus(containerEl: HTMLElement) {
        const isTemplaterActive = !!this.plugin.templater.getApi();
        new Setting(containerEl)
            .setName('Integration status')
            .setDesc(isTemplaterActive 
                ? 'Templater integration is active. Note: Ensure "Trigger Templater on new file creation" is enabled in Templater settings for full syntax support' 
                : 'Templater plugin was not detected')
            .then(s => {
                const statusText = isTemplaterActive ? 'Integration active' : 'Integration missing';
                const status = s.controlEl.createSpan({
                    cls: 'objects-status-indicator',
                    text: statusText,
                });
                status.addClass(isTemplaterActive ? 'objects-status-active' : 'objects-status-missing');
                if (isTemplaterActive) {
                    status.setCssProps({ '--status-color': 'var(--color-green)' });
                } else {
                    status.setCssProps({ '--status-color': 'var(--color-red)' });
                }
            });
    }

    /**
     * Renders configuration like template and output folders.
     */
    private renderGeneralConfig(containerEl: HTMLElement) {
        new Setting(containerEl)
            .setName('Core behavior')
            .setHeading();

        new Setting(containerEl)
            .setName('Trigger symbol')
            .setDesc('Character that triggers the template suggester (e.g. @ or #)')
            .addText(text => text
                .setPlaceholder('@')
                .setValue(this.plugin.settings.triggerSymbol)
                .onChange(async v => {
                    const oldSymbol = this.plugin.settings.triggerSymbol;
                    const newSymbol = v.trim() || '@';
                    
                    if (oldSymbol !== newSymbol) {
                        this.plugin.settings.triggerSymbol = newSymbol;
                        
                        // Update all existing triggers with the new symbol
                        this.plugin.settings.triggerTemplates.forEach(t => {
                            if (t.trigger.startsWith(oldSymbol)) {
                                t.trigger = newSymbol + t.trigger.substring(oldSymbol.length);
                            } else if (!t.trigger.startsWith(newSymbol)) {
                                t.trigger = newSymbol + t.trigger;
                            }
                        });
                        
                        await this.plugin.saveSettings();
                        this.display(); // Refresh to show updated triggers in the list
                    }
                }));

        new Setting(containerEl)
            .setName('Template folder')
            .setDesc('Root directory for your Markdown templates')
            .addText(text => text
                .setPlaceholder('Templates')
                .setValue(this.plugin.settings.templateFolder)
                .onChange(v => { 
                    this.plugin.settings.templateFolder = sanitizeFolderPath(v); 
                    this.debouncedSave(); 
                }));

        new Setting(containerEl)
            .setName('Default output path')
            .setDesc('Fallback folder for newly created notes, if not defined in the mapping')
            .addText(text => text
                .setPlaceholder('Inbox')
                .setValue(this.plugin.settings.defaultOutputPath)
                .onChange(v => { 
                    this.plugin.settings.defaultOutputPath = sanitizeFolderPath(v); 
                    this.debouncedSave(); 
                }));

        new Setting(containerEl)
            .setName('Open created note')
            .setDesc('Whether to automatically open the newly created note in a new tab')
            .addToggle(toggle => toggle
                .setValue(this.plugin.settings.openNewNote)
                .onChange(v => {
                    this.plugin.settings.openNewNote = v;
                    this.debouncedSave();
                }));
    }

    /**
     * Renders the list of trigger mappings.
     */
    private renderTriggerMappings(containerEl: HTMLElement) {
        new Setting(containerEl)
            .setName('Trigger mappings')
            .setHeading();

        this.plugin.settings.triggerTemplates.forEach((mapping, index) => {
            this.renderMappingRow(containerEl, mapping, index);
        });

        new Setting(containerEl)
            .addButton(btn => btn
                .setButtonText('Add new mapping')
                .setCta()
                .onClick(async () => {
                    const symbol = this.plugin.settings.triggerSymbol;
                    this.plugin.settings.triggerTemplates.push({ trigger: symbol, templateName: '', enabled: true });
                    await this.plugin.saveSettings();
                    this.display();
                }));
    }

    /**
     * Renders a single mapping row (Trigger, Template, Path, Status).
     */
    private renderMappingRow(containerEl: HTMLElement, mapping: TriggerTemplateMapping, index: number) {
        const symbol = this.plugin.settings.triggerSymbol;
        
        const s = new Setting(containerEl)
            .addToggle(t => t
                .setValue(mapping.enabled)
                .onChange(async v => {
                    mapping.enabled = v;
                    await this.plugin.saveSettings();
                }))
            .addText(t => { t
                    .setPlaceholder(symbol + 'trigger')
                    .setValue(mapping.trigger)
                    .onChange(v => {
                        mapping.trigger = v.startsWith(symbol) ? v : (v ? symbol + v : symbol);
                        t.setValue(mapping.trigger);
                        this.debouncedSave();
                    });
                t.inputEl.setCssProps({ 'flex': '1', 'width': '100%' });
            })
            .addText(t => {
                new TemplateSuggest(this.app, t.inputEl, this.plugin);
                t.setPlaceholder('Template')
                    .setValue(mapping.templateName)
                    .onChange(v => {
                        mapping.templateName = v.replace(/\.md$/, '');
                        this.debouncedSave();
                    });
                t.inputEl.setCssProps({ 'flex': '1', 'width': '100%' });
            })
            .addText(t => {
                new FolderSuggest(this.app, t.inputEl);
                t.setPlaceholder('Target folder')
                    .setValue(mapping.outputPath || '')
                    .onChange(v => {
                        mapping.outputPath = sanitizeFolderPath(v);
                        this.debouncedSave();
                    });
                t.inputEl.setCssProps({ 'flex': '1', 'width': '100%' });
            })
            .addExtraButton(b => b
                .setIcon('trash')
                .setTooltip('Delete mapping')
                .onClick(async () => {
                    this.plugin.settings.triggerTemplates.splice(index, 1);
                    await this.plugin.saveSettings();
                    this.display();
                }));

        s.infoEl.remove();
        s.controlEl.addClass('objects-mapping-control');
        s.controlEl.setCssProps({
            'display': 'flex',
            'flex': '1',
            'width': '100%',
            'gap': '10px'
        });
    }

    private renderFooter(containerEl: HTMLElement) {
        const symbol = this.plugin.settings.triggerSymbol;
        containerEl.createDiv({
            cls: 'objects-settings-footer',
            text: `Settings are saved automatically. Triggers must start with ${symbol}.`
        });
    }
}

/**
 * Suggester for selecting templates from the configured template folder.
 */
class TemplateSuggest extends AbstractInputSuggest<TFile> {
    constructor(app: App, private inputEl: HTMLInputElement, private plugin: ObjectsPlugin) {
        super(app, inputEl);
    }
    
    getSuggestions(query: string): TFile[] {
        const root = sanitizeFolderPath(this.plugin.settings.templateFolder);
        if (!root) return [];
        const lower = query.toLowerCase();
        return this.app.vault.getMarkdownFiles().filter(f => 
            (f.path.startsWith(root + '/') || f.parent?.path === root) && 
            f.path.toLowerCase().includes(lower)
        );
    }

    renderSuggestion(file: TFile, el: HTMLElement): void {
        const root = sanitizeFolderPath(this.plugin.settings.templateFolder);
        const rel = file.path.startsWith(root + '/') ? file.path.substring(root.length + 1) : file.path;
        el.setText(rel.replace(/\.md$/, ''));
    }

    selectSuggestion(file: TFile): void {
        const root = sanitizeFolderPath(this.plugin.settings.templateFolder);
        const rel = file.path.startsWith(root + '/') ? file.path.substring(root.length + 1) : file.path;
        this.inputEl.value = rel.replace(/\.md$/, '');
        this.inputEl.dispatchEvent(new Event('input'));
        this.close();
    }
}

export class FolderSuggest extends AbstractInputSuggest<string> {
    constructor(app: App, private inputEl: HTMLInputElement) {
        super(app, inputEl);
    }
    
    getSuggestions(query: string): string[] {
        const lowerCaseInput = query.toLowerCase();
        const folders = this.app.vault.getAllLoadedFiles()
            .filter((f): f is TFolder => f instanceof TFolder)
            .map(f => f.path); 
            
        return folders.filter(folderPath => 
            folderPath.toLowerCase().includes(lowerCaseInput)
        );
    }

    renderSuggestion(folder: string, el: HTMLElement): void {
        el.setText(folder === "/" ? "Vault Root (/)" : folder);
    }

    selectSuggestion(folder: string): void {
        this.inputEl.value = folder;
        this.inputEl.dispatchEvent(new Event('input'));
        this.close();
    }
}
