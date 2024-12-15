// ./src/view.ts

import "../styles.css";

import {
  ItemView,
  TAbstractFile,
  TFile,
  WorkspaceLeaf,
  setIcon,
} from "obsidian";

import type NotesExplorerPlugin from "main";
import { type NotesExplorerSettings } from "./settings";
import Root from "./components/Root.svelte";
import { get } from "svelte/store";
import store, {
  allAllowedFiles,
  cardsPerBatch,
  currentPage,
  displayedCount,
  folderName,
  showActionBar,
  totalPages,
} from "./components/store";
import { leftSideArrow, rightSideArrow, topBarIcon } from "./icons";

export const PLUGIN_VIEW_TYPE = "notes-explorer";

export class CardsViewPluginView extends ItemView {
  private settings: NotesExplorerSettings;
  private svelteRoot: Root | null;
  private plugin: NotesExplorerPlugin;
  private viewContent: Element;
  private statusBarEl: HTMLElement | null = null;

  constructor(
    plugin: NotesExplorerPlugin,
    settings: NotesExplorerSettings,
    leaf: WorkspaceLeaf
  ) {
    super(leaf);
    this.plugin = plugin;
    this.settings = settings;
    this.svelteRoot = null;
    this.viewContent = this.containerEl.children[1];
  }

  getViewType() {
    return PLUGIN_VIEW_TYPE;
  }

  getDisplayText() {
    return "Notes Explorer";
  }

  async onOpen() {
    store.view.set(this);

    this.registerAllEvent();

    this.getAllFiles();

    this.svelteRoot = new Root({
      target: this.viewContent,
    });

    this.addAction(topBarIcon, "Show/Hide top bar", () => {
      store.showActionBar.set(!get(showActionBar));
    });

    this.renderMoreOnScroll();
  }

  async onClose() {
    store.viewIsVisible.set(false);
    store.searchQuery.set("");
    store.displayedCount.set(50);
    store.displayedFilesInBatchCount.set(cardsPerBatch);

    if (this.statusBarEl) {
      this.statusBarEl.remove();
      this.statusBarEl = null;
    }
  }

  private registerAllEvent() {
    this.registerEvent(
      this.app.vault.on("create", async (file: TAbstractFile) => {
        if (!this.app.workspace.layoutReady) {
          return;
        }
        if (file instanceof TFile && file.extension === "md") {
          store.files.update((files) => files?.concat(file));
        }
      })
    );
    this.registerEvent(
      this.app.vault.on("delete", async (file: TAbstractFile) => {
        if (file instanceof TFile && file.extension === "md") {
          store.files.update((files) =>
            files?.filter((f) => f.path !== file.path)
          );
        }
      })
    );
    this.registerEvent(
      this.app.vault.on("modify", async (file: TAbstractFile) => {
        if (file instanceof TFile && file.extension === "md") {
          store.files.update((files) =>
            files?.map((f) => (f.path === file.path ? file : f))
          );
        }
      })
    );
    this.registerEvent(
      this.app.vault.on(
        "rename",
        async (file: TAbstractFile, oldPath: string) => {
          if (file instanceof TFile && file.extension === "md") {
            store.files.update((files) =>
              files?.map((f) => (f.path === oldPath ? file : f))
            );
          }
        }
      )
    );

    this.app.workspace.on("resize", () => {
      store.refreshOnResize.set(true);
    });

    this.app.workspace.on("active-leaf-change", () => {
      // check our leaf is visible
      const rootLeaf = this.app.workspace.getMostRecentLeaf(
        this.app.workspace.rootSplit
      );
      store.viewIsVisible.set(
        rootLeaf?.view?.getViewType() === PLUGIN_VIEW_TYPE
      );
    });
  }

  private getAllFiles() {
    const onlyFolder = get(folderName);

    if (onlyFolder !== "") {
      return;
    } else {
      store.files.set(get(allAllowedFiles));
    }
  }

