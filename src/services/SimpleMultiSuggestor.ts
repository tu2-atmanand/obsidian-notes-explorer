import { AbstractInputSuggest, App, TFile, TFolder } from "obsidian";

export class SimpleMultiSuggestor extends AbstractInputSuggest<string> {
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
    const lowerCaseInputStr = inputStr.toLocaleLowerCase();
    return [...this.content].filter((content) =>
      content.toLocaleLowerCase().includes(lowerCaseInputStr)
    );
  }

  renderSuggestion(content: string, el: HTMLElement): void {
    el.setText(content);
  }

  selectSuggestion(content: string, evt: MouseEvent | KeyboardEvent): void {
    this.onSelectCb(content);
    this.inputEl.value = content; // Set the input value to the selected suggestion
    this.inputEl.blur();
    this.close();
  }
}

export function getSimpleFolderSuggestions(app: App): string[] {
  // Pass only loaded folders
  const folders = app.vault
    .getAllLoadedFiles()
    .filter((f) => f instanceof TFolder && f.path !== "/")
    .map((f) => f.path);

  return folders;
}

export function getSimpleFileSuggestions(app: App): string[] {
  // Pass only loaded files
  const files = app.vault
    .getAllLoadedFiles()
    .filter((f) => f instanceof TFile && f.extension === "md")
    .map((f) => f.path);

  return files;
}

export function getSimpleTagSuggestions(app: App): string[] {
  // Get all tags from the vault
  const allTagsDict = app.metadataCache.getTags() || {};
  const tagsArray = Object.entries(allTagsDict)
    .filter(([tag]) => tag.startsWith("#"))
    .sort(([, countA], [, countB]) => countB - countA) // Sort by number of occurrences in descending order
    .map(([tag]) => tag); // Extract the tag names

  return tagsArray;
}
