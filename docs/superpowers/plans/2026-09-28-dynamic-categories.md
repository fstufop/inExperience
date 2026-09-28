# Dynamic Categories Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the hardcoded `Categories` constant with a Firestore-backed collection so admins can create, rename, reorder, and delete categories between competitions without touching code.

**Architecture:** A `CategoriesContext` wraps the entire app with a single `onSnapshot` listener on the Firestore `categories` collection, providing ordered category names and full docs to all consumers. An admin CRUD page manages the collection. All components that previously imported the static constant are updated to call `useCategories()`.

**Tech Stack:** React 18, TypeScript, Firebase Firestore (web v9 modular SDK), React Context API

**Spec:** `docs/superpowers/specs/2026-09-28-dynamic-categories-design.md`

## Global Constraints

- Firestore collection name: `categories` (lowercase, exact)
- Document schema: `{ name: string, order: number }` — no other fields
- Order values: integers, 0-based; gaps are fine; sort is always `orderBy('order', 'asc')`
- No cascading updates: renaming or deleting a category does NOT update existing teams/WODs
- No drag-and-drop reorder: ↑/↓ buttons only
- `CategoryType` static union type is removed; all annotations become `string`
- `src/commons/constants/categories.ts` is deleted in the final task
- Security rules already allow authenticated writes and public reads — no rule changes needed

## Review Focus

- **Empty categories collection on first load:** Forms (TeamForm, WodForm) show a `<select>` with no options; they must remain submittable-only-when-a-category-exists and not crash. Test: `categories = []` → select is disabled with placeholder text.
- **ScoreboardPage with stale teamsData keys:** When a category is deleted, the old key lingers in `teamsData` state and could render a ghost section. Test: after removing a category, its section must not appear in the scoreboard.
- **Race between categoriesLoading and page loading:** ScoreboardPage must not flip `loading` to false before categories arrive, or it renders 0 category rows. Test: `categoriesLoading = true` → page stays in loading state.
- **Reorder at boundary:** ↑ button on first item and ↓ button on last item must be disabled. Test: index 0 cannot move up; index N-1 cannot move down.
- **Rename to empty string:** Inline rename must not save a blank name. Test: trim + guard before `updateDoc`.

---

## File Map

| File | Status | Responsibility |
|------|--------|---------------|
| `src/contexts/CategoriesContext.tsx` | **Create** | Context, provider, hook — single Firestore listener |
| `src/pages/Admin/CategoriesManagementPage.tsx` | **Create** | CRUD admin page for categories |
| `src/App.tsx` | Modify | Wrap with `CategoriesProvider`; add `/admin/categories` route |
| `src/components/admin/Sidebar.tsx` | Modify | Add "Categorias" menu item |
| `src/pages/ScoreboardPage.tsx` | Modify | Replace static `Categories` with `useCategories()`; split useEffect |
| `src/components/Team/TeamForm.tsx` | Modify | Replace static `Categories` with `useCategories()` |
| `src/components/Team/TeamList.tsx` | Modify | Replace static `Categories` with `useCategories()` |
| `src/components/Wod/WodForm.tsx` | Modify | Replace static `Categories` with `useCategories()` |
| `src/components/Wod/WodList.tsx` | Modify | Replace static `Categories` with `useCategories()` |
| `src/pages/Admin/CompetitionDetailPage.tsx` | Modify | Derive categories from snapshot teams (not context) |
| `src/commons/constants/categories.ts` | **Delete** | Replaced by Firestore-backed context |

---

## Task 1: CategoriesContext

**Files:**
- Create: `src/contexts/CategoriesContext.tsx`

**Interfaces:**
- Produces:
  - `CategoryDoc: { id: string; name: string; order: number }`
  - `useCategories(): { categories: string[], categoryDocs: CategoryDoc[], categoriesLoading: boolean }`
  - `CategoriesProvider: ({ children: ReactNode }) => JSX.Element`

- [ ] **Step 1: Create the context file**

