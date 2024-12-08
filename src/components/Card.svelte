<!-- ./src/components/Card.svelte -->

<script lang="ts">
  import {
    type MarkdownPostProcessorContext,
    MarkdownPreviewRenderer,
    MarkdownRenderer,
    setIcon,
    TFile,
  } from "obsidian";
  import { afterUpdate, createEventDispatcher, onMount } from "svelte";
  import { skipNextTransition, app, view, settings } from "./store";
  import { TitleDisplayMode } from "../settings";

  export let file: TFile;
  let displayFilename: boolean =
    $settings.displayTitle !== TitleDisplayMode.Title;
  let contentDiv: HTMLElement;
  let pinned: boolean;
  $: pinned = $settings.pinnedFiles.includes(file.path);

  // function postProcessor(
  //   element: HTMLElement,
  //   context: MarkdownPostProcessorContext,
  // ) {
  //   if (context.sourcePath !== file.path) {
  //     // Very important to check if the sourcePath is the same as the file path
  //     // Otherwise, the post processor will be applied to all files
  //     return;
  //   }

  //   if (
  //     $settings.displayTitle == TitleDisplayMode.Filename &&
  //     element.children.length > 0 &&
  //     element.children[0].tagName === "H1" &&
  //     element.children[0].textContent
  //   ) {
  //     element.children[0].remove();
  //   } else if ($settings.displayTitle == TitleDisplayMode.Title) {
  //     displayFilename = false;
  //   }

  //   if (element.children.length === 0) {
  //     return;
  //   }

  //   // Add shadow to blocks of embed notes (we take all .internal-embed,
  //   // including images, because we can't differentiate them at that time,
  //   // but CSS will only apply to embed notes)
  //   for (let i = 0; i < element.children.length; i++) {
  //     if (
  //       element.children[i].getElementsByClassName("internal-embed").length ||
  //       element.children[i].className.includes("block-language-dataview")
  //     ) {
  //       // console.log("Adding shadow to embed note");
  //       element.children[i].appendChild(
  //         document.createElement("div"),
  //       ).className = "embed-shadow";
  //     }
  //   }

  //   // Find block where to cut the preview
  //   let lastBlockIndex: number = 0,
  //     charCount: number = 0;
  //   do {
  //     charCount += element.children[lastBlockIndex]?.textContent?.length || 0;
  //   } while (
  //     lastBlockIndex < element.children.length &&
  //     charCount < 200 &&
  //     ++lastBlockIndex
  //   );

  //   // Remove all blocks after the last block
  //   for (let i = element.children.length - 1; i > lastBlockIndex; i--) {
  //     element.children[i]?.remove();
  //   }

  //   if (charCount < 200) {
  //     return;
  //   }

  //   // Cut the last block
  //   if (
  //     !element.children[lastBlockIndex].lastChild ||
  //     element.children[lastBlockIndex].lastChild?.nodeType !== Node.TEXT_NODE
  //   ) {
  //     return;
  //   }

  //   // TODO : I have to find out how many words will fit in the card, when a max-hight option has been set, to add the '...' at the end.
  //   const lastElText = element.children[lastBlockIndex].lastChild?.textContent;
  //   if (lastElText != null) {
  //     const cut = Math.min(50, 200 - (charCount - lastElText.length));
  //     (element.children[lastBlockIndex].lastChild as Child).textContent =
  //       `${lastElText.slice(0, cut)} ...`;
  //   }
  // }

  // const renderFile = async (el: HTMLElement): Promise<void> => {
  //   const content = await file.vault.cachedRead(file);
  //   if (content.trim().length > 0) {
  //     MarkdownPreviewRenderer.registerPostProcessor(postProcessor);
  //     await MarkdownRenderer.render($app, content, el, file.path, $view);
  //     MarkdownPreviewRenderer.unregisterPostProcessor(postProcessor);
  //   } else {
  //     el.createEl("div", {
  //       text: "File is Empty",
  //       cls: "card-content-empty",
  //     });
  //   }
  // };

  // Function to truncate content to a specific number of words
  const truncateContent = (content: string, maxLiness: number): string => {
    const lines = content.split(/\r?\n/);
    return lines.length > maxLiness
      ? lines.slice(0, maxLiness).join("\n")
      : content;
  };

  const renderFile = async (el: HTMLElement): Promise<void> => {
    const content = await file.vault.cachedRead(file);
    if (content.trim().length > 0) {
      const maxLiness = $settings.maxLines || 20;
      const truncatedContent = truncateContent(content, maxLiness);

      await MarkdownRenderer.render(
        $app,
        truncatedContent,
        el,
        file.path,
        $view,
      );
      postProcessRenderedContent(el);
    } else {
      el.createEl("div", {
        text: "File is Empty",
        cls: "card-content-empty",
      });
    }
  };

  // Post-process rendered content for optimizations
  const postProcessRenderedContent = (element: HTMLElement) => {
    if ($settings.displayTitle === TitleDisplayMode.Filename) {
      const firstChild = element.firstElementChild;
      if (firstChild?.tagName === "H1") {
        firstChild.remove();
      }
    }

    // Add shadows to embeds and dataview blocks
    element
      .querySelectorAll(".internal-embed, .block-language-dataview")
      .forEach((embed) => {
        embed.appendChild(document.createElement("div")).className =
          "embed-shadow";
      });

    // Truncate the preview if needed
    // let charCount = 0;
    // Array.from(element.children).forEach((child, index) => {
    //   charCount += child.textContent?.length || 0;
    //   if (charCount > 200) {
    //     truncateLastBlock(child, charCount, 200);
    //     // Remove extra siblings
    //     while (child.nextSibling) {
    //       child.nextSibling.remove();
    //     }
    //   }
    // });
  };

  // // Truncate the last block to fit within the character limit
  // const truncateLastBlock = (
  //   block: Element,
  //   charCount: number,
  //   maxChars: number,
  // ) => {
  //   const textNode = Array.from(block.childNodes).find(
  //     (node) => node.nodeType === Node.TEXT_NODE,
  //   ) as Text | null;

  //   if (textNode) {
  //     const excessChars = charCount - maxChars;
  //     const visibleText = textNode.textContent!.slice(0, -excessChars) + " ...";
  //     textNode.textContent = visibleText;
  //   }
  // };

  const togglePin = async () => {
    $settings.pinnedFiles = pinned
      ? $settings.pinnedFiles.filter((f) => f !== file.path)
      : [...$settings.pinnedFiles, file.path];
  };

  const trashFile = async () => {
    await file.vault.trash(
      file,
      $settings.toSystemTrash !== "trash" ? true : false,
    );
  };

  const openFile = async () => {
    if ($settings.openNoteLayout === "right") {
      await $app.workspace.getLeaf("split", "vertical").openFile(file);
    } else if ($settings.openNoteLayout === "tab") {
      await $app.workspace.getLeaf("tab").openFile(file);
    } else if ($settings.openNoteLayout === "window") {
      await $app.workspace.getLeaf("window").openFile(file);
    }
  };

  let backgroundColor = "";

  const updateTagColorIndicator = async () => {
    if (contentDiv && $settings.tagPositionForCardColor === "content") {
      const content = contentDiv.textContent || contentDiv.innerText;
      for (let tag of $settings.tagColors) {
        if (content.includes("#" + tag.name)) {
          backgroundColor = tag.color;
          break;
        }
      }
    } else {
      const frontmatter = $app.metadataCache.getFileCache(file)?.frontmatter;

      if (!frontmatter || !frontmatter.tags) return;

      const tags = Array.isArray(frontmatter.tags)
        ? frontmatter.tags
        : [frontmatter.tags];

      for (const tag of tags) {
        // Case-insensitive matching of tags with $settings.tagColors
        const matchingTag = $settings.tagColors.find(
          (tagColor) => tagColor.name === tag,
        );

        if (matchingTag) {
          backgroundColor = matchingTag.color;
          break; // Exit once a match is found
        }
      }
    }
  };

  function calculateStyle() {
    let style = "";
    if ($settings.maxCardHeight) {
      style = `max-height: ${$settings.maxCardHeight}px; overflow: hidden; text-overflow: ellipsis; `;
    }

    if ($settings.tagColorIndicatorType === "background") {
      // console.log("Whats the value of backgroundColor :", backgroundColor);
      style += `background-color: ${backgroundColor};`;
    } else {
      if (backgroundColor !== "") {
        const modifiedBG =
          backgroundColor.slice(0, backgroundColor.lastIndexOf(",") + 1) +
          " 0.1)";
        style += `border-inline: 4px solid ${backgroundColor}; background-color: ${modifiedBG};`;
        // console.log("The final style :", style);
      }
    }

    return style;
  }

  $: cardStyle = calculateStyle();

  // // Compute style based on settings
  // $: cardStyle = $settings.maxCardHeight
  //   ? `max-height: ${$settings.maxCardHeight}px; overflow: hidden; text-overflow: ellipsis; background-color: ${backgroundColor};`
  //   : `background-color: ${backgroundColor};`;

  $: folderIconClass = $settings.showParentFolder
    ? "folder-name"
    : "clickable-icon";

  const pinButton = (element: HTMLElement) => setIcon(element, "pin");
  const trashIcon = (element: HTMLElement) => setIcon(element, "trash");
  const folderIcon = (element: HTMLElement) => setIcon(element, "folder");
  const blankIcon = (element: HTMLElement) => setIcon(element, "blank");
  const vaultIcon = (element: HTMLElement) => setIcon(element, "vault");
  const pinnedIcon = (element: HTMLElement) => setIcon(element, "circle-stop");

  const dispatch = createEventDispatcher();
  onMount(async () => {
    await renderFile(contentDiv);
    await updateTagColorIndicator();
    cardStyle = calculateStyle();
    dispatch("loaded");
  });

  afterUpdate(() => {
    updateTagColorIndicator().then(() => {
      cardStyle = calculateStyle(); // Recalculate style after tag color update
    });
  });
