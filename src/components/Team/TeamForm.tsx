import React, { useState } from 'react';
import { db } from '../../firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { Categories } from '../../commons/constants/categories';

function TeamForm() {
  const [name, setName] = useState('');
  const [box, setBox] = useState('');
  const [category, setCategory] = useState<string>(Categories[0]);
  const [atleta1, setAtleta1] = useState('');
  const [atleta2, setAtleta2] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

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
      // 1. Cria o Documento do Time
      const teamRef = await addDoc(collection(db, "teams"), {
        name: name,
        category: category,
        box: box,
        totalPoints: 0, 
        generalRank: 0,
        createdAt: serverTimestamp(), 
      });

      // 2. Adiciona os Documentos dos Atletas (Membros)
      // Usamos o timeRef.id como teamId (referência)
      await addDoc(collection(db, "athletes"), {
        name: atleta1,
        teamId: teamRef.id,
        role: "Membro 1",
        category: category,
      });

      await addDoc(collection(db, "athletes"), {
        name: atleta2,
        teamId: teamRef.id,
        role: "Membro 2",
        category: category,
      });
      
      setMessage(`Time "${name}" e atletas adicionados com sucesso!`);
      // Limpa o formulário
      setName('');
      setBox('');
      setAtleta1('');
      setAtleta2('');

    } catch (error) {
      console.error("Erro ao adicionar time:", error);
      setMessage("Erro ao adicionar o time. Verifique o console.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="team-form-card">
      <h3>Adicionar Novo Time</h3>
      <form onSubmit={handleSubmit}>
        {/* Campos do Time */}
        <input type="text" placeholder="Nome do Time" value={name} onChange={(e) => setName(e.target.value)} required />
        <input type="text" placeholder="Box de Origem" value={box} onChange={(e) => setBox(e.target.value)} required />
        
        {/* Seleção de Categoria */}
        <select value={category} onChange={(e) => setCategory(e.target.value as string)}>
          {Categories.map(cat => (
            <option key={cat} value={cat}>{cat}</option>
          ))}
        </select>
        
        {/* Campos dos Atletas (Input Simples) */}
        <input type="text" placeholder="Nome do Atleta 1" value={atleta1} onChange={(e) => setAtleta1(e.target.value)} required />
        <input type="text" placeholder="Nome do Atleta 2" value={atleta2} onChange={(e) => setAtleta2(e.target.value)} required />

        <button type="submit" disabled={loading}>
          {loading ? 'Salvando...' : 'Salvar Time'}
        </button>
      </form>
      {message && <p className={message.includes('sucesso') ? 'success' : 'error'}>{message}</p>}
    </div>
  );
}

export default TeamForm;