```tsx
// src/contexts/CategoriesContext.tsx
import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { db } from '../firebase';
import { collection, onSnapshot, orderBy, query } from 'firebase/firestore';

export interface CategoryDoc {
  id: string;
  name: string;
  order: number;
}

interface CategoriesContextValue {
  categories: string[];
  categoryDocs: CategoryDoc[];
  categoriesLoading: boolean;
}

const CategoriesContext = createContext<CategoriesContextValue>({
  categories: [],
  categoryDocs: [],
  categoriesLoading: true,
});

export function CategoriesProvider({ children }: { children: ReactNode }) {
  const [categoryDocs, setCategoryDocs] = useState<CategoryDoc[]>([]);
  const [categoriesLoading, setCategoriesLoading] = useState(true);

  useEffect(() => {
    const q = query(collection(db, 'categories'), orderBy('order', 'asc'));
    const unsub = onSnapshot(
      q,
      (snap) => {
        setCategoryDocs(snap.docs.map(d => ({ id: d.id, ...d.data() } as CategoryDoc)));
        setCategoriesLoading(false);
      },
      () => setCategoriesLoading(false),
    );
    return unsub;
  }, []);

  const categories = categoryDocs.map(d => d.name);

  return (
    <CategoriesContext.Provider value={{ categories, categoryDocs, categoriesLoading }}>
      {children}
    </CategoriesContext.Provider>
  );
}

export function useCategories() {
  return useContext(CategoriesContext);
}
```

- [ ] **Step 2: Verify build passes**

```bash
npm run build
```

Expected: no TypeScript errors, build succeeds.

- [ ] **Step 3: Commit**

```bash
git add src/contexts/CategoriesContext.tsx
git commit -m "feat: add CategoriesContext with Firestore onSnapshot"
```

---

## Task 2: Wire provider and route in App.tsx + Sidebar

**Files:**
- Modify: `src/App.tsx`
- Modify: `src/components/admin/Sidebar.tsx`

**Interfaces:**
- Consumes: `CategoriesProvider` from `../contexts/CategoriesContext`
- `CategoriesManagementPage` import is added here but the file is created in Task 3; leave import commented out until Task 3, or add it and accept a temporary build error that Task 3 resolves.

- [ ] **Step 1: Update App.tsx**

Replace the content of `src/App.tsx` with:

```tsx
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { CategoriesProvider } from './contexts/CategoriesContext';
import ScoreboardPage from './pages/ScoreboardPage';
import SchedulePage from './pages/SchedulePage';
import WodDescriptionPage from './pages/WodDescriptionPage';
import AdminLoginPage from './pages/Admin/AdminLoginPage';
import AdminLayout from './pages/Admin/AdminDashboard';
import ProtectedRoute from './components/ProtectedRoute';
import ScoreboardAdmin from './pages/Admin/ScoreboardAdmin';
import TeamsManagementPage from './pages/Admin/TeamsManagementPage';
import WodsManagementPage from './pages/Admin/WodsManagementPage';
import ScoreEntryPage from './pages/Admin/ScoreEntryPage';
import UpdateWodDescriptions from './pages/Admin/UpdateWodDescriptions';
import CompetitionHistoryPage from './pages/Admin/CompetitionHistoryPage';
import CompetitionDetailPage from './pages/Admin/CompetitionDetailPage';
import CategoriesManagementPage from './pages/Admin/CategoriesManagementPage';

function App() {
  return (
    <CategoriesProvider>
      <Router>
        <Routes>
          <Route path="/" element={<ScoreboardPage />} />
          <Route path="/schedule" element={<SchedulePage />} />
          <Route path="/wods" element={<WodDescriptionPage />} />
          <Route path="/admin/login" element={<AdminLoginPage />} />
          <Route element={<ProtectedRoute />}>
            <Route path="/admin/" element={<AdminLayout />}>
              <Route index element={<ScoreboardAdmin />} />
              <Route path="scoreboard" element={<ScoreboardAdmin />} />
              <Route path="teams" element={<TeamsManagementPage />} />
              <Route path="wods" element={<WodsManagementPage />} />
              <Route path="wods/update-descriptions" element={<UpdateWodDescriptions />} />
              <Route path="score-entry" element={<ScoreEntryPage />} />
              <Route path="history" element={<CompetitionHistoryPage />} />
              <Route path="history/:id" element={<CompetitionDetailPage />} />
              <Route path="categories" element={<CategoriesManagementPage />} />
            </Route>
          </Route>
          <Route path="*" element={<h1>404 - Not Found</h1>} />
        </Routes>
      </Router>
    </CategoriesProvider>
  );
}

export default App;
```

