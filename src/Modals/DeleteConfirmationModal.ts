// src/Modal/DeleteConfirmationModal.tsx

import { App, Modal } from "obsidian";

import { DeleteFileMode } from "src/settings";
import { get } from "svelte/store";
import { settings } from "src/components/store";

interface DeleteConfirmationModalProps {
  app: App; // Add this field
  mssg: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export class DeleteConfirmationModal extends Modal {
  mssg: string;
  onConfirm: () => void;
  onCancel: () => void;

  constructor({
    app,
    mssg,
    onConfirm,
    onCancel,
  }: DeleteConfirmationModalProps) {
    super(app);
    this.mssg = mssg;
    this.onConfirm = onConfirm;
    this.onCancel = onCancel;
  }

  onOpen() {
    const { contentEl } = this;

    this.modalEl.setAttribute("data-type", "notes-explorer");

    let trashLocMssg = "";
    if (get(settings).deleteFileMode === DeleteFileMode.System) {
      trashLocMssg =
        "The note file will be moved in the system trash. You can easily restore it later if required.";
    } else if (get(settings).deleteFileMode === DeleteFileMode.Trash) {
      trashLocMssg =
        "The note file will be moved in the vault's trash folder. You can easily restore it later from the .trash folder in your vault folder.";
    } else {
      trashLocMssg =
        "Even though the delete file mode is set as permanent. Still to avoid any accidental data loss, the file will be moved to system's trash. You can delete it from there permanently.";
    }
    const homeComponent = contentEl.createEl("span", {
      cls: "deleteConfirmationModalHome",
    });
    homeComponent.createEl("h2", { text: this.mssg });
    homeComponent.createEl("p", { text: trashLocMssg });

    const buttonContainer = homeComponent.createDiv(
      "deleteConfirmationModalHome-button-container"
    );

    const confirmButton = buttonContainer.createEl("button", {
      text: "Delete",
    });
    confirmButton.classList.add("deleteTaskConfirmBtn");
    confirmButton.addEventListener("click", () => {
      this.onConfirm();
      this.close();
    });

    const cancelButton = buttonContainer.createEl("button", { text: "Cancel" });
    cancelButton.classList.add("deleteTaskCancelmBtn");
    cancelButton.addEventListener("click", () => {
      this.onCancel();
      this.close();
    });
  }

  onClose() {
    const { contentEl } = this;
    contentEl.empty();
  }
}
