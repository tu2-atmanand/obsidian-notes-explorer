import store, { settings } from "src/components/store";

import { get } from "svelte/store";

export const initialPlaceholderSuggestionsMap = new Map<string, string>([
  ["file:", " - Use this filter to search for a particular note"],
  ["parent:", " - Use this to filter files by parent folder"],
  ["tag:", " - Use this to filter files by tag"],
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

    store.settings.set(updatedSetting);
}