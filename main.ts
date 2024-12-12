import { Plugin, TFile, TFolder, WorkspaceLeaf } from "obsidian";

import {
  type NotesExplorerSettings,
  NotesExplorerSettingsTab,
  DEFAULT_SETTINGS,
} from "./src/settings";
import { CardsViewPluginView, PLUGIN_VIEW_TYPE } from "./src/view";
import store from "./src/components/store";
import "./styles.css";
import { pluginIcon } from "src/icons";

export default class NotesExplorerPlugin extends Plugin {
  settings: NotesExplorerSettings = Object.assign({}, DEFAULT_SETTINGS);

  async onload() {
    console.log("Notes Explorer : Loading plugin ...");

    this.settings = Object.assign(this.settings, await this.loadData());
    store.settings.subscribe(async () => await this.saveSettings());

    store.plugin.set(this);
    store.app.set(this.app);
    store.settings.set(this.settings);
    store.appCache.set(this.app.metadataCache);

    this.app.workspace.onLayoutReady(() => {
      this.registerPluginEvents();

      this.createFileMenu();

      this.registerCommands();

      this.addSettingTab(new NotesExplorerSettingsTab(this.app, this));

      this.registerPluginRibbonIcon();

      this.registerView(
        PLUGIN_VIEW_TYPE,
        (leaf) => new CardsViewPluginView(this, this.settings, leaf)
      );

      if (this.settings.launchOnStart) {
        this.activateView();
      }
    });
  }

  onunload() {
    console.log("Notes Explorer : Unloading plugin ...");
  }

  async saveSettings() {
    await this.saveData(this.settings);
  }

  async activateView() {
    const { workspace } = this.app;

    let leaf: WorkspaceLeaf | null;
    const leaves = workspace.getLeavesOfType(PLUGIN_VIEW_TYPE);

    if (leaves.length) {
      leaf = leaves[0];
    } else {
      leaf = workspace.getLeaf("tab");
    }

    await leaf.setViewState({ type: PLUGIN_VIEW_TYPE, active: true });
    store.viewIsVisible.set(true);
  }

  private async registerPluginEvents() {
    this.registerEvent(
      this.app.metadataCache.on("resolved", async () =>
        store.appCache.update(() => this.app.metadataCache)
      )
    );

    if (this.settings.openViewOnFolderClick) {
      this.registerDomEvent(document, "click", async (evt: MouseEvent) => {
        // console.log("CLick event is triggered...");

        // // Event to open the Cards View on Tag click from
        // if (this.settings.openViewOnTagTreeClick) {
        //   const target = evt.target as HTMLElement;
        //   let tagElement = target.closest(".tree-item-self.tag-pane-tag");
        //   if (tagElement) {
        //     console.log("registerDomEvent : Tag from tag-tree has been clicked...");
        //     const textElement = tagElement.querySelector(".tree-item-inner-text");
        //     if (textElement) {
        //       const tagName = textElement.textContent?.trim();
        //       if (tagName) {
        //         // this.openTagInCardsView(tagName);
        //         evt.preventDefault();
        //       }
        //     }
        //   }
        // }

        // // Event to open the Cards View on Tag click from
        // if (this.settings.openViewOnInlineTagClick) {
        //   const target = evt.target as HTMLElement;
        //   if (
        //     target.classList.contains("cm-hashtag-end") &&
        //     target.closest(".cm-line")
        //   ) {
        //     console.log(
        //       "registerDomEvent : Tag from inline tag has been clicked..."
        //     );
        //     const tagName = target.textContent?.trim();
        //     if (tagName) {
        //       // this.openTagInCardsView(tagName);
        //       evt.preventDefault();
        //     }
        //   }
        // }

        // Event to open the Cards View on Folder click, just like Folder Notes plugin
        const elemTarget = evt.target as Element;
        var Tfolder = this.setByFolderElement(elemTarget);
        // console.log(
        //   "EVENT : folder returned by setByFolderElement :",
        //   Tfolder,
        //   " | Instance :",
        //   Tfolder instanceof TFolder
        // );

        // open it
        if (Tfolder && Tfolder instanceof TFolder) {
          // this.openAllFilesInFolder(Tfolder);
          // store.folderName.set(Tfolder.name);
          // await this.activateView();
          await this.openAllFilesInFolder(Tfolder);
        }
      });
    }
  }