- [ ] **Step 2: Add "Categorias" to Sidebar**

In `src/components/admin/Sidebar.tsx`, add the new item after `wods` and before `history`:

```tsx
const menuItems: MenuItem[] = [
  { id: 'scoreboard', label: 'Scoreboard', icon: 'emoji_events', path: '/admin/scoreboard' },
  { id: 'scores', label: 'Registrar Resultados', icon: 'assessment', path: '/admin/score-entry' },
  { id: 'teams', label: 'Cadastrar Times', icon: 'groups', path: '/admin/teams' },
  { id: 'wods', label: 'Cadastrar Provas (WODs)', icon: 'assignment', path: '/admin/wods' },
  { id: 'categories', label: 'Categorias', icon: 'category', path: '/admin/categories' },
  { id: 'history', label: 'Histórico', icon: 'history', path: '/admin/history' },
  { id: 'logout', label: 'Sair', icon: 'logout', path: '/admin/login' },
];
```

- [ ] **Step 3: Commit** (after Task 3 resolves the missing import)

Hold this commit — complete in Task 3 step below.

---

## Task 3: CategoriesManagementPage

**Files:**
- Create: `src/pages/Admin/CategoriesManagementPage.tsx`

**Interfaces:**
- Consumes: `useCategories()` → `{ categoryDocs: CategoryDoc[], categoriesLoading: boolean }`
- Firestore ops: `addDoc`, `updateDoc`, `deleteDoc`, `writeBatch`, `doc`, `collection` from `firebase/firestore`

- [ ] **Step 1: Create the page**

