import { AbstractInputSuggest, App, TFile, TFolder } from "obsidian";

import { get } from "svelte/store";
import { initialPlaceholderSuggestionsMap } from "src/utils/SearchQueryHelpers";
import { searchHistoryEntries } from "src/components/store";

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
    if (inputStr === "") {
      let initialPlaceholderSuggestions = [
        `file:${initialPlaceholderSuggestionsMap.get("file:")}`,
        `parent:${initialPlaceholderSuggestionsMap.get("parent:")}`,
        `tag:${initialPlaceholderSuggestionsMap.get("tag:")}`,
      ];
      initialPlaceholderSuggestions = [
        ...initialPlaceholderSuggestions,
        ...get(searchHistoryEntries),
      ];
      return initialPlaceholderSuggestions;
    } else if (inputStr.trim().startsWith("file:")) {
      return [...this.content].filter((file) =>
        file.toLocaleLowerCase().includes(inputStr.toLocaleLowerCase())
      );
    } else if (inputStr.trim().startsWith("parent:")) {
      return [...this.content].filter((folder) =>
        folder.toLocaleLowerCase().includes(inputStr.toLocaleLowerCase())
      );
    } else if (inputStr.trim().startsWith("tag:")) {
      return [...this.content].filter((tag) =>
        tag.toLocaleLowerCase().includes(inputStr.toLocaleLowerCase())
      );
    } else {
      // TODO : Actually here if the user is simply searching somthing, that means I hae to check it with the content of all the notes and additionally it cann be this filters. But on pressing enter there wont be any suggestions for simple content search, suggestions should be only for the special filters which starts with the predefined labels.
      //   const lowerCaseInputStr = inputStr.toLocaleLowerCase();
      //   return [...this.content].filter((content) =>
      //     content.toLocaleLowerCase().includes(lowerCaseInputStr)
      //   );
      return [];
    }
  }

  renderSuggestion(content: string, el: HTMLElement): void {
    el.setText(content);
  }

  selectSuggestion(content: string, evt?: MouseEvent | KeyboardEvent): void {
    const oldSearchContent = this.inputEl.value;
    const selectFlag = false;
    let finalSearchContent = content;
    console.log(
      "selectSuggestion called with content:",
      content,
      "\nOld search content:",
      oldSearchContent
    );
    if (oldSearchContent.trim().startsWith("file:")) {
      //   finalSearchContent = `file: ${content}`;
      this.inputEl.blur();
      this.onSelectCb(content);
      this.inputEl.value = "";
      this.close();
    } else if (oldSearchContent.trim().startsWith("parent:")) {
      //   finalSearchContent = `parent: ${content}`;
      this.inputEl.blur();
      this.onSelectCb(content);
      this.inputEl.value = "";
      this.close();
    } else if (oldSearchContent.trim().startsWith("tag:")) {
      //   finalSearchContent = `tag: ${content}`;
      this.inputEl.blur();
      this.onSelectCb(content);
      this.inputEl.value = "";
      this.close();
    } else if (
      content.trim() === `file:${initialPlaceholderSuggestionsMap.get("file:")}`
    ) {
      finalSearchContent = `file: `;
      this.inputEl.value = finalSearchContent;
      this.close();
      this.getSuggestions(finalSearchContent);
    } else if (
      content.trim() ===
      `parent:${initialPlaceholderSuggestionsMap.get("parent:")}`
    ) {
      finalSearchContent = `parent: `;
      this.inputEl.value = finalSearchContent;
      this.close();
      this.getSuggestions(finalSearchContent);
    } else if (
      content.trim() === `tag:${initialPlaceholderSuggestionsMap.get("tag:")}`
    ) {
      finalSearchContent = `tag: `;
      this.inputEl.value = finalSearchContent;
      this.close();
      this.getSuggestions(finalSearchContent);
    } else {
    }
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
    .map((f) => `parent: ${f.path}`);

  return folders;
}

export function getFileSuggestions(app: App): string[] {
  // Pass only loaded files
  const files = app.vault
    .getAllLoadedFiles()
    .filter((f) => f instanceof TFile && f.extension === "md")
    .map((f) => `file: ${f.path}`);

  return files;
}

export function getTagSuggestions(app: App): string[] {
  // Get all tags from the vault
  const allTagsDict = app.metadataCache.getTags() || {};
  const tagsArray = Object.entries(allTagsDict)
    .filter(([tag]) => tag.startsWith("#"))
    .sort(([, countA], [, countB]) => countB - countA) // Sort by number of occurrences in descending order
    .map(([tag]) => `tag: ${tag}`); // Extract the tag names

  return tagsArray;
}
