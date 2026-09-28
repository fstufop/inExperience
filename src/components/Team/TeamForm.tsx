import React, { useState, useEffect } from 'react';
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

  useEffect(() => {
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