```tsx
// src/pages/Admin/CategoriesManagementPage.tsx
import { useState } from 'react';
import { db } from '../../firebase';
import { collection, addDoc, updateDoc, deleteDoc, writeBatch, doc } from 'firebase/firestore';
import { useCategories, type CategoryDoc } from '../../contexts/CategoriesContext';
import Loading from '../../components/Loading';

export default function CategoriesManagementPage() {
  const { categoryDocs, categoriesLoading } = useCategories();
  const [newName, setNewName] = useState('');
  const [adding, setAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');
  const [deleteTarget, setDeleteTarget] = useState<CategoryDoc | null>(null);
  const [error, setError] = useState('');

  if (categoriesLoading) return <Loading message="Carregando categorias..." size="medium" />;

  const handleAdd = async () => {
    if (!newName.trim()) return;
    setAdding(true);
    setError('');
    try {
      const maxOrder = categoryDocs.reduce((max, c) => Math.max(max, c.order), -1);
      await addDoc(collection(db, 'categories'), { name: newName.trim(), order: maxOrder + 1 });
      setNewName('');
    } catch {
      setError('Erro ao adicionar categoria.');
    } finally {
      setAdding(false);
    }
  };

  const startEdit = (doc: CategoryDoc) => {
    setEditingId(doc.id);
    setEditingName(doc.name);
    setError('');
  };

  const handleRename = async (id: string) => {
    if (!editingName.trim()) { setError('O nome não pode estar vazio.'); return; }
    setError('');
    try {
      await updateDoc(doc(db, 'categories', id), { name: editingName.trim() });
      setEditingId(null);
    } catch {
      setError('Erro ao renomear.');
    }
  };

  const handleMoveUp = async (index: number) => {
    if (index === 0) return;
    const a = categoryDocs[index];
    const b = categoryDocs[index - 1];
    const batch = writeBatch(db);
    batch.update(doc(db, 'categories', a.id), { order: b.order });
    batch.update(doc(db, 'categories', b.id), { order: a.order });
    await batch.commit();
  };

  const handleMoveDown = async (index: number) => {
    if (index === categoryDocs.length - 1) return;
    const a = categoryDocs[index];
    const b = categoryDocs[index + 1];
    const batch = writeBatch(db);
    batch.update(doc(db, 'categories', a.id), { order: b.order });
    batch.update(doc(db, 'categories', b.id), { order: a.order });
    await batch.commit();
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setError('');
    try {
      await deleteDoc(doc(db, 'categories', deleteTarget.id));
      setDeleteTarget(null);
    } catch {
      setError('Erro ao deletar categoria.');
    }
  };

  return (
    <div className="admin-page-container">
      <h1>Categorias</h1>
      <p style={{ color: '#888', marginBottom: '1.5rem' }}>
        A ordem aqui é a ordem de exibição no scoreboard e nos formulários.
        Times e WODs existentes não são afetados ao renomear ou deletar.
      </p>

      {/* Add new */}
      <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '2rem', maxWidth: '480px' }}>
        <input
          type="text"
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') handleAdd(); }}
          placeholder="Nome da nova categoria"
          disabled={adding}
          style={{
            flex: 1, padding: '0.75rem 1rem', background: '#2a2a2a', color: '#fff',
            border: '1px solid #444', borderRadius: '8px', fontSize: '1rem',
          }}
        />
        <button
          onClick={handleAdd}
          disabled={adding || !newName.trim()}
          style={{
            padding: '0.75rem 1.25rem', background: 'linear-gradient(135deg, #33cc33, #29a329)',
            color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer',
            fontWeight: 'bold', opacity: adding || !newName.trim() ? 0.5 : 1,
          }}
        >
          {adding ? 'Adicionando...' : 'Adicionar'}
        </button>
      </div>

      {error && <p style={{ color: '#f44336', marginBottom: '1rem' }}>{error}</p>}

      {/* Category list */}
      {categoryDocs.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '3rem', color: '#888' }}>
          <span className="material-symbols-outlined" style={{ fontSize: '3rem', display: 'block', marginBottom: '0.5rem' }}>category</span>
          <p>Nenhuma categoria cadastrada ainda.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', maxWidth: '600px' }}>
          {categoryDocs.map((cat, index) => (
            <div
              key={cat.id}
              style={{
                display: 'flex', alignItems: 'center', gap: '0.75rem',
                background: '#1e1e1e', borderRadius: '8px', padding: '0.75rem 1rem',
                border: '1px solid #333',
              }}
            >
              {/* Order buttons */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                <button
                  onClick={() => handleMoveUp(index)}
                  disabled={index === 0}
                  style={orderBtn(index === 0)}
                  title="Mover para cima"
                >
                  <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>arrow_upward</span>
                </button>
                <button
                  onClick={() => handleMoveDown(index)}
                  disabled={index === categoryDocs.length - 1}
                  style={orderBtn(index === categoryDocs.length - 1)}
                  title="Mover para baixo"
                >
                  <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>arrow_downward</span>
                </button>
              </div>

              {/* Name / inline edit */}
              {editingId === cat.id ? (
                <input
                  autoFocus
                  value={editingName}
                  onChange={(e) => setEditingName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleRename(cat.id);
                    if (e.key === 'Escape') setEditingId(null);
                  }}
                  onBlur={() => handleRename(cat.id)}
                  style={{
                    flex: 1, background: '#333', color: '#fff', border: '1px solid #555',
                    borderRadius: '6px', padding: '0.4rem 0.75rem', fontSize: '1rem',
                  }}
                />
              ) : (
                <span
                  style={{ flex: 1, cursor: 'pointer', color: '#fff' }}
                  onClick={() => startEdit(cat)}
                  title="Clique para renomear"
                >
                  {cat.name}
                </span>
              )}

              {/* Delete */}
              <button
                onClick={() => setDeleteTarget(cat)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#f44336', padding: '4px' }}
                title="Deletar"
              >
                <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>delete</span>
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Delete confirmation modal */}
      {deleteTarget && (
        <div
          style={{
            position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999,
          }}
          onClick={(e) => { if (e.target === e.currentTarget) setDeleteTarget(null); }}
        >
          <div style={{
            background: '#1e1e1e', borderRadius: '12px', padding: '2rem',
            maxWidth: '420px', width: '100%', boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
          }}>
            <h2 style={{ margin: '0 0 1rem', color: '#fff' }}>Deletar categoria?</h2>
            <p style={{ color: '#aaa', marginBottom: '0.5rem' }}>
              A categoria <strong style={{ color: '#fff' }}>"{deleteTarget.name}"</strong> será removida.
            </p>
            <p style={{ color: '#888', fontSize: '0.85rem', marginBottom: '1.5rem' }}>
              Times e WODs cadastrados com esta categoria não serão alterados.
            </p>
            <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end' }}>
              <button
                onClick={() => setDeleteTarget(null)}
                style={{ padding: '0.75rem 1.5rem', background: '#444', color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' }}
              >
                Cancelar
              </button>
              <button
                onClick={handleDelete}
                style={{ padding: '0.75rem 1.5rem', background: 'linear-gradient(135deg, #f44336, #c62828)', color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' }}
              >
                Deletar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const orderBtn = (disabled: boolean): React.CSSProperties => ({
  background: 'none', border: 'none', cursor: disabled ? 'not-allowed' : 'pointer',
  color: disabled ? '#444' : '#888', padding: '2px', lineHeight: 1,
  display: 'flex', alignItems: 'center',
});
```

