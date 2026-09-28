import React, { useState } from 'react';
import { db } from '../../firebase';
import { collection, addDoc, deleteDoc, writeBatch, doc, getDocs, query, where } from 'firebase/firestore';
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

  const startEdit = (cat: CategoryDoc) => {
    setEditingId(cat.id);
    setEditingName(cat.name);
    setError('');
  };

  const handleRename = async (id: string) => {
    if (!editingName.trim()) { setError('O nome não pode estar vazio.'); return; }
    const newNameTrimmed = editingName.trim();
    const oldCat = categoryDocs.find(c => c.id === id);
    if (!oldCat || oldCat.name === newNameTrimmed) { setEditingId(null); return; }
    const oldName = oldCat.name;
    setError('');
    try {
      const batch = writeBatch(db);
      batch.update(doc(db, 'categories', id), { name: newNameTrimmed });

      const [teamsSnap, wodsSnap] = await Promise.all([
        getDocs(query(collection(db, 'teams'), where('category', '==', oldName))),
        getDocs(query(collection(db, 'wods'), where('category', '==', oldName))),
      ]);
      teamsSnap.docs.forEach(d => batch.update(d.ref, { category: newNameTrimmed }));
      wodsSnap.docs.forEach(d => batch.update(d.ref, { category: newNameTrimmed }));

      await batch.commit();
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
