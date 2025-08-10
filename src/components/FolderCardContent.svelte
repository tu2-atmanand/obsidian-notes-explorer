<script lang="ts">
  import { TFolder, setIcon } from "obsidian";
  export let folder: TFolder;
  import { onMount } from "svelte";

  let folderIconDiv: HTMLElement;

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

  import { folderIconSVG } from "../icons";
  import { settings } from "src/store";

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
    <div class="folder-children-title">Children:</div>
    <ul>
      {#each childrenNames as name}
        <li>{name}</li>
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
  .folder-icon {
    flex: 1;
    display: flex;
    justify-content: flex-end;
    align-items: flex-start;
    height: 100%;
    max-width: 25%;
  }
</style>
