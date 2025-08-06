// ./src/components/store.ts

import {
  type App,
  type CachedMetadata,
  getAllTags,
  ItemView,
  MetadataCache,
  prepareFuzzySearch,
  TFile,
  TFolder,
} from "obsidian";
import { derived, get, readable, writable } from "svelte/store";
import { Sort, type NotesExplorerSettings } from "./settings";
import NotesExplorerPlugin from "main";
import { isFileEmpty } from "src/utils/GeneralHelpers";

export const app = writable<App>();
export const plugin = writable<NotesExplorerPlugin>();
export const view = writable<ItemView>();
export const settings = writable<NotesExplorerSettings>();
export const appCache = writable<MetadataCache>();
export const files = writable<TFile[]>([]);
export const folderName = writable<TFolder[]>([]);
export const viewIsVisible = writable(false);
export const skipNextTransition = writable(true);
export const renderOnFileUpdate = writable(false);
export const refreshSignal = writable<boolean>(false);
export const refreshOnResize = writable<boolean>(false);
export const showActionBar = writable<boolean>(true);

export const searchFilters = writable<{ cf: string[]; nf: string[] }>({
  cf: [],
  nf: [],
});

export const excludedFilesCount = writable<number>(0);

function checkFilterForFile(fstr: string, filterType: string, file: TFile) {
  const [type, val] = fstr.split(/:\s*(.*)/).map((str) => str.trim());

  switch (type) {
    case "file":
      // console.log(
      //   "Checking filter:",
      //   fstr,
      //   "\nFile path:",
      //   file.path,
      //   "\nCondition: ",
      //   file.basename.includes(val)
      // );
      if (file.basename.includes(val)) return true;
      break;

    case "parent":
      if (file.parent?.path.includes(val)) return true;
      break;

    case "tag": {
      const tags = getAllTags(
        get(appCache).getFileCache(file) as CachedMetadata
      );
      if (tags?.includes(val)) return true;
      break;
    }

    case "content":
      // Check if the file content contains the specified value
      get(app)
        .vault.cachedRead(file)
        .then((content) => {
          if (content.includes(val)) {
            return true;
          }
        });
      break;

    // date filters
    case "created-before":
      // console.log(
      //   "For file:",
      //   file.path,
      //   " | Created at:",
      //   file.stat.ctime,
      //   " | Filter value : ",
      //   val,
      //   " | Filter value in unix time:",
      //   new Date(val).getTime()
      // );
      if (file.stat.ctime < new Date(val).getTime()) return true;
      break;
    case "created-after":
      if (file.stat.ctime > new Date(val).getTime()) return true;
      break;
    case "edited-before":
      if (file.stat.mtime < new Date(val).getTime()) return true;
      break;
    case "edited-after":
      if (file.stat.mtime > new Date(val).getTime()) return true;
      break;

    default:
      if (fstr.startsWith(`["`) && fstr.endsWith("]")) {
        // Handle frontmatter filters
        const frontMatterKeyFromFilter = fstr
          .slice(1, -1)
          .split(":")[0]
          .trim()
          .replaceAll(`"`, ``);
        const frontMatterFlagAndValueFromFilter = fstr
          .slice(1, -1)
          .split(":")[1]
          .trim();
        const fileCache = get(appCache).getFileCache(file);
        if (fileCache && fileCache.frontmatter) {
          const fmValue = fileCache.frontmatter[frontMatterKeyFromFilter];

          const conditionFlag = frontMatterFlagAndValueFromFilter
            .split(" ")[0]
            .trim();
          // console.log(
          //   "frontMatterKeyFromFilter = ",
          //   frontMatterKeyFromFilter,
          //   "\nfrontMatterFlagAndValueFromFilter = ",
          //   frontMatterFlagAndValueFromFilter,
          //   "\nComplete frontMatter from file = ",
          //   fileCache.frontmatter,
          //   "\nMatching frontMatter value from file : fmValue = ",
          //   fmValue,
          //   "\nconditionFlag = ",
          //   conditionFlag
          // );
          if (
            fmValue !== undefined &&
            fmValue !== null &&
            fmValue !== "" &&
            frontMatterFlagAndValueFromFilter.includes(" ")
          ) {
            switch (conditionFlag) {
              case "ABOVE":
                if (
                  Number(fmValue.trim()) >
                  Number(frontMatterFlagAndValueFromFilter.split(` `)[1].trim())
                ) {
                  return true;
                }
                break;
              case "BELOW":
                if (
                  Number(fmValue.trim()) <
                  Number(frontMatterFlagAndValueFromFilter.split(` `)[1].trim())
                ) {
                  return true;
                }
                break;
              case "BEFORE":
                if (
                  new Date(fmValue.trim()).getTime() <
                  new Date(
                    frontMatterFlagAndValueFromFilter.split(` `)[1].trim()
                  ).getTime()
                ) {
                  return true;
                }
                break;
              case "AFTER":
                if (
                  new Date(fmValue.trim()).getTime() >
                  new Date(
                    frontMatterFlagAndValueFromFilter.split(` `)[1].trim()
                  ).getTime()
                ) {
                  return true;
                }
                break;
              default:
                if (
                  fmValue.trim() === frontMatterFlagAndValueFromFilter.trim()
                ) {
                  return true;
                }
                break;
            }
          }
        }
      }
  }
  return false;
}

