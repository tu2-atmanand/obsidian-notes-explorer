// ./src/settings.ts

import {
  App,
  Notice,
  PluginSettingTab,
  Setting,
  normalizePath,
  setIcon,
} from "obsidian";
import { buyMeCoffeeSVGIcon, kofiSVGIcon } from "./icons";

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
export enum NoteMetadata {
  Finename = "fileName",
  FolderName = "folderName",
  LastEditedTime = "editedTime",
  CreatedTime = "createdTime",
  Frontmatter = "frontmatter",
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
  fixedCardHeight: number | null;
  maxLines: number | null;
  launchOnStart: boolean;
  showDeleteButton: boolean;
  displayTitle: TitleDisplayMode;
  showEmptyNotes: boolean;
  showSubFolders: boolean;
  contentInteractions: boolean;
  metadataVisibility: boolean;
  noteMetadata: NoteMetadata;
  frontmatterTag: string | null;
  deleteFileMode: DeleteFileMode;
  openNoteLayout: NoteOpenLayout;
  tagPositionForCardColor: TagPostionForCardColor;
  pinnedFiles: string[];
  tagColors: TagSetting[];
  tagColorIndicatorType: TagCardColorIndicatorType;
  defaultSort: Sort;
  openViewOnFolderClick: boolean;
  excludedFolders: string[];
  pagesView: boolean;
  cardsPerPage: number;
}

