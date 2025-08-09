import { TFile, getFrontMatterInfo } from "obsidian";
import store, { allAllowedFiles } from "src/store";

import { get } from "svelte/store";

export function refreshView() {
  // store.refreshSignal.set(!$refreshSignal);
  store.files.set(get(allAllowedFiles));
}

/**
 * Pulls the content without frontmatter from a file.
 * @param file - The file object.
 * @returns The content without frontmatter.
 */
export const pullContentWithoutFrontmatter = async (file: TFile) => {
  const content = await file.vault.cachedRead(file);
  // console.log("Content with frontmatter :\n", content);
  const frontMatter = getFrontMatterInfo(content).exists
    ? getFrontMatterInfo(content).frontmatter
    : "";
  const contentWithoutfrontmatter = content
    .replace(`---\n${frontMatter}---`, "")
    .trim();

  // if (file.path.includes("Archived")) {
  //   console.log(
  //     "Only frontmatter :\n",
  //     frontMatter,
  //     "\nContent without frontmatter :\n",
  //     contentWithoutfrontmatter,
  //     "\nLenth : ",
  //     contentWithoutfrontmatter.length === 0 ? true : false
  //   );
  // }

  return contentWithoutfrontmatter;
};

/**
 * Checks if a string is a valid regular expression.
 *
 * @param str - The string to check.
 * @returns `true` if the string is a valid regular expression, `false` otherwise.
 */
export function isValidRegExp(str: string): boolean {
  try {
    new RegExp(str);
    return true;
  } catch {
    return false;
  }
}
