<!-- ./src/components/Root.svelte -->

<script lang="ts">
  import {
    debounce,
    Menu,
    Notice,
    SearchComponent,
    setIcon,
    TFolder,
  } from "obsidian";
  import { afterUpdate, onMount, tick } from "svelte";
  import { slide } from "svelte/transition";
  import MiniMasonry from "minimasonry";
  import Card from "./Card.svelte";
  import store, {
    displayedFiles,
    searchQuery,
    skipNextTransition,
    viewIsVisible,
    settings,
    plugin,
    folderName,
    refreshOnResize,
    showActionBar,
    totalPages,
    currentPage,
    cardsPerBatch,
    searchFilters,
    allAllowedFiles,
    allTags,
    excludedFilesCount,
    files,
  } from "../store";
  import { Sort } from "src/settings";
  import {
    getFileSuggestions,
    getFolderSuggestions,
    getTagSuggestions,
    getYAMLPropertySuggestions,
    SearchFiltersMultiSuggestor,
  } from "src/services/SearchFiltersMultiSuggestor";
  import { get } from "svelte/store";
  import {
    addToSearchHistory,
    initialPlaceholderSuggestionsMap,
  } from "src/utils/SearchQueryHelpers";
  import { refreshView } from "src/utils/GeneralHelpers";
  import { NotesCountStatisticsModal } from "src/modals/NotesCountStatisticsModal";
  import {
    closeCircleIcon,
    closeIcon,
    cumpulsoryFilterIcon,
    filtersIcon,
    filtersPanelIcon,
    findCloseIcon,
    findExpandIcon,
    normalFilterIcon,
    refreshIcon,
    sortIcon,
    viewShareButtonIcon,
    viewShareIcon,
  } from "src/icons";

  export let cardsContainer: HTMLElement;
  let notesGrid: MiniMasonry;
  let viewContent: HTMLElement;
  let columns: number;

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

  let activeSuggest: SearchFiltersMultiSuggestor | null = null;
  function searchInput(el: HTMLElement) {
    const search = new SearchComponent(el);
    search.clearButtonEl.style.display = "none"; // Hide the clear button
    search.addRightDecorator((rightDecoratorEl) => {
      const sortButton = document.createElement("button");
      sortButton.className = "clickable-icon";
      setIcon(sortButton, "search");
      sortButton.addEventListener(
        "click",
        () => ($searchQuery = search.inputEl.value),
      );
      rightDecoratorEl.appendChild(sortButton);
    });
    search.setClass("action-bar__search-input");
    const inputEl = search.inputEl;
    const appInstance = get(plugin)?.app;
    const fileSuggestions = new Set(getFileSuggestions(appInstance));
    const tagSuggestions = new Set(getTagSuggestions(appInstance));
    const parentSuggestions = new Set(getFolderSuggestions(appInstance));
    const yamlPropertiesSuggestions = new Set(
      getYAMLPropertySuggestions(appInstance),
    );
    // console.log("Yaml Properties Suggestions:", yamlPropertiesSuggestions);
    const finalSuggestions = new Set([
      ...fileSuggestions,
      ...tagSuggestions,
      ...parentSuggestions,
      ...yamlPropertiesSuggestions,
    ]);

    const updateSuggestions = (value: string) => {
      if (!appInstance) return;

      if (!activeSuggest) {
        activeSuggest = new SearchFiltersMultiSuggestor(
          inputEl,
          finalSuggestions,
          (selected: string) => {
            // console.log(
            //   "Selected:",
            //   selected,
            //   "\nValue inside inputEl:",
            //   inputEl.value,
            //   "\n Is first check true : ",
            //   inputEl.value === "",
            // );
            if (!selected) return;

            const oldSearchFilters = get(searchFilters);
            if (
              !oldSearchFilters.cf.includes(selected) &&
              !oldSearchFilters.nf.includes(selected)
            ) {
              store.searchFilters.set({
                cf: oldSearchFilters.cf,
                nf: [...oldSearchFilters.nf, selected],
              });
              // refreshView();
            } else {
              // console.warn(
              //   "The selected item is already present in the search filters.",
              // );
              new Notice("The filter is already added to the view.");
            }
            addToSearchHistory(selected);
          },
          appInstance,
        );
        inputEl.blur();
        activeSuggest.getSuggestions(inputEl.value);
        inputEl.focus();
      } else {
        activeSuggest.getSuggestions(inputEl.value);
      }
    };

    // inputEl.addEventListener("focus", () => updateSuggestions(inputEl.value));
    inputEl.addEventListener("click", () => {
      if (activeSuggest) {
        activeSuggest.getSuggestions(inputEl.value);
      } else {
        updateSuggestions(inputEl.value);
      }
    });
    inputEl.addEventListener("input", () => {
      // console.log("This will only be called when the input changes.");
      // console.log("Input changed:", inputEl.value);
      if (inputEl.value.trim() === "") {
        $searchQuery = "";
      } else {
        updateSuggestions(inputEl.value);
      }
    });
    search.clearButtonEl.addEventListener("click", (e: Event) => {
      $searchQuery = "";
    });
    inputEl.addEventListener("keydown", (e: KeyboardEvent) => {
      if (e.key === "Enter") {
        // console.log("Enter pressed in search input:", inputEl.value);
        const inputVal = inputEl.value.trim();
        if (!inputVal) return;

        addToSearchHistory(inputVal);

        const regex = /^\[.*:.*\]$/;
        // console.log(
        //   "Valid filter format detected:",
        //   inputVal,
        //   "If condition: ",
        //   regex.test(inputVal),
        // );
        if (
          regex.test(inputVal) ||
          /^file:\s*\S+$/.test(inputVal) ||
          /^parent:\s*\S+$/.test(inputVal) ||
          /^tag:\s*\S+$/.test(inputVal) ||
          /^content:\s*\S+$/.test(inputVal) ||
          /^created-before:\s*\S+$/.test(inputVal) ||
          /^created-after:\s*\S+$/.test(inputVal) ||
          /^modified-before:\s*\S+$/.test(inputVal) ||
          /^modified-after:\s*\S+$/.test(inputVal)
        ) {
          const oldSearchFilters = get(searchFilters);
          if (
            !oldSearchFilters.cf.includes(inputVal) &&
            !oldSearchFilters.nf.includes(inputVal)
          ) {
            store.searchFilters.set({
              cf: oldSearchFilters.cf,
              nf: [...oldSearchFilters.nf, inputVal],
            });
            inputEl.value = "";
            // refreshView();
          } else {
            // console.warn(
            //   "The selected item is already present in the search filters.",
            // );
            new Notice("The filter is already added to the view.");
          }
        } else {
          $searchQuery = inputVal;
        }
        inputEl.blur();
      }
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
      item.setChecked($settings.defaultSort == Sort.NameAsc);
      item.onClick(async () => {
        store.settings.update((s) => {
          s.defaultSort = Sort.NameAsc;
          return s;
        });
        await $plugin.saveSettings();
      });
    });
    sortMenu.addItem((item) => {
      item.setTitle("Filename(Z-A)");
      item.setChecked($settings.defaultSort == Sort.NameDesc);
      item.onClick(async () => {
        store.settings.update((s) => {
          s.defaultSort = Sort.NameDesc;
          return s;
        });
        await $plugin.saveSettings();
      });
    });

    sortMenu.addSeparator();

    sortMenu.addItem((item) => {
      item.setTitle("Edited (newest first)");
      item.setChecked($settings.defaultSort == Sort.EditedDesc);
      item.onClick(async () => {
        store.settings.update((s) => {
          s.defaultSort = Sort.EditedDesc;
          return s;
        });
        await $plugin.saveSettings();
      });
    });
    sortMenu.addItem((item) => {
      item.setTitle("Edited (oldest first)");
      item.setChecked($settings.defaultSort == Sort.EditedAsc);
      item.onClick(async () => {
        store.settings.update((s) => {
          s.defaultSort = Sort.EditedAsc;
          return s;
        });
        await $plugin.saveSettings();
      });
    });
    sortMenu.addSeparator();
    sortMenu.addItem((item) => {
      item.setTitle("Created (newest first)");
      item.setChecked($settings.defaultSort == Sort.CreatedDesc);
      item.onClick(async () => {
        store.settings.update((s) => {
          s.defaultSort = Sort.CreatedDesc;
          return s;
        });
        await $plugin.saveSettings();
      });
    });
    sortMenu.addItem((item) => {
      item.setTitle("Created (oldest first)");
      item.setChecked($settings.defaultSort == Sort.CreatedAsc);
      item.onClick(async () => {
        store.settings.update((s) => {
          s.defaultSort = Sort.CreatedAsc;
          return s;
        });
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
        // refreshView();
      });
    });

    sortMenu.showAtMouseEvent(event);
  }

  function clearFolderFilter(event: MouseEvent) {
    store.folderName.set([]);
    // store.files.set($allAllowedFiles);
    refreshView();
    // notesGrid.layout();
  }

  function removeFilter(index: number, type: "cf" | "nf") {
    store.searchFilters.update((filters) => {
      filters[type]?.splice(index, 1);
      return { ...filters };
    });
    // refreshView();
  }

  function moveFilter(index: number, type: "cf" | "nf") {
    searchFilters.update((filters) => {
      const item = filters[type]?.splice(index, 1)[0];
      const otherType = type === "cf" ? "nf" : "cf";
      filters[otherType].push(item);
      return { ...filters };
    });
  }

  function handleTagClick(event: MouseEvent) {
    // $searchQuery = (event.target as HTMLButtonElement).textContent || "";
    store.searchFilters.update((filters) => {
      const tag = (event.target as HTMLButtonElement).textContent || "";
      if (!filters.cf.includes(tag) && !filters.nf.includes(tag)) {
        filters.nf.push(tag);
      } else {
        // console.warn("The tag is already present in the search filters.");
        new Notice("The tag is already added to the view.");
      }
      return { ...filters };
    });
  }

  $: totalNotesCount =
    $searchQuery === "" &&
    $folderName.length === 0 &&
    $searchFilters.cf.length === 0 &&
    $searchFilters.nf.length === 0
      ? `${$allAllowedFiles.length}`
      : `${$displayedFiles.length} / ${get(plugin).app.vault.getMarkdownFiles()?.length}`; // Display filtered count vs total count

  function handleCountLabelBtn(event: MouseEvent) {
    const statisticsModal = new NotesCountStatisticsModal(get(plugin));
    statisticsModal.open();
  }

  function getFilterKeyText(filter: string) {
    if (filter.startsWith(`["`)) {
      return filter;
    } else {
      return `${filter.split(":")[0]?.trim()}: `;
    }
  }

  function getFilterValueText(filter: string) {
    if (filter.startsWith(`["`)) {
      return "";
    } else {
      return filter.split(":")[1]?.trim();
    }
  }

  function copyViewLinkToClipboard() {
    const viewLink = get(plugin).getViewShareLink();
    navigator.clipboard.writeText(viewLink).then(
      () => {
        new Notice("Notes Explorer view link copied to clipboard!");
      },
      (err) => {
        console.error("Failed to copy view link: ", err);
        new Notice("Failed to copy view link.");
      },
    );
  }

  onMount(() => {
    columns = Math.floor(viewContent.clientWidth / $settings.minCardWidth) + 1;
    notesGrid = new MiniMasonry({
      container: cardsContainer,
      baseWidth: $settings.minCardWidth,
      gutter: $settings.gutterSize,
      surroundingGutter: $settings.enableSurroundingGutters,
      ultimateGutter: 20,
      wedge: true,
    });
    notesGrid.layout();

    window.addEventListener("resize", handleResize);

    return () => {
      notesGrid.destroy();
      window.removeEventListener("resize", handleResize);
    };
  });

  // afterUpdate(
  //   debounce(async () => {
  //     if (!$viewIsVisible) {
  //       $skipNextTransition = true;
  //       return;
  //     }

  //     notesGrid.layout();
  //     $skipNextTransition = false;

  //     if ($refreshOnResize || $settings) {
  //       notesGrid.layout();
  //       $refreshOnResize = false;
  //     }
  //   }),
  // );

  let lastLayout: Date = new Date();
  let pendingLayout: ReturnType<typeof setTimeout> | null = null;
  const debouncedLayout = () => {
    // If there has been a relayout call in the last 100ms,
    // we schedule another one 100ms later to avoid layout thrashing
    return new Promise<void>((resolve) => {
      if (
        lastLayout.getTime() + 100 > new Date().getTime() &&
        pendingLayout === null
      ) {
        pendingLayout = setTimeout(
          () => {
            notesGrid.layout();
            $skipNextTransition = false;
            lastLayout = new Date();
            pendingLayout = null;
            resolve();
          },
          lastLayout.getTime() + 100 - new Date().getTime(),
        );
        return;
      }

      // Otherwise, relayout immediately
      notesGrid.layout();
      $skipNextTransition = false;
      lastLayout = new Date();
      resolve();
    });
  };

  export const updateLayoutNextTick = async () => {
    console.log("Updating layout next tick");
    await tick();
    return await debouncedLayout();
  };
  files.subscribe(() => {
    console.log("Files store updated, updating layout next tick");
    console.log("Files:", $files);
    store.renderOnFileUpdate.set(true);
    updateLayoutNextTick();
  });

  let screenWidth = window.innerWidth;
  let showFilters = false;
  let showSearchInput = false;

  function toggleSearchInput() {
    showSearchInput = !showSearchInput;
    if (!showSearchInput) {
      $searchQuery = "";
    }
  }

  const handleResize = () => {
    screenWidth = window.innerWidth;
    if (screenWidth > 1200) {
      showFilters = false;
    }
  };

  $: actionBarStyle = $showActionBar
    ? "action-bar-parent"
    : "action-bar-parent action-bar-parent-hide";
