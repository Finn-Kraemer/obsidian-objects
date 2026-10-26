import { Editor, Notice, Plugin } from 'obsidian';
import { ObsidianObjectsSettings, DEFAULT_SETTINGS, TriggerTemplateMapping } from './types';
import { SettingsTab } from './settings';
import { TemplaterHandler } from './templater';
import { TriggerSuggest } from './suggester';
import { ObjectCreator } from './creator';
import { ObjectTypeModal, TitleModal } from './modal';

/**
 * Main class of the Obsidian Objects Plugin.
 * Manages the plugin lifecycle, settings, and Templater integration.
 */
export default class ObjectsPlugin extends Plugin {
    /** Current configuration of the plugin */
    settings: ObsidianObjectsSettings = DEFAULT_SETTINGS;
    /** Handler for interacting with the Templater plugin or the fallback system */
    templater!: TemplaterHandler;
    /** Shared logic for creating or linking object notes */
    creator!: ObjectCreator;

    /**
     * Initializes the plugin when loaded into Obsidian.
     */
    async onload() {
        console.debug('Objects: Loading...');
        await this.loadSettings();
        
        this.templater = new TemplaterHandler(this.app);
        this.creator = new ObjectCreator(this.app, this);
        
        // Register the settings tab in Obsidian
        this.addSettingTab(new SettingsTab(this.app, this));

        // Register the editor suggester for @-triggers
        this.registerEditorSuggest(new TriggerSuggest(this.app, this));

        // Convert the selected text (or the word under the cursor) into an object without a trigger
        this.addCommand({
            id: 'convert-selection-to-object',
            name: 'Convert selection to object',
            editorCallback: (editor) => this.convertSelectionToObject(editor),
        });

        // Perform validations once the workspace layout is ready
        //this.app.workspace.onLayoutReady(() => {
        //    this.verifyIntegrations();
        //});
    }

    /**
     * Lets the user pick an object type and turns the current selection (or the word
     * under the cursor) into a link to a new or existing object of that type.
     */
    private convertSelectionToObject(editor: Editor) {
        const mappings = this.settings.triggerTemplates.filter(t => t.enabled && t.type === 'template');
        if (mappings.length === 0) {
            new Notice('No enabled object types configured.');
            return;
        }

        let from = editor.getCursor('from');
        let to = editor.getCursor('to');
        if (!editor.somethingSelected()) {
            const word = editor.wordAt(from);
            if (word) {
                from = word.from;
                to = word.to;
            }
        }
        // Note titles can't span multiple lines
        const text = editor.getRange(from, to).replace(/\s+/g, ' ').trim();

        const openTitleModal = (mapping: TriggerTemplateMapping) => {
            new TitleModal(this.app, this, mapping, (title, openNote) => {
                void this.creator.createOrLink(mapping, title, openNote, editor, from, to);
            }, text).open();
        };

        const [onlyMapping] = mappings;
        if (mappings.length === 1 && onlyMapping) {
            openTitleModal(onlyMapping);
        } else {
            new ObjectTypeModal(this.app, mappings, openTitleModal).open();
        }
    }

    /**
     * Checks if necessary third-party plugins (like Templater) are active.
     */
    //private verifyIntegrations() {
    //    const api = this.templater.getApi();
    //}

    /**
     * Loads saved settings and merges them with default values.
     */
    async loadSettings() {
        const loadedData = (await this.loadData()) as Partial<ObsidianObjectsSettings>;
        this.settings = Object.assign({}, DEFAULT_SETTINGS, loadedData);

        // Migration: Ensure all existing mappings have necessary properties
        if (this.settings.triggerTemplates) {
            this.settings.triggerTemplates.forEach(mapping => {
                if (mapping.enabled === undefined) {
                    mapping.enabled = true;
                }
                if (mapping.type === undefined) {
                    mapping.type = 'template';
                }
            });
        }
    }

    /**
     * Permanently saves current settings.
     */
    async saveSettings() {
        await this.saveData(this.settings);
    }
}
