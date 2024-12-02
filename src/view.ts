// ./src/view.ts

import "../styles.css";

import { ItemView, TAbstractFile, TFile, WorkspaceLeaf } from "obsidian";
import store, { Sort } from "./components/store";

import type { CardsViewSettings } from "./settings";
import Root from "./components/Root.svelte";
import { get } from "svelte/store";

export const VIEW_TYPE = "cards-view";

export class CardsViewPluginView extends ItemView {
  private settings: CardsViewSettings;
  private svelteRoot?: Root;

  constructor(settings: CardsViewSettings, leaf: WorkspaceLeaf) {
    super(leaf);
    this.settings = settings;
  }

  getViewType() {
    return VIEW_TYPE;
  }

  getDisplayText() {
    return "Cards View (Beta)";
  }

  async onOpen() {
    const viewContent = this.containerEl.children[1];
    store.view.set(this);

    store.files.set(this.app.vault.getMarkdownFiles());
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
      store.refreshSignal.set(true);
    });

    this.svelteRoot = new Root({
      target: viewContent,
    });

    // Obtain a reference to the cards-container via Svelte component instance
    // const rootInstance = this.svelteRoot as Root; // Assuming Root has cardsContainer defined
    // const cardsContainer = await rootInstance.cardsContainer;
    const cardsContainer = viewContent.children[1];
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

    this.app.workspace.on("active-leaf-change", () => {
      // check our leaf is visible
      const rootLeaf = this.app.workspace.getMostRecentLeaf(
        this.app.workspace.rootSplit
      );
      store.viewIsVisible.set(rootLeaf?.view?.getViewType() === VIEW_TYPE);
    });
  }

  async onClose() {
    store.viewIsVisible.set(false);
    store.searchQuery.set("");
    store.displayedCount.set(50);
    store.sort.set(Sort.Modified);
  }
}