export const DEFAULT_SETTINGS: NotesExplorerSettings = {
  minCardWidth: 250,
  fixedCardHeight: null,
  maxLines: null,
  launchOnStart: false,
  showDeleteButton: true,
  displayTitle: TitleDisplayMode.Both,
  showEmptyNotes: false,
  showSubFolders: false,
  contentInteractions: false,
  noteMetadata: NoteMetadata.FolderName,
  frontmatterTag: null,
  metadataVisibility: true,
  deleteFileMode: DeleteFileMode.System,
  openNoteLayout: NoteOpenLayout.Right,
  tagPositionForCardColor: TagPostionForCardColor.content,
  pinnedFiles: [],
  tagColors: [],
  tagColorIndicatorType: TagCardColorIndicatorType.background,
  defaultSort: Sort.EditedDesc,
  openViewOnFolderClick: false,
  excludedFolders: [],
  pagesView: true,
  cardsPerPage: 50,
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

    new Setting(containerEl).setName("General features").setHeading();

    new Setting(containerEl)
      .setName("DEV : Page View")
      .setDesc("Show pages instead of contineous scrolling.")
      .addToggle((toggle) =>
        toggle
          .setValue(this.plugin.settings.pagesView)
          .onChange(async (value) => {
            this.plugin.settings.pagesView = value;
            await this.plugin.saveSettings();
            cardsPerPageSetting.setDisabled(!value);
          })
      );

    const cardsPerPageSetting = new Setting(containerEl)
      .setName("Cards per page")
      .setDesc(
        "Enter the number of cards you want to see on per page. Find the best number which gives you smooth experience."
      )
      .addText((text) =>
        text
          .setPlaceholder("eg.: 50")
          .setValue(this.plugin.settings.cardsPerPage?.toString() || "")
          .onChange(async (value) => {
            if (value.trim() === "") {
              this.plugin.settings.cardsPerPage = 50;
            } else if (!isNaN(parseInt(value))) {
              this.plugin.settings.cardsPerPage = parseInt(value);
            } else {
              new Notice("Invalid number");
              return;
            }
            await this.plugin.saveSettings();
          })
      )
      .setDisabled(!this.plugin.settings.pagesView);

    new Setting(containerEl)
      .setName("Launch on start")
      .setDesc("Open the notes explorer board when Obsidian starts")
      .addToggle((toggle) =>
        toggle
          .setValue(this.plugin.settings.launchOnStart)
          .onChange(async (value) => {
            this.plugin.settings.launchOnStart = value;
            await this.plugin.saveSettings();
          })
      );

    // new Setting(containerEl)
    //   .setName("Open board on tag click from Tag Tree")
    //   .setDesc(
    //     "Enable this if you want to see all the notes in cards board, which has the tag you just clicked from the tag tree."
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
    //   .setName("Open board on tag click from inline Tag")
    //   .setDesc(
    //     "Enable this if you want to see all the notes in cards board, which has the tag you just clicked from the in file tag."
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
      .setName("Open note layout")
      .setDesc(
        "Select how should the parent note open. Double click on the card to open the note."
      )
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
          .setValue(this.plugin.settings.deleteFileMode)
          .onChange(async (value) => {
            this.plugin.settings.deleteFileMode = value as DeleteFileMode;
            await this.plugin.saveSettings();
          })
      );

    new Setting(containerEl)
      .setName("Note's content interactions")
      .setDesc(
        "Enable this feature if you like to have in-card interactions, such as opening internal links and getting hover preview. NOTE : Obsidian restart required for this setting."
      )
      .addToggle((toggle) =>
        toggle
          .setValue(this.plugin.settings.contentInteractions)
          .onChange(async (value) => {
            this.plugin.settings.contentInteractions = value;
            await this.plugin.saveSettings();
          })
      );

    new Setting(containerEl)
      .setName("Open board on folder click")
      .setDesc(
        "Enable this if you want to open the notes explorer board with all the notes from a folder, when you will click on the folder from file explorer. You also have same option using right-click menu, if you dont like this feature.\nNOTE : Obsidian restart required for this setting."
      )
      .addToggle((toggle) =>
        toggle
          .setValue(this.plugin.settings.openViewOnFolderClick)
          .onChange(async (value) => {
            this.plugin.settings.openViewOnFolderClick = value;
            await this.plugin.saveSettings();
          })
      );

    new Setting(containerEl).setName("Cards UI").setHeading();

    new Setting(containerEl)
      .setName("Title display mode")
      .setDesc("Select what you want to see at the top of each card.")
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
          .setPlaceholder("eg.: 200")
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
      .setName("Fixed card height")
      .setDesc(
        "Set a fixed height for the card in pixels (leave blank for no restriction). All cards will take a fixed height regardless of how many maximum lines you have set or if the note contains any image, etc. This setting will help you to get a gallery view instead of a masonry view."
      )
      .addText((text) =>
        text
          .setPlaceholder("eg.: 500")
          .setValue(this.plugin.settings.fixedCardHeight?.toString() || "")
          .onChange(async (value) => {
            if (value.trim() === "") {
              this.plugin.settings.fixedCardHeight = null;
            } else if (!isNaN(parseInt(value))) {
              this.plugin.settings.fixedCardHeight = parseInt(value);
            } else {
              new Notice("Invalid number");
              return;
            }
            await this.plugin.saveSettings();
          })
      );

    new Setting(containerEl)
      .setName("Maximum number of lines")
      .setDesc(
        "Set the maximum number of lines to be rendered in card from the note. Default : 20 lines"
      )
      .addText((text) =>
        text
          .setPlaceholder("eg.: 20")
          .setValue(this.plugin.settings.maxLines?.toString() || "")
          .onChange(async (value) => {
            if (value.trim() === "") {
              this.plugin.settings.maxLines = null;
            } else if (!isNaN(parseInt(value))) {
              this.plugin.settings.maxLines = parseInt(value);
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
      .setName("Note's Metadata")
      .setDesc(
        "Select the property of the note that you want to see in the cards footer. If selected the 'frontmatter' option, enter the frontmatter-tag in the below text input box."
      )
      .addDropdown((dropdown) =>
        dropdown
          .addOptions({
            [NoteMetadata.Finename]: "Note's file name",
            [NoteMetadata.FolderName]: "Note's folder name",
            [NoteMetadata.LastEditedTime]: "Last edited time",
            [NoteMetadata.CreatedTime]: "Created date-time",
            [NoteMetadata.Frontmatter]: "Frontmatter",
          })
          .setValue(this.plugin.settings.noteMetadata)
          .onChange(async (value) => {
            this.plugin.settings.noteMetadata = value as NoteMetadata;
            await this.plugin.saveSettings();
            frontmatterTagSetting.setDisabled(
              value !== NoteMetadata.Frontmatter
            );
          })
      );

    const frontmatterTagSetting = new Setting(containerEl)
      .setName("Frontmatter Tag")
      .setDesc("Enter the name of the frontmatter tag to display its value.")
      .addText((text) =>
        text
          .setPlaceholder("eg.: author")
          .setValue(this.plugin.settings.frontmatterTag || "")
          .onChange(async (value) => {
            this.plugin.settings.frontmatterTag = value;
            await this.plugin.saveSettings();
          })
      )
      .setDisabled(
        this.plugin.settings.noteMetadata !== NoteMetadata.Frontmatter
      );

    new Setting(containerEl)
      .setName("Footer always visible")
      .setDesc(
        "Disable this option to hide the note's metadata from showing in the card's footer. Visible only on mouse hover."
      )
      .addToggle((toggle) =>
        toggle
          .setValue(this.plugin.settings.metadataVisibility)
          .onChange(async (value) => {
            this.plugin.settings.metadataVisibility = value;
            await this.plugin.saveSettings();
          })
      );

    new Setting(containerEl).setName("Tag color indicator").setHeading();

    new Setting(containerEl)
      .setName("Which tags to read")
      .setDesc(
        "Whether to read the tags from content or frontmatter. If selected frontmatter then create a property 'tags'."
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
      .setName("Indicator type")
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
                row.setAttribute(
                  "data-tag-color",
                  "notes-explorer-tag-color-data"
                );
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
              default: tag.color || "rgba(255, 0, 0, 1)", // Default alpha to 1
              components: {
                preview: true,
                opacity: true,
                hue: true,
                interaction: {
                  rgba: true,
                  input: true,
                  clear: true,
                  cancel: true,
                  save: false,
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
              // .on("save", (color: any) => {
              //   pickr.hide();
              //   const rgbaColor = `rgba(${color
              //     .toRGBA()
              //     .map((value: number, index: number) =>
              //       index < 3 ? Math.round(value) : value
              //     )
              //     .join(", ")})`; // Construct valid rgba format
              //   tag.color = rgbaColor;
              //   row.style.backgroundColor = rgbaColor;
              //   rgbaInput.setValue(rgbaColor);
              //   this.plugin.saveSettings();
              // })
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

    new Setting(containerEl).setName("Exclude Folders").setHeading();

    new Setting(containerEl)
      .setName("Folder name")
      .setDesc(
        "Enter the complete folder path and click on save to exclude all notes from this folder from the board. You can also apply filters to board notes from sub-folders from the board filter menu."
      )
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

    const folderIcon = (element: HTMLElement) => setIcon(element, "folder");

    const excludeFolderContainer = containerEl.createDiv({
      cls: "notes-explorer-exclude-folders-list",
    });
    this.plugin.settings.excludedFolders.forEach((folder) => {
      const listItem = excludeFolderContainer.createDiv({
        cls: "notes-explorer-exclude-folders-list-item",
      });

      // Add folder icon
      const folderIconDiv = listItem.createDiv({
        cls: "notes-explorer-exclude-folders-list-folderIcon",
      });
      folderIcon(folderIconDiv);

      listItem.createDiv({
        text: folder,
        cls: "notes-explorer-exclude-folders-list-folderName",
      });

      const deleteButton = listItem.createEl("button", {
        text: "Remove",
        cls: "notes-explorer-exclude-folders-list-button",
      });
      deleteButton.addEventListener("click", () => {
        this.plugin.settings.excludedFolders =
          this.plugin.settings.excludedFolders.filter((f) => f !== folder);
        this.plugin.saveSettings();
        this.display(); // Refresh UI
      });
    });

    // new Setting(containerEl)
    //   .setName("Reset settings")
    //   .setDesc("Reset all settings to default")
    //   .addButton((button) =>
    //     button.setButtonText("Reset").onClick(async () => {
    //       this.plugin.settings = DEFAULT_SETTINGS;
    //       await this.plugin.saveSettings();
    //       this.display();
    //     })
    //   );

    containerEl.createEl("hr");

    const footerSection = containerEl.createEl("div", {
      cls: "settingTabFooterSection",
    });

    footerSection
      .createEl("p", {
        text: "This plugin is developed by ",
      })
      .createEl("a", {
        text: "Atmanand Gauns",
        href: "https://www.github.com/tu2-atmanand",
      });

    const footerText = createEl("p");
    footerText.appendText(
      "If you like this plugin, do consider supporting my work by making a small donation for continued better improvement of this idea!"
    );

    footerSection.appendChild(footerText);

    const parser = new DOMParser();

    const donationSection = createEl("div", {
      cls: "settingTabFooterDonationsSec",
    });
    donationSection.appendChild(paypalButton("https://paypal.me/tu2atmanand"));
    donationSection.appendChild(
      buyMeACoffeeButton(
        "https://www.buymeacoffee.com/tu2_atmanand",
        parser.parseFromString(buyMeCoffeeSVGIcon, "text/xml").documentElement
      )
    );
    donationSection.appendChild(
      kofiButton(
        "https://ko-fi.com/atmanandgauns",
        parser.parseFromString(kofiSVGIcon, "text/xml").documentElement
      )
    );

    footerSection.appendChild(donationSection);
  }
}

const paypalButton = (link: string): HTMLElement => {
  const a = createEl("a", {
    href: link,
    cls: "buymeacoffee-tu2-atmanand-img",
  });
  const svg = createSvg("svg", {
    attr: {
      xmlns: "http://www.w3.org/2000/svg",
      width: "150",
      height: "40",
    },
  });
  // Append `path` elements to `svg`
  svg.appendChild(
    createSvg("path", {
      attr: {
        fill: "#253B80",
        d: "M46.211 6.749h-6.839a.95.95 0 0 0-.939.802l-2.766 17.537a.57.57 0 0 0 .564.658h3.265a.95.95 0 0 0 .939-.803l.746-4.73a.95.95 0 0 1 .938-.803h2.165c4.505 0 7.105-2.18 7.784-6.5.306-1.89.013-3.375-.872-4.415-.972-1.142-2.696-1.746-4.985-1.746zM47 13.154c-.374 2.454-2.249 2.454-4.062 2.454h-1.032l.724-4.583a.57.57 0 0 1 .563-.481h.473c1.235 0 2.4 0 3.002.704.359.42.469 1.044.332 1.906zM66.654 13.075h-3.275a.57.57 0 0 0-.563.481l-.145.916-.229-.332c-.709-1.029-2.29-1.373-3.868-1.373-3.619 0-6.71 2.741-7.312 6.586-.313 1.918.132 3.752 1.22 5.031.998 1.176 2.426 1.666 4.125 1.666 2.916 0 4.533-1.875 4.533-1.875l-.146.91a.57.57 0 0 0 .562.66h2.95a.95.95 0 0 0 .939-.803l1.77-11.209a.568.568 0 0 0-.561-.658zm-4.565 6.374c-.316 1.871-1.801 3.127-3.695 3.127-.951 0-1.711-.305-2.199-.883-.484-.574-.668-1.391-.514-2.301.295-1.855 1.805-3.152 3.67-3.152.93 0 1.686.309 2.184.892.499.589.697 1.411.554 2.317zM84.096 13.075h-3.291a.954.954 0 0 0-.787.417l-4.539 6.686-1.924-6.425a.953.953 0 0 0-.912-.678h-3.234a.57.57 0 0 0-.541.754l3.625 10.638-3.408 4.811a.57.57 0 0 0 .465.9h3.287a.949.949 0 0 0 .781-.408l10.946-15.8a.57.57 0 0 0-.468-.895z",
      },
    })
  );
  svg.appendChild(
    createSvg("path", {
      attr: {
        fill: "#179BD7",
        d: "M94.992 6.749h-6.84a.95.95 0 0 0-.938.802l-2.766 17.537a.569.569 0 0 0 .562.658h3.51a.665.665 0 0 0 .656-.562l.785-4.971a.95.95 0 0 1 .938-.803h2.164c4.506 0 7.105-2.18 7.785-6.5.307-1.89.012-3.375-.873-4.415-.971-1.142-2.694-1.746-4.983-1.746zm.789 6.405c-.373 2.454-2.248 2.454-4.062 2.454h-1.031l.725-4.583a.568.568 0 0 1 .562-.481h.473c1.234 0 2.4 0 3.002.704.359.42.468 1.044.331 1.906zM115.434 13.075h-3.273a.567.567 0 0 0-.562.481l-.145.916-.23-.332c-.709-1.029-2.289-1.373-3.867-1.373-3.619 0-6.709 2.741-7.311 6.586-.312 1.918.131 3.752 1.219 5.031 1 1.176 2.426 1.666 4.125 1.666 2.916 0 4.533-1.875 4.533-1.875l-.146.91a.57.57 0 0 0 .564.66h2.949a.95.95 0 0 0 .938-.803l1.771-11.209a.571.571 0 0 0-.565-.658zm-4.565 6.374c-.314 1.871-1.801 3.127-3.695 3.127-.949 0-1.711-.305-2.199-.883-.484-.574-.666-1.391-.514-2.301.297-1.855 1.805-3.152 3.67-3.152.93 0 1.686.309 2.184.892.501.589.699 1.411.554 2.317zM119.295 7.23l-2.807 17.858a.569.569 0 0 0 .562.658h2.822c.469 0 .867-.34.939-.803l2.768-17.536a.57.57 0 0 0-.562-.659h-3.16a.571.571 0 0 0-.562.482z",
      },
    })
  );
  svg.appendChild(
    createSvg("path", {
      attr: {
        fill: "#253B80",
        d: "M7.266 29.154l.523-3.322-1.165-.027H1.061L4.927 1.292a.316.316 0 0 1 .314-.268h9.38c3.114 0 5.263.648 6.385 1.927.526.6.861 1.227 1.023 1.917.17.724.173 1.589.007 2.644l-.012.077v.676l.526.298a3.69 3.69 0 0 1 1.065.812c.45.513.741 1.165.864 1.938.127.795.085 1.741-.123 2.812-.24 1.232-.628 2.305-1.152 3.183a6.547 6.547 0 0 1-1.825 2c-.696.494-1.523.869-2.458 1.109-.906.236-1.939.355-3.072.355h-.73c-.522 0-1.029.188-1.427.525a2.21 2.21 0 0 0-.744 1.328l-.055.299-.924 5.855-.042.215c-.011.068-.03.102-.058.125a.155.155 0 0 1-.096.035H7.266z",
      },
    })
  );
  svg.appendChild(
    createSvg("path", {
      attr: {
        fill: "#179BD7",
        d: "M23.048 7.667c-.028.179-.06.362-.096.55-1.237 6.351-5.469 8.545-10.874 8.545H9.326c-.661 0-1.218.48-1.321 1.132L6.596 26.83l-.399 2.533a.704.704 0 0 0 .695.814h4.881c.578 0 1.069-.42 1.16-.99l.048-.248.919-5.832.059-.32c.09-.572.582-.992 1.16-.992h.73c4.729 0 8.431-1.92 9.513-7.476.452-2.321.218-4.259-.978-5.622a4.667 4.667 0 0 0-1.336-1.03z",
      },
    })
  );
  svg.appendChild(
    createSvg("path", {
      attr: {
        fill: "#222D65",
        d: "M21.754 7.151a9.757 9.757 0 0 0-1.203-.267 15.284 15.284 0 0 0-2.426-.177h-7.352a1.172 1.172 0 0 0-1.159.992L8.05 17.605l-.045.289a1.336 1.336 0 0 1 1.321-1.132h2.752c5.405 0 9.637-2.195 10.874-8.545.037-.188.068-.371.096-.55a6.594 6.594 0 0 0-1.017-.429 9.045 9.045 0 0 0-.277-.087z",
      },
    })
  );
  svg.appendChild(
    createSvg("path", {
      attr: {
        fill: "#253B80",
        d: "M9.614 7.699a1.169 1.169 0 0 1 1.159-.991h7.352c.871 0 1.684.057 2.426.177a9.757 9.757 0 0 1 1.481.353c.365.121.704.264 1.017.429.368-2.347-.003-3.945-1.272-5.392C20.378.682 17.853 0 14.622 0h-9.38c-.66 0-1.223.48-1.325 1.133L.01 25.898a.806.806 0 0 0 .795.932h5.791l1.454-9.225 1.564-9.906z",
      },
    })
  );

  a.appendChild(svg);
  return a;
};

const buyMeACoffeeButton = (link: string, img: HTMLElement): HTMLElement => {
  const a = document.createElement("a");
  a.setAttribute("href", link);
  a.addClass("buymeacoffee-tu2-atmanand-img");
  a.appendChild(img);
  return a;
};

const kofiButton = (link: string, img: HTMLElement): HTMLElement => {
  const a = document.createElement("a");
  a.setAttribute("href", link);
  a.addClass("buymeacoffee-tu2-atmanand-img");
  a.appendChild(img);
  return a;
};