- [ ] **Step 2: Verify build passes**

```bash
npm run build
```

Expected: no errors. The `CategoriesManagementPage` import in `App.tsx` now resolves correctly.

- [ ] **Step 3: Commit Tasks 2 + 3 together**

```bash
git add src/App.tsx src/components/admin/Sidebar.tsx src/pages/Admin/CategoriesManagementPage.tsx
git commit -m "feat: add CategoriesManagementPage and wire provider + route"
```

- [ ] **Step 4: Manual smoke test**
  - Navigate to `/admin/categories`
  - Add a category → it appears in the list
  - Reorder with ↑/↓ → order updates live
  - Rename inline (click name, type, Enter) → name updates
  - Delete → confirmation modal → category removed
  - ↑ button on first item is disabled; ↓ on last item is disabled

---

## Task 4: Update form consumers (TeamForm, WodForm, TeamList, WodList)

**Files:**
- Modify: `src/components/Team/TeamForm.tsx`
- Modify: `src/components/Team/TeamList.tsx`
- Modify: `src/components/Wod/WodForm.tsx`
- Modify: `src/components/Wod/WodList.tsx`

**Interfaces:**
- Consumes: `useCategories()` → `{ categories: string[], categoriesLoading: boolean }`

The pattern is identical in all four files:

1. Remove `import { Categories } from '../../commons/constants/categories';`
2. Add `import { useCategories } from '../../contexts/CategoriesContext';`
3. Inside component, add `const { categories, categoriesLoading } = useCategories();`
4. Replace `Categories[0]` with `categories[0] ?? ''` in `useState` initialisers
5. Replace `Categories.map(...)` with `categories.map(...)` in JSX
6. Add `disabled={categoriesLoading || categories.length === 0}` to the `<select>` element

- [ ] **Step 1: Update TeamForm.tsx**

