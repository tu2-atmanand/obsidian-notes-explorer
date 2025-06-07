<!-- ./src/components/Root.svelte -->

<script lang="ts">
  import { debounce, Menu, SearchComponent, setIcon } from "obsidian";
  import { afterUpdate, onMount } from "svelte";
  import MiniMasonry from "minimasonry";
  import Card from "./Card.svelte";
  import store, {
    tags,
    displayedFiles,
    searchQuery,
    skipNextTransition,
    sort,
    viewIsVisible,
    settings,
    refreshSignal,
    plugin,
    folderName,
    allAllowedFiles,
    refreshOnResize,
    showActionBar,
    totalPages,
    currentPage,
    cardsPerBatch,
    searchHistoryEntries,
    searchFilters,
  } from "./store";
  import { Sort } from "src/settings";
  import {
    getFileSuggestions,
    getFolderSuggestions,
    getTagSuggestions,
    MultiSuggest,
  } from "src/services/MultiSuggest";
  import { get } from "svelte/store";
    import { initialPlaceholderSuggestionsMap } from "src/utils/SearchQueryHelpers";

  export let cardsContainer: HTMLElement;
  let notesGrid: MiniMasonry;
  let viewContent: HTMLElement;
  let columns: number;

  const sortIcon = (element: HTMLElement) => {
    setIcon(element, "arrow-down-wide-narrow");
  };
  const refreshIcon = (element: HTMLElement) => {
    setIcon(element, "refresh-ccw");
  };
  const closeIcon = (element: HTMLElement) => {
    setIcon(element, "x");
  };

  let currentPageLocal = 1;
  $: currentPageLocal = $currentPage;

  function goToPage(page: number) {
    store.currentPage.set(page);
    store.displayedFilesInBatchCount.set(cardsPerBatch);
  }

  export function nextPage() {
    if (currentPageLocal < $totalPages) goToPage(currentPageLocal + 1);
  }

  export function previousPage() {
    if (currentPageLocal > 1) goToPage(currentPageLocal - 1);
  }

  function refreshView() {
    store.refreshSignal.set(!$refreshSignal);
    store.files.set($allAllowedFiles);
  }

  function searchInput(el: HTMLElement) {
    const search = new SearchComponent(el);
    const inputEl = search.inputEl;
    let activeSuggest: MultiSuggest | null = null;
    let activeSuggester = "";

    const updateSuggestions = (value: string) => {
      const appInstance = get(plugin)?.app;
      if (!appInstance) return;

      // Always close the previous suggest before creating a new one
      if (activeSuggest) {
        activeSuggest.destroy();
        activeSuggest = null;
      }

      let content: Set<string> = new Set();

      if (value === "" && activeSuggester !== "main") {
        let initialPlaceholderSuggestions = [
          `file:${initialPlaceholderSuggestionsMap.get("file:")}`,
          `parent:${initialPlaceholderSuggestionsMap.get("parent:")}`,
          `tag:${initialPlaceholderSuggestionsMap.get("tag:")}`,
        ];
        initialPlaceholderSuggestions = [
          ...initialPlaceholderSuggestions,
          ...get(searchHistoryEntries),
        ];
        content = new Set(initialPlaceholderSuggestions);
        activeSuggest = new MultiSuggest(
          inputEl,
          content,
          (selected) => {
            console.log(
              "Selected:",
              selected,
              "\nValue inside inputEl:",
              inputEl.value,
              "\n Is first check true : ",
              inputEl.value === "",
            );
            activeSuggester = "";
            // if (inputEl.value.trim().startsWith("file:")) {
            //     "file: " + selected.replace("file:", "").trim();
            // } else if (inputEl.value.trim().startsWith("parent:")) {
            //   finalSearchQuery = "parent: ";
            // } else if (inputEl.value.trim().startsWith("tag:")) {
            //   finalSearchQuery = "tag: ";
            // } else {
            //   finalSearchQuery = "";
            // }
            // $searchQuery = selected;
          },
          appInstance,
        );

        activeSuggest.getSuggestions(inputEl.value);
        activeSuggester = "main";
        // suggest.selectSuggestion(finalSearchQuery);
        // activeSuggest.close();
      } else if (value.trim().startsWith("file:")  && activeSuggester !== "file") {
        content = new Set(getFileSuggestions(appInstance));
        console.log("Content for suggestions:", content);
        let finalSearchQuery = "";
        activeSuggest = new MultiSuggest(
          inputEl,
          content,
          (selected) => {
            console.log(
              "Selected:",
              selected,
              "\nValue inside inputEl:",
              inputEl.value,
              "\n Is first check true : ",
              inputEl.value === "",
            );
            if (inputEl.value.trim() === "") {
              console.log("Is this even running...?");
              if (selected.trim().startsWith("file:")) {
                finalSearchQuery = "file: ";
              } else if (selected.trim().startsWith("parent:")) {
                finalSearchQuery = "parent: ";
              } else if (selected.trim().startsWith("tag:")) {
                finalSearchQuery = "tag: ";
              } else {
                finalSearchQuery = "";
              }
            } else {
              console.log("Input value on Enter:", inputEl.value);
              const filters = get(searchFilters);
              searchFilters.set({
                cf: filters.cf,
                nf: [...filters.nf, inputEl.value],
              });
              console.log("Updated search filters:", get(searchFilters));
            }
            activeSuggester = "";
            // $searchQuery = selected;
          },
          appInstance,
        );

        activeSuggest.getSuggestions(inputEl.value);
        activeSuggester = "file";
        // suggest.selectSuggestion(finalSearchQuery);
        // activeSuggest.close();
      } else if (value.trim().startsWith("parent:")) {
        content = new Set(getFolderSuggestions(appInstance));
      } else if (value.trim().startsWith("tag:")) {
        content = new Set(getTagSuggestions(appInstance));
      } else {
        content = new Set(get(searchHistoryEntries));
      }
    };

    inputEl.addEventListener("focus", () => updateSuggestions(inputEl.value));
    inputEl.addEventListener("input", () => {
      // console.log("Input changed:", inputEl.value);
      updateSuggestions(inputEl.value);
    });
    inputEl.addEventListener("keydown", (e: KeyboardEvent) => {
      if (e.key === "Enter") {
        const inputVal = inputEl.value.trim();
        if (!inputVal) return;

        // let finalVal = inputVal;
        // if (inputVal.startsWith("file:")) {
        //   finalVal = "file: " + inputVal.slice(5).trim();
        // } else if (inputVal.startsWith("parent:")) {
        //   finalVal = "parent: " + inputVal.slice(7).trim();
        // } else if (inputVal.startsWith("tag:")) {
        //   finalVal = "tag: " + inputVal.slice(4).trim();
        // } else {
        //   inputEl.value = ""; // Ignore and reset unknown formats
        //   return;
        // }

        console.log("Input value on Enter:", inputVal);
        const filters = get(searchFilters);
        searchFilters.set({
          cf: filters.cf,
          nf: [...filters.nf, inputVal],
        });
        console.log("Updated search filters:", get(searchFilters));

        // $searchQuery = inputVal.replace(/^(file:|tag:|parent:)/, "").trim();
        inputEl.value = "";
      }
    });

    // searchQuery.subscribe((val) => {
    //   inputEl.value = val;
    // });
    searchFilters.subscribe((filters) => {
      // if (filters.cf.length > 0 || filters.nf.length > 0) {
      //   inputEl.value = "";
      // }
      console.log("Search filters updated:", filters);
    });
  }

  function sortMenu(event: MouseEvent) {
    const sortMenu = new Menu();

    sortMenu.addItem((item) => {
      item.setTitle("Sorting filters");
      item.setIcon("clock-arrow-down");
      item.setIsLabel(true);
    });
    sortMenu.addItem((item) => {
      item.setTitle("Filename (A-Z)");
      item.setChecked($sort == Sort.NameAsc);
      item.onClick(async () => {
        $sort = Sort.NameAsc;
        $settings.defaultSort = Sort.NameAsc;
        await $plugin.saveSettings();
      });
    });
    sortMenu.addItem((item) => {
      item.setTitle("Filename(Z-A)");
      item.setChecked($sort == Sort.NameDesc);
      item.onClick(async () => {
        $sort = Sort.NameDesc;
        $settings.defaultSort = Sort.NameDesc;
        await $plugin.saveSettings();
      });
    });

    sortMenu.addSeparator();

    sortMenu.addItem((item) => {
      item.setTitle("Edited (newest first)");
      item.setChecked($sort == Sort.EditedDesc);
      item.onClick(async () => {
        $sort = Sort.EditedDesc;
        $settings.defaultSort = Sort.EditedDesc;
        await $plugin.saveSettings();
      });
    });
    sortMenu.addItem((item) => {
      item.setTitle("Edited (oldest first)");
      item.setChecked($sort == Sort.EditedAsc);
      item.onClick(async () => {
        $sort = Sort.EditedAsc;
        $settings.defaultSort = Sort.EditedAsc;
        await $plugin.saveSettings();
      });
    });
    sortMenu.addSeparator();
    sortMenu.addItem((item) => {
      item.setTitle("Created (newest first)");
      item.setChecked($sort == Sort.CreatedDesc);
      item.onClick(async () => {
        $sort = Sort.CreatedDesc;
        $settings.defaultSort = Sort.CreatedDesc;
        await $plugin.saveSettings();
      });
    });
    sortMenu.addItem((item) => {
      item.setTitle("Created (oldest first)");
      item.setChecked($sort == Sort.CreatedAsc);
      item.onClick(async () => {
        $sort = Sort.CreatedAsc;
        $settings.defaultSort = Sort.CreatedAsc;
        await $plugin.saveSettings();
      });
    });

    sortMenu.addSeparator();
    sortMenu.addItem((item) => {
      item.setTitle("File filters");
      item.setIcon("file-question");
      item.setIsLabel(true);
    });

    sortMenu.addItem((item) => {
      item.setTitle("Show empty notes");
      item.setChecked($settings.showEmptyNotes);
      item.onClick(async () => {
        $settings.showEmptyNotes = !$settings.showEmptyNotes;
      });
    });

    sortMenu.addSeparator();
    sortMenu.addItem((item) => {
      item.setTitle("Folder filters");
      item.setIcon("folder-tree");
      item.setIsLabel(true);
    });

    sortMenu.addItem((item) => {
      item.setTitle("Read sub-folders");
      item.setChecked($settings.showSubFolders);
      item.onClick(() => {
        $settings.showSubFolders = !$settings.showSubFolders;
        refreshView();
      });
    });

    sortMenu.showAtMouseEvent(event);
  }

  function clearFolderFilter(event: MouseEvent) {
    store.folderName.set("");
    store.files.set($allAllowedFiles);
    notesGrid.layout();
  }

  function removeFilter(index: number, type: "cf" | "nf") {
    searchFilters.update((filters) => {
      filters[type].splice(index, 1);
      return { ...filters };
    });
  }

  function moveFilter(index: number, type: "cf" | "nf") {
    searchFilters.update((filters) => {
      const item = filters[type].splice(index, 1)[0];
      const otherType = type === "cf" ? "nf" : "cf";
      filters[otherType].push(item);
      return { ...filters };
    });
  }

  onMount(() => {
    $sort = $settings.defaultSort;
    columns = Math.floor(viewContent.clientWidth / $settings.minCardWidth) + 1;
    notesGrid = new MiniMasonry({
      container: cardsContainer,
      baseWidth: $settings.minCardWidth,
      gutter: 20,
      surroundingGutter: false,
      ultimateGutter: 20,
    });
    notesGrid.layout();

    return () => {
      notesGrid.destroy();
    };
  });

  afterUpdate(
    debounce(async () => {
      if (!$viewIsVisible) {
        $skipNextTransition = true;
        return;
      }

      notesGrid.layout();
      $skipNextTransition = false;

      if ($refreshOnResize || $settings) {
        notesGrid.layout();
        $refreshOnResize = false;
      }
    }),
  );

  $: actionBarStyle = $showActionBar
    ? "action-bar-parent"
    : "action-bar-parent action-bar-parent-hide";