  private renderMoreOnScroll() {
    store.pagesView.set(this.settings.pagesView);
    const cardsContainer = this.viewContent.children[1];

    if (!this.settings.pagesView) {
      // Add status bar showing the number of cards rendered inside the view.
      const statusBarItemEl = this.plugin.addStatusBarItem();
      store.displayedCount.subscribe(() => {
        const statusBarText = "Current cards : " + get(displayedCount);
        statusBarItemEl.setText(statusBarText);
      });

      if (cardsContainer) {
        // Apply the scroll event to cardsContainer
        cardsContainer.addEventListener("scroll", async () => {
          if (
            cardsContainer.scrollTop + cardsContainer.clientHeight >
            cardsContainer.scrollHeight - 100
          ) {
            store.skipNextTransition.set(true);
            store.displayedCount.set(get(store.displayedFiles).length + 50);
          }
        });
      } else {
        console.error("cardsContainer is undefined");
      }
    } else {
      const pageBarContainer = this.viewContent.children[2];
      if (pageBarContainer) {
        this.statusBarEl = this.plugin.addStatusBarItem();

        // Left-side arrow button
        const leftArrowButton = this.statusBarEl.createEl("span", {
          cls: "notes-explorer-status-bar-button",
        });
        setIcon(leftArrowButton, leftSideArrow);
        leftArrowButton.addEventListener("click", () => {
          if (get(currentPage) > 1) {
            store.currentPage.set(get(currentPage) - 1);
            store.displayedFilesInBatchCount.set(cardsPerBatch);
          }
        });
        leftArrowButton.setAttribute("aria-label", "Go to previous page");
        leftArrowButton.setAttribute("aria-label-position", "top");

        // Status text
        const statusBarText = this.statusBarEl.createEl("span", {
          text: "Page : " + get(currentPage),
          cls: "notes-explorer-statuBarSpanEl",
        });
        store.currentPage.subscribe(() => {
          statusBarText.textContent = "Page : " + get(currentPage);
        });
        statusBarText.setAttribute("aria-label", "Open page navigation bar");
        statusBarText.setAttribute("aria-label-position", "top");

        // Right-side arrow button
        const rightArrowButton = this.statusBarEl.createEl("span", {
          cls: "notes-explorer-status-bar-button",
        });
        setIcon(rightArrowButton, rightSideArrow);
        rightArrowButton.addEventListener("click", () => {
          if (get(currentPage) < get(totalPages)) {
            store.currentPage.set(get(currentPage) + 1);
            store.displayedFilesInBatchCount.set(cardsPerBatch);
          }
        });
        rightArrowButton.setAttribute("aria-label", "Go to next page");
        rightArrowButton.setAttribute("aria-label-position", "top");

        // Add a click event listener to toggle the visibility
        let isPageBarVisible = false;
        statusBarText.addEventListener("click", () => {
          isPageBarVisible = !isPageBarVisible;
          if (isPageBarVisible) {
            pageBarContainer.classList.add("page-bar-visible");
          } else {
            pageBarContainer.classList.remove("page-bar-visible");
          }
        });

        if (cardsContainer && this.settings.cardsPerPage >= cardsPerBatch) {
          // Apply the scroll event to cardsContainer
          cardsContainer.addEventListener("scroll", async () => {
            console.log(
              "Cards currently in displayedFiles :",
              get(store.displayedFiles).length,
              "\nRemaining cards :",
              this.settings.cardsPerPage - get(store.displayedFiles).length
            );
            if (
              cardsContainer.scrollTop + cardsContainer.clientHeight >
              cardsContainer.scrollHeight - 100
            ) {
              const remainingCardsInCurrentPage =
                this.settings.cardsPerPage - get(store.displayedFiles).length;
              if (remainingCardsInCurrentPage >= cardsPerBatch) {
                store.skipNextTransition.set(true);
                store.displayedFilesInBatchCount.set(
                  get(store.displayedFiles).length + cardsPerBatch
                );
              } else {
                store.skipNextTransition.set(true);
                store.displayedFilesInBatchCount.set(
                  get(store.displayedFiles).length + remainingCardsInCurrentPage
                );
              }
            }
          });
        } else {
          console.log("Seting displayedFilesInBatchCount to :", this.settings.cardsPerPage);
          store.displayedFilesInBatchCount.set(this.settings.cardsPerPage);
        }
      } else {
        console.error("cardsContainer is undefined");
      }
    }
  }
}