export const allAllowedFiles = derived(
  [settings, folderName, searchFilters],
  ([$settings, $folderName, $searchFilters]) => {
    // console.warn(
    //   "allAllowedFiles : Setting or folderName or searchFilters has been updated.\nThis function should NOT run on resizing events"
    // );
    let allFiles: TFile[] = [];

    if ($folderName.length === 0) {
      // If no folder is specified, get all markdown files in the vault
      allFiles = get(app).vault.getMarkdownFiles();
    } else {
      // Fetch files from the specified folder
      const folder = get(app).vault.getAbstractFileByPath($folderName[0].path);
      // console.log(
      //   "Folder name is not empty, fetching files from folder:",
      //   $folderName,
      //   "\nFolder object is : ",
      //   folder
      // );

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
          // Only fetch files from the current folder
          allFiles = folder.children.filter(
            (child): child is TFile =>
              child instanceof TFile && child.extension === "md"
          );
        }
      }
    }

    // Exclude files in the excluded folders
    const filesAfterRemovingExcludedFolders = allFiles.filter((file) => {
      return !$settings.excludedFolders.some((excludeFolder) =>
        file.path.startsWith(excludeFolder)
      );
    });

    // Exclude files based on the excluded file names
    excludedFilesCount.set(
      get(app).vault.getMarkdownFiles().length -
        filesAfterRemovingExcludedFolders.length
    );

    let finalFilteredFiles: TFile[] = filesAfterRemovingExcludedFolders;

    let cumpulsoryFilteredFilesSet = new Set<TFile>();
    if ($searchFilters.cf.length > 0) {
      let tempFilteredFiles = filesAfterRemovingExcludedFolders;

      // Apply AND filters
      let secondOrHigherFilter = false;
      $searchFilters.cf.forEach((fstr) => {
        if (secondOrHigherFilter) {
          tempFilteredFiles = Array.from(cumpulsoryFilteredFilesSet);
          cumpulsoryFilteredFilesSet = new Set<TFile>();
        }
        tempFilteredFiles.forEach((file) => {
          if (checkFilterForFile(fstr, "cf", file)) {
            cumpulsoryFilteredFilesSet.add(file);
          } else {
            // If the file does not match the filter, remove it from the set if this current filter is a second or higher filter.
            if (secondOrHigherFilter) {
              cumpulsoryFilteredFilesSet.delete(file);
            }
          }
        });
        secondOrHigherFilter = true;
      });
      finalFilteredFiles = Array.from(cumpulsoryFilteredFilesSet);
    }

    if ($searchFilters.nf.length > 0) {
      const normalFilteredFilesSet = new Set<TFile>();
      // // If no files match the AND filters, we return empty set
      // if ($searchFilters.cf.length === 0) {
      //   cumpulsoryFilteredFilesSet = new Set(filesAfterRemovingExcludedFolders);
      // }

      // Apply OR filters
      $searchFilters.nf.forEach((fstr) => {
        finalFilteredFiles.forEach((file) => {
          if (checkFilterForFile(fstr, "nf", file)) {
            normalFilteredFilesSet.add(file);
          }
        });
      });
      finalFilteredFiles = Array.from(normalFilteredFilesSet);
    }

    return finalFilteredFiles;
  }
);

// export const tags = derived(
//   [allAllowedFiles, appCache],
//   ([$allAllowedFiles, $appCache]) => {
//     const tags = $allAllowedFiles
//       .map(
//         (file) =>
//           getAllTags($appCache.getFileCache(file) as CachedMetadata) || [],
//       )
//       .flat();

//     const tagCounts = tags.reduce(
//       (acc, tag) => {
//         acc[tag] = (acc[tag] || 0) + 1;
//         return acc;
//       },
//       {} as Record<string, number>,
//     );

