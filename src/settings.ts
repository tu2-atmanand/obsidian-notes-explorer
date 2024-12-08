// ./src/settings.ts

import {
  App,
  Notice,
  PluginSettingTab,
  Setting,
  normalizePath,
} from "obsidian";

import NotesExplorerPlugin from "../main";
import Pickr from "@simonwep/pickr";
import Sortable from "sortablejs";

export enum TitleDisplayMode {
  Both = "Both",
  Title = "Title",
  Filename = "Filename",
}
export enum DeleteFileMode {
  System = "system",
  Trash = "trash",
  Permanent = "perm",
}
export enum NoteOpenLayout {
  Right = "right",
  NewTab = "tab",
  NewWindow = "window",
}
export enum TagPostionForCardColor {
  frontmatter = "frontmatter",
  content = "content",
}
export enum TagCardColorIndicatorType {
  background = "background",
  sidebars = "sidebars",
}
export interface TagSetting {
  name: string;
  color: string;
  order: number;
}
export enum Sort {
  NameAsc = "Title (A-Z)",
  NameDesc = "Title (Z-A)",
  EditedDesc = "Edited (Newest First)",
  EditedAsc = "Edited (Oldest First)",
  CreatedDesc = "Created (Newest First)",
  CreatedAsc = "Created (Oldest First)",
}

export interface NotesExplorerSettings {
  minCardWidth: number;
  maxCardHeight: number | null;
  launchOnStart: boolean;
  showDeleteButton: boolean;
  displayTitle: TitleDisplayMode;
  showEmptyNotes: boolean;
  showSubFolders: boolean;
  showParentFolder: boolean;
  toSystemTrash: DeleteFileMode;
  openNoteLayout: NoteOpenLayout;
  tagPositionForCardColor: TagPostionForCardColor;
  pinnedFiles: string[];
  tagColors: TagSetting[];
  tagColorIndicatorType: TagCardColorIndicatorType;
  defaultSort: Sort;
  openViewOnFolderClick: boolean;
  excludedFolders: string[];
}

export const DEFAULT_SETTINGS: NotesExplorerSettings = {
  minCardWidth: 250,
  maxCardHeight: null,
  launchOnStart: false,
  showDeleteButton: true,
  displayTitle: TitleDisplayMode.Both,
  showEmptyNotes: false,
  showSubFolders: false,
  showParentFolder: true,
  toSystemTrash: DeleteFileMode.System,
  openNoteLayout: NoteOpenLayout.Right,
  tagPositionForCardColor: TagPostionForCardColor.content,
  pinnedFiles: [],
  tagColors: [],
  tagColorIndicatorType: TagCardColorIndicatorType.background,
  defaultSort: Sort.EditedDesc,
  openViewOnFolderClick: false,
  excludedFolders: [],
};

export class NotesExplorerSettingsTab extends PluginSettingTab {
  plugin: NotesExplorerPlugin;
  tempFolderName: string;

  constructor(app: App, plugin: NotesExplorerPlugin) {
    super(app, plugin);
    this.plugin = plugin;
    this.tempFolderName = "";
  }

