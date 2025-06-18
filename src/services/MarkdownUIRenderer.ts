// /src/services/MarkdownUIRenderer.ts

import { App, Component, Keymap, MarkdownRenderer } from "obsidian";

import type NotesExplorerPlugin from "main";

/**
 * Triggers a hover preview for markdown links when the CTRL key is held.
 *
 * @param app - The instance of the Obsidian app.
 * @param event - The mouse event that triggered the hover.
 * @param containerEl - The HTML element containing the markdown link.
 * @param filePath - The path of the file linked to.
 */
export function markdownButtonHoverPreviewEvent(
  app: App,
  event: MouseEvent,
  containerEl: HTMLElement,
  filePath: string
) {
  if (!event.ctrlKey) return; // Only proceed if CTRL is held
  app.workspace.trigger("hover-link", {
    event,
    source: "notes-explorer",
    hoverParent: { hoverPopover: null },
    targetEl: event.currentTarget,
    linktext: filePath,
    sourcePath: filePath,
  });
}


/**
 * Hooks mouse event handlers for internal markdown links within a specified container.
 *
 * @param plugin - The instance of the NotesExplorerPlugin.
 * @param containerEl - The HTML element containing the internal links.
 * @param sourcePath - The path of the source file.
 * @param filePath - The path of the target file linked to.
 */
export function hookMarkdownLinkMouseEventHandlers(
  plugin: NotesExplorerPlugin,
  containerEl: HTMLElement,
  sourcePath: string,
  filePath: string
) {
  containerEl.querySelectorAll<HTMLElement>("a.internal-link").forEach((el) => {
    // Register the click event
    plugin.registerDomEvent(el, "click", (evt: MouseEvent) => {
      evt.preventDefault();
      const linktext = el.getAttribute("href");
      if (linktext) {
        plugin.app.workspace.openLinkText(
          linktext,
          sourcePath,
          Keymap.isModEvent(evt)
        );
      }
    });

    // Register the mouseover event
    plugin.registerDomEvent(el, "mouseover", (event: MouseEvent) => {
      event.preventDefault();
      const linktext = el.getAttribute("href");
      if (linktext) {
        plugin.app.workspace.trigger("hover-link", {
          event,
          source: "task-board",
          hoverParent: { hoverPopover: null },
          targetEl: event.currentTarget,
          linktext: linktext,
          sourcePath: filePath,
        });
      }
    });
  });
}


/**
 * Asynchronously renders markdown text into a specified HTML element.
 *
 * @param app - The instance of the Obsidian app.
 * @param text - The markdown text to render.
 * @param element - The HTML element to render the markdown into.
 * @param path - The path of the file being rendered.
 * @param obsidianComponent - The Obsidian component associated with the rendering.
 */
export async function obsidianMarkdownRenderer(
  app: App,
  text: string,
  element: HTMLSpanElement,
  path: string,
  obsidianComponent: Component
) {
  await MarkdownRenderer.render(app, text, element, path, obsidianComponent);
}


/**
 * Renders markdown UI by rendering the markdown text and hooking mouse event handlers.
 *
 * @param plugin - The instance of the NotesExplorerPlugin.
 * @param obsidianComponent - The Obsidian component associated with the rendering.
 * @param text - The markdown text to render.
 * @param element - The HTML element to render the markdown into.
 * @param path - The path of the file being rendered.
 */
export function renderMarkdownUI(
  plugin: NotesExplorerPlugin,
  obsidianComponent: Component | null,
  text: string,
  element: HTMLSpanElement,
  path: string
) {
  if (!obsidianComponent) {
    return;
  }

  // Render the markdown text into the element using Obsidian API
  obsidianMarkdownRenderer(plugin.app, text, element, path, obsidianComponent)
    .then(() => {
      hookMarkdownLinkMouseEventHandlers(plugin, element, path, path);
    })
    .catch((error) => {
      console.error("Error rendering markdown:", error);
      element.textContent = "Error rendering markdown content.";
    });
}
