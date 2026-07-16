/**
 * sortfilter.js  —  Domain helper: order & filter the item set
 * ---------------------------------------------------------------------------
 * Given the in-memory item set, applies the user's sort/filter choices before
 * rendering. Operates over the already-fetched items (no re-query).
 *
 * Exports:
 *   - applySortFilter(items, { sortBy, direction, typeFilter }) -> items[]
 *
 * Sort options:   'date' | 'type' | 'size'
 * Direction:      'asc' | 'desc'  (default 'desc')
 * Type filter:    'all' | 'text' | 'file'
 *
 * Related docs: docs/10-subsystems/ui-shell-and-views.md      (Layer 1)
 *               docs/20-components/toolbar-sortfilter.md       (Layer 2)
 *               docs/30-data-and-api/client-sdk-contracts.md   (Layer 3)
 */

/**
 * Get the sortable "size" value for an item.
 * Files use file_size; notes use content length.
 * @param {object} item
 * @returns {number}
 */
function itemSize(item) {
  if (item.type === "file") return item.file_size || 0;
  return (item.content || "").length;
}

/**
 * Apply filter and sort to an item array.
 * Returns a new sorted, filtered array (does not mutate the input).
 *
 * @param {object[]} items
 * @param {{ sortCombined: string, typeFilter: string, search: string }} sel
 * @returns {object[]}
 */
export function applySortFilter(items, sel) {
  const { sortCombined = "date-desc", typeFilter = "all", search = "" } = sel || {};

  // 1. Filter by type and search
  const result = items.filter((i) => {
    if (typeFilter !== "all" && i.type !== typeFilter) return false;
    
    if (search) {
      const title = (i.title || i.file_name || "").toLowerCase();
      const content = (i.content || "").toLowerCase();
      if (!title.includes(search) && !content.includes(search)) return false;
    }
    
    return true;
  });

  // 2. Sort
  result.sort((a, b) => {
    if (sortCombined === "date-desc") {
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    } else if (sortCombined === "date-asc") {
      return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
    } else if (sortCombined === "alpha-asc" || sortCombined === "alpha-desc") {
      const nameA = (a.title || a.file_name || "").toLowerCase();
      const nameB = (b.title || b.file_name || "").toLowerCase();
      const cmp = nameA.localeCompare(nameB);
      return sortCombined === "alpha-asc" ? cmp : -cmp;
    }
    return 0;
  });

  return result;
}
