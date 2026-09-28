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
