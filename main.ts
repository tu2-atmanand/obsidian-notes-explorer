import { Plugin, WorkspaceLeaf } from "obsidian";

import {
  type CardsViewSettings,
  CardsViewSettingsTab,
  DEFAULT_SETTINGS,
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
    store.app.set(this.app);
    store.settings.set(this.settings);
    store.appCache.set(this.app.metadataCache);
    this.registerEvent(
      this.app.metadataCache.on("resolved", async () =>
        store.appCache.update(() => this.app.metadataCache),
      ),
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
      (leaf) => new CardsViewPluginView(this.settings, leaf),
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

  async saveSettings() {
    await this.saveData(this.settings);
  }
}
