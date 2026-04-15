# 💎 Objects

> **Rethink your notes as objects.** Create structured, perfectly organized notes directly in your flow using simple `@-triggers`.

[![Obsidian Version](https://img.shields.io/badge/Obsidian-v1.5.0+-8a2be2?logo=obsidian)](https://obsidian.md)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

---

## What it does

**Objects** bridges the gap between thinking and documenting. Instead of breaking your creative flow to manually create files, navigate folders, or apply templates, you simply define "Objects" (like `@person`, `@meeting`, or `@atomic-note`) and trigger them anywhere.

- **Unified Workflow**: Creation, organization, and linking happen in one single interaction.
- **Smart Routing**: Notes are automatically moved to their designated folders based on their type.
- **Dynamic Content**: Uses a powerful fallback system (`{{title}}`, `{{date}}`, `{{time}}`) or integrates natively with [Templater](https://github.com/SilentVoid13/Templater).
- **Intelligent Linking**: If an object already exists, the plugin links to it instead of creating a duplicate.

---

## Preview

<div align="center">
  <figure>
    <img src="assets/settings.png" alt="Settings Page" width="600" />
    <figcaption><i>1. Configure custom triggers and mappings</i></figcaption>
  </figure>
  <br/>
  <figure>
    <img src="assets/select_objects.png" alt="Select Object Suggestion" width="600" />
    <figcaption><i>2. Trigger with @ and select your object type</i></figcaption>
  </figure>
  <br/>
  <figure>
    <img src="assets/create_object.png" alt="Enter Title Modal" width="600" />
    <figcaption><i>3. Enter the name of your new object</i></figcaption>
  </figure>
</div>


---

## How to use it

1.  **Trigger**: Type `@` followed by the object type (e.g., `@project`) anywhere in your editor.
2.  **Identify**: A suggestion list appears—select your desired object.
3.  **Name**: A modal pops up. Type the name of your new object (e.g., "Deep Work Initiative").
4.  **Confirm**: Hit `Enter`.
5.  **Result**: A clean markdown link is inserted at your cursor, and the new note is instantly created in the background using your specified template.

---

## Settings

Customize **Objects** to fit your personal knowledge management system:

| Setting | Description |
| :--- | :--- |
| **Path Configuration** | Set your global `Template Folder` and a `Default Output Path` for unassigned triggers. |
| **Trigger Mappings** | Map any `@trigger` (e.g., `@idea`) to a specific template and target folder. |
| **Status Check** | Real-time validation of your Templater integration. |

> **Note**: For full Templater syntax support, ensure **"Trigger Templater on new file creation"** is enabled in the Templater settings.

---

## Platform Support

Objects is primarily designed for **Desktop** environments to maximize productivity.

- **Tested on**: Linux, Android (Mobile)
- **Untested but likely compatible**: macOS, Windows, iOS

*Feel free to test it on your platform and report any issues!*

---

## Installation

### Manual Installation
1. Download the `main.js` and `manifest.json` from the [latest release](https://github.com/Finn-Kraemer/obsidian-objects/releases).
2. Create a folder named `obsidian-objects` in your vault's `.obsidian/plugins/` directory.
3. Move the downloaded files into that folder.

---

## 📄 License

This project is licensed under the **MIT License**. See the [LICENSE](./LICENSE) file for details.
