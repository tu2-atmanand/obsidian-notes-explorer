// ./src/view.ts

import "../styles.css";

import {
  ItemView,
  TAbstractFile,
  TFile,
  WorkspaceLeaf,
} from "obsidian";

import type NotesExplorerPlugin from "main";
import { type NotesExplorerSettings } from "./settings";
import Root from "./components/Root.svelte";
import { get } from "svelte/store";
import store, { allAllowedFiles, folderName } from "./components/store";

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
    // const this.viewContent = this.containerEl.children[1];
    store.view.set(this);

    this.registerAllEvent();

    this.getAllFiles();

    this.svelteRoot = new Root({
      target: this.viewContent,
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

    if (onlyFolder !== '') {
      // console.log("getAllFiles : Notes from only selected folder...");
      return;
    } else {
      store.files.set(get(allAllowedFiles));
    }
  }

  private renderMoreOnScroll() {
    // Obtain a reference to the cards-container via Svelte component instance
    // const rootInstance = this.svelteRoot as Root; // Assuming Root has cardsContainer defined
    // const cardsContainer = await rootInstance.cardsContainer;
    const cardsContainer = this.viewContent.children[1];
    // Apply the scroll event to cardsContainer
    if (cardsContainer) {
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

    // // On scroll 80% of viewContent, load more cards
    // viewContent.addEventListener("scroll", async () => {
    //   if (
    //     viewContent.scrollTop + viewContent.clientHeight >
    //     viewContent.scrollHeight - 500
    //   ) {
    //     store.skipNextTransition.set(true);
    //     store.displayedCount.set(get(store.displayedFiles).length + 50);
    //   }
    // });
  }
}
