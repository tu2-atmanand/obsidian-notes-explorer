// /src/modal/NotesCountStatisticsModal.ts

import { App, Modal } from "obsidian";
import {
  allAllowedFiles,
  excludedFilesCount,
  filteredFiles,
} from "src/store";

import type NotesExplorerPlugin from "main";
import { get } from "svelte/store";

export class NotesCountStatisticsModal extends Modal {
  constructor(plugin: NotesExplorerPlugin) {
    super(plugin.app);
  }

  onOpen() {
    const { contentEl } = this;
    contentEl.empty();

    const allNotesInVaultCount = this.app.vault.getMarkdownFiles().length;

    const title = contentEl.createEl("h2", { text: "Notes Statistics" });
    title.addClass("notes-explorer-modal-title");
    const totalFilesEl = contentEl.createDiv({
      cls: "notes-explorer-modal-text-element",
    });
    totalFilesEl.createEl("p", {
      text: "Total notes in vault: ",
    });
    totalFilesEl.createEl("p", {
      text: `${allNotesInVaultCount}`,
      cls: "notes-explorer-modal-text-element-highlight",
    });

    const allAllowedFilesEl = contentEl.createDiv({
      cls: "notes-explorer-modal-text-element",
    });
    allAllowedFilesEl.createEl("p", {
      text: "Total notes allowed for Notes Explorer to fetch: ",
    });
    allAllowedFilesEl.createEl("p", {
      text: `${allNotesInVaultCount - get(excludedFilesCount)}`,
      cls: "notes-explorer-modal-text-element-highlight",
    });

    const filteredFilesEl = contentEl.createDiv({
      cls: "notes-explorer-modal-text-element",
    });
    filteredFilesEl.createEl("p", {
      text: "Total filtered notes from the folder-tag, search-query or search-filters: ",
    });
    filteredFilesEl.createEl("p", {
      text: `${get(filteredFiles).length}`,
      cls: "notes-explorer-modal-text-element-highlight",
    });

    // contentEl.appendChild(title);
    // contentEl.appendChild(totalFilesEl);
    // contentEl.appendChild(allAllowedFilesEl);
    // contentEl.appendChild(filteredFilesEl);
  }

  onClose() {
    const { contentEl } = this;
    contentEl.empty();
  }
}