//     return Object.keys(tagCounts).sort((a, b) => tagCounts[b] - tagCounts[a]);
//   },
// );

// export const searchFilters = writable<{ cf: string[]; nf: string[] }>({
//   cf: [],
//   nf: [],
// });
// // Phase 2: apply searchFilters (cf AND, nf OR)
// export const filteredBySearchFilters = derived(
//   [allAllowedFiles, searchFilters],
//   ([$allAllowedFiles, $searchFilters]) => {
//     console.info(
//       "This will run if searchFilters change or allAllowedFiles change...",
//     );
//     // If there are no filters, return allAllowedFiles
//     if ($searchFilters.cf.length === 0 && $searchFilters.nf.length === 0) {
//       return $allAllowedFiles;
//     }

//     let cumpulsoryFilteredFilesSet = new Set<TFile>();

//     // Apply AND filters
//     $searchFilters.cf.forEach((fstr) => {
//       const [type, val] = fstr.split(/:\s*(.*)/).map((str) => str.trim());
//       $allAllowedFiles.forEach((file) => {
//         switch (type) {
//           case "parent":
//             if (file.path.startsWith(val)) cumpulsoryFilteredFilesSet.add(file);
//             break;

//           case "tag":
//             const tags = getAllTags(
//               get(appCache).getFileCache(file) as CachedMetadata,
//             );
//             if (tags?.includes(val)) cumpulsoryFilteredFilesSet.add(file);
//             break;

//           // date filters
//           case "created-before":
//             if (file.stat.ctime < new Date(val).getTime())
//               cumpulsoryFilteredFilesSet.add(file);
//             break;
//           case "created-after":
//             if (file.stat.ctime > new Date(val).getTime())
//               cumpulsoryFilteredFilesSet.add(file);
//             break;
//           case "edited-before":
//             if (file.stat.mtime < new Date(val).getTime())
//               cumpulsoryFilteredFilesSet.add(file);
//             break;
//           case "edited-after":
//             if (file.stat.mtime > new Date(val).getTime())
//               cumpulsoryFilteredFilesSet.add(file);
//             break;
//         }
//       });
//     });

//     let normalFilteredFilesSet = new Set<TFile>();
//     // If no files match the AND filters, we return empty set
//     if ($searchFilters.cf.length === 0) {
//       cumpulsoryFilteredFilesSet = new Set($allAllowedFiles);
//     }

//     // Apply OR filters
//     $searchFilters.nf.forEach((fstr) => {
//       const [type, val] = fstr.split(/:\s*(.*)/).map((str) => str.trim());
//       cumpulsoryFilteredFilesSet.forEach((file) => {
//         switch (type) {
//           case "file":
//             if (file.path.includes(val)) normalFilteredFilesSet.add(file);
//             break;

//           case "parent":
//             if (file.path.startsWith(val)) normalFilteredFilesSet.add(file);
//             break;

//           case "tag":
//             const tags = getAllTags(
//               get(appCache).getFileCache(file) as CachedMetadata,
//             );
//             if (tags?.includes(val)) normalFilteredFilesSet.add(file);
//             break;

//           case "created-before":
//             if (file.stat.ctime < new Date(val).getTime())
//               normalFilteredFilesSet.add(file);
//             break;
//           case "created-after":
//             if (file.stat.ctime > new Date(val).getTime())
//               normalFilteredFilesSet.add(file);
//             break;
//           case "edited-before":
//             if (file.stat.mtime < new Date(val).getTime())
//               normalFilteredFilesSet.add(file);
//             break;
//           case "edited-after":
//             if (file.stat.mtime > new Date(val).getTime())
//               normalFilteredFilesSet.add(file);
//             break;
//         }
//       });
//     });

//     return Array.from(normalFilteredFilesSet);
//   },
// );

// Sort files based on the selected sort method
export const sortedFiles = derived([files], ([$files]) => {
  const isPinned = (path: string) => get(settings).pinnedFiles.includes(path);

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

  const sortFunction = sortMethods[get(settings)?.defaultSort] || (() => 0);

  return [...$files]
    .filter((file) => !file.path.endsWith(".excalidraw.md"))
    .sort((a, b) => comparePinned(a, b) || sortFunction(a, b));
});

