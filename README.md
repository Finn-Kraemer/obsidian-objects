# 💎 Objects

> **Accelerate your thought process.** Create structured notes from templates directly in your flow using simple `@-triggers`.

[![Obsidian Version](https://img.shields.io/badge/Obsidian-v1.5.0+-8a2be2?logo=obsidian)](https://obsidian.md)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

---

## Introduction

**Objects** is a productivity-focused plugin designed to bridge the gap between thinking and documenting. Instead of breaking your flow to create a new file, navigate to a folder, and apply a template, simply type `@` followed by your object type.

Whether you're mentioning a new `@person`, starting an `@atomic` note, or spinning up a `@project`, Objects handles the file creation, folder organization, and templating in a single, seamless interaction.

---

## Key Features

- **Instant Creation**: Trigger a suggestion list anywhere in your editor by typing `@`.
- **Smart Organization**: Automatically routes new notes to specific folders based on the trigger type.
- **Templater Integration**: Native support for the [Templater](https://github.com/SilentVoid13/Templater) plugin for advanced dynamic content.
- **Automatic Linking**: If a note with that name already exists, the plugin intelligently links to it instead of creating a duplicate.
- **Fallback Logic**: Works out-of-the-box even without Templater, using basic placeholder replacement (`{{title}}`, `{{date}}`, `{{time}}`).
- **Fully Configurable**: Map any trigger (e.g., `@book`, `@meeting`, `@idea`) to any template and destination folder.

---

## Screenshots

<div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '20px' }}>
  <figure>
    <img src="assets/select_objects.png" alt="Select Object Suggestion" />
    <figcaption align="center"><i>1. Trigger with @ and select your object type</i></figcaption>
  </figure>
  <figure>
    <img src="assets/create_object.png" alt="Enter Title Modal" />
    <figcaption align="center"><i>2. Enter the name of your new object</i></figcaption>
  </figure>
  <figure>
    <img src="assets/settings.png" alt="Settings Page" />
    <figcaption align="center"><i>3. Configure custom triggers and mappings</i></figcaption>
  </figure>
</div>

---

## Installation

### Via Obsidian (Recommended)
1. Open **Settings** > **Community Plugins**.
2. Click **Browse** and search for `Objects`.
3. Click **Install**, then **Enable**.

### Manual Installation
1. Download the `main.js` and `manifest.json` from the [latest release](https://github.com/Finn-Kraemer/obsidian-objects/releases).
2. Create a folder named `template-objects` in your vault's `.obsidian/plugins/` directory.
3. Move the downloaded files into that folder.
4. Reload Obsidian and enable the plugin in settings.

---

## Usage Guide

### 1. Basic Workflow
1. In any note, type `@`.
2. A list of your configured "Objects" will appear.
3. Select one (e.g., `@project`).
4. A modal will appear—type the name of the new project.
5. Hit `Enter`. 
6. **Result**: A link is inserted at your cursor, and the new note is created and opened in the background.

### 2. Configuration
Head to **Settings > Objects** to customize your experience:

| Setting | Description |
| :--- | :--- |
| **Template Folder** | The root directory where your `.md` templates are stored. |
| **Default Output Path** | Where new notes go if no specific folder is defined for a trigger. |
| **Trigger Mappings** | Create rows mapping `@trigger` ⮕ `Template` ⮕ `Target Folder`. |

---

## Project Structure

```text
obsidian-objects/
├── assets/             # Visual documentation and screenshots
├── release/            # Compiled plugin files for distribution
└── src/                # Source code (TypeScript)
    ├── main.ts         # Entry point: plugin lifecycle and initialization
    ├── settings.ts     # Configuration UI and settings management
    ├── suggester.ts    # Editor suggestion logic (the @-trigger)
    ├── modal.ts        # User interface for object naming
    └── templater.ts    # Logic for file creation and template application
```

---

## 📄 License

This project is licensed under the **MIT License**. See the [LICENSE](./LICENSE) file for details.
