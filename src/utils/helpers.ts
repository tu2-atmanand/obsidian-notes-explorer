// /src/utils/helpers.ts

import type { App } from "obsidian";
import { DeleteConfirmationModal } from "src/Modals/DeleteConfirmationModal";

export const openDeleteConfirmationModal = async (
  app: App
): Promise<boolean> => {
  console.log("trashFile: Modal opening...");
  return new Promise((resolve) => {
    const mssg = "Are you sure you want to delete the note?";
    const deleteModal = new DeleteConfirmationModal({
      app,
      mssg,
      onConfirm: async () => {
        console.log("trashFile: Confirmed");
        resolve(true);
      },
      onCancel: () => {
        console.log("trashFile: Canceled");
        resolve(false);
      },
    });
    deleteModal.open();
  });
};