export const searchQuery = writable<string>("");
export const preparedSearch = derived(searchQuery, ($searchQuery) =>
  $searchQuery ? prepareFuzzySearch($searchQuery) : null
);
export const searchResultFiles = derived(
  [preparedSearch, sortedFiles],
  ([$preparedSearch, $sortedFiles], set) => {
    if ($preparedSearch == null) {
      set($sortedFiles);
      return;
    }

    Promise.all(
      $sortedFiles.map(async (file) => {
        const content = await file.vault.cachedRead(file);
        return [$preparedSearch(content), $preparedSearch(file.name)];
      })
    ).then((searchResults) => {
      set(
        $sortedFiles.filter((file, index) => {
          const [contentMatch, nameMatch] = searchResults[index];

          return (
            (contentMatch && contentMatch.score > -4) ||
            (nameMatch && nameMatch.score > -4)
          );
        })
      );
    });
  },
  get(sortedFiles)
);

const createFilteredFiles = () =>
  readable<TFile[]>([], (set) => {
    const unsubscribe = sortedFiles.subscribe(async ($sortedFiles) => {
      const nonEmptyFiles = [];
      for (const file of $sortedFiles) {
        const emptiness = await isFileEmpty(file);
        if (get(settings).showEmptyNotes || emptiness !== "") {
          nonEmptyFiles.push(file);
        }
      }
      set(nonEmptyFiles);
    });
    return unsubscribe;
  });
export const filteredFiles = createFilteredFiles();

export const displayedCount = writable(50); // This keeps the count of how many cards has been rendered in a contineous scroll mode.
export const currentPage = writable(1);
export const displayedFilesInBatchCount = writable(30); //This is the number of cards to be displayed in a batch when using pages view. It will be initially set to `cardsPerBatch` and then incremented by `cardsPerBatch` or how many cards can fit as per the settings.cardsPerPage value.
export const cardsPerBatch = 30;

export const totalPages = derived(
  [sortedFiles, searchQuery, searchResultFiles, settings],
  ([$sortedFiles, $searchQuery, $searchResultFiles, $settings]) => {
    if ($searchQuery !== "") {
      const tempData = Math.ceil(
        $searchResultFiles.length / $settings.cardsPerPage
      );
      return tempData;
    } else {
      const tempData = Math.ceil($sortedFiles.length / $settings.cardsPerPage);
      return tempData;
    }
  }
);

export const displayedFiles = derived(
  [
    filteredFiles,
    searchResultFiles,
    displayedCount,
    currentPage,
    displayedFilesInBatchCount,
  ],
  ([
    $filteredFiles,
    $searchResultFiles,
    $displayedCount,
    $currentPage,
    $displayedFilesInBatchCount,
  ]) => {
    // console.log(
    //   "Inside displayedFiles derived store...\nThe filtered files are :\n",
    //   $filteredFiles,
    //   "\nThe searchResult files are :\n",
    //   $searchResultFiles,
    //   "\nSearch query is :\n",
    //   get(searchQuery)
    // );
    const filesToDisplay =
      get(searchQuery).trim() !== "" ? $searchResultFiles : $filteredFiles;

    if (get(settings).pagesView && get(settings).cardsPerPage) {
      const start = ($currentPage - 1) * get(settings).cardsPerPage;
      return filesToDisplay.slice(start, start + $displayedFilesInBatchCount);
    } else {
      return filesToDisplay.slice(0, $displayedCount);
    }
  }
);

export const displayedFilesCount = derived(
  [displayedFiles],
  ([$displayedFiles]) => {
    return $displayedFiles.length;
  }
);

export const allTags = derived([appCache], ([$appCache]) => {
  const tags = $appCache.vault
    .getMarkdownFiles()
    .map(
      (file) => getAllTags($appCache.getFileCache(file) as CachedMetadata) || []
    )
    .flat();

  const tagCounts = tags.reduce(
    (acc, tag) => {
      acc[tag] = (acc[tag] || 0) + 1;
      return acc;
    },
    {} as Record<string, number>
  );

  return Object.keys(tagCounts).sort((a, b) => tagCounts[b] - tagCounts[a]);
});

export default {
  app,
  plugin,
  settings,
  files,
  excludedFilesCount,
  allAllowedFiles,
  // filteredBySearchFilters,
  folderName,
  searchQuery,
  searchFilters,
  searchResultFiles,
  displayedCount,
  displayedFiles,
  displayedFilesCount,
  filteredFiles,
  viewIsVisible,
  skipNextTransition,
  renderOnFileUpdate,
  refreshSignal,
  refreshOnResize,
  allTags,
  view,
  appCache,
  currentPage,
  showActionBar,
  totalPages,
  cardsPerBatch,
  displayedFilesInBatchCount,
};
