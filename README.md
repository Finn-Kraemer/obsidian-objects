# Obsidian Objects
A plugin for the Obsidian application that accelerates note creation from templates. Use a trigger, such as @project, to automatically create and link a new note from a corresponding template file.

**Note**: This plugin requires the Templater community plugin to be installed and enabled.

## Features
- **Create notes with triggers**: Type a new note name followed by a trigger (e.g., My New Note@note) to create the note from a template.

- **Link notes automatically**: The trigger text is replaced with an internal link to the newly created note.

- **Get suggestions**: An autocomplete menu appears when you type a trigger, helping you select the correct one.

- **Organize with folders**: Define a global template folder, a default output folder, and trigger-specific folders for new notes.

- **Check for dependencies**: The settings tab includes a status indicator to confirm that the Templater plugin is active.

- **Avoid duplicates**: If a note with the same name already exists in the target folder, the plugin links to the existing note instead of creating a new one.

## How to use
Follow these instructions to set up and use the Obsidian Objects plugin.

1. **Set up requirements**
Before you install this plugin, you must install and enable the Templater plugin from the community plugins browser.

2. **Install the plugin**
Install Obsidian Objects from the community plugins browser in the Obsidian application.

3. **Configure the plugin**
To configure the plugin, perform the following steps:

   1. Open Settings in the Obsidian application.

   2. In the sidebar, select Community plugins → Obsidian Objects.

   3. In Template Folder, enter the path to the folder where you store your template files (for example, Templates).

   4. Under Trigger → Template Mappings, select Add new mapping to create a new trigger.

      - **Trigger**: The keyword you want to use, such as @project.

      - **Template filename**: The name of the template file in your template folder (without the .md file extension).

      - **Specific output path (optional)**: A folder path that overrides the default for this specific trigger. For example, Projects/.

4. **Create a note with a trigger**
To create a new note from a template, perform the following steps in the editor:

   1. Type the name for your new note.

   2. Immediately after the name, type your trigger keyword. For example: Weekly Review@meeting.

   3. From the suggestion menu that appears, select the trigger you want to use.

The plugin replaces your text with an internal link, [[Weekly Review]], and creates the new note Weekly Review.md from your template. If the note was not already present, it will open in a new tab.

## Settings overview
- Templater Status: Confirms if the Templater plugin is available.

   - ✔ Available: The plugin is working correctly.

   - ✖ Not Found: The Templater plugin is missing or disabled.

- Template Folder: The path to the folder containing your template files.

- Default Output Path: (Optional) A global folder for newly created notes.

- Trigger → Template Mappings: A list where you can define each trigger and link it to a template file and an optional, specific output folder.