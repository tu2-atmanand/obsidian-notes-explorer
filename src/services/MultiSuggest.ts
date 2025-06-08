// /src/services/MultiSuggest.ts

import {
  AbstractInputSuggest,
  App,
  TFile,
  TFolder,
  sanitizeHTMLToDom,
} from "obsidian";

import { get } from "svelte/store";
import { initialPlaceholderSuggestionsMap } from "src/utils/SearchQueryHelpers";
import { settings } from "src/components/store";

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
    console.log(this);
  }

  getSuggestions(inputStr: string): string[] {
    if (inputStr === "") {
      let initialPlaceholderSuggestions = [
        "divider:Filters",
        `file:${initialPlaceholderSuggestionsMap.get("file:")}`,
        `parent:${initialPlaceholderSuggestionsMap.get("parent:")}`,
        `tag:${initialPlaceholderSuggestionsMap.get("tag:")}`,
        "divider:History",
      ];
      initialPlaceholderSuggestions = [
        ...initialPlaceholderSuggestions,
        ...get(settings).searchHistoryEntries,
      ];
      //   const tempHTMLElement = createEl("div", {cls: "suggesterOptionRow"});
      //   this.renderSuggestion("History", this.inputEl);
      return initialPlaceholderSuggestions;
    } else if (inputStr.trim().startsWith("file:")) {
      return [...this.content].filter(
        (file) =>
          file.toLocaleLowerCase().includes(inputStr.toLocaleLowerCase()) &&
          file.startsWith("file:")
      );
    } else if (inputStr.trim().startsWith("parent:")) {
      return [...this.content].filter(
        (folder) =>
          folder.toLocaleLowerCase().includes(inputStr.toLocaleLowerCase()) &&
          folder.startsWith("parent:")
      );
    } else if (inputStr.trim().startsWith("tag:")) {
      return [...this.content].filter(
        (tag) =>
          tag
            .toLocaleLowerCase()
            .includes(inputStr.toLocaleLowerCase().replace(/^tag: /, "")) &&
          tag.startsWith("tag:")
      );
    } else {
      // TODO : Actually here if the user is simply searching somthing, that means I hae to check it with the content of all the notes and additionally it cann be this filters. But on pressing enter there wont be any suggestions for simple content search, suggestions should be only for the special filters which starts with the predefined labels.
      return [...this.content, ...get(settings).searchHistoryEntries].filter(
        (content) =>
          content.toLocaleLowerCase().includes(inputStr.toLocaleLowerCase())
      );
    }
  }

  renderSuggestion(content: string, el: HTMLElement): void {
    const labelStyle = {
      border: "1px solid var(--background-modifier-border)",
      borderRadius: "4px",
      color: "var(--text-muted)",
      backgroundColor: "var(--background-modifier-accent)",
      padding: "2px 4px",
      marginRight: "4px",
    };

    if (content.startsWith("divider:")) {
      const label = content.split(":")[1];
      const div = el.createDiv("suggestion-divider");
      div.setText(label.toUpperCase());
      div.style.fontWeight = "bold";
      div.style.borderBottom = "1px solid var(--background-modifier-border)";
    } else if (
      content.startsWith("file:") ||
      content.startsWith("tag:") ||
      content.startsWith("parent:")
    ) {
      const label = content.split(":")[0];
      const span = el.createSpan({ text: label });
      Object.assign(span.style, labelStyle);
      const restContent = content.slice(label.length + 1); // Get the rest of the content after the label
      el.createSpan({ text: restContent });
    } else {
      el.createSpan({ text: content });
    }
  }

  selectSuggestion(content: string, evt?: MouseEvent | KeyboardEvent): void {
    // If the user presses enter, we close the suggester
    if (evt?.type === "keydown") this.close();

    const oldSearchContent = this.inputEl.value;
    let finalSearchContent = content;
    console.log(
      "selectSuggestion called with content:",
      content,
      "\nOld search content:",
      oldSearchContent
    );

    if (
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
      if (
        content.startsWith("file:") ||
        content.startsWith("parent:") ||
        content.startsWith("tag:")
      ) {
        this.inputEl.blur();
        this.onSelectCb(content);
        this.inputEl.value = "";
        this.close();
      } else {
        this.inputEl.value = content;
        this.close();
      }
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
