import { TFile, Plugin } from 'obsidian';

/**
 * Defines a mapping between a trigger word and a template.
 */
export interface TriggerTemplateMapping {
    /** The trigger word, e.g., "@project" */
    trigger: string;
    /** Name of the template file (without .md) */
    templateName: string;
    /** Optional specific output folder for this trigger */
    outputPath?: string;
    /** Whether this mapping is active */
    enabled: boolean;
}

/**
 * Structure of the plugin settings.
 */
export interface ObsidianObjectsSettings {
    /** Global folder where templates are searched */
    templateFolder: string;
    /** List of all configured trigger mappings */
    triggerTemplates: TriggerTemplateMapping[];
    /** Global standard output folder */
    defaultOutputPath: string;
}

/**
 * Default settings on first plugin start.
 */
export const DEFAULT_SETTINGS: ObsidianObjectsSettings = {
    templateFolder: 'Templates',
    triggerTemplates: [
        { trigger: '@project', templateName: 'project', outputPath: 'Projects/', enabled: true },
        { trigger: '@atomic', templateName: 'atomic', outputPath: 'Zettelkasten/', enabled: true },
        { trigger: '@person', templateName: 'person', enabled: true }
    ],
    defaultOutputPath: '',
};

/**
 * Definition of the external Templater API (excerpt).
 */
export interface ITemplaterAPI {
    create_new_note_from_template(
        template_file: TFile,
        folder: string,
        new_filename: string,
        open_new_note: boolean
    ): Promise<TFile>;
}

/**
 * Extension of the Plugin type for access to the Templater instance.
 */
export interface ITemplaterPlugin extends Plugin {
    templater: ITemplaterAPI;
}
