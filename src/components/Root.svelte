<!-- ./src/components/Root.svelte -->

<script lang="ts">
  import { debounce, Menu, SearchComponent, setIcon } from "obsidian";
  import { afterUpdate, onMount } from "svelte";
  import MiniMasonry from "minimasonry";
  import Card from "./Card.svelte";
  import store, {
    // tags,
    displayedFiles,
    searchQuery,
    skipNextTransition,
    sort,
    viewIsVisible,
    settings,
    refreshSignal,
    plugin,
    folderName,
    refreshOnResize,
    showActionBar,
    totalPages,
    currentPage,
    cardsPerBatch,
    searchFilters,
    allAllowedFiles,
  } from "./store";
  import { Sort } from "src/settings";
  import {
    getFileSuggestions,
    getFolderSuggestions,
    getTagSuggestions,
    getYAMLPropertySuggestions,
    MultiSuggest,
  } from "src/services/MultiSuggest";
  import { get } from "svelte/store";
  import {
    addToSearchHistory,
    initialPlaceholderSuggestionsMap,
  } from "src/utils/SearchQueryHelpers";
  import { refreshView } from "src/utils/GeneralHelpers";

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
  const cumpulsoryFilterIcon = (element: HTMLElement) => {
    setIcon(element, "lock-keyhole");
  };
  const normalFilterIcon = (element: HTMLElement) => {
    setIcon(element, "lock-open");
  };
  const closeCircleIcon = (element: HTMLElement) => {
    setIcon(element, "circle-x");
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

  let activeSuggest: MultiSuggest | null = null;
  function searchInput(el: HTMLElement) {
    const search = new SearchComponent(el);
    const inputEl = search.inputEl;
    const appInstance = get(plugin)?.app;
    const fileSuggestions = new Set(getFileSuggestions(appInstance));
    const tagSuggestions = new Set(getTagSuggestions(appInstance));
    const parentSuggestions = new Set(getFolderSuggestions(appInstance));
    const yamlPropertiesSuggestions = new Set(
      getYAMLPropertySuggestions(appInstance),
    );
    console.log("Yaml Properties Suggestions:", yamlPropertiesSuggestions);
    const finalSuggestions = new Set([
      ...fileSuggestions,
      ...tagSuggestions,
      ...parentSuggestions,
      ...yamlPropertiesSuggestions,
    ]);

    const updateSuggestions = (value: string) => {
      console.log("User has clicked inside the inputEl:", value);
      if (!appInstance) return;

      if (!activeSuggest) {
        activeSuggest = new MultiSuggest(
          inputEl,
          finalSuggestions,
          (selected) => {
            console.log(
              "Selected:",
              selected,
              "\nValue inside inputEl:",
              inputEl.value,
              "\n Is first check true : ",
              inputEl.value === "",
            );
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
              refreshView();
            } else {
              console.warn(
                "The selected item is already present in the search filters.",
              );
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
      console.log("User has clicked inside the inputEl:", inputEl.value);
      if (activeSuggest) {
        activeSuggest.getSuggestions(inputEl.value);
      } else {
        updateSuggestions(inputEl.value);
      }
    });
    inputEl.addEventListener("input", () => {
      console.log("This will only be called when the input changes.");
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
        console.log("Enter pressed in search input:", inputEl.value);
        const inputVal = inputEl.value.trim();
        if (!inputVal) return;

        addToSearchHistory(inputVal);

        const regex = /^\[.*:.*\]$/;
        console.log(
          "Valid filter format detected:",
          inputVal,
          "If condition: ",
          regex.test(inputVal),
        );
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
            refreshView();
          } else {
            console.warn(
              "The selected item is already present in the search filters.",
            );
            new Notice("The filter is already added to the view.");
          }
        } else {
          $searchQuery = inputVal;
        }
      }
    });

    // searchQuery.subscribe((val) => {
    //   inputEl.value = val;
    // });
    store.searchFilters.subscribe((filters) => {
      console.log("Root.svelte : SearchFilters Subscriber:", filters);
      refreshView();
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
    store.searchFilters.update((filters) => {
      filters[type].splice(index, 1);
      return { ...filters };
    });
    refreshView();
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
                use:cumpulsoryFilterIcon
                title="Convert to Normal Filter"
              ></button>
              <span>{filter}</span>
              <button
                class="close"
                on:click={() => removeFilter(index, "cf")}
                use:closeCircleIcon
              />
            </div>
          {/each}
          {#each $searchFilters.nf as filter, index}
            <div class="filter-label nf">
              <button
                class="toggle"
                on:click={() => moveFilter(index, "nf")}
                use:normalFilterIcon
                title="Convert to Compulsory Filter"
              />
              <span>{filter}</span>
              <button
                class="close"
                on:click={() => removeFilter(index, "nf")}
                use:closeCircleIcon
              />
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
