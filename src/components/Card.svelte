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
  import { skipNextTransition, app, view, settings, plugin } from "./store";
  import { TitleDisplayMode } from "../settings";
  import { openDeleteConfirmationModal } from "src/utils/helpers";
  import {
    hookMarkdownLinkMouseEventHandlers,
    markdownButtonHoverPreviewEvent,
  } from "src/utils/MarkdownHoverPreview";

  export let file: TFile;
  let displayFilename: boolean =
    $settings.displayTitle !== TitleDisplayMode.Title;
  let contentDiv: HTMLElement;
  let footerDiv: HTMLElement;
  let pinned: boolean;
  let backgroundColor = "";
  $: pinned = $settings.pinnedFiles.includes(file.path);

  const pinButton = (element: HTMLElement) => setIcon(element, "pin");
  const trashIcon = (element: HTMLElement) => setIcon(element, "trash");
  const folderIcon = (element: HTMLElement) => setIcon(element, "folder");
  const blankIcon = (element: HTMLElement) => setIcon(element, "blank");
  const vaultIcon = (element: HTMLElement) => setIcon(element, "vault");
  const pinnedIcon = (element: HTMLElement) => setIcon(element, "circle-stop");

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

  // const renderNoteCard = async (el: HTMLElement): Promise<void> => {
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
    // Remove frontmatter (--- block)
    content = content.replace(/^---[\s\S]*?---\n?/, "");
    // Remove content between %% and the %% markers
    content = content.replace(/%%[\s\S]*?%%\n?/g, "");

    // Split into lines and slice
    const lines = content.split(/\r?\n/);
    const truncatedLines = lines.slice(0, maxLiness);

    // Join the truncated lines
    return truncatedLines.join("\n").trim();
  };

  const renderNoteCard = async (el: HTMLElement): Promise<void> => {
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
      // $plugin.registerHoverLinkSource(PLUGIN_VIEW_TYPE, {
      //   defaultMod: true /* require ctrl key trigger */,
      //   display: "Notes Explorer",
      // });
      if ($settings.contentInteractions) {
        hookMarkdownLinkMouseEventHandlers(
          $app,
          $plugin,
          el,
          file.path,
          file.path,
        );
      }
    } else {
      el.createEl("div", {
        text: "File is Empty",
        cls: "card-content-empty",
      });
    }
  };

  const parentNoteHoverPreview = async (event: MouseEvent, el: HTMLElement) => {
    markdownButtonHoverPreviewEvent($app, event, el, file.path);
  };

  // Post-process rendered content for optimizations
  const postProcessRenderedContent = (element: HTMLElement) => {
    // TODO : The below feature not working. Also add another option to remove both title and filename from the card header :
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
    const modalAnswer = await openDeleteConfirmationModal($app);
    if (modalAnswer) {
      try {
        await file.vault.trash(
          file,
          $settings.deleteFileMode === "trash" ? false : true,
        );
      } catch (error) {
        console.error("trashFile : Error deleting the file:", error);
      }
    }
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

      // // Sort tagColors by order before iterating
      // const sortedTagColors = [...$settings.tagColors].sort(
      //   (a, b) => a.order - b.order,
      // );

      for (const tagColor of $settings.tagColors) {
        const matchingTag = tags.find((tag) => tag === tagColor.name);

        if (matchingTag) {
          backgroundColor = tagColor.color;
          break; // Exit once a match is found
        }
      }
    }
  };

  function getFooterMetadata(): string {
    const metadataType = $settings.noteMetadata;

    switch (metadataType) {
      case "fileName":
        return file.name;

      case "folderName":
        return file.parent?.path !== "/"
          ? file.parent?.path || ""
          : "Root folder";

      case "editedTime":
        return file.stat.mtime
          ? new Date(file.stat.mtime).toLocaleString()
          : "N/A";

      case "createdTime":
        return file.stat.ctime
          ? new Date(file.stat.ctime).toLocaleString()
          : "N/A";

      case "frontmatter":
        const frontmatterTag = $settings.frontmatterTag?.trim();
        if (!frontmatterTag) return "Invalid frontmatter tag";

        const frontmatter = $app.metadataCache.getFileCache(file)?.frontmatter;
        return frontmatter?.[frontmatterTag] || "Tag not found";

      default:
        return "Invalid Metadata Setting";
    }
  }

  function calculateStyle() {
    let style = "";
    if ($settings.fixedCardHeight) {
      style = `height: ${$settings.fixedCardHeight}px; max-height: ${$settings.fixedCardHeight}px; overflow: hidden; text-overflow: ellipsis; `;
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

  // Compute style based on settings
  $: cardStyle = calculateStyle();

  $: footerMetadataClass = $settings.metadataVisibility
    ? "footer-metadata"
    : "clickable-icon footer-metadata";

  const dispatch = createEventDispatcher();
  onMount(async () => {
    await renderNoteCard(contentDiv);
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
      <div class="top-bar-fileName">{file.basename}</div>
    </div>
  {/if}

  <div
    class="card-content"
    style="
    padding-inline: {$settings.tagColorIndicatorType === 'background'
      ? '8px'
      : '4px'};
    {$settings.fixedCardHeight ? 'overflow-y: clip;' : ''}
  "
    on:dblclick={openFile}
    bind:this={contentDiv}
    role="presentation"
  ></div>

  <div
    class={$settings.metadataVisibility
      ? "card-footer-parent-active"
      : "card-footer-parent"}
    bind:this={footerDiv}
    on:mouseenter={(event) => parentNoteHoverPreview(event, footerDiv)}
    role="presentation"
  >
    <div class="card-footer">
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
      <div class={footerMetadataClass}>
        {#if $settings.noteMetadata === "folderName" && file.parent != null && file.parent.path !== "/"}
          <span use:folderIcon />
        {:else if $settings.noteMetadata === "folderName"}
          <span use:vaultIcon />
        {/if}
        <div class="card-footer-text">{getFooterMetadata()}</div>
      </div>
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
