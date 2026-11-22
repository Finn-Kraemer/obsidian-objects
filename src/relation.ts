/**
 * Merges a link to the originating note into an existing frontmatter value.
 * Empty values become the link, a repeated link is ignored, and a different
 * existing value turns into a list so no relation is lost.
 */
export function mergeRelation(current: unknown, link: string): string | string[] {
    if (current === undefined || current === null || current === '') return link;
    if (Array.isArray(current)) {
        const items = current.filter((v): v is string => typeof v === 'string' && v !== '');
        return items.includes(link) ? items : [...items, link];
    }
    if (typeof current === 'string') return current === link ? link : [current, link];
    return link;
}