```tsx
// src/components/Team/TeamForm.tsx
import React, { useState } from 'react';
import { db } from '../../firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { useCategories } from '../../contexts/CategoriesContext';

function TeamForm() {
  const { categories, categoriesLoading } = useCategories();
  const [name, setName] = useState('');
  const [box, setBox] = useState('');
  const [category, setCategory] = useState('');
  const [atleta1, setAtleta1] = useState('');
  const [atleta2, setAtleta2] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  // Keep selected category in sync when categories load
  React.useEffect(() => {
    if (categories.length > 0 && !category) setCategory(categories[0]);
  }, [categories, category]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');

    if (!name || !box || !atleta1 || !atleta2) {
      setMessage('Preencha todos os campos obrigatórios.');
      setLoading(false);
      return;
    }

    try {
      const teamRef = await addDoc(collection(db, 'teams'), {
        name,
        category,
        box,
        totalPoints: 0,
        generalRank: 0,
        createdAt: serverTimestamp(),
      });

      await addDoc(collection(db, 'athletes'), { name: atleta1, teamId: teamRef.id, role: 'Membro 1', category });
      await addDoc(collection(db, 'athletes'), { name: atleta2, teamId: teamRef.id, role: 'Membro 2', category });

      setMessage(`Time "${name}" e atletas adicionados com sucesso!`);
      setName(''); setBox(''); setAtleta1(''); setAtleta2('');
    } catch (error) {
      console.error('Erro ao adicionar time:', error);
      setMessage('Erro ao adicionar o time. Verifique o console.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="team-form-card">
      <h3>Adicionar Novo Time</h3>
      <form onSubmit={handleSubmit}>
        <input type="text" placeholder="Nome do Time" value={name} onChange={(e) => setName(e.target.value)} required />
        <input type="text" placeholder="Box de Origem" value={box} onChange={(e) => setBox(e.target.value)} required />
        <select
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          disabled={categoriesLoading || categories.length === 0}
        >
          {categories.length === 0
            ? <option value="">Nenhuma categoria cadastrada</option>
            : categories.map(cat => <option key={cat} value={cat}>{cat}</option>)
          }
        </select>
        <input type="text" placeholder="Nome do Atleta 1" value={atleta1} onChange={(e) => setAtleta1(e.target.value)} required />
        <input type="text" placeholder="Nome do Atleta 2" value={atleta2} onChange={(e) => setAtleta2(e.target.value)} required />
        <button type="submit" disabled={loading || categories.length === 0}>
          {loading ? 'Salvando...' : 'Salvar Time'}
        </button>
      </form>
      {message && <p className={message.includes('sucesso') ? 'success' : 'error'}>{message}</p>}
    </div>
  );
}

export default TeamForm;
```

- [ ] **Step 2: Update WodForm.tsx**

Apply the same pattern to `src/components/Wod/WodForm.tsx`:

```tsx
// src/components/Wod/WodForm.tsx — top of file
import { useCategories } from '../../contexts/CategoriesContext';
// Remove: import { Categories } from '../../commons/constants/categories';

// Inside WodForm():
const { categories, categoriesLoading } = useCategories();
const [category, setCategory] = useState('');

// Keep in sync:
React.useEffect(() => {
  if (categories.length > 0 && !category) setCategory(categories[0]);
}, [categories, category]);

// In JSX, replace the <select> for category:
<select
  value={category}
  onChange={(e) => setCategory(e.target.value)}
  disabled={categoriesLoading || categories.length === 0}
>
  {categories.length === 0
    ? <option value="">Nenhuma categoria cadastrada</option>
    : categories.map(cat => <option key={cat} value={cat}>{cat}</option>)
  }
</select>

// Also disable the submit button when no categories:
<button type="submit" disabled={loading || categories.length === 0}>
```

- [ ] **Step 3: Update TeamList.tsx**

In `src/components/Team/TeamList.tsx`:

```tsx
// Remove:
import { Categories } from '../../commons/constants/categories';

// Add at top of file:
import { useCategories } from '../../contexts/CategoriesContext';

// Inside TeamList component (after existing state declarations):
const { categories, categoriesLoading } = useCategories();

// Around line 26, replace:
//   setEditCategory(wod.category || Categories[0]);
// with:
setEditCategory(team.category);

// In the edit modal JSX, find the <select> for category and replace with:
<select
  value={editCategory}
  onChange={(e) => setEditCategory(e.target.value)}
  disabled={categoriesLoading}
>
  {categories.map(cat => <option key={cat} value={cat}>{cat}</option>)}
</select>
```

- [ ] **Step 4: Update WodList.tsx**

In `src/components/Wod/WodList.tsx`:

```tsx
// Remove:
import { Categories } from '../../commons/constants/categories';

// Add:
import { useCategories } from '../../contexts/CategoriesContext';

// Inside WodList component:
const { categories, categoriesLoading } = useCategories();

// Replace:
//   setEditCategory(wod.category || Categories[0]);
// with:
setEditCategory(wod.category);

// In edit modal JSX, find the category <select> and replace with:
<select
  value={editCategory}
  onChange={(e) => setEditCategory(e.target.value)}
  disabled={categoriesLoading}
>
  {categories.map(cat => <option key={cat} value={cat}>{cat}</option>)}
</select>
```

