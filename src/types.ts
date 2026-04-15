import { TFile, Plugin } from 'obsidian';

export interface TriggerTemplateMapping {
    trigger: string;
    templateName: string;
    outputPath?: string;
    enabled: boolean;
}

export interface ObsidianObjectsSettings {
    templateFolder: string;
    triggerTemplates: TriggerTemplateMapping[];
    defaultOutputPath: string;
}

export const DEFAULT_SETTINGS: ObsidianObjectsSettings = {
    templateFolder: 'Templates',
    triggerTemplates: [
        { trigger: '@project', templateName: 'project', outputPath: 'Projects/', enabled: true },
        { trigger: '@atomic', templateName: 'atomic', outputPath: 'Zettelkasten/', enabled: true },
        { trigger: '@person', templateName: 'person', enabled: true }
    ],
    defaultOutputPath: '',
};

export interface ITemplaterAPI {
    create_new_note_from_template(
        template_file: TFile,
        folder: string,
        new_filename: string,
        open_new_note: boolean
    ): Promise<TFile>;
}

export interface ITemplaterPlugin extends Plugin {
    templater: ITemplaterAPI;
}
