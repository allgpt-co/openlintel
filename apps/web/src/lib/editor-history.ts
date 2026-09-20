/** Capture the visible scene before an edit, including saved or remote changes. */
export function recordSceneEdit<T>(
  history: { furniture: T[] }[],
  historyIndex: number,
  currentFurniture: T[],
  nextFurniture: T[],
) {
  const nextHistory = history.slice(0, historyIndex + 1);
  nextHistory[historyIndex] = { furniture: structuredClone(currentFurniture) };
  nextHistory.push({ furniture: structuredClone(nextFurniture) });
  return nextHistory;
}