</script>

<div class={actionBarStyle}>
  <div class="action-bar" bind:this={viewContent}>
    <button
      class="clickable-icon refresh-button"
      use:refreshIcon
      on:click={refreshView}
    />
    <div class="search-component">
      <div class="action-bar__search" use:searchInput />
      <button
        class="clickable-icon sort-button"
        use:sortIcon
        on:click={sortMenu}
      />
    </div>
    <div class="action-bar_labelSection">
      {#if $folderName}
        <div class="action-bar_folder">
          <div style="align-content: center;">{$folderName}</div>
          <div class="action-bar_folder_closeButton">
            <button
              class="clickable-icon"
              use:closeIcon
              on:click={clearFolderFilter}
            />
          </div>
        </div>
      {:else if $searchFilters.cf.length > 0 || $searchFilters.nf.length > 0}
        <div class="filter-labels">
          {#each $searchFilters.cf as filter, index}
            <div class="filter-label cf">
              <button
                class="toggle"
                on:click={() => moveFilter(index, "cf")}
                title="Move to Normal Filter">⮌</button
              >
              <span>{filter}</span>
              <button class="close" on:click={() => removeFilter(index, "cf")}
                >×</button
              >
            </div>
          {/each}
          {#each $searchFilters.nf as filter, index}
            <div class="filter-label nf">
              <button
                class="toggle"
                on:click={() => moveFilter(index, "nf")}
                title="Move to Compulsory Filter">⮌</button
              >
              <span>{filter}</span>
              <button class="close" on:click={() => removeFilter(index, "nf")}
                >×</button
              >
            </div>
          {/each}
        </div>
      {:else}
        <div class="action-bar_tags">
          <!-- {#each $tags as tag}
            <span class="tag">{tag}</span>
          {/each} -->
        </div>
      {/if}
    </div>
  </div>
</div>

<div
  bind:this={cardsContainer}
  class="cards-container"
  style="--columns: {columns};"
  style:padding-top={$showActionBar ? "4em" : "0"}
>
  {#each $displayedFiles as file (file.path)}
    <Card {file} on:loaded={() => notesGrid.layout()} />
  {/each}
</div>

<div class="page-bar">
  <button on:click={previousPage} disabled={currentPageLocal === 1}
    >Previous</button
  >
  {#each Array($totalPages)
    .fill(0)
    .map((_, i) => i + 1) as page}
    <button
      class:active={currentPageLocal === page}
      on:click={() => goToPage(page)}
    >
      {page}
    </button>
  {/each}
  <button on:click={nextPage} disabled={currentPageLocal === $totalPages}
    >Next</button
  >
</div>
