import {
  Notice,
  Plugin,
  TAbstractFile,
  TFile,
  TFolder,
  WorkspaceLeaf,
} from "obsidian";

import {
  type CardsViewSettings,
  CardsViewSettingsTab,
  DEFAULT_SETTINGS,
  Sort,
} from "./src/settings";
import { CardsViewPluginView, VIEW_TYPE } from "./src/view";
import store from "./src/components/store";
import "./styles.css";

export default class CardsViewPlugin extends Plugin {
  settings: CardsViewSettings = Object.assign({}, DEFAULT_SETTINGS);

  async onload() {
    console.log("Cards View (Beta) : Loading plugin ...");

    this.settings = Object.assign(this.settings, await this.loadData());
    store.settings.subscribe(async () => await this.saveSettings());

    store.plugin.set(this);
    store.app.set(this.app);
    store.settings.set(this.settings);
    store.appCache.set(this.app.metadataCache);

    this.registerEvent(
      this.app.metadataCache.on("resolved", async () =>
        store.appCache.update(() => this.app.metadataCache)
      )
    );

    this.addSettingTab(new CardsViewSettingsTab(this.app, this));
    this.addRibbonIcon("align-start-horizontal", "Card view", () => {
      this.activateView();
    });

    this.addCommand({
      id: "cards-view-plugin",
      name: "Open card view",
      callback: () => {
        this.activateView();
      },
    });

    this.registerView(
      VIEW_TYPE,
      (leaf) => new CardsViewPluginView(this, this.settings, leaf)
    );

    this.app.workspace.onLayoutReady(() => {
      if (this.settings.launchOnStart) {
        this.activateView();
      }
    });
  }

  onunload() {
    console.log("Cards View (Beta) : Unloading plugin ...");
  }

  async saveSettings() {
    await this.saveData(this.settings);
  }

  async activateView() {
    const { workspace } = this.app;

    let leaf: WorkspaceLeaf | null;
    const leaves = workspace.getLeavesOfType(VIEW_TYPE);

    if (leaves.length) {
      leaf = leaves[0];
    } else {
      leaf = workspace.getLeaf("tab");
    }

    await leaf.setViewState({ type: VIEW_TYPE, active: true });
    store.viewIsVisible.set(true);
  }

  async createFileMenu() {
    this.registerEvent(
      this.app.workspace.on("file-menu", (menu, file) => {
        if (file instanceof TFolder) {
          menu.addItem((item) => {
            item
              .setTitle("Open folder in Cards View")
              .setIcon("documents")
              .onClick(() => this.openAllFilesInFolder(file));
          });
        }
      })
    );

    this.registerDomEvent(document, "click", (evt: MouseEvent) => {
      // Event to open the Cards View on Tag click from
      if (this.settings.openViewOnTagTreeClick) {
        const target = evt.target as HTMLElement;
        let tagElement = target.closest(".tree-item-self.tag-pane-tag");
        if (tagElement) {
          const textElement = tagElement.querySelector(".tree-item-inner-text");
          if (textElement) {
            const tagName = textElement.textContent?.trim();
            if (tagName) {
              this.openTagInCardsView(tagName);
              evt.preventDefault();
            }
          }
        }
      }

      // Event to open the Cards View on Tag click from
      if (this.settings.openViewOnInlineTagClick) {
        const target = evt.target as HTMLElement;
        if (
          target.classList.contains("cm-hashtag-end") &&
          target.closest(".cm-line")
        ) {
          const tagName = target.textContent?.trim();
          if (tagName) {
            this.openTagInCardsView(tagName);
            evt.preventDefault();
          }
        }
      }

      // Event to open the Cards View on Folder click, just like Folder Notes plugin
      if (this.settings.openViewOnFolderClick) {
        // get the folder path
        const elemTarget = evt.target as Element;
        var Tfolder = this.setByFolderElement(elemTarget);

        // open it
        if (Tfolder && Tfolder instanceof TFolder) {
          this.openAllFilesInFolder(Tfolder);
        }
      }
    });
  }

  // set by folder element
  private setByFolderElement(folderItemEl: Element) {
    var folderPath = "";
    var folderName = "";

    var className = folderItemEl.className.toString();
    var folderElem = folderItemEl;
    if (className.contains("nav-folder-title-content")) {
      folderName = folderElem.getText();
      if (folderItemEl.parentElement) {
        folderElem = folderItemEl.parentElement;
        if (folderElem.attributes.getNamedItem("data-path")?.textContent)
          folderPath =
            folderElem.attributes.getNamedItem("data-path")?.textContent ?? "";
      }
    } else if (className.contains("nav-folder-title")) {
      folderPath =
        folderItemEl.attributes.getNamedItem("data-path")?.textContent ?? "";
      folderName = folderItemEl.lastElementChild?.getText() ?? "";
    }

    // fix the folder path
    if (folderPath.length > 0) {
      var slashLast = folderPath.lastIndexOf("/");
      var folderPathLast = folderPath.split("/").pop();
      if (folderPathLast != folderName) {
        folderPath = folderPath.substring(0, slashLast + 1) + folderName;
      }
    }

    // set to mine
    return this.app.vault.getAbstractFileByPath(folderPath);
  }

  async openAllFilesInFolder(folder: TFolder) {
    const files = folder.children.filter(
      (child): child is TFile =>
        child instanceof TFile && child.extension === "md"
    );
    await this.activateView();
    const leaves = this.app.workspace.getLeavesOfType(VIEW_TYPE);
    if (leaves.length > 0) {
      this.updateFiles(files, Sort.CreatedDesc);
    }
  }

  async openTagInCardsView(tagName: string) {
    try {
      const files = await this.getFilesWithTag(tagName);
      await this.activateView();
      const leaves = this.app.workspace.getLeavesOfType(VIEW_TYPE);
      if (leaves.length > 0) {
        const cardsView = leaves[0].view as CardsViewPluginView;
        this.updateFiles(files, Sort.CreatedDesc);
      } else {
        new Notice("无法打开卡片视图");
      }
    } catch (error) {
      console.error("打开标签卡片视图时出错:", tagName, error);
      new Notice(`打开卡片视图时出错: ${this.getErrorMessage(error)}`);
    }
  }

  private async getFilesWithTag(tagName: string): Promise<TFile[]> {
    const files: TFile[] = [];
    for (const file of this.app.vault.getMarkdownFiles()) {
      const cache = this.app.metadataCache.getFileCache(file);
      if (cache?.tags?.some((tag) => tag.tag === `#${tagName}`)) {
        files.push(file);
      }
    }
    return files;
  }

  private getErrorMessage(error: unknown): string {
    if (error instanceof Error) {
      return error.message;
    }
    return String(error);
  }

  private updateFiles(files: TFile[], sortType: Sort = Sort.EditedDesc) {
    store.files.set(files);
    store.displayedCount.set(50);
    store.searchQuery.set("");
    store.sort.set(sortType);
  }
}