- [ ] **Step 5: Verify build passes**

```bash
npm run build
```

Expected: no TypeScript errors.

- [ ] **Step 6: Commit**

```bash
git add src/components/Team/TeamForm.tsx src/components/Team/TeamList.tsx \
        src/components/Wod/WodForm.tsx src/components/Wod/WodList.tsx
git commit -m "feat: replace static Categories with useCategories() in form consumers"
```

---

## Task 5: Update ScoreboardPage

**Files:**
- Modify: `src/pages/ScoreboardPage.tsx`

**Interfaces:**
- Consumes: `useCategories()` → `{ categories: string[], categoriesLoading: boolean }`

The key change: split the single `useEffect` into two — one for wods+results (no dependency on categories) and one for team subscriptions (depends on categories). Also update the general scoreboard render to respect category order from context.

- [ ] **Step 1: Update ScoreboardPage.tsx**

Replace the top of the file (imports + component opening) as follows. The WOD tab still uses `categories` from context instead of the old `Categories` constant.

```tsx
// src/pages/ScoreboardPage.tsx
import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useCategories } from '../contexts/CategoriesContext';
import { db } from '../firebase';
import { collection, query, where, orderBy, onSnapshot } from 'firebase/firestore';
import ScoreBoardCategory from '../components/ScoreBoardCategory';
import type { Team } from '../types/Team';
import type { Wod } from '../types/Wod';
import type { Result } from '../types/Result';
import logo from '../assets/logo.png';
import Loading from '../components/Loading';

function ScoreboardPage() {
  const navigate = useNavigate();
  const { categories, categoriesLoading } = useCategories();
  const [teamsData, setTeamsData] = useState<Record<string, Team[]>>({});
  const [loading, setLoading] = useState(true);
  const [wods, setWods] = useState<Wod[]>([]);
  const [resultsData, setResultsData] = useState<Result[]>([]);
  const [activeWodNumber, setActiveWodNumber] = useState<number | 'general'>('general');

  // Effect 1: wods + results (no category dependency)
  useEffect(() => {
    const unsubs: (() => void)[] = [];

    const qWods = query(collection(db, 'wods'), orderBy('order', 'asc'));
    unsubs.push(onSnapshot(qWods, (snap) => {
      setWods(snap.docs.map(d => ({ id: d.id, ...d.data() } as Wod)));
    }));

    const qResults = query(collection(db, 'results'));
    unsubs.push(onSnapshot(qResults, (snap) => {
      setResultsData(snap.docs.map(d => ({ id: d.id, ...d.data() } as Result)));
    }));

    return () => unsubs.forEach(u => u());
  }, []);

  // Effect 2: team subscriptions — recreated whenever categories change
  useEffect(() => {
    if (categoriesLoading) return;

    if (categories.length === 0) {
      setTeamsData({});
      setLoading(false);
      return;
    }

    // Remove stale keys from previous category set
    setTeamsData(prev => {
      const next: Record<string, Team[]> = {};
      categories.forEach(cat => { if (prev[cat]) next[cat] = prev[cat]; });
      return next;
    });

    const unsubs: (() => void)[] = [];

    categories.forEach(category => {
      const q = query(
        collection(db, 'teams'),
        where('category', '==', category),
        orderBy('totalPoints', 'desc'),
      );
      unsubs.push(onSnapshot(q, (snap) => {
        const teams: Team[] = snap.docs.map(d => ({ id: d.id, ...d.data() } as Team));
        setTeamsData(prev => ({ ...prev, [category]: teams }));
        setLoading(false);
      }, () => setLoading(false)));
    });

    return () => unsubs.forEach(u => u());
  }, [categories, categoriesLoading]);
```

Then in the JSX, update the two render sections:

