import { App, TFile, Plugin, normalizePath } from 'obsidian';

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

export class TemplaterHandler {
    private app: App;

    constructor(app: App) {
        this.app = app;
    }

    getApi(): ITemplaterAPI | null {
        const plugins = (this.app as any).plugins;
        if (!plugins || !plugins.enabledPlugins.has('templater-obsidian')) {
            return null;
        }
        const plugin = plugins.plugins['templater-obsidian'] as ITemplaterPlugin | undefined;
        return plugin?.templater || null;
    }

    async createNoteFromTemplate(templateFile: TFile | null, folderPath: string, fileName: string): Promise<TFile | null> {
        const api = this.getApi();
        const newNotePath = normalizePath(folderPath ? `${folderPath}/${fileName}.md` : `${fileName}.md`);

        if (api && templateFile) {
            return await api.create_new_note_from_template(templateFile, folderPath, fileName, false);
        } else {
            // Basic fallback or Templater disabled / No template provided
            let content = "";
            if (templateFile instanceof TFile) {
                console.log("Obsidian Objects: Using internal placeholder logic.");
                content = await this.app.vault.read(templateFile);
                content = this.replacePlaceholders(content, fileName);
            } else {
                console.log("Obsidian Objects: No template provided, creating empty note.");
            }

            return await this.app.vault.create(newNotePath, content);
        }
    }

    private replacePlaceholders(content: string, title: string): string {
        const now = (window as any).moment();
        const date = now.format("YYYY-MM-DD");
        const time = now.format("HH:mm");

        return content
            .replace(/\{\{title\}\}/g, title)
            .replace(/\{\{date\}\}/g, date)
            .replace(/\{\{time\}\}/g, time);
    }
}
