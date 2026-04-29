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
        this.renderArchiveConfig(containerEl);
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
                ? 'Templater integration is active. Templater syntax (<% ... %>) is processed via the Templater API for every note Objects creates.'
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
            .setName('Use file properties')
            .setDesc('Whether to allow defining and filtering by frontmatter properties')
            .addToggle(toggle => toggle
                .setValue(this.plugin.settings.useProperties)
                .onChange(async v => {
                    this.plugin.settings.useProperties = v;
                    await this.plugin.saveSettings();
                    this.display(); // Refresh to show/hide property fields
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
     * Renders archive settings.
     */
    private renderArchiveConfig(containerEl: HTMLElement) {
        new Setting(containerEl)
            .setName('Archive behavior')
            .setDesc('Define how to identify archived notes to exclude them from suggestions')
            .setHeading();

        new Setting(containerEl)
            .setName('Archive tag')
            .setDesc('Tag that marks a note as archived (e.g. #archived)')
            .addText(text => text
                .setPlaceholder('#archived')
                .setValue(this.plugin.settings.archiveTag)
                .onChange(v => {
                    this.plugin.settings.archiveTag = v.trim();
                    this.debouncedSave();
                }));

        new Setting(containerEl)
            .setName('Archive property key')
            .setDesc('Frontmatter property key to identify archived notes (e.g. Archived)')
            .addText(text => text
                .setPlaceholder('Archived')
                .setValue(this.plugin.settings.archivePropertyKey)
                .onChange(v => {
                    this.plugin.settings.archivePropertyKey = v.trim();
                    this.debouncedSave();
                }));

        new Setting(containerEl)
            .setName('Archive property value')
            .setDesc('Expected value for the archive property')
            .addText(text => text
                .setPlaceholder('True')
                .setValue(this.plugin.settings.archivePropertyValue)
                .onChange(v => {
                    this.plugin.settings.archivePropertyValue = v.trim();
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
                    this.plugin.settings.triggerTemplates.push({ trigger: symbol, templateName: '', enabled: true, type: 'template' });
                    await this.plugin.saveSettings();
                    this.display();
                }));
    }

    /**
     * Renders a single mapping row using a polished Card/Accordion layout.
     */
    private renderMappingRow(containerEl: HTMLElement, mapping: TriggerTemplateMapping, index: number) {
        const symbol = this.plugin.settings.triggerSymbol;
        const useProperties = this.plugin.settings.useProperties;

        const detailsEl = containerEl.createEl('details');
        detailsEl.addClass('objects-mapping-details');
        detailsEl.setCssProps({
            'background': 'var(--background-secondary-alt)',
            'border': '1px solid var(--background-modifier-border)',
            'border-radius': '6px',
            'margin-bottom': '12px'
        });

        if (!mapping.trigger || mapping.trigger === symbol) {
            detailsEl.setAttribute('open', '');
        }

        const summaryEl = detailsEl.createEl('summary');
        summaryEl.setCssProps({
            'cursor': 'pointer',
            'outline': 'none',
            'padding': '10px 15px',
            'font-weight': 'var(--font-bold)'
        });

        const titleText = (mapping.trigger && mapping.trigger !== symbol)
            ? `Mapping: ${mapping.trigger}`
            : `New Mapping (#${index + 1})`;

        const headerSetting = new Setting(summaryEl).setName(titleText);

        headerSetting.settingEl.setCssProps({
            'padding': '5px 10px',

            'border': 'none'
        });

        headerSetting.addToggle(t => t
            .setValue(mapping.enabled)
            .setTooltip(mapping.enabled ? 'Disable mapping' : 'Enable mapping')
            .onChange(async v => {
                mapping.enabled = v;
                t.setTooltip(v ? 'Disable mapping' : 'Enable mapping');
                await this.plugin.saveSettings();
            }));

        headerSetting.addExtraButton(b => b
            .setIcon('trash')
            .setTooltip('Delete mapping')
            .onClick(async () => {
                this.plugin.settings.triggerTemplates.splice(index, 1);
                await this.plugin.saveSettings();
                this.display();
            }));

        headerSetting.controlEl.addEventListener('click', (e) => {
            e.stopPropagation();
        });

        const contentEl = detailsEl.createDiv();
        contentEl.setCssProps({
            'padding': '0 15px 15px 15px',
            'border-top': '1px solid var(--background-modifier-border)',
            'margin-top': '5px'
        });

        new Setting(contentEl)
            .setName('Type')
            .setDesc('Select whether this trigger inserts a template or executes a command.')
            .addDropdown(dropdown => dropdown
                .addOption('template', 'Template')
                .addOption('command', 'Obsidian command')
                .setValue(mapping.type || 'template')
                .onChange(async (value: 'template' | 'command') => {
                    mapping.type = value;
                    await this.plugin.saveSettings();
                    this.display(); // Refresh to show/hide relevant fields
                }));

        new Setting(contentEl)
            .setName('Trigger text')
            .setDesc('The text that initiates this action.')
            .addText(t => t
                .setPlaceholder(symbol + 'trigger')
                .setValue(mapping.trigger)
                .onChange(v => {
                    mapping.trigger = v.startsWith(symbol) ? v : (v ? symbol + v : symbol);
                    t.setValue(mapping.trigger);
                    headerSetting.setName(`Mapping: ${mapping.trigger}`);
                    this.debouncedSave();
                }));

        if (mapping.type === 'command') {
            new Setting(contentEl)
                .setName('Command')
                .setDesc('The Obsidian command to execute.')
                .addText(t => {
                    new CommandSuggest(this.app, t.inputEl);
                    t.setPlaceholder('Search command...')
                        .setValue(mapping.commandName || '')
                        .onChange(() => {
                            // The actual value is set by the suggester
                            this.debouncedSave();
                        });
                    
                    // Hook into the suggester's selection to store the ID
                    t.inputEl.addEventListener('command-selected', (e: CustomEvent) => {
                        mapping.commandId = e.detail.id;
                        mapping.commandName = e.detail.name;
                        t.setValue(mapping.commandName || '');
                        this.debouncedSave();
                    });
                });
        } else {
            new Setting(contentEl)
                .setName('Template file')
                .setDesc('The template to be inserted.')
                .addText(t => {
                    new TemplateSuggest(this.app, t.inputEl, this.plugin);
                    t.setPlaceholder('Template')
                        .setValue(mapping.templateName || '')
                        .onChange(v => {
                            mapping.templateName = v ? v.replace(/\.md$/, '') : '';
                            this.debouncedSave();
                        });
                });

            new Setting(contentEl)
                .setName('Target folder')
                .setDesc('Where the generated file should be saved.')
                .addText(t => {
                    new FolderSuggest(this.app, t.inputEl);
                    t.setPlaceholder('Target folder')
                        .setValue(mapping.outputPath || '')
                        .onChange(v => {
                            mapping.outputPath = sanitizeFolderPath(v);
                            this.debouncedSave();
                        });
                });

            if (useProperties) {
                new Setting(contentEl)
                    .setName('Property key')
                    .setDesc('Frontmatter property key.')
                    .addText(t => t
                        .setPlaceholder('Key')
                        .setValue(mapping.propertyKey || '')
                        .onChange(v => {
                            mapping.propertyKey = v;
                            this.debouncedSave();
                        }));

                new Setting(contentEl)
                    .setName('Property value')
                    .setDesc('Frontmatter property value.')
                    .addText(t => t
                        .setPlaceholder('Value')
                        .setValue(mapping.propertyValue || '')
                        .onChange(v => {
                            mapping.propertyValue = v;
                            this.debouncedSave();
                        }));
            }
        }
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

/**
 * Suggester for selecting Obsidian commands.
 */
class CommandSuggest extends AbstractInputSuggest<{ id: string, name: string }> {
    constructor(app: App, private inputEl: HTMLInputElement) {
        super(app, inputEl);
    }

    getSuggestions(query: string): { id: string, name: string }[] {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const commands = (this.app as any).commands.listCommands();
        const lowerQuery = query.toLowerCase();
        
        return commands
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            .map((cmd: any) => ({ id: cmd.id, name: cmd.name }))
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            .filter((cmd: any) => cmd.name.toLowerCase().includes(lowerQuery));
    }

    renderSuggestion(cmd: { id: string, name: string }, el: HTMLElement): void {
        el.setText(cmd.name);
    }

    selectSuggestion(cmd: { id: string, name: string }): void {
        this.inputEl.value = cmd.name;
        this.inputEl.dispatchEvent(new CustomEvent('command-selected', { detail: cmd }));
        this.close();
    }
}