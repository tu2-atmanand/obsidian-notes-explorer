import { AbstractInputSuggest, App, TFile, TFolder } from "obsidian";

import { initialPlaceholderSuggestionsMap } from "src/utils/SearchQueryHelpers";

export class MultiSuggest extends AbstractInputSuggest<string> {
  content: Set<string>;

  constructor(
    private inputEl: HTMLInputElement,
    content: Set<string>,
    private onSelectCb: (value: string) => void,
    app: App
  ) {
    super(app, inputEl);
    this.content = content;
  }

  getSuggestions(inputStr: string): string[] {
    inputStr = inputStr
      .trim()
      .replace(/^file:|parent:|tag:/, "")
      .trim();
    // console.log("Input String: '", inputStr, "'");
    const lowerCaseInputStr = inputStr.toLocaleLowerCase();
    return [...this.content].filter((content) =>
      content.toLocaleLowerCase().includes(lowerCaseInputStr)
    );
  }

  renderSuggestion(content: string, el: HTMLElement): void {
    el.setText(content);
  }

  selectSuggestion(content: string, evt?: MouseEvent | KeyboardEvent): void {
    const oldSearchContent = this.inputEl.value;
    let finalSearchContent = content;
    if (oldSearchContent.trim() == "file:") {
      finalSearchContent = `file: ${content}`;
    } else if (oldSearchContent.trim() == "parent:") {
      finalSearchContent = `parent: ${content}`;
    } else if (oldSearchContent.trim() == "tag:") {
      finalSearchContent = `tag: ${content}`;
    } else if (
      oldSearchContent.trim() ===
      `file:${initialPlaceholderSuggestionsMap.get("file:")}`
    ) {
      finalSearchContent = `file: `;
    } else if (
      oldSearchContent.trim() ===
      `parent:${initialPlaceholderSuggestionsMap.get("parent:")}`
    ) {
      finalSearchContent = `parent: `;
    } else if (
      oldSearchContent.trim() ===
      `tag:${initialPlaceholderSuggestionsMap.get("tag:")}`
    ) {
      finalSearchContent = `tag: `;
    }
    this.inputEl.value = finalSearchContent;
    this.inputEl.blur();
    this.onSelectCb(content);
    this.inputEl.value = "";
    this.close();
  }

  destroy(): void {
	super.close();
  }
}

export function getFolderSuggestions(app: App): string[] {
  // const folders: string[] = [];
  // const stack: TFolder[] = [app.vault.getRoot()];

  // while (stack.length > 0) {
  // 	const currentFolder = stack.pop()!;
  // 	folders.push(currentFolder.path);

  // 	currentFolder.children
  // 		.filter((child): child is TFolder => child instanceof TFolder)
  // 		.forEach((childFolder) => stack.push(childFolder));
  // }

  // Pass only loaded folders
  const folders = app.vault
    .getAllLoadedFiles()
    .filter((f) => f instanceof TFolder && f.path !== "/")
    .map((f) => f.path);

  return folders;
}

export function getFileSuggestions(app: App): string[] {
  // Pass only loaded files
  const files = app.vault
    .getAllLoadedFiles()
    .filter((f) => f instanceof TFile && f.extension === "md")
    .map((f) => f.path);

  return files;
}

export function getTagSuggestions(app: App): string[] {
  // Get all tags from the vault
  const allTagsDict = app.metadataCache.getTags() || {};
  const tagsArray = Object.entries(allTagsDict)
    .filter(([tag]) => tag.startsWith("#"))
    .sort(([, countA], [, countB]) => countB - countA) // Sort by number of occurrences in descending order
    .map(([tag]) => tag); // Extract the tag names

  return tagsArray;
}

export function getQuickAddPluginChoices(
  app: App,
  quickAddPluginObj: any
): string[] {
  const quickAddPlugin = app.plugins.getPlugin("quickadd");
  if (!quickAddPlugin) return [];

  const choices = quickAddPluginObj.settings.choices;
  console.log("QuickAdd Choices:", quickAddPluginObj);
  return Object.keys(choices)
    .filter((key) => choices[key].type === "Capture")
    .map((key) => choices[key].name);
}
