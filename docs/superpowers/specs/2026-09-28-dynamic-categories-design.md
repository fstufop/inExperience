# Dynamic Categories

**Date:** 2026-09-28  
**Project:** inExperience Admin

---

## Goal

Replace the hardcoded `Categories` constant with a Firestore-backed collection, allowing admins to create, rename, reorder, and delete categories between competitions without touching code.

## Firestore Data Model

**Collection:** `categories`  
**Document schema:**
```
{
  name: string,   // e.g. "Evolution F"
  order: number   // integer, 0-based sequential; drives display order everywhere
}
```

No changes to `teams`, `wods`, or `results` — they store `category` as a plain string and continue to do so.

**Ordering invariant:** `order` values are kept contiguous (0, 1, 2, …N-1). On add, `order = max + 1`. On delete, no reindex (gaps are fine; sort by `order` is stable). On reorder (↑/↓), swap the `order` values of the two affected documents via a Firestore batch write.

## Architecture

### CategoriesContext

**File:** `src/contexts/CategoriesContext.tsx`

- Uses `onSnapshot` on the `categories` collection, ordered by `order asc`, to keep state current in real time.
- Exposes via context:
  - `categories: string[]` — ordered list of category names
  - `categoriesLoading: boolean`
- The provider wraps `<Router>` in `App.tsx` so both public and admin routes share the same listener.
- Only one Firestore listener is active for the entire app lifetime.

### CategoriesManagementPage

**File:** `src/pages/Admin/CategoriesManagementPage.tsx`  
**Route:** `/admin/categories`  
**Sidebar label:** "Categorias" / icon: `category`

Operations:

| Action | Behaviour |
|--------|-----------|
| Add | Text input + "Adicionar" button. Writes `{ name, order: currentMax + 1 }`. Clears input on success. |
| Rename | Inline edit: click name → input appears → confirm with Enter or blur. Updates the Firestore document. |
| Reorder ↑/↓ | Swaps `order` values of adjacent documents via `writeBatch`. Buttons disabled at boundaries. |
| Delete | Confirmation modal ("Tem certeza? Times e WODs desta categoria não serão afetados.") → `deleteDoc`. |

No cascading deletes — existing teams and WODs retain their `category` string.

### Consumer updates

All components that currently `import { Categories }` are updated to call `useCategories()` instead. The static `categories.ts` file is deleted.

**ScoreboardPage (`src/pages/ScoreboardPage.tsx`):**  
The `useEffect` that creates per-category `onSnapshot` subscriptions takes `categories` as a dependency. When the context loads or categories change, it tears down existing subscriptions and recreates them. The page-level loading state stays `true` until `categoriesLoading` is `false` and the first snapshot has arrived.

**Other consumers** (TeamForm, TeamList, WodForm, WodList, CompetitionDetailPage):  
Straightforward substitution — replace `Categories` array with `categories` from `useCategories()`. Loading states in forms show a disabled select while `categoriesLoading` is true.

### CategoryType

The static `CategoryType` union type is removed. All type annotations that used it become `string`.

## Files Affected

| File | Change |
|------|--------|
| `src/contexts/CategoriesContext.tsx` | **New** — context + provider + hook |
| `src/pages/Admin/CategoriesManagementPage.tsx` | **New** — CRUD page |
| `src/App.tsx` | Wrap root with `CategoriesProvider`; add `/admin/categories` route |
| `src/components/admin/Sidebar.tsx` | Add "Categorias" menu item |
| `src/pages/ScoreboardPage.tsx` | Consume `useCategories()`; add categories as `useEffect` dep |
| `src/components/Team/TeamForm.tsx` | Replace `Categories` with `useCategories()` |
| `src/components/Team/TeamList.tsx` | Replace `Categories` with `useCategories()` |
| `src/components/Wod/WodForm.tsx` | Replace `Categories` with `useCategories()` |
| `src/components/Wod/WodList.tsx` | Replace `Categories` with `useCategories()` |
| `src/pages/Admin/CompetitionDetailPage.tsx` | Replace `Categories` with `useCategories()` |
| `src/commons/constants/categories.ts` | **Deleted** |

## Out of Scope

- Cascading rename/delete (updating existing teams/WODs when a category is renamed or deleted)
- Drag-and-drop reordering
- Per-competition category sets (categories are global)