</script>

<div
  class="card"
  style={cardStyle}
  class:skip-transition={$skipNextTransition}
  role="link"
  tabindex="0"
>
  {#if displayFilename}
    <div class="top-bar">
      <div>{file.basename}</div>
    </div>
  {/if}

  <div
    class="card-content"
    style="
    padding-inline: {$settings.tagColorIndicatorType === 'background'
      ? '8px'
      : '4px'};
    {$settings.maxCardHeight ? 'overflow-y: clip;' : ''}
  "
    on:dblclick={openFile}
    on:keydown={openFile}
    bind:this={contentDiv}
    role="presentation"
  ></div>

  <div class="card-info-parent">
    <div class="card-info">
      {#if pinned}
        <button
          class="clickable-icon"
          use:pinnedIcon
          on:click|stopPropagation={togglePin}
        />
      {:else}
        <button
          class="clickable-icon"
          class:is-active={pinned}
          use:pinButton
          on:click|stopPropagation={togglePin}
        />
      {/if}
      {#if file.parent != null && file.parent.path !== "/"}
        <div class={folderIconClass}>
          <span use:folderIcon />{file.parent.path}
        </div>
      {:else}
        <div class={folderIconClass}>
          <span use:vaultIcon />Root
        </div>
      {/if}
      {#if $settings.showDeleteButton}
        <button
          class="clickable-icon"
          use:trashIcon
          on:click|stopPropagation={trashFile}
        />
      {:else}
        <button class="clickable-icon" use:blankIcon />
      {/if}
    </div>
  </div>
</div>

<style>
</style>
