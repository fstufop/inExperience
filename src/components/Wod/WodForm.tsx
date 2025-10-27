import React, { useState } from 'react';
import { db } from '../../firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import type { Wod, WodType } from '../../types/Wod';
import { Categories } from '../../commons/constants/categories';

const WodTypes: WodType[] = ['Time', 'Reps', 'Load'];

interface WodFormProps {
    nextOrder: number;
}

function WodForm({ nextOrder }: WodFormProps) {
  const [name, setName] = useState('');
  const [type, setType] = useState<Wod['type']>('Time');
  const [category, setCategory] = useState<string>(Categories[0]);
  const [maxPoints, setMaxPoints] = useState(100);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');

    if (!name || maxPoints <= 0) {
        setMessage('Preencha o nome da prova e defina a pontuação máxima.');
        setLoading(false);
        return;
    }

    try {
      await addDoc(collection(db, "wods"), {
        name: name,
        type: type,
        category: category,
        maxPoints: maxPoints,
        order: nextOrder,
        status: 'not started',
        createdAt: serverTimestamp(),
      });
      
      setMessage(`Prova "${name}" (#${nextOrder}) adicionada com sucesso!`);
      setName('');
      setMaxPoints(100);

    } catch (error) {
      console.error("Erro ao adicionar prova:", error);
      setMessage("Erro ao adicionar a prova. Verifique o console.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="wod-form-card">
      <h3>Adicionar Nova Prova (WOD)</h3>
      <form onSubmit={handleSubmit}>
        <input 
            type="text" 
            placeholder="Nome da Prova (Ex: WOD 1: Clean & Jerk)" 
            value={name} 
            onChange={(e) => setName(e.target.value)} 
            required 
        />
        
        {/* Categoria */}
        <label>Categoria:</label>
        <select value={category} onChange={(e) => setCategory(e.target.value)}>
          {Categories.map(cat => (
            <option key={cat} value={cat}>{cat}</option>
          ))}
        </select>

        {/* Tipo de Pontuação */}
        <label>Tipo de Pontuação:</label>
        <select value={type} onChange={(e) => setType(e.target.value as Wod['type'])}>
          {WodTypes.map(t => (
            <option key={t} value={t}>{t} ({t === 'Time' ? 'Menor é melhor' : 'Maior é melhor'})</option>
          ))}
        </select>
        
        {/* Pontuação Máxima */}
        <label>Pontuação Máxima (1º Lugar):</label>
        <input 
            type="number" 
            placeholder="Máx. Pontos" 
            value={maxPoints} 
            onChange={(e) => setMaxPoints(parseInt(e.target.value))} 
            required 
            min="1"
        />
        
        <p>Ordem de Exibição: <strong>#{nextOrder}</strong></p>

        <button type="submit" disabled={loading}>
          {loading ? 'Salvando...' : 'Salvar WOD'}
        </button>
      </form>
      {message && <p className={message.includes('sucesso') ? 'success' : 'error'}>{message}</p>}
    </div>
  );
}

export default WodForm;