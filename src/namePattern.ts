import { App, moment } from 'obsidian';
import { sanitizeFolderPath } from './utils';

/**
 * Matches the placeholders of a name pattern:
 * {{title}}, {{counter}}, {{counter:3}}, {{date}}, {{date:FORMAT}}, {{time}}, {{time:FORMAT}}
 */
const PLACEHOLDER_REGEX = /\{\{(title|counter|date|time)(?::([^}]*))?\}\}/g;

/** Characters that are not allowed in file names (see sanitizeFileName) */
const INVALID_FILENAME_CHARS = /[\\/:"*?<>|]/g;

export interface RenderedName {
    /** The resulting note name */
    value: string;
    /** Cursor position: end of the title, or end of the name if the pattern has no {{title}} */
    cursor: number;
}

/**
 * Renders a name pattern into a note name.
 * Example: "TODO: {{counter}}" -> "TODO: 3" when TODO: 1 and TODO: 2 already exist in the folder.
 *
 * @param pattern The name pattern of the mapping
 * @param title Text inserted at {{title}}
 * @param folder Target folder of the mapping, used to find the next free counter
 */
export function renderNamePattern(app: App, pattern: string, title: string, folder: string): RenderedName {
    const now = moment();
    let counter: number | null = null;
    let value = '';
    let cursor = -1;
    let lastIndex = 0;

    for (const match of pattern.matchAll(PLACEHOLDER_REGEX)) {
        value += pattern.slice(lastIndex, match.index);
        lastIndex = match.index + match[0].length;

        const [, name, arg] = match;
        switch (name) {
            case 'title':
                value += title;
                cursor = value.length;
                break;
            case 'counter': {
                if (counter === null) counter = findNextCounter(app, pattern, folder);
                const width = parseInt(arg ?? '', 10);
                value += String(counter).padStart(isNaN(width) ? 0 : width, '0');
                break;
            }
            case 'date':
                value += now.format(arg || 'YYYY-MM-DD');
                break;
            case 'time':
                value += now.format(arg || 'HH:mm');
                break;
        }
    }
    value += pattern.slice(lastIndex);

    return { value, cursor: cursor === -1 ? value.length : cursor };
}

/**
 * Finds the next free number for {{counter}}: the highest number among existing notes
 * in the target folder whose name matches the pattern, plus one.
 */
function findNextCounter(app: App, pattern: string, folder: string): number {
    const regex = buildCounterRegex(pattern);
    const targetFolder = sanitizeFolderPath(folder);

    let max = 0;
    for (const file of app.vault.getMarkdownFiles()) {
        if (targetFolder && sanitizeFolderPath(file.parent?.path ?? '') !== targetFolder) continue;

        const match = regex.exec(file.basename);
        if (match?.[1]) {
            max = Math.max(max, parseInt(match[1], 10));
        }
    }
    return max + 1;
}

/**
 * Turns a name pattern into a regular expression that captures the first {{counter}}.
 * Literal parts are sanitized the same way file names are, so "TODO: {{counter}}" matches "TODO_ 1".
 */
function buildCounterRegex(pattern: string): RegExp {
    let source = '';
    let lastIndex = 0;
    let hasCounter = false;

    for (const match of pattern.matchAll(PLACEHOLDER_REGEX)) {
        source += escapeLiteral(pattern.slice(lastIndex, match.index));
        lastIndex = match.index + match[0].length;

        if (match[1] === 'counter' && !hasCounter) {
            source += '(\\d+)';
            hasCounter = true;
        } else if (match[1] === 'counter') {
            source += '\\d+';
        } else {
            source += '.*?';
        }
    }
    source += escapeLiteral(pattern.slice(lastIndex));

    return new RegExp(`^${source.trim()}$`);
}

function escapeLiteral(text: string): string {
    return text
        .replace(INVALID_FILENAME_CHARS, '_')
        .replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
