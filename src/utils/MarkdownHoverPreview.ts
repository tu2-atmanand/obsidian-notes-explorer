// /src/utils/MarkdownHoverPreview.ts

import { App, Keymap } from "obsidian";

import type NotesExplorerPlugin from "main";

export function hookMarkdownLinkMouseEventHandlers(
  app: App,
  plugin: NotesExplorerPlugin,
  containerEl: HTMLElement,
  sourcePath: string,
  filePath: string
) {
  containerEl.querySelectorAll<HTMLElement>("a.internal-link").forEach((el) => {
    // Register the click event
    plugin.registerDomEvent(el, "click", (evt: MouseEvent) => {
      if (!evt.ctrlKey) return; // Only proceed if CTRL is held
      evt.preventDefault();
      const linktext = el.getAttribute("href");
      if (linktext) {
        app.workspace.openLinkText(
          linktext,
          sourcePath,
          Keymap.isModEvent(evt)
        );
      }
    });

    // Register the mouseover event
    plugin.registerDomEvent(el, "mouseover", (event: MouseEvent) => {
      if (!event.ctrlKey) return; // Only proceed if CTRL is held
      event.preventDefault();
      const linktext = el.getAttribute("href");
      if (linktext) {
        app.workspace.trigger("hover-link", {
          event,
          source: "notes-explorer",
          hoverParent: { hoverPopover: null },
          targetEl: event.currentTarget,
          linktext: linktext,
          sourcePath: filePath,
        });
      }
    });
  });
}

export function markdownButtonHoverPreviewEvent(
  app: App,
  event: MouseEvent,
  containerEl: HTMLElement,
  filePath: string
) {
  console.log("markdownButtonHoverPreviewEvent ...");
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
