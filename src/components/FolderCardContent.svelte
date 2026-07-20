<script lang="ts">
  import { TFolder, setIcon } from "obsidian";
  export let folder: TFolder;
  import { onMount } from "svelte";
  import { folderIconSVG } from "../icons";
  import { settings } from "src/store";

  export let openFile: (evt: MouseEvent) => Promise<void>;
  export let clickHandler: "click" | "dblclick";
  export let fixedCardHeight: number | null;

  let folderIconDiv: HTMLElement;

  export const fileIcon = (element: HTMLElement) => {
    setIcon(element, "file");
  };
  export const folderIcon = (element: HTMLElement) => {
    setIcon(element, "folder");
  };

  // Get children names (files and folders)
  $: childrenNames = folder.children
    .slice(0, $settings.maxLines ?? folder.children.length)
    .map((child) => {
      // Estimate max length based on minCardWidth (e.g., 8px per character)
      const charWidth = 8;
      const maxLen = Math.floor($settings.minCardWidth / charWidth);
      return child.name.length > maxLen
        ? child.name.slice(0, maxLen) + "..."
        : child.name;
    });

  onMount(() => {
    if (folderIconDiv) {
      folderIconDiv.innerHTML = folderIconSVG;
    }
  });
</script>

<div
  class="folder-card"
  on:click|preventDefault={clickHandler === "click" ? openFile : null}
  on:dblclick|preventDefault={clickHandler === "dblclick" ? openFile : null}
  role="presentation"
>
  <div class="folder-card-header">
    <div class="folder-card-icon" bind:this={folderIconDiv}></div>
    <h1 class="folder-card-title">
      {folder.name.length > 45 ? folder.name.slice(0, 45) + "..." : folder.name}
    </h1>
  </div>
  <div class="folder-card-body" style="{fixedCardHeight ? 'flex-grow: 1; overflow-y: auto;' : ''}">
    {#if folder.children.length === 0}
      <div class="folder-card-empty">There's nothing here</div>
    {:else}
      <ul class="folder-card-list">
        {#each folder.children.slice(0, $settings.maxLines ?? folder.children.length) as child}
          <li class="folder-card-item">
            <span class="folder-card-item-icon">
              {#if child instanceof TFolder}
                <div class="folder-card-item-folder" use:folderIcon></div>
              {:else}
                <div class="folder-card-item-file" use:fileIcon></div>
              {/if}
            </span>
            {child.name.length > Math.floor($settings.minCardWidth / 8)
              ? child.name.slice(0, Math.floor($settings.minCardWidth / 8)) +
                "..."
              : child.name}
          </li>
        {/each}
      </ul>
    {/if}
  </div>
</div>

<style>
.folder-card {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  width: 100%;
  height: 100%;
  gap: 1.1em;
}

.folder-card-header {
  display: flex;
  flex-direction: row;
  align-items: center;
  width: 100%;
  gap: 1em;
}

.folder-card-icon {
  width: 30px;
  height: 30px;
  min-width: 20px;
  flex-shrink: 0;
  display: flex;
  justify-content: center;
  align-items: center;
}

.folder-card-icon svg {
  width: 100%;
  height: 100%;
}

.folder-card-title {
  font-weight: bold;
  white-space: normal;
  font-size: 24px;
  margin: 0 !important;
  flex: 1;
  word-break: break-word;
}

.folder-card-body {
  border: 1px solid var(--background-modifier-border);
  background-color: var(--background-modifier-cover);
  border-radius: 10px;
  padding: 0.8em;
  width: 100%;
  height: 100%;
}

.folder-card-list {
  margin: 0;
  padding: 0;
  list-style: none;
  display: flex;
  flex-direction: column;
  gap: 0.2em;
}

.folder-card-empty {
  font-style: italic;
}

.folder-card-item {
  display: flex;
  flex-direction: row;
  align-content: center;
  align-items: center;
  gap: 0.5rem;
}

.folder-card-item-icon {
  display: flex;
  align-items: center;
  justify-content: center;
}

.folder-card-item-folder,
.folder-card-item-file {
  width: 18px;
  height: 18px;
}
</style>