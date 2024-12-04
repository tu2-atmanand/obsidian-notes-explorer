// ./src/components/store.ts

import {
  type App,
  type CachedMetadata,
  getAllTags,
  ItemView,
  MetadataCache,
  prepareFuzzySearch,
  TFile,
  getFrontMatterInfo,
  TAbstractFile,
} from "obsidian";
import { derived, get, readable, writable } from "svelte/store";
import { Sort, type CardsViewSettings } from "../settings";
import CardsViewPlugin from "main";

export const pluginIcon = "align-start-horizontal";

export const plugin = writable<CardsViewPlugin>();
export const app = writable<App>();
export const view = writable<ItemView>();
export const settings = writable<CardsViewSettings>();
export const appCache = writable<MetadataCache>();
export const files = writable<TFile[]>([]);
export const folderName = writable<string>("");
export const viewIsVisible = writable(false);
export const skipNextTransition = writable(true);
export const refreshSignal = writable<boolean>(false);
export const refreshOnResize = writable<boolean>(false);

export const sort = writable<Sort>();

export const allAllowedFiles = derived(
  [settings, refreshSignal],
  ([$settings, $refreshSignal]) => {
    console.log(
      "allAllowedFiles : Setting or Refresh signal, reading all files again.\nThis function should NOT run on resizing events",
    );
    const allFiles = get(app).vault.getMarkdownFiles();
    const filteredFiles = allFiles.filter((file) => {
      return !$settings.excludedFolders.some(
        (excludeFolder) => file.path.startsWith(excludeFolder), // TODO : I know I am going to get error here and the fix is, I have to march whether file.parentFolderName is there in excludeFolder or not.
      );
    });
    return filteredFiles;
  },
);

// export const sortedFiles = derived(
//   [sort, files, settings],
//   ([$sort, $files, $settings]) =>
//     [...$files]
//       .filter((file: TFile) => !file.path.endsWith(".excalidraw.md"))
//       .sort(
//         (a: TFile, b: TFile) =>
//           ($settings.pinnedFiles.includes(b.path) ? 1 : 0) -
//             ($settings.pinnedFiles.includes(a.path) ? 1 : 0) ||
//           b.stat[$sort] - a.stat[$sort],
//       ),
//   [] as TFile[],
// );

export const sortedFiles = derived([sort, files], ([$sort, $files]) =>
  [...$files]
    .filter((file: TFile) => !file.path.endsWith(".excalidraw.md"))
    .sort((a: TFile, b: TFile) => {
      switch ($sort) {
        case Sort.NameAsc:
          return (
            (get(settings).pinnedFiles.includes(b.path) ? 1 : 0) -
              (get(settings).pinnedFiles.includes(a.path) ? 1 : 0) ||
            a.basename.localeCompare(b.basename)
          );
        case Sort.NameDesc:
          return (
            (get(settings).pinnedFiles.includes(b.path) ? 1 : 0) -
              (get(settings).pinnedFiles.includes(a.path) ? 1 : 0) ||
            b.basename.localeCompare(a.basename)
          );
        case Sort.EditedDesc:
          return (
            (get(settings).pinnedFiles.includes(b.path) ? 1 : 0) -
              (get(settings).pinnedFiles.includes(a.path) ? 1 : 0) ||
            b.stat.mtime - a.stat.mtime
          );
        case Sort.EditedAsc:
          return (
            (get(settings).pinnedFiles.includes(b.path) ? 1 : 0) -
              (get(settings).pinnedFiles.includes(a.path) ? 1 : 0) ||
            a.stat.mtime - b.stat.mtime
          );
        case Sort.CreatedDesc:
          return (
            (get(settings).pinnedFiles.includes(b.path) ? 1 : 0) -
              (get(settings).pinnedFiles.includes(a.path) ? 1 : 0) ||
            b.stat.ctime - a.stat.ctime
          );
        case Sort.CreatedAsc:
          return (
            (get(settings).pinnedFiles.includes(b.path) ? 1 : 0) -
              (get(settings).pinnedFiles.includes(a.path) ? 1 : 0) ||
            a.stat.ctime - b.stat.ctime
          );
        default:
          return 0;
      }
    }),
);

