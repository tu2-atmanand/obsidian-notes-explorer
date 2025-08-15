// /src/services/SearchFiltersSearchFiltersMultiSuggestoror.ts

import { AbstractInputSuggest, App, TFile, TFolder } from "obsidian";

import { get } from "svelte/store";
import { initialPlaceholderSuggestionsMap } from "src/utils/SearchQueryHelpers";
import { settings } from "src/store";

export class SearchFiltersMultiSuggestor extends AbstractInputSuggest<string> {
  content: Set<string>;
  private datePickerEl: HTMLInputElement | null;

  constructor(
    private inputEl: HTMLInputElement,
    content: Set<string>,
    private onSelectCb: (value: string) => void,
    app: App
  ) {
    super(app, inputEl);
    this.content = content;
    this.datePickerEl = null;
  }

  getSuggestions(inputStr: string): string[] {
    // console.log(
    //   "User has clicked inside the inputEl. getSuggestions called with inputStr:",
    //   inputStr === "" ? "empty string" : inputStr
    // );
    if (inputStr === "") {
      if (this.datePickerEl) {
        try {
          document.body.removeChild(this.datePickerEl); // Remove the date picker if it exists as soon as user starts typing in the input.
        } catch (error) {
          // console.error("Error removing date picker:", error);
        }
      }
      let initialPlaceholderSuggestions = [
        "divider:Filters",
        `file:${initialPlaceholderSuggestionsMap.get("file:")}`,
        `parent:${initialPlaceholderSuggestionsMap.get("parent:")}`,
        `tag:${initialPlaceholderSuggestionsMap.get("tag:")}`,
        `content:${initialPlaceholderSuggestionsMap.get("content:")}`,
        `created-before:${initialPlaceholderSuggestionsMap.get("created-before:")}`,
        `created-after:${initialPlaceholderSuggestionsMap.get("created-after:")}`,
        `modified-before:${initialPlaceholderSuggestionsMap.get("modified-before:")}`,
        `modified-after:${initialPlaceholderSuggestionsMap.get("modified-after:")}`,
        `["property": value]${initialPlaceholderSuggestionsMap.get(`["property": value]`)}`,
        `regex:${initialPlaceholderSuggestionsMap.get("regex:")}`,
        "divider:History",
      ];
      initialPlaceholderSuggestions = [
        ...initialPlaceholderSuggestions,
        ...get(settings).searchHistoryEntries,
      ];
      // this.inputEl.focus();
      // console.log(
      //   "Returning initial placeholder suggestions:",
      //   initialPlaceholderSuggestions
      // );
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
    } else if (inputStr.trim().startsWith("regex:")) {
      return [...this.content].filter(
        (regex) =>
          regex
            .toLocaleLowerCase()
            .includes(inputStr.toLocaleLowerCase().replace(/^regex:/, "")) &&
          regex.startsWith("regex:")
      );
    } else if (inputStr.trim() === "[]" || inputStr.trim().startsWith('["')) {
      return [...this.content].filter(
        (property) =>
          property.toLocaleLowerCase().includes(inputStr.toLocaleLowerCase()) &&
          property.startsWith(`["`)
      );
    } else {
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
      backgroundColor: "var(--titlebar-background)",
      padding: "2px 4px",
      marginRight: "4px",
      fontSize: `var(--nav-item-size)`,
      lineHeight: `var(--line-height-tight)`,
      fontWeight: `var(--nav-item-weight)`,
    };

    const contentStyle = {
      color: "var(--text-normal)",
      fontSize: `var(--nav-item-size)`,
      lineHeight: `var(--line-height-tight)`,
      fontWeight: `var(--nav-item-weight)`,
    };

    if (content.startsWith("divider:")) {
      const label = content.split(":")[1];
      const div = el.createDiv("suggestion-divider");
      div.setText(label.toUpperCase());
      div.style.fontWeight = "bold";
      div.style.borderBottom = "1px solid var(--background-modifier-border)";
      div.style.pointerEvents = "none";
    } else if (
      content.startsWith("file:") ||
      content.startsWith("tag:") ||
      content.startsWith("parent:") ||
      content.startsWith("content:") ||
      content.startsWith("regex:")
    ) {
      const label = content.split(":")[0];
      const span = el.createSpan({ text: label });
      Object.assign(span.style, labelStyle);
      const restContent = content.slice(label.length + 1); // Get the rest of the content after the label
      const contentSpan = el.createSpan({ text: restContent });
      Object.assign(contentSpan.style, contentStyle);
    } else if (
      content.startsWith("created-before:") ||
      content.startsWith("created-after:") ||
      content.startsWith("modified-before:") ||
      content.startsWith("modified-after:")
    ) {
      const label = content.split(":")[0];
      const span = el.createSpan({ text: label });
      Object.assign(span.style, labelStyle);
      const restContent = content.slice(label.length + 1); // Get the rest of the content after the label
      const contentSpan = el.createSpan({ text: restContent });
      Object.assign(contentSpan.style, contentStyle);
    } else if (content.startsWith(`["property": value]`)) {
      const label = content.split("]")[0];
      const span = el.createSpan({ text: label });
      Object.assign(span.style, labelStyle);
      const restContent = content.slice(label.length + 1); // Get the rest of the content after the label
      const contentSpan = el.createSpan({ text: restContent });
      Object.assign(contentSpan.style, contentStyle);
    } else {
      const contentSpan = el.createSpan({ text: content });
      Object.assign(contentSpan.style, contentStyle);
    }
  }

