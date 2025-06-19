import { TFile, getFrontMatterInfo } from "obsidian";
import store, { allAllowedFiles } from "src/components/store";

import { get } from "svelte/store";

export function refreshView() {
  // store.refreshSignal.set(!$refreshSignal);
  store.files.set(get(allAllowedFiles));
}

// Helper function to determine if a file is empty
export const isFileEmpty = async (file: TFile) => {
  const content = await file.vault.cachedRead(file);
  // console.log("Content with frontmatter :\n", content);
  const frontMatter = getFrontMatterInfo(content).exists
    ? getFrontMatterInfo(content).frontmatter
    : "";
  const contentWithoutfrontmatter = content
    .replace(`---\n${frontMatter}---`, "")
    .trim();
  if (file.path.includes("Archived")) {
    // console.log(
    //   "Only frontmatter :\n",
    //   frontMatter,
    //   "\nContent without frontmatter :\n",
    //   contentWithoutfrontmatter,
    //   "\nLenth : ",
    //   contentWithoutfrontmatter.length === 0 ? true : false
    // );
  }
  return contentWithoutfrontmatter.length === 0;
};
