import { Plugin, Notice } from 'obsidian';
import { ObsidianObjectsSettings, DEFAULT_SETTINGS, ITemplaterAPI } from './types';
import { SettingsTab } from './settings';
import { TemplaterHandler } from './templater';
import { TriggerSuggest } from './suggester';

export default class ObsidianObjectsPlugin extends Plugin {
    settings: ObsidianObjectsSettings;
    templater: TemplaterHandler;

    async onload() {
        console.log('Obsidian Objects: Loading...');
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
            const message = 'Obsidian Objects: The "Templater" plugin is not active. Please install and enable it for full functionality.';
            new Notice(message, 7000);
            console.warn(message);
        } else {
            console.log('Obsidian Objects: Templater plugin found and ready.');
        }
    }

    async loadSettings() {
        this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
    }

    async saveSettings() {
        await this.saveData(this.settings);
    }
}
