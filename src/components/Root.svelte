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
    app,
    plugin,
    folderName,
    filteredFiles,
    allAllowedFiles,
    refreshOnResize,
  } from "./store";
  import { Sort } from "src/settings";

  let notesGrid: MiniMasonry;
  let viewContent: HTMLElement;
  export let cardsContainer: HTMLElement;
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

  const searchInput = (element: HTMLElement) => {
    const searchInput = new SearchComponent(element);
    searchInput.onChange((value) => {
      $searchQuery = value;
    });
    searchQuery.subscribe((value) => {
      searchInput.inputEl.value = value;
    });
  };

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
      item.setTitle("Edited (Newest First)");
      item.setChecked($sort == Sort.EditedDesc);
      item.onClick(async () => {
        $sort = Sort.EditedDesc;
        $settings.defaultSort = Sort.EditedDesc;
        await $plugin.saveSettings();
      });
    });
    sortMenu.addItem((item) => {
      item.setTitle("Edited (Oldest First)");
      item.setChecked($sort == Sort.EditedAsc);
      item.onClick(async () => {
        $sort = Sort.EditedAsc;
        $settings.defaultSort = Sort.EditedAsc;
        await $plugin.saveSettings();
      });
    });
    sortMenu.addSeparator();
    sortMenu.addItem((item) => {
      item.setTitle("Created (Newest First)");
      item.setChecked($sort == Sort.CreatedDesc);
      item.onClick(async () => {
        $sort = Sort.CreatedDesc;
        $settings.defaultSort = Sort.CreatedDesc;
        await $plugin.saveSettings();
      });
    });
    sortMenu.addItem((item) => {
      item.setTitle("Created (Oldest First)");
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
      item.onClick(async () => {
        $settings.showSubFolders = !$settings.showSubFolders;
      });
    });

    sortMenu.showAtMouseEvent(event);
  }

  function clearFolderFilter(event: MouseEvent) {
    store.folderName.set("");
    store.files.set($allAllowedFiles);
    notesGrid.layout();
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
        // console.log("Root : Resized or setting changed, refreshing...");
        notesGrid.layout();
        $refreshOnResize = false;
      }
    }),
  );
</script>

<div class="action-bar" bind:this={viewContent}>
  <button
    class="clickable-icon refresh-button"
    use:refreshIcon
    on:click={() => {
      store.refreshSignal.set(!$refreshSignal);
      store.files.set($allAllowedFiles);
    }}
  />
  <div class="search-component">
    <div class="action-bar__search" use:searchInput />
    <button
      class="clickable-icon sort-button"
      use:sortIcon
      on:click={sortMenu}
    />
  </div>
  <div class="action-bar__tags">
    <div class="action-bar__tags__list">
      {#each $tags as tag}
        <button class="action-bar__tag" on:click={() => ($searchQuery = tag)}
          >{tag}</button
        >
      {/each}
    </div>
  </div>
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
  {/if}
</div>
<div
  bind:this={cardsContainer}
  class="cards-container"
  style:--columns={columns}
>
  {#each $displayedFiles as file (file.path + file.stat.mtime)}
    <Card {file} on:loaded={() => notesGrid.layout()} />
  {/each}
</div>
