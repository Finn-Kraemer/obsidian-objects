import { Plugin, Notice } from 'obsidian';
import { ObsidianObjectsSettings, DEFAULT_SETTINGS } from './types';
import { SettingsTab } from './settings';
import { TemplaterHandler } from './templater';
import { TriggerSuggest } from './suggester';

export default class ObjectsPlugin extends Plugin {
    settings: ObsidianObjectsSettings;
    templater: TemplaterHandler;

    async onload() {
        await this.loadSettings();
        
        this.templater = new TemplaterHandler(this.app);
        this.addSettingTab(new SettingsTab(this.app, this));

        this.registerEditorSuggest(new TriggerSuggest(this.app, this));

        this.app.workspace.onLayoutReady(() => {
            this.verifyIntegrations();
        });
    }

    private verifyIntegrations() {
        const api = this.templater.getApi();
        if (!api) {
            const message = 'Objects: The "Templater" plugin is not active. Please install and enable it for full functionality.';
            new Notice(message, 7000);
        }
    }

    async loadSettings() {
        this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
    }

    async saveSettings() {
        await this.saveData(this.settings);
    }
}
