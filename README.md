# Obsidian Objects
A plugin for Obsidian that accelerates note creation from templates. Use triggers like `@project` to instantly create and link new notes.

**Enhanced Compatibility**: Works seamlessly with the **Templater** community plugin for advanced templates, but also includes a built-in replacement engine for basic placeholders if Templater is not installed.

## Features
- **Prompted note creation**: Simply type a trigger like `@project`, select it, and a modal will prompt you for the note title.
- **Internal Placeholder Support**: Supports `{{title}}`, `{{date}}`, and `{{time}}` even without Templater.
- **Link notes automatically**: Trigger text is replaced with a clean markdown link.
- **Intelligent folder-aware suggestions**: Shows existing notes from the target folder during title entry.
- **Flexible organization**: Define specific output folders for each trigger.
- **Smart duplicate handling**: Links to existing notes instead of creating duplicates.

## How to use
1. **Configure Triggers**: Go to settings and define your triggers (e.g., `@person`), the template file to use, and an optional output folder.
2. **Type a trigger**: In any note, type `@` followed by your trigger keyword.
3. **Choose Title**: Select the trigger, enter a title (or choose an existing one from the suggestions), and hit Enter.

The plugin creates the note (using Templater or the internal engine) and inserts the link.

## Installation
Currently in submission. To install manually:
1. Download `main.js`, `manifest.json`, and `styles.css` from the latest release.
2. Move them to `<vault>/.obsidian/plugins/template-objects/`.
3. Enable the plugin in settings.
