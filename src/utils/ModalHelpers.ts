// /src/utils/ModalHelpers.ts

import type { App } from "obsidian";
import DeleteConfirmationModal from "src/modals/DeleteConfirmationModal";

export const openDeleteConfirmationModal = async (
  app: App
): Promise<boolean> => {
  return new Promise((resolve) => {
    const mssg = "Are you sure you want to delete the note?";
    const deleteModal = new DeleteConfirmationModal({
      app,
      mssg,
      onConfirm: async () => {
        resolve(true);
      },
      onCancel: () => {
        resolve(false);
      },
    });
    deleteModal.open();
  });
};
