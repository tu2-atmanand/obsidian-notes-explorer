import store, { settings } from "src/store";

import { get } from "svelte/store";

export const initialPlaceholderSuggestionsMap = new Map<string, string>([
  ["file:", " - Search for a particular note"],
  ["parent:", " - Filter files by parent folder"],
  ["tag:", " - Filter files by tag"],
  ["content:", " - Filter files by content"],
  ["created-before:", " - Notes created before a specific date"],
  ["created-after:", " - Notes created after a specific date"],
  ["modified-before:", " - Notes modified before a specific date"],
  ["modified-after:", " - Notes modified after a specific date"],
  [
    `["property": value]`,
    ` - Filter notes with YAML frontmatter. Eg. ["author": John Doe], ["date": BEFORE 2023-01-01], ["amount": > 100`,
  ],
]);

export function addToSearchHistory(entry: string) {
  const updatedSetting = get(settings);
  const index = updatedSetting.searchHistoryEntries.indexOf(entry);
  if (index !== -1) {
    // Remove the existing entry
    updatedSetting.searchHistoryEntries.splice(index, 1);
  }
  // Add the new entry at the top
  updatedSetting.searchHistoryEntries.unshift(entry);

  store.settings.set(updatedSetting); // TODO : As an optimization you can store the history inside local storage and only save it to the disk once in a day or when first time the application start, maybe after few seconds.
}