</script>

<div class={actionBarStyle}>
  <div class="action-bar" bind:this={viewContent}>
    <div class="action-bar-right-section">
      <div class="action-bar_buttons">
        <button
          class="clickable-icon refresh-button"
          aria-label="Refresh View"
          use:refreshIcon
          on:click={refreshView}
        ></button>
        <button
          class="notes-explorer-view-share-button-desktop"
          aria-label="Share View Link"
          on:click={copyViewLinkToClipboard}
          use:viewShareButtonIcon
        ></button>
        <button
          class="clickable-icon sort-button"
          aria-label="Sort Notes"
          use:sortIcon
          on:click={sortMenu}
        ></button>
      </div>
      <button
        class="clickable-icon searchFieldToggleBtn"
        on:click={toggleSearchInput}
        aria-label={showSearchInput ? "Clear Search Query" : "Search Tasks"}
      >
        {#if showSearchInput}
          <div class="icon-search-x" use:findCloseIcon></div>
        {:else}
          <div class="icon-search" use:findExpandIcon></div>
        {/if}
      </button>
      {#if showSearchInput}
        <div
          class="action-bar__search"
          use:searchInput
          transition:slide|local={{ duration: 250 }}
        ></div>
      {/if}
      <button
        class="clickable-icon count-label-button"
        aria-label="Notes Count Statistics"
        on:click={handleCountLabelBtn}>{totalNotesCount}</button
      >
    </div>
    {#if screenWidth <= 1200}
      <button
        class="clickable-icon filters-toggle-button {$folderName.length > 0 ||
        $searchFilters.cf.length > 0 ||
        $searchFilters.nf.length > 0
          ? 'filters-active'
          : ''}"
        aria-label="Toggle Filters Panel"
        on:click={() => (showFilters = !showFilters)}
        use:filtersPanelIcon
      ></button>
    {:else}
      <div class="action-bar_labelSection">
        {#if $folderName.length > 0 || $searchFilters.cf.length > 0 || $searchFilters.nf.length > 0}
          {#if $folderName.length > 0}
            <div class="action-bar_folder">
              <div style="align-content: center;">{$folderName[0].name}</div>
              <div class="action-bar_folder_closeButton">
                <button
                  class="clickable-icon"
                  aria-label="Clear Folder Filter"
                  use:closeIcon
                  on:click={clearFolderFilter}
                ></button>
              </div>
            </div>
          {/if}
          <div class="filter-labels">
            {#each $searchFilters.cf as filter, index}
              <div class="filter-label cf">
                <button
                  class="toggle"
                  aria-label="Convert to Normal Filter"
                  on:click={() => moveFilter(index, "cf")}
                  use:cumpulsoryFilterIcon
                  title="Convert to Normal Filter"
                ></button>
                <div class="filter-label-text">
                  <div class="filter-label-text-key">
                    {getFilterKeyText(filter)}
                  </div>
                  <div class="filter-label-text-value">
                    {getFilterValueText(filter)}
                  </div>
                </div>
                <button
                  class="close"
                  aria-label="Remove Filter"
                  on:click={() => removeFilter(index, "cf")}
                  use:closeCircleIcon
                ></button>
              </div>
            {/each}
            {#each $searchFilters.nf as filter, index}
              <div class="filter-label nf">
                <button
                  class="toggle"
                  aria-label="Convert to Compulsory Filter"
                  on:click={() => moveFilter(index, "nf")}
                  use:normalFilterIcon
                  title="Convert to Compulsory Filter"
                ></button>
                <div class="filter-label-text">
                  <div class="filter-label-text-key">
                    {getFilterKeyText(filter)}
                  </div>
                  <div class="filter-label-text-value">
                    {getFilterValueText(filter)}
                  </div>
                </div>
                <button
                  class="close"
                  aria-label="Remove Filter"
                  on:click={() => removeFilter(index, "nf")}
                  use:closeCircleIcon
                ></button>
              </div>
            {/each}
          </div>
        {:else}
          <div class="action-bar_labelSection_tags">
            {#each $allTags as tag}
              <button
                class="action-bar_labelSection_tags_tag"
                on:click={handleTagClick}
                >{tag}
              </button>
            {/each}
          </div>
        {/if}
      </div>
    {/if}
  </div>
</div>

<div
  class="filter-section-small-screens responsive"
  class:visible={showFilters}
  transition:slide
>
  {#if $folderName.length > 0 || $searchFilters.cf.length > 0 || $searchFilters.nf.length > 0}
    <button
      class="clickable-icon notes-explorer-view-share-button"
      aria-label="Share View Link"
      on:click={copyViewLinkToClipboard}
      use:viewShareButtonIcon
    ></button>
    <button
      class="clickable-icon count-label-button-small-screens"
      on:click={handleCountLabelBtn}>{totalNotesCount}</button
    >
    {#if $folderName.length > 0}
      <div class="filter-section-small-screens-folder-label">
        <div style="align-content: center;">{$folderName[0].name}</div>
        <div class="filter-section-small-screens-folder-label-closeButton">
          <button
            class="clickable-icon"
            aria-label="Clear Folder Filter"
            use:closeIcon
            on:click={clearFolderFilter}
          ></button>
        </div>
      </div>
    {/if}
    <div class="filter-section-small-screens-filter-labels">
      {#each $searchFilters.cf as filter, index}
        <div class="filter-label cf">
          <button
            class="toggle"
            aria-label="Convert to Normal Filter"
            on:click={() => moveFilter(index, "cf")}
            use:cumpulsoryFilterIcon
            title="Convert to Normal Filter"
          ></button>
          <div class="filter-label-text">
            <div class="filter-label-text-key">
              {getFilterKeyText(filter)}
            </div>
            <div class="filter-label-text-value">
              {getFilterValueText(filter)}
            </div>
          </div>
          <button
            class="close"
            aria-label="Remove Filter"
            on:click={() => removeFilter(index, "cf")}
            use:closeCircleIcon
          ></button>
        </div>
      {/each}
      {#each $searchFilters.nf as filter, index}
        <div class="filter-label nf">
          <button
            class="toggle"
            aria-label="Convert to Compulsory Filter"
            on:click={() => moveFilter(index, "nf")}
            use:normalFilterIcon
            title="Convert to Compulsory Filter"
          ></button>
          <div class="filter-label-text">
            <div class="filter-label-text-key">
              {getFilterKeyText(filter)}
            </div>
            <div class="filter-label-text-value">
              {getFilterValueText(filter)}
            </div>
          </div>
          <button
            class="close"
            aria-label="Remove Filter"
            on:click={() => removeFilter(index, "nf")}
            use:closeCircleIcon
          ></button>
        </div>
      {/each}
    </div>
  {:else}
    <div class="filter-section-small-screens-no-filters">
      <button
        class="clickable-icon notes-explorer-view-share-button"
        aria-label="Share View Link"
        on:click={copyViewLinkToClipboard}
        use:viewShareButtonIcon
      ></button>
      <button
        class="clickable-icon count-label-button-small-screens"
        on:click={handleCountLabelBtn}>{totalNotesCount}</button
      >
      <div class="filter-section-small-screens-no-filters-message">
        No Filters Applied
      </div>
    </div>
  {/if}
</div>

<div
  bind:this={cardsContainer}
  class="cards-container"
  style="--columns: {columns};"
  style:padding-top={$showActionBar ? "4em" : "0"}
>
  {#if $searchFilters.cf.length === 0 && $searchFilters.nf.length === 0 && $searchQuery === "" && $folderName.length === 0 && $displayedFiles.length === 0}
    <div class="loading-animation-and-message">
      <div class="loading-spinner"></div>
      <div class="loading-message">Loading your files...</div>
    </div>
  {:else if $folderName.length > 0 && $displayedFiles.length === 0}
    <div class="no-files-message">
      No files found in the folder "{$folderName[0].name}". <br /><br />Either
      the folder is empty or you probably have added this folder or its parent
      folder to excluded folder in settings.
    </div>
  {:else if ($searchFilters.cf.length > 0 || $searchFilters.nf.length > 0) && $displayedFiles.length === 0}
    <div class="no-files-message">
      No files found. <br /><br />Verify your filters again and check if you
      have applied any folder tag or search query and also make sure the notes
      you are looking for are not in the Excluded folders in setting.
    </div>
  {:else if $displayedFiles.length === 0}
    <div class="no-files-message">
      No files found !<br /><br />Please check if you have applied any other
      filters and make sure the notes you are searching are not in the Excluded
      folders from setting.
    </div>
  {:else}
    {#each $displayedFiles as file (`${file.path}-${file.stat.mtime}`)}
      <Card {file} {updateLayoutNextTick} />
    {/each}
  {/if}
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
