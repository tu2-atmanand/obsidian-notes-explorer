<script lang="ts">
  import { TFolder, setIcon } from "obsidian";
  export let folder: TFolder;
  import { onMount } from "svelte";
  import { folderIconSVG } from "../icons";
  import { settings } from "src/store";

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

<div class="folder-card-content">
  <div class="folder-card-top">
    <div class="folder-name">
      {folder.name.length > 45 ? folder.name.slice(0, 45) + "..." : folder.name}
    </div>
    <div class="folder-icon" bind:this={folderIconDiv}></div>
  </div>
  <div class="folder-children">
    <div class="folder-children-title">Children</div>
    <ul>
      {#each folder.children.slice(0, $settings.maxLines ?? folder.children.length) as child}
        <li class="folder-child">
          <span class="child-icon">
            {#if child instanceof TFolder}
              <div class="child-folder-icon" use:folderIcon></div>
            {:else}
              <div class="child-file-icon" use:fileIcon></div>
            {/if}
          </span>
          {child.name.length > Math.floor($settings.minCardWidth / 8)
            ? child.name.slice(0, Math.floor($settings.minCardWidth / 8)) +
              "..."
            : child.name}
        </li>
      {/each}
    </ul>
  </div>
</div>

<style>
  .folder-card-content {
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    width: 100%;
    height: 100%;
    padding: 5px !important;
    padding-inline: 2px !important;
  }
  .folder-card-top {
    display: flex;
    flex-direction: row;
    align-items: center;
    width: 100%;
    padding: 0.5em;
    box-sizing: border-box;
    background: var(--background-modifier-cover);
    border: 1px solid var(--code-comment);
    border-radius: 0.5rem;
  }
  .folder-name {
    flex: 1;
    font-weight: bold;
    overflow: hidden;
    text-overflow: ellipsis;
    font-size: 1.4rem;
  }
  .folder-children {
    flex: 1;
    padding: 0.5em;
  }
  .folder-children > ul {
    padding-inline: 20px;
    margin: 0;
  }
  .folder-children-title {
    font-weight: bold;
    margin-bottom: 0.25em;
  }
  .folder-child {
    display: flex;
    flex-direction: row;
    align-content: center;
    align-items: center;
    gap: 0.5rem;
  }
  .folder-icon {
    flex: 1;
    display: flex;
    justify-content: flex-end;
    align-items: flex-start;
    height: 100%;
    max-width: 25%;
  }
</style>
