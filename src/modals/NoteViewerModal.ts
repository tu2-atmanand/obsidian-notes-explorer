import { Keymap, Modal, TFile, setIcon, type UserEvent } from "obsidian";
import { cancelIcon, editIcon, fileOpenIcon } from "src/icons";

import type NotesExplorerPlugin from "main";
import { get } from "svelte/store";
import { renderMarkdownUI } from "src/services/MarkdownUIRenderer";
import { view } from "src/store";

export class NoteViewerModal extends Modal {
  private plugin: NotesExplorerPlugin;
  private file: TFile;

  constructor(plugin: NotesExplorerPlugin, file: TFile) {
    super(plugin.app);
    this.plugin = plugin;
    this.file = file;
  }

  async onOpen() {
    const { contentEl } = this;
    contentEl.empty();

    this.modalEl.setAttribute("data-type", "notes-explorer-note");
    contentEl.setAttribute("data-type", "notes-explorer-note");

    // Create header
    const header = contentEl.createDiv("note-modal-header");

    // File basename
    const fileName = header.createDiv("note-modal-header-file-name");
    fileName.textContent = this.file.basename;

    // Buttons
    const buttonContainer = header.createDiv(
      "note-modal-header-button-container"
    );

    // TODO : Final decision, I wont going to provide a direct editor since user might accidentally open the modal and editing something by mistake. So this button will be required as user can switch to edit mode. But a very important feature required to integrate this Live Editor is, the editor should also scroll to the exact position where the user was reading the note in the normal rendered view.
    // const editButton = buttonContainer.createEl("button", {
    //   text: "Edit Note",
    // });
    // setIcon(editButton, editIcon);
    // editButton.onclick = () => this.editNote();

    const openButton = buttonContainer.createEl("button", {
        text: "Open Note",
    });
    setIcon(openButton, fileOpenIcon);
    openButton.onclick = async (evt: MouseEvent) => await this.openNote(evt);

    const closeButton = buttonContainer.createEl("button", { text: "Close" });
    setIcon(closeButton, cancelIcon);
    closeButton.onclick = () => this.close();

    // Create content area
    const contentArea = contentEl.createDiv("note-modal-content");
    const fileContent = this.file
      ? await this.plugin.app.vault.cachedRead(this.file)
      : "Error Loading Note";
    renderMarkdownUI(
      this.plugin,
      get(view),
      fileContent,
      contentArea,
      this.file.path
    );
  }

  onClose() {
    const { contentEl } = this;
    contentEl.empty();
  }

  private editNote() {
    // Logic to edit the note
    // console.log("Edit note:", this.file.path);
  }

  private async openNote(evt: UserEvent) {
    const newLeaf = this.plugin.app.workspace.getLeaf(Keymap.isModEvent(evt));
    await newLeaf.openFile(this.file);
    this.close();
  }
}