  selectSuggestion(content: string, evt?: MouseEvent | KeyboardEvent): void {
    // If the user presses enter, we close the suggester
    if (evt?.type === "keydown") {
      this.close();
      return;
    }
    if (this.datePickerEl) {
      try {
        document.body.removeChild(this.datePickerEl); // Remove the date picker if it exists as soon as user starts typing in the input.
      } catch (error) {
        // console.error("Error removing date picker:", error);
      }
    }

    // const oldSearchContent = this.inputEl.value;
    let finalSearchContent = content;
    // console.log(
    //   "selectSuggestion called with content:",
    //   content,
    //   "\nOld search content:",
    //   oldSearchContent,
    //   '\nfinalSearchContent.startsWith([") =',
    //   finalSearchContent.startsWith(`["`)
    // );

    if (
      content.trim() === `file:${initialPlaceholderSuggestionsMap.get("file:")}`
    ) {
      finalSearchContent = `file: `;
      this.inputEl.value = finalSearchContent;
      this.close();
      this.inputEl.blur();
      // this.getSuggestions(finalSearchContent);
      this.inputEl.focus();
    } else if (
      content.trim() ===
      `parent:${initialPlaceholderSuggestionsMap.get("parent:")}`
    ) {
      finalSearchContent = `parent: `;
      this.inputEl.value = finalSearchContent;
      this.close();
      this.inputEl.blur();
      // this.getSuggestions(finalSearchContent);
      this.inputEl.focus();
    } else if (
      content.trim() === `tag:${initialPlaceholderSuggestionsMap.get("tag:")}`
    ) {
      finalSearchContent = `tag: `;
      this.inputEl.value = finalSearchContent;
      this.close();
      this.inputEl.blur();
      // this.getSuggestions(finalSearchContent);
      this.inputEl.focus();
    } else if (
      content.trim() ===
      `content:${initialPlaceholderSuggestionsMap.get("content:")}`
    ) {
      finalSearchContent = `content: `;
      this.inputEl.value = finalSearchContent;
      this.close();
      this.inputEl.blur();
      // this.getSuggestions(finalSearchContent);
      this.inputEl.focus();
    } else if (
      content.trim() ===
      `regex:${initialPlaceholderSuggestionsMap.get("regex:")}`
    ) {
      finalSearchContent = `regex: //`;
      this.inputEl.value = finalSearchContent;
      this.close();
      this.inputEl.blur();
      // this.getSuggestions(finalSearchContent);
      this.inputEl.focus();
    } else if (
      content.trim() ===
      `created-before:${initialPlaceholderSuggestionsMap.get("created-before:")}`
    ) {
      finalSearchContent = `created-before: `;
      this.inputEl.value = finalSearchContent;
      this.close();

      this.getDatePickerSuggestions(finalSearchContent, this.inputEl).then(
        (datePickerValue) => {
          // console.log("Date picker value:", datePickerValue);
          this.inputEl.value = datePickerValue || finalSearchContent;
          // this.onSelectCb(datePickerValue || finalSearchContent);
          this.close();
        }
      );
    } else if (
      content.trim() ===
      `created-after:${initialPlaceholderSuggestionsMap.get("created-after:")}`
    ) {
      finalSearchContent = `created-after: `;
      this.inputEl.value = finalSearchContent;
      this.close();

      this.getDatePickerSuggestions(finalSearchContent, this.inputEl).then(
        (datePickerValue) => {
          // console.log("Date picker value:", datePickerValue);
          this.inputEl.value = datePickerValue || finalSearchContent;
          // this.onSelectCb(datePickerValue || finalSearchContent);
          this.close();
        }
      );
    } else if (
      content.trim() ===
      `modified-before:${initialPlaceholderSuggestionsMap.get("modified-before:")}`
    ) {
      finalSearchContent = `modified-before: `;
      this.inputEl.value = finalSearchContent;
      this.close();
      this.getDatePickerSuggestions(finalSearchContent, this.inputEl).then(
        (datePickerValue) => {
          // console.log("Date picker value:", datePickerValue);
          this.inputEl.value = datePickerValue || finalSearchContent;
          // this.onSelectCb(datePickerValue || finalSearchContent);
          this.close();
        }
      );
    } else if (
      content.trim() ===
      `modified-after:${initialPlaceholderSuggestionsMap.get("modified-after:")}`
    ) {
      finalSearchContent = `modified-after: `;
      this.inputEl.value = finalSearchContent;
      this.close();
      this.getDatePickerSuggestions(finalSearchContent, this.inputEl).then(
        (datePickerValue) => {
          // console.log("Date picker value:", datePickerValue);
          this.inputEl.value = datePickerValue || finalSearchContent;
          // this.onSelectCb(datePickerValue || finalSearchContent);
          this.close();
        }
      );
    } else if (
      content.trim() ===
      `["property": value]${initialPlaceholderSuggestionsMap.get(`["property": value]`)}`
    ) {
      finalSearchContent = `["`;
      this.inputEl.value = finalSearchContent;
      this.close();
      this.inputEl.blur();
      // this.getSuggestions(finalSearchContent);
      this.inputEl.focus();
    } else if (content.startsWith("divider:")) {
      // Do nothing for divider suggestions
      return;
    } else {
      if (
        content.startsWith("file:") ||
        content.startsWith("parent:") ||
        content.startsWith("tag:") ||
        content.startsWith("content:") ||
        content.startsWith("created-before:") ||
        content.startsWith("created-after:") ||
        content.startsWith("modified-before:") ||
        content.startsWith("modified-after:") ||
        content.startsWith("regex:")
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

  getDatePickerSuggestions(
    content: string,
    targetEl?: HTMLElement
  ): Promise<string> {
    // console.log("Opening date picker for:", content);

    return new Promise((resolve) => {
      this.datePickerEl = document.createElement("input");
      this.datePickerEl.type = "date";
      this.datePickerEl.style.position = "absolute";
      this.datePickerEl.style.zIndex = "9999"; // ensure on top
      // this.datePickerEl.style.opacity = "0"; // optional if you only want native popup
      // this.datePickerEl.style.pointerEvents = "none"; // prevent interaction with the hidden element
      // this.datePickerEl.style.visibility = "hidden"; // So it doesn't break layout

      // Position near the input element
      if (targetEl) {
        const rect = targetEl.getBoundingClientRect();
        this.datePickerEl.style.left = `${rect.left}px`;
        this.datePickerEl.style.top = `${rect.bottom}px`;
      }

      document.body.appendChild(this.datePickerEl);

      // Trigger the native date picker
      this.datePickerEl.click();

      this.datePickerEl.onchange = () => {
        if (this.datePickerEl) {
          const selectedDate = this.datePickerEl.value;
          document.body.removeChild(this.datePickerEl);

          if (selectedDate) {
            const finalValue = `${content.split(":")[0]}: ${selectedDate}`;
            // console.log("Selected date:", finalValue);
            resolve(finalValue);
          } else {
            resolve(content); // fallback if user cancels
          }
        }
      };
    });
  }

  destroy(): void {
    super.close();
  }
}

// export function getDatePickerSuggestions(
//   content: string,
//   targetEl?: HTMLElement
// ): Promise<string> {
//   console.log("Opening date picker for:", content);

//   return new Promise((resolve) => {
//     const dateInput = document.createElement("input");
//     dateInput.type = "date";
//     dateInput.style.position = "absolute";
//     dateInput.style.zIndex = "9999"; // ensure on top
//     // dateInput.style.opacity = "0"; // optional if you only want native popup
//     // dateInput.style.pointerEvents = "none"; // prevent interaction with the hidden element
//     // dateInput.style.visibility = "hidden"; // So it doesn't break layout

//     // Position near the input element
//     if (targetEl) {
//       const rect = targetEl.getBoundingClientRect();
//       dateInput.style.left = `${rect.left}px`;
//       dateInput.style.top = `${rect.bottom}px`;
//     }

//     document.body.appendChild(dateInput);

//     // Trigger the native date picker
//     dateInput.click();

//     dateInput.onchange = () => {
//       const selectedDate = dateInput.value;
//       document.body.removeChild(dateInput);

//       if (selectedDate) {
//         const finalValue = `${content.split(":")[0]}: ${selectedDate}`;
//         console.log("Selected date:", finalValue);
//         // document.body.removeChild(dateInput);
//         resolve(finalValue);
//       } else {
//         // document.body.removeChild(dateInput);
//         resolve(content); // fallback if user cancels
//       }
//     };
//   });
// }

export function getFolderSuggestions(app: App): string[] {
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

export function getYAMLPropertySuggestions(app: App): string[] {
  // Get all YAML properties from the vault
  const allFiles = app.vault
    .getAllLoadedFiles()
    .filter((f) => f instanceof TFile && f.extension === "md");
  const yamlPropertiesSet = new Set<string>();

  allFiles.forEach((file) => {
    if (file instanceof TFile) {
      const metadata = app.metadataCache.getFileCache(file);
      if (metadata && metadata.frontmatter) {
        // console.log("Frontmatter:", metadata.frontmatter, "\nFile:", file.path);
        Object.keys(metadata.frontmatter).forEach((key) => {
          const value = metadata.frontmatter ? metadata.frontmatter[key] : null;
          if (Array.isArray(value)) {
            value.forEach((val) => {
              yamlPropertiesSet.add(`["${key}": ${val}]`);
            });
          } else {
            yamlPropertiesSet.add(`["${key}": ${value}]`);
          }
        });
      }
    }
  });

  return Array.from(yamlPropertiesSet);
}