export const searchQuery = writable<string>("");
export const preparedSearch = derived(searchQuery, ($searchQuery) =>
  $searchQuery ? prepareFuzzySearch($searchQuery) : null,
);

export const searchResultFiles = derived(
  [preparedSearch, sortedFiles, appCache],
  ([$preparedSearch, $sortedFiles, $appCache], set) => {
    if ($preparedSearch == null) {
      set($sortedFiles);
      return;
    }

    Promise.all(
      $sortedFiles.map(async (file) => {
        const content = await file.vault.cachedRead(file);
        const tags =
          getAllTags($appCache.getFileCache(file) as CachedMetadata) || [];
        return [
          $preparedSearch(content),
          $preparedSearch(file.name),
          $preparedSearch(`#${tags.join(" #")}`),
        ];
      }),
    ).then((searchResults) => {
      set(
        $sortedFiles.filter((file, index) => {
          const [contentMatch, nameMatch, tagsMatch] = searchResults[index];

          return (
            (contentMatch && contentMatch.score > -2) ||
            (nameMatch && nameMatch.score > -2) ||
            (tagsMatch && tagsMatch.score > -2)
          );
        }),
      );
    });
  },
  get(sortedFiles),
);

// Helper function to determine if a file is empty
const isEmptyFile = async (file: TFile) => {
  const content = await file.vault.cachedRead(file);
  const frontMatter = getFrontMatterInfo(content).exists
    ? getFrontMatterInfo(content).frontmatter
    : "";
  return content.replace(`---\n${frontMatter}\n---`, "").trim().length === 0;
};

// Async filter for non-empty files
const createFilteredFiles = () =>
  readable<TFile[]>([], (set) => {
    const unsubscribe = sortedFiles.subscribe(async ($sortedFiles) => {
      const $settings = get(settings);
      const nonEmptyFiles = [];
      for (const file of $sortedFiles) {
        const emptiness = await isEmptyFile(file);
        if ($settings.showEmptyNotes || !emptiness) {
          nonEmptyFiles.push(file);
        }
      }
      set(nonEmptyFiles);
    });
    return unsubscribe;
  });

export const filteredFiles = createFilteredFiles();

export const displayedCount = writable(50);

export const displayedFiles = derived(
  [filteredFiles, searchResultFiles, displayedCount, searchQuery],
  ([$filteredFiles, $searchResultFiles, $displayedCount, $searchQuery]) => {
    const filesToDisplay = $searchQuery ? $searchResultFiles : $filteredFiles;
    return filesToDisplay.slice(0, $displayedCount);
  },
);

// displayedCount.subscribe((count) => console.log("Displayed Count:", count));
// displayedFiles.subscribe((files) => console.log("Displayed Files:", files));

export const tags = derived(
  [displayedFiles, appCache],
  ([$displayedFiles, $appCache]) => {
    const tags = $displayedFiles
      .map(
        (file) =>
          getAllTags($appCache.getFileCache(file) as CachedMetadata) || [],
      )
      .flat();

    const tagCounts = tags.reduce(
      (acc, tag) => {
        acc[tag] = (acc[tag] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>,
    );

    return Object.keys(tagCounts).sort((a, b) => tagCounts[b] - tagCounts[a]);
  },
);

export default {
  plugin,
  files,
  allAllowedFiles,
  folderName,
  sort,
  searchQuery,
  searchResultFiles,
  displayedCount,
  displayedFiles,
  filteredFiles,
  viewIsVisible,
  skipNextTransition,
  refreshSignal,
  refreshOnResize,
  tags,
  app,
  view,
  settings,
  appCache,
};
