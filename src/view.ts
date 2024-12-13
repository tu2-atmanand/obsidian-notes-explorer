// ./src/view.ts

import "../styles.css";

import { ItemView, TAbstractFile, TFile, WorkspaceLeaf } from "obsidian";

import type NotesExplorerPlugin from "main";
import { type NotesExplorerSettings } from "./settings";
import Root from "./components/Root.svelte";
import { get } from "svelte/store";
import store, {
  allAllowedFiles,
  currentPage,
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
      // const actionBarContainer = this.viewContent.children[1];
      // console.log("Container :", actionBarContainer);
      store.showActionBar.set(!get(showActionBar));
    });

    this.renderMoreOnScroll();
  }

  async onClose() {
    store.viewIsVisible.set(false);
    store.searchQuery.set("");
    store.displayedCount.set(50);
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
    if (!this.settings.pagesView) {
      const cardsContainer = this.viewContent.children[1];
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
        const statusBarEl = this.plugin.addStatusBarItem();

        // Left-side arrow button
        const leftArrowButton = statusBarEl.createEl("button", {
          cls: "status-bar-button",
        });
        leftArrowButton.innerHTML = `<i class="${leftSideArrow}"></i>`;
        leftArrowButton.addEventListener("click", () => {
          if (get(currentPage) > 1) {
            store.currentPage.set(get(currentPage) - 1);
          }
        });

        // Status text
        const statusBarText = statusBarEl.createEl("span", {
          text: "Page : " + get(currentPage),
        });

        // Right-side arrow button
        const rightArrowButton = statusBarEl.createEl("button", {
          cls: "status-bar-button",
        });
        rightArrowButton.innerHTML = `<i class="${rightSideArrow}"></i>`;
        rightArrowButton.addEventListener("click", () => {
          if (get(currentPage) < get(totalPages)) {
            store.currentPage.set(get(currentPage) + 1);
          }
        });

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
      } else {
        console.error("cardsContainer is undefined");
      }
    }
  }
}
