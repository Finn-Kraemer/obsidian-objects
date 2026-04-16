import { Plugin, Notice } from 'obsidian';
import { ObsidianObjectsSettings, DEFAULT_SETTINGS } from './types';
import { SettingsTab } from './settings';
import { TemplaterHandler } from './templater';
import { TriggerSuggest } from './suggester';

/**
 * Main class of the Obsidian Objects Plugin.
 * Manages the plugin lifecycle, settings, and Templater integration.
 */
export default class ObjectsPlugin extends Plugin {
    /** Current configuration of the plugin */
    settings: ObsidianObjectsSettings = DEFAULT_SETTINGS;
    /** Handler for interacting with the Templater plugin or the fallback system */
    templater!: TemplaterHandler;

    /**
     * Initializes the plugin when loaded into Obsidian.
     */
    async onload() {
        console.debug('Objects: Loading...');
        await this.loadSettings();
        
        this.templater = new TemplaterHandler(this.app);
        
        // Register the settings tab in Obsidian
        this.addSettingTab(new SettingsTab(this.app, this));

        // Register the editor suggester for @-triggers
        this.registerEditorSuggest(new TriggerSuggest(this.app, this));

        // Perform validations once the workspace layout is ready
        this.app.workspace.onLayoutReady(() => {
            this.verifyIntegrations();
        });
    }

    /**
     * Checks if necessary third-party plugins (like Templater) are active.
     * Displays a notice if Templater is missing.
     */
    private verifyIntegrations() {
        const api = this.templater.getApi();
        if (!api) {
            const message = 'Objects: The "Templater" plugin is not active.';
            new Notice(message, 7000);
        }
    }

    /**
     * Loads saved settings and merges them with default values.
     */
    async loadSettings() {
        this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
    }

    /**
     * Permanently saves current settings.
     */
    async saveSettings() {
        await this.saveData(this.settings);
    }
}