```tsx
  // General scoreboard: render in category order from context, skip empty
  {activeWodNumber === 'general' ? (
    <div className="category-list">
      {categories.map(category => {
        const teams = teamsData[category] || [];
        if (teams.length === 0) return null;
        return (
          <ScoreBoardCategory
            key={category}
            categoryName={category}
            teams={teams}
            showResult={false}
          />
        );
      })}
    </div>
  ) : (
    // WOD view: same as before but use `categories` from context
    <div className="category-list">
      {categories.map(category => {
        const wodForCategory = wods.find(w => {
          const match = w.name.match(/(?:Prova|WOD)\s*(\d+)/i);
          const wodNum = match ? parseInt(match[1]) : w.order;
          return wodNum === activeWodNumber && w.category === category;
        });
        if (!wodForCategory) return null;

        const wodResults = resultsData.filter(r =>
          r.wodId === wodForCategory.id && r.category === category
        );
        const teamsWithWodResults = (teamsData[category] || []).map(team => {
          const teamResult = wodResults.find(r => r.teamId === team.id);
          return { ...team, wodResult: teamResult };
        });
        const sortedTeams = teamsWithWodResults.sort((a, b) => {
          if (!a.wodResult && b.wodResult) return 1;
          if (a.wodResult && !b.wodResult) return -1;
          return (a.wodResult?.wodRank || 999) - (b.wodResult?.wodRank || 999);
        });

        return (
          <div key={category} style={{ marginBottom: '2rem' }}>
            <ScoreBoardCategory
              categoryName={category}
              teams={sortedTeams.map(({ wodResult, ...team }) => ({
                ...team,
                totalPoints: wodResult?.awardedPoints || 0,
                rawScore: wodResult?.rawScore,
                timeCapReached: wodResult?.timeCapReached,
                repsRemaining: wodResult?.repsRemaining,
                wodRank: wodResult?.wodRank,
              }))}
              showResult={true}
              wodStatus={wodForCategory.status}
            />
          </div>
        );
      })}
    </div>
  )}
```

The loading guard at the top of the render block should check both:
```tsx
if (loading || categoriesLoading) {
  return <Loading message="Carregando Placar..." size="large" />;
}
```

- [ ] **Step 2: Verify build passes**

```bash
npm run build
```

- [ ] **Step 3: Commit**

```bash
git add src/pages/ScoreboardPage.tsx
git commit -m "feat: replace static Categories with useCategories() in ScoreboardPage"
```

---

## Task 6: Update CompetitionDetailPage + delete categories.ts

**Files:**
- Modify: `src/pages/Admin/CompetitionDetailPage.tsx`
- Delete: `src/commons/constants/categories.ts`

CompetitionDetailPage shows historical snapshot data — it must NOT use the live context categories. Instead it derives categories from the saved `teams` array in the snapshot.

- [ ] **Step 1: Update CompetitionDetailPage.tsx**

Remove the `Categories` import:
```tsx
// Remove this line:
import { Categories } from '../../commons/constants/categories';
```

In `ScoreboardTab`, replace the `Categories.map(...)` call:
```tsx
// Before:
function ScoreboardTab({ teams }: { teams: Team[] }) {
  return (
    <div>
      {Categories.map(category => {

// After:
function ScoreboardTab({ teams }: { teams: Team[] }) {
  const uniqueCategories = [...new Set(teams.map(t => t.category))].sort();
  return (
    <div>
      {uniqueCategories.map(category => {
```

The rest of the function body is unchanged.

- [ ] **Step 2: Delete categories.ts**

```bash
git rm src/commons/constants/categories.ts
```

- [ ] **Step 3: Verify build passes**

```bash
npm run build
```

Expected: clean build with no references to `categories.ts`.

- [ ] **Step 4: Commit**

```bash
git add src/pages/Admin/CompetitionDetailPage.tsx
git commit -m "feat: derive categories from snapshot in CompetitionDetailPage; delete static categories.ts"
```

---

## Task 7: Seed initial categories in Firestore

This is a one-time admin action, not a code change. After deploying:

- [ ] **Step 1:** Log in to the admin panel and navigate to `/admin/categories`
- [ ] **Step 2:** Add the 6 categories for the next competition in order:
  1. Iniciante F
  2. Scale F
  3. Evolution F
  4. Scale M
  5. Evolution M
  6. RX M
- [ ] **Step 3:** Verify the scoreboard at `/` shows the correct category tabs once teams are registered in those categories.
