import store, { allAllowedFiles } from "src/components/store";

import { get } from "svelte/store";

export function refreshView() {
  // store.refreshSignal.set(!$refreshSignal);
  store.files.set(get(allAllowedFiles));
}
