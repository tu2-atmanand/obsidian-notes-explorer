<!-- ./src/components/Root.svelte -->

<script lang="ts">
  import { debounce, Menu, SearchComponent, setIcon } from "obsidian";
  import { afterUpdate, onMount } from "svelte";
  import MiniMasonry from "minimasonry";
  import Card from "./Card.svelte";
  import {
    tags,
    displayedFiles,
    searchQuery,
    skipNextTransition,
    Sort,
    sort,
    viewIsVisible,
    settings,
    refreshSignal,
  } from "./store";

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
      item.setTitle("Last created");
      item.setChecked($sort == Sort.Created);
      item.onClick(async () => {
        $sort = Sort.Created;
      });
    });
    sortMenu.addItem((item) => {
      item.setTitle("Last modified");
      item.setChecked($sort == Sort.Modified);
      item.onClick(async () => {
        $sort = Sort.Modified;
      });
    });
    sortMenu.addSeparator();
    sortMenu.addItem((item) => {
      item.setTitle("Show empty notes");
      item.setChecked($settings.showEmptyNotes);
      item.onClick(async () => {
        $settings.showEmptyNotes = !$settings.showEmptyNotes;
      });
    });
    sortMenu.showAtMouseEvent(event);
  }

  onMount(() => {
    columns = Math.floor(viewContent.clientWidth / $settings.minCardWidth);
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

      if($refreshSignal) {
        notesGrid.layout();
        $refreshSignal = false;
      }
    }),
  );
</script>

<div class="action-bar" bind:this={viewContent}>
  <div class="buttons-area">
    <button
      class="clickable-icon refresh-button"
      use:refreshIcon
      on:click={() => notesGrid.layout()}
    />
    <button
      class="clickable-icon sort-button"
      use:sortIcon
      on:click={sortMenu}
    />
  </div>
  <div class="action-bar__search" use:searchInput />
  <div class="action-bar__tags">
    <div class="action-bar__tags__list">
      {#each $tags as tag}
        <button class="action-bar__tag" on:click={() => ($searchQuery = tag)}
          >{tag}</button
        >
      {/each}
    </div>
  </div>
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
