import { 
    App, 
    Editor, 
    EditorPosition, 
    EditorSuggest, 
    EditorSuggestContext, 
    EditorSuggestTriggerInfo, 
    Notice 
} from 'obsidian';
import ObjectsPlugin from './main';
import { TriggerTemplateMapping, ObsidianAppWithCommands } from './types';
import { TitleModal } from './modal';

/**
 * Editor suggester that reacts to the '@' character and suggests defined templates.
 */
export class TriggerSuggest extends EditorSuggest<TriggerTemplateMapping> {
    private plugin: ObjectsPlugin;

    constructor(app: App, plugin: ObjectsPlugin) {
        super(app);
        this.plugin = plugin;
    }

    /**
     * Checks if the suggester should be triggered at the current cursor position.
     * Trigger: '@' at the start of a line or after a space.
     */
    onTrigger(cursor: EditorPosition, editor: Editor): EditorSuggestTriggerInfo | null {
        const line = editor.getLine(cursor.line).substring(0, cursor.ch);
        const symbol = this.plugin.settings.triggerSymbol;
        
        // Escape the symbol for use in a regular expression
        const escapedSymbol = symbol.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        // Match the symbol and any non-whitespace characters following it at the end of the line
        const regex = new RegExp(`${escapedSymbol}([^\\s]*)$`);
        
        const match = regex.exec(line);
        if (!match) return null;

        const query = match[1];
        // Calculate the absolute start position of the trigger
        const triggerStart = line.length - match[0].length;
        
        // If not at the start of the line, ensure it's not preceded by a word character (to avoid triggering mid-word like in emails)
        if (triggerStart > 0) {
            const charBefore = line.charAt(triggerStart - 1);
            if (/\w/.test(charBefore)) {
                return null;
            }
        }

        return {
            start: { line: cursor.line, ch: triggerStart },
            end: cursor,
            query: query,
        };
    }

    /**
     * Provides matching mapping suggestions based on previous input.
     */
    getSuggestions(context: EditorSuggestContext): TriggerTemplateMapping[] {
        const query = context.query.toLowerCase();
        const symbol = this.plugin.settings.triggerSymbol;
        return this.plugin.settings.triggerTemplates.filter(t =>
            t.enabled && t.trigger.toLowerCase().startsWith(symbol + query)
        );
    }

    renderSuggestion(suggestion: TriggerTemplateMapping, el: HTMLElement) {
        el.setText(suggestion.trigger);
    }

    /**
     * Called when a suggestion is selected.
     * Opens the modal for title entry or executes a command.
     */
    selectSuggestion(suggestion: TriggerTemplateMapping) {
        const context = this.context;
        if (!context) return;

        if (suggestion.type === 'command' && suggestion.commandId) {
            // Remove the trigger text
            context.editor.replaceRange('', context.start, context.end);
            
            // Execute the command
            const appWithCommands = this.app as ObsidianAppWithCommands;
            const success = appWithCommands.commands.executeCommandById(suggestion.commandId);
            if (!success) {
                new Notice(`Command "${suggestion.commandName || suggestion.commandId}" could not be executed.`);
            }
            
            // Refocus the editor
            context.editor.focus();
            return;
        }

        new TitleModal(this.app, this.plugin, suggestion, (title, openNote) => {
            void this.plugin.creator.createOrLink(suggestion, title, openNote, context.editor, context.start, context.end);
        }).open();
    }
}
