import {
  Plugin,
  TFile,
  TFolder,
  WorkspaceLeaf,
  type ObsidianProtocolData,
} from "obsidian";

import {
  type NotesExplorerSettings,
  NotesExplorerSettingsTab,
  DEFAULT_SETTINGS,
} from "./src/settings";
import { NotesExplorerView, PLUGIN_VIEW_TYPE } from "./src/view";
import store, { settings } from "./src/components/store";
import "./styles.css";
import { pluginIcon } from "src/icons";
import { get } from "svelte/store";

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

      this.registerObsidianURIHandler();

      this.registerView(
        PLUGIN_VIEW_TYPE,
        (leaf) => new NotesExplorerView(this, this.settings, leaf)
      );

      if (this.settings.launchOnStart) {
        this.activateView("main");
      }
    });
  }

  onunload() {
    console.log("Notes Explorer : Unloading plugin ...");
  }

  async saveSettings() {
    await this.saveData(this.settings);
  }

  async activateView(layout: string) {
    const { workspace } = this.app;

    let leaf: WorkspaceLeaf;
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
        const Tfolder = this.setByFolderElement(elemTarget);

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
              .setTitle("Open folder in notes explorer")
              .setIcon(pluginIcon)
              .onClick(() => this.openAllFilesInFolder(file));
          });
        }
      })
    );
  }

  private async registerCommands() {
    this.addCommand({
      id: "view-in-main-window",
      name: "Open in main window",
      callback: () => {
        this.activateView("main");
      },
    });
  }

  private async registerPluginRibbonIcon() {
    this.addRibbonIcon(pluginIcon, "Notes explorer", () => {
      this.activateView("main");
    });
  }

  // set by folder element
  private setByFolderElement(folderItemEl: Element) {
    let folderPath = "";
    let folderName = "";

    const className = folderItemEl.className.toString();
    let folderElem = folderItemEl;
    if (className.contains("nav-folder-title-content")) {
      folderName = folderElem.getText();
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
    }

    // fix the folder path
    if (folderPath.length > 0) {
      const slashLast = folderPath.lastIndexOf("/");
      const folderPathLast = folderPath.split("/").pop();
      if (folderPathLast != folderName) {
        folderPath = folderPath.substring(0, slashLast + 1) + folderName;
      }
    }

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

    await this.activateView("main");
  }

  /**
   * Handles obsidian://fs protocol for search functionality
   *
   * @param layout - Where to open search:
   *   - "tab" (default) - Opens in new tab
   *   - "split" - Opens in split pane
   *   - "window" - Opens in new window
   *   - "modal" - Opens in modal popup
   * @param args - Additional parameters for search and filtering, passed as a JSON object
   *
   * Examples:
   * - obsidian://fs?query=hello&layout=modal
   * - obsidian://fs?query=world&layout=tab
   * - obsidian://fs?query=test (defaults to tab view)
   */
  private registerObsidianURIHandler() {
    this.registerObsidianProtocolHandler(
      "notes-explorer",
      async (path: ObsidianProtocolData) => {
        const args = JSON.parse(path.args) || "";
        const layout = args.layout || "modal";
        console.log("Path from Obsidian URI:", args);
        store.searchFilters.set(args);

        // Method 1 = Joes Approach
        // const params = new URLSearchParams({
        //   layout: "window",
        //   parent: "/Research this/Notes Explorer",
        //   tag1: "#sport/football",
        //   tag2: "#game",
        // });
        // const finalURI = `obsidian://notes-explorer?${params.toString()}`;
        // console.log("This is encoded URI : ", finalURI);

        // Method 2 = Encoding and Decoding as Json Object
        // const data = {
        //   layout: "None",
        //   parent: "/Research this😁/Notes Explorer",
        //   tag1: "#sport/football",
        //   tag2: "#game🐗",
        //   createdBefore: "2023-10-01",
        //   "property 1": 10,
        // };
        // console.log("Data to encode:", data);
        // const encodedArgs = encodeURIComponent(JSON.stringify(data));
        // const finalURI = `obsidian://notes-explorer?args=${encodedArgs}`;
        // console.log("This is encoded URI : ", finalURI);

        // const docodedArgs = decodeURIComponent(
        //   finalURI.split("args=")[1] || ""
        // );
        // console.log("Decoded args from URI: ", JSON.stringify(docodedArgs));

        if (layout === "modal") {
          // TODO : Implement the function to open Notes Explorer view inside a modal.
        } else {
          const { workspace } = this.app;
          let leaf: WorkspaceLeaf | null = null;

          if (layout === "tab") {
            leaf = workspace.getLeaf("tab");
          } else if (layout === "split") {
            leaf = workspace.getLeaf("split");
          } else if (layout === "window") {
            leaf = workspace.getLeaf("window");
            console.log("Opening in a new window...");
          } else {
            new Notice(
              "Unsupported view type passed in the Obsidian URI: " + layout
            );
          }

          if (leaf && ["tab", "split", "window"].includes(layout)) {
            await leaf.setViewState({ type: PLUGIN_VIEW_TYPE, active: true });
            store.viewIsVisible.set(true);
          }
        }
      }
    );
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
