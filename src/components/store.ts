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
  TFolder,
} from "obsidian";
import { derived, get, readable, writable } from "svelte/store";
import { Sort, type NotesExplorerSettings } from "../settings";
import NotesExplorerPlugin from "main";

export const plugin = writable<NotesExplorerPlugin>();
export const app = writable<App>();
export const view = writable<ItemView>();
export const settings = writable<NotesExplorerSettings>();
export const appCache = writable<MetadataCache>();
export const files = writable<TFile[]>([]);
export const folderName = writable<string>("");
export const viewIsVisible = writable(false);
export const skipNextTransition = writable(true);
export const refreshSignal = writable<boolean>(false);
export const refreshOnResize = writable<boolean>(false);

export const sort = writable<Sort>();

// export const allAllowedFiles = derived(
//   [settings, refreshSignal, folderName],
//   ([$settings, $refreshSignal, $folderName]) => {
//     console.log(
//       "allAllowedFiles : Setting or Refresh signal, reading all files again.\nThis function should NOT run on resizing events",
//     );
//     const allFiles = get(app).vault.getMarkdownFiles();
//     const filteredFiles = allFiles.filter((file) => {
//       return !$settings.excludedFolders.some(
//         (excludeFolder) => file.path.startsWith(excludeFolder), // TODO : I know I am going to get error here and the fix is, I have to march whether file.parentFolderName is there in excludeFolder or not.
//       );
//     });
//     return filteredFiles;
//   },
// );

export const allAllowedFiles = derived(
  [settings, refreshSignal, folderName],
  ([$settings, $refreshSignal, $folderName]) => {
    // console.log(
    //   "allAllowedFiles : Setting or Refresh signal, reading all files again.\nThis function should NOT run on resizing events",
    // );
    let allFiles: TFile[] = [];

    if ($folderName === "") {
      // If no folder is specified, get all markdown files in the vault
      allFiles = get(app).vault.getMarkdownFiles();
    } else {
      // Fetch files from the specified folder
      const folder = get(app).vault.getAbstractFileByPath($folderName);

      if (folder instanceof TFolder) {
        if ($settings.showSubFolders) {
          // Helper function to recursively fetch files
          const collectFiles = (currentFolder: TFolder) => {
            currentFolder.children.forEach((child) => {
              if (child instanceof TFile && child.extension === "md") {
                allFiles.push(child);
              } else if (child instanceof TFolder) {
                collectFiles(child); // Recursively process subfolder
              }
            });
          };
          collectFiles(folder);
        } else {
          // Only fetch files in the current folder
          allFiles = folder.children.filter(
            (child): child is TFile =>
              child instanceof TFile && child.extension === "md",
          );
        }
      }
    }

    // Exclude files in the excluded folders
    const filteredFiles = allFiles.filter((file) => {
      return !$settings.excludedFolders.some(
        (excludeFolder) => file.path.startsWith(excludeFolder),
      );
    });

    return filteredFiles;
  },
);

export const sortedFiles = derived(
  [sort, files, settings],
  ([$sort, $files, $settings]) => {
    const isPinned = (path: string) => $settings.pinnedFiles.includes(path);

    const comparePinned = (a: TFile, b: TFile) =>
      (isPinned(b.path) ? 1 : 0) - (isPinned(a.path) ? 1 : 0);

    const sortMethods: Record<string, (a: TFile, b: TFile) => number> = {
      [Sort.NameAsc]: (a, b) => a.basename.localeCompare(b.basename),
      [Sort.NameDesc]: (a, b) => b.basename.localeCompare(a.basename),
      [Sort.EditedAsc]: (a, b) => a.stat.mtime - b.stat.mtime,
      [Sort.EditedDesc]: (a, b) => b.stat.mtime - a.stat.mtime,
      [Sort.CreatedAsc]: (a, b) => a.stat.ctime - b.stat.ctime,
      [Sort.CreatedDesc]: (a, b) => b.stat.ctime - a.stat.ctime,
    };

    const sortFunction = sortMethods[$sort] || (() => 0);

    return [...$files]
      .filter((file) => !file.path.endsWith(".excalidraw.md"))
      .sort((a, b) => comparePinned(a, b) || sortFunction(a, b));
  },
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
  // console.log("Content with frontmatter :\n", content);
  const frontMatter = getFrontMatterInfo(content).exists
    ? getFrontMatterInfo(content).frontmatter
    : "";
  const contentWfrontmatter = content
    .replace(`---\n${frontMatter}\n---`, "")
    .trim().length;
  // console.log(
  //   "Only frontmatter :\n",frontMatter,
  //   "\nContent without frontmatter :\n",contentWfrontmatter,
  // );
  return contentWfrontmatter === 0;
};

// Async filter for non-empty files
const createFilteredFiles = () =>
  readable<TFile[]>([], (set) => {
    const unsubscribe = sortedFiles.subscribe(async ($sortedFiles) => {
      const nonEmptyFiles = [];
      for (const file of $sortedFiles) {
        const emptiness = await isEmptyFile(file);
        if (get(settings).showEmptyNotes || !emptiness) {
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