  async createFileMenu() {
    this.registerEvent(
      this.app.workspace.on("file-menu", (menu, file, source, leaf) => {
        if (source === "link-context-menu") return;

        if (file instanceof TFolder) {
          // console.log("The value :", file.children);
          menu.addItem((item) => {
            item
              .setTitle("Open folder in Cards View")
              .setIcon(pluginIcon)
              .onClick(() => this.openAllFilesInFolder(file));
          });
        }
      })
    );
  }

  private registerCommands() {
    this.addCommand({
      id: "notes-explorer-plugin",
      name: "Open card view",
      callback: () => {
        this.activateView();
      },
    });
  }

  private registerPluginRibbonIcon() {
    this.addRibbonIcon(pluginIcon, "Notes Explorer", () => {
      this.activateView();
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
      // console.log(
      //   "setByFolderElement : contains 'nav-folder-title-content' | folderName :",
      //   folderName
      // );
      if (folderItemEl.parentElement) {
        folderElem = folderItemEl.parentElement;
        if (folderElem.attributes.getNamedItem("data-path")?.textContent)
          folderPath =
            folderElem.attributes.getNamedItem("data-path")?.textContent ?? "";
        // console.log("setByFolderElement : data-path : folderPth :", folderPath);
      }
    } else if (className.contains("nav-folder-title")) {
      folderPath =
        folderItemEl.attributes.getNamedItem("data-path")?.textContent ?? "";
      folderName = folderItemEl.lastElementChild?.getText() ?? "";
      // console.log(
      //   "setByFolderElement : contains 'nav-folder-title'\nfolderPath :",
      //   folderPath,
      //   "\nfolderName :",
      //   folderName
      // );
    }

    // fix the folder path
    if (folderPath.length > 0) {
      var slashLast = folderPath.lastIndexOf("/");
      var folderPathLast = folderPath.split("/").pop();
      if (folderPathLast != folderName) {
        folderPath = folderPath.substring(0, slashLast + 1) + folderName;
      }
    }

    // console.log(
    //   "setByFolderElement : Final values\nfolderPath :",
    //   folderPath,
    //   "\nfolderName :",
    //   folderName
    // );
    // set to mine
    return this.app.vault.getAbstractFileByPath(folderPath);
  }

  async openAllFilesInFolder(folder: TFolder) {
    if (folder instanceof TFolder) {
      let files: TFile[] = [];

      if (this.settings.showSubFolders) {
        // Helper function to recursively fetch files
        const collectFiles = (currentFolder: TFolder) => {
          currentFolder.children.forEach((child) => {
            if (child instanceof TFile && child.extension === "md") {
              files.push(child);
            } else if (child instanceof TFolder) {
              // console.log(
              //   "openAllFilesInFolder : This is subFolder :",
              //   child.name
              // );
              collectFiles(child); // Recursively process subfolder
            }
          });
        };

        collectFiles(folder);
      } else {
        // Only fetch files in the current folder
        files = folder.children.filter(
          (child): child is TFile =>
            child instanceof TFile && child.extension === "md"
        );
      }

      store.files.set(files);
      store.folderName.set(folder.name);
    }

    await this.activateView();
  }

  // async openTagInCardsView(tagName: string) {
  //   try {
  //     const files = await this.getFilesWithTag(tagName);
  //     await this.activateView();
  //     const leaves = this.app.workspace.getLeavesOfType(VIEW_TYPE);
  //     if (leaves.length > 0) {
  //       this.updateFiles(files, Sort.CreatedDesc);
  //     } else {
  //       new Notice("无法打开卡片视图");
  //     }
  //   } catch (error) {
  //     console.error("打开标签卡片视图时出错:", tagName, error);
  //     new Notice(`打开卡片视图时出错: ${this.getErrorMessage(error)}`);
  //   }
  // }

  // private async getFilesWithTag(tagName: string): Promise<TFile[]> {
  //   const files: TFile[] = [];
  //   for (const file of this.app.vault.getMarkdownFiles()) {
  //     const cache = this.app.metadataCache.getFileCache(file);
  //     if (cache?.tags?.some((tag) => tag.tag === `#${tagName}`)) {
  //       files.push(file);
  //     }
  //   }
  //   return files;
  // }

  // private updateFiles(file: TFolder, sortType: Sort = this.settings.defaultSort) {
  //   // store.files.set(files);
  //   store.folders.set([..., file]);
  //   store.displayedCount.set(50);
  //   store.sort.set(sortType);
  // }

  // private getErrorMessage(error: unknown): string {
  //   if (error instanceof Error) {
  //     return error.message;
  //   }
  //   return String(error);
  // }
}