  display(): void {
    const { containerEl } = this;
    containerEl.empty();

    new Setting(containerEl)
      .setName("Launch on start")
      .setDesc("Open the cards view when Obsidian starts")
      .addToggle((toggle) =>
        toggle
          .setValue(this.plugin.settings.launchOnStart)
          .onChange(async (value) => {
            this.plugin.settings.launchOnStart = value;
            await this.plugin.saveSettings();
          })
      );

    new Setting(containerEl).setName("Cards UI").setHeading();

    new Setting(containerEl)
      .setName("Title display mode")
      .setDesc("What to display on cards starting with a # Level 1 title")
      .addDropdown((dropdown) =>
        dropdown
          .addOptions({
            [TitleDisplayMode.Both]: "Both title and filename",
            [TitleDisplayMode.Title]: "Title",
            [TitleDisplayMode.Filename]: "Filename",
          })
          .setValue(this.plugin.settings.displayTitle)
          .onChange(async (value) => {
            this.plugin.settings.displayTitle = value as TitleDisplayMode;
            await this.plugin.saveSettings();
          })
      );

    new Setting(containerEl)
      .setName("Minimum card width")
      .setDesc("Cards will not be smaller than this width (in pixels)")
      .addText((text) =>
        text
          .setPlaceholder("200")
          .setValue(this.plugin.settings.minCardWidth.toString())
          .onChange(async (value) => {
            if (isNaN(parseInt(value))) {
              new Notice("Invalid number");
              return;
            }

            this.plugin.settings.minCardWidth = parseInt(value);
            await this.plugin.saveSettings();
          })
      );

    new Setting(containerEl)
      .setName("Maximum card height")
      .setDesc(
        "Set the maximum height of the card in pixels (leave blank for no restriction)"
      )
      .addText((text) =>
        text
          .setPlaceholder("e.g., 300")
          .setValue(this.plugin.settings.maxCardHeight?.toString() || "")
          .onChange(async (value) => {
            if (value.trim() === "") {
              this.plugin.settings.maxCardHeight = null;
            } else if (!isNaN(parseInt(value))) {
              this.plugin.settings.maxCardHeight = parseInt(value);
            } else {
              new Notice("Invalid number");
              return;
            }
            await this.plugin.saveSettings();
          })
      );

    new Setting(containerEl)
      .setName("Show delete button")
      .setDesc(
        "Disable this option to remove the delete button, so you dont delete any note accidentally."
      )
      .addToggle((toggle) =>
        toggle
          .setValue(this.plugin.settings.showDeleteButton)
          .onChange(async (value) => {
            this.plugin.settings.showDeleteButton = value;
            await this.plugin.saveSettings();
          })
      );

    new Setting(containerEl)
      .setName("Show parent folder name")
      .setDesc(
        "Disable this option to hide the parent folder from showing on the cards. Visible on mouse hover."
      )
      .addToggle((toggle) =>
        toggle
          .setValue(this.plugin.settings.showParentFolder)
          .onChange(async (value) => {
            this.plugin.settings.showParentFolder = value;
            await this.plugin.saveSettings();
          })
      );

    new Setting(containerEl).setName("Genearl features").setHeading();

    // new Setting(containerEl)
    //   .setName("Open view on tag click from Tag Tree")
    //   .setDesc(
    //     "Enable this if you want to see all the notes in cards view, which has the tag you just clicked from the tag tree."
    //   )
    //   .addToggle((toggle) =>
    //     toggle
    //       .setValue(this.plugin.settings.openViewOnTagTreeClick)
    //       .onChange(async (value) => {
    //         this.plugin.settings.openViewOnTagTreeClick = value;
    //         await this.plugin.saveSettings();
    //       })
    //   );

    // new Setting(containerEl)
    //   .setName("Open view on tag click from inline Tag")
    //   .setDesc(
    //     "Enable this if you want to see all the notes in cards view, which has the tag you just clicked from the in file tag."
    //   )
    //   .addToggle((toggle) =>
    //     toggle
    //       .setValue(this.plugin.settings.openViewOnInlineTagClick)
    //       .onChange(async (value) => {
    //         this.plugin.settings.openViewOnInlineTagClick = value;
    //         await this.plugin.saveSettings();
    //       })
    //   );

    new Setting(containerEl)
      .setName("Open view on folder click")
      .setDesc(
        "Enable this if you want to open the cards view with all the notes from a folder, when you will click on the folder from file explorer. You also have same option using file munu, if you dont like this feature.\nNOTE : You will require to restart Obsidian on this setting change."
      )
      .addToggle((toggle) =>
        toggle
          .setValue(this.plugin.settings.openViewOnFolderClick)
          .onChange(async (value) => {
            this.plugin.settings.openViewOnFolderClick = value;
            await this.plugin.saveSettings();
          })
      );

    new Setting(containerEl)
      .setName("Deleted files")
      .setDesc("What happens to a file after you delete it.")
      .addDropdown((dropdown) =>
        dropdown
          .addOptions({
            [DeleteFileMode.System]: "Move to system trash",
            [DeleteFileMode.Trash]: "Move to vault trash folder (.trash)",
            [DeleteFileMode.Permanent]: "Permanently delete",
          })
          .setValue(this.plugin.settings.toSystemTrash)
          .onChange(async (value) => {
            this.plugin.settings.toSystemTrash = value as DeleteFileMode;
            await this.plugin.saveSettings();
          })
      );

    new Setting(containerEl)
      .setName("Open note layout")
      .setDesc("Where should the note open.")
      .addDropdown((dropdown) =>
        dropdown
          .addOptions({
            [NoteOpenLayout.Right]: "Open note on right side",
            [NoteOpenLayout.NewTab]: "Open note in new tab",
            [NoteOpenLayout.NewWindow]: "Open note in new window",
          })
          .setValue(this.plugin.settings.openNoteLayout)
          .onChange(async (value) => {
            this.plugin.settings.openNoteLayout = value as NoteOpenLayout;
            await this.plugin.saveSettings();
          })
      );

    new Setting(containerEl).setName("Tag color indicator").setHeading();

    new Setting(containerEl)
      .setName("Where do you place the tags")
      .setDesc(
        "If you use frontmatter then create a property 'tags' and enter your tag name as value."
      )
      .addDropdown((dropdown) =>
        dropdown
          .addOptions({
            [TagPostionForCardColor.content]: "In content",
            [TagPostionForCardColor.frontmatter]: "In frontmatter",
          })
          .setValue(this.plugin.settings.tagPositionForCardColor)
          .onChange(async (value) => {
            this.plugin.settings.tagPositionForCardColor =
              value as TagPostionForCardColor;
            await this.plugin.saveSettings();
          })
      );

    new Setting(containerEl)
      .setName("Tag color indicator type")
      .setDesc(
        "Select whether you want the cards background color as the tag color or cards sidebars. With background options sometimes few elements of your note might not be properly visible due to the theme you are using, in that case use the sidbar option."
      )
      .addDropdown((dropdown) =>
        dropdown
          .addOptions({
            [TagCardColorIndicatorType.background]: "Card's background",
            [TagCardColorIndicatorType.sidebars]: "Card's sidebars",
          })
          .setValue(this.plugin.settings.tagColorIndicatorType)
          .onChange(async (value) => {
            this.plugin.settings.tagColorIndicatorType =
              value as TagCardColorIndicatorType;
            await this.plugin.saveSettings();
          })
      );

    const tagContainer = containerEl.createDiv({
      cls: "notes-explorer-tag-container",
    });

    Sortable.create(tagContainer, {
      animation: 150,
      ghostClass: "notes-explorer-sortable-ghost",
      chosenClass: "notes-explorer-sortable-chosen",
      dragClass: "notes-explorer-sortable-drag",
      dragoverBubble: true,
      forceFallback: true,
      fallbackClass: "notes-explorer-sortable-fallback",
      easing: "cubic-bezier(1, 0, 0, 1)",
      onSort: async () => {
        const newOrder = Array.from(tagContainer.children)
          .map((child, index) => {
            const tagName = child.getAttribute("data-tag-name");
            const tag = this.plugin.settings.tagColors.find(
              (t) => t.name === tagName
            );
            if (tag) {
              tag.order = index + 1;
              return tag;
            }
            return null;
          })
          .filter((tag): tag is TagSetting => tag !== null);

        this.plugin.settings.tagColors = newOrder;
        await this.plugin.saveSettings();
      },
    });

    // Render existing tags
    this.plugin.settings.tagColors
      .sort((a, b) => a.order - b.order)
      .forEach((tag, index) => {
        const row = tagContainer.createDiv({
          cls: "notes-explorer-tag-container-tag-row",
          attr: { "data-tag-name": tag.name },
        });
        // row.style.backgroundColor = tag.color;

        let rgbaInput: any;
        new Setting(row)
          .setClass("notes-explorer-tag-container-tag-row-element")
          .addButton((drag) =>
            drag
              .setTooltip("Hold and drag")
              .setIcon("grip-horizontal")
              .buttonEl.setCssStyles({ backgroundColor: tag.color })
          )
          .addText((text) =>
            text
              .setPlaceholder("Tag Name")
              .setValue(tag.name)
              .onChange(async (value) => {
                tag.name = value;
                row.setAttribute("data-tag-name", value);
                await this.plugin.saveSettings();
              })
              .inputEl.setCssStyles({
                backgroundColor: tag.color,
              })
          )
          .addText((input) => {
            rgbaInput = input;
            input
              .setPlaceholder("RGBA Color")
              .setValue(tag.color)
              .onChange(async (value) => {
                tag.color = value;
                row.setAttribute("data-tag-color", "notes-explorer-tag-color-data");
                row.style.backgroundColor = value;
                await this.plugin.saveSettings();
              });
            input.inputEl.setCssStyles({
              backgroundColor: tag.color,
              width: "100%",
            });
          })
          .addButton((button) => {
            const pickr = new Pickr({
              el: button.buttonEl,
              theme: "nano",
              default: tag.color || "rgba(255, 255, 255, 1)", // Default alpha to 1
              components: {
                preview: true,
                opacity: true,
                hue: true,
                interaction: {
                  rgba: true,
                  input: true,
                  clear: true,
                  cancel: true,
                  save: true,
                },
              },
            });

            pickr
              .on("change", (color: any) => {
                const rgbaColor = `rgba(${color
                  .toRGBA()
                  .map((value: any, index: number) =>
                    index < 3 ? Math.round(value) : value
                  )
                  .join(", ")})`; // Construct valid rgba format
                tag.color = rgbaColor;
                row.style.backgroundColor = rgbaColor;
                rgbaInput.setValue(rgbaColor);
              })
              .on("save", (color: any) => {
                pickr.hide();
                const rgbaColor = `rgba(${color
                  .toRGBA()
                  .map((value: number, index: number) =>
                    index < 3 ? Math.round(value) : value
                  )
                  .join(", ")})`; // Construct valid rgba format
                tag.color = rgbaColor;
                row.style.backgroundColor = rgbaColor;
                rgbaInput.setValue(rgbaColor);
                this.plugin.saveSettings();
              })
              .on("cancel", () => {
                pickr.hide(); // Close the picker when cancel is pressed
              });

            pickr.on("clear", () => pickr.hide());
          })

          .addButton((deleteButton) =>
            deleteButton
              .setButtonText("Delete")
              .setIcon("trash")
              .setCta()
              .onClick(async () => {
                this.plugin.settings.tagColors.splice(index, 1);
                await this.plugin.saveSettings();
                this.display();
              })
          );
      });

    // Add "Add Tag" button
    new Setting(containerEl).addButton((button) =>
      button
        .setButtonText("Add tag color")
        .setCta()
        .onClick(async () => {
          const newTag = {
            name: "",
            color: "",
            order: this.plugin.settings.tagColors.length + 1,
          };
          this.plugin.settings.tagColors.push(newTag);
          await this.plugin.saveSettings();
          this.display();
        })
    );

    new Setting(containerEl)
      .setName("Exclude Folders")
      .setDesc("Add folders to exclude from the board")
      .addText((text) =>
        text.setPlaceholder("Enter folder path").onChange((value) => {
          this.tempFolderName = value; // Temporary field to hold input
        })
      )
      .addButton((button) =>
        button
          .setButtonText("Add")
          .setCta()
          .onClick(() => {
            const folderInput = normalizePath(this.tempFolderName);
            if (
              folderInput &&
              !this.plugin.settings.excludedFolders.includes(folderInput)
            ) {
              this.plugin.settings.excludedFolders.push(folderInput);
              this.plugin.saveSettings();
              this.display();
            }
          })
      );

    containerEl.createEl("ul", { cls: "notes-explorer-exclude-folders-list" });
    this.plugin.settings.excludedFolders.forEach((folder) => {
      const li = containerEl.createEl("li", { text: folder });
      const deleteButton = li.createEl("button", { text: "Remove" });
      deleteButton.addEventListener("click", () => {
        this.plugin.settings.excludedFolders =
          this.plugin.settings.excludedFolders.filter((f) => f !== folder);
        this.plugin.saveSettings();
        this.display(); // Refresh UI
      });
    });

    new Setting(containerEl)
      .setName("Reset settings")
      .setDesc("Reset all settings to default")
      .addButton((button) =>
        button.setButtonText("Reset").onClick(async () => {
          this.plugin.settings = DEFAULT_SETTINGS;
          await this.plugin.saveSettings();
          this.display();
        })
      );
  }
}
