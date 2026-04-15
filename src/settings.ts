import { App, PluginSettingTab, Setting, TFile, AbstractInputSuggest, debounce } from 'obsidian';
import ObsidianObjectsPlugin from './main';
import { ObsidianObjectsSettings, DEFAULT_SETTINGS, TriggerTemplateMapping } from './types';
import { sanitizeFolderPath } from './utils';

export class SettingsTab extends PluginSettingTab {
    private readonly plugin: ObsidianObjectsPlugin;
    private readonly debouncedSave: () => void;

    constructor(app: App, plugin: ObsidianObjectsPlugin) {
        super(app, plugin);
        this.plugin = plugin;
        this.debouncedSave = debounce(() => this.plugin.saveSettings(), 500, true);
    }

    display(): void {
        const { containerEl } = this;
        containerEl.empty();

        containerEl.createEl('h2', { text: 'Obsidian Objects Settings' });

        this.renderStatus(containerEl);
        this.renderGeneralConfig(containerEl);
        this.renderTriggerMappings(containerEl);
        this.renderFooter(containerEl);
    }

    private renderStatus(containerEl: HTMLElement) {
        const isTemplaterActive = !!this.plugin.templater.getApi();
        new Setting(containerEl)
            .setName('Integrations Status')
            .setDesc(isTemplaterActive ? 'Templater integration is active.' : 'WARNING: Templater plugin is not detected.')
            .then(s => {
                const status = s.controlEl.createSpan({
                    text: isTemplaterActive ? '✔ Active' : '✘ Missing',
                });
                status.style.fontWeight = 'bold';
                status.style.color = isTemplaterActive ? 'var(--text-success)' : 'var(--text-error)';
            });
    }

    private renderGeneralConfig(containerEl: HTMLElement) {
        containerEl.createEl('h3', { text: 'General Configuration' });

        new Setting(containerEl)
            .setName('Template Folder')
            .setDesc('Root directory for your markdown templates.')
            .addText(text => text
                .setPlaceholder('Templates')
                .setValue(this.plugin.settings.templateFolder)
                .onChange(v => { 
                    this.plugin.settings.templateFolder = sanitizeFolderPath(v); 
                    this.debouncedSave(); 
                }));

        new Setting(containerEl)
            .setName('Default Output Path')
            .setDesc('Fallback folder for newly created notes.')
            .addText(text => text
                .setPlaceholder('Inbox')
                .setValue(this.plugin.settings.defaultOutputPath)
                .onChange(v => { 
                    this.plugin.settings.defaultOutputPath = sanitizeFolderPath(v); 
                    this.debouncedSave(); 
                }));
    }

    private renderTriggerMappings(containerEl: HTMLElement) {
        containerEl.createEl('h3', { text: 'Trigger Mappings' });

        this.plugin.settings.triggerTemplates.forEach((mapping, index) => {
            this.renderMappingRow(containerEl, mapping, index);
        });

        new Setting(containerEl)
            .addButton(btn => btn
                .setButtonText('Add New Mapping')
                .setCta()
                .onClick(async () => {
                    this.plugin.settings.triggerTemplates.push({ trigger: '@', templateName: '', enabled: true });
                    await this.plugin.saveSettings();
                    this.display();
                }));
    }

    private renderMappingRow(containerEl: HTMLElement, mapping: TriggerTemplateMapping, index: number) {
        const s = new Setting(containerEl)
            .addToggle(t => t
                .setValue(mapping.enabled)
                .onChange(async v => {
                    mapping.enabled = v;
                    await this.plugin.saveSettings();
                }))
            .addText(t => t
                .setPlaceholder('@trigger')
                .setValue(mapping.trigger)
                .onChange(v => {
                    mapping.trigger = v.startsWith('@') ? v : (v ? '@' + v : '@');
                    t.setValue(mapping.trigger);
                    this.debouncedSave();
                }))
            .addText(t => {
                new TemplateSuggest(this.app, t.inputEl, this.plugin);
                t.setPlaceholder('Template')
                    .setValue(mapping.templateName)
                    .onChange(v => {
                        mapping.templateName = v.replace(/\.md$/, '');
                        this.debouncedSave();
                    });
            })
            .addText(t => t
                .setPlaceholder('Target Folder')
                .setValue(mapping.outputPath || '')
                .onChange(v => {
                    mapping.outputPath = sanitizeFolderPath(v);
                    this.debouncedSave();
                }))
            .addExtraButton(b => b
                .setIcon('trash')
                .setTooltip('Delete Mapping')
                .onClick(async () => {
                    this.plugin.settings.triggerTemplates.splice(index, 1);
                    await this.plugin.saveSettings();
                    this.display();
                }));

        s.infoEl.remove();
        s.controlEl.addClass('objects-mapping-control');
    }

    private renderFooter(containerEl: HTMLElement) {
        const footer = containerEl.createDiv();
        footer.style.marginTop = '4rem';
        footer.style.textAlign = 'center';
        footer.style.color = 'var(--text-muted)';
        footer.style.fontSize = 'var(--font-ui-smaller)';
        footer.textContent = 'Settings are saved automatically. Triggers must start with @.';
    }
}

class TemplateSuggest extends AbstractInputSuggest<TFile> {
    constructor(app: App, private inputEl: HTMLInputElement, private plugin: ObsidianObjectsPlugin) {
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
