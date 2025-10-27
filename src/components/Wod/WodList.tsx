import React, { useState } from 'react';
import { db } from '../../firebase';
import { deleteDoc, doc, updateDoc } from 'firebase/firestore';
import type { Wod, WodType } from '../../types/Wod';
import { Categories } from '../../commons/constants/categories';

const WodTypes: WodType[] = ['Time', 'Reps', 'Load'];

interface WodListProps {
    wods: Wod[];
}

const WodList: React.FC<WodListProps> = ({ wods }) => {
    const [editingWod, setEditingWod] = useState<Wod | null>(null);
    const [editName, setEditName] = useState('');
    const [editType, setEditType] = useState<WodType>('Time');
    const [editCategory, setEditCategory] = useState('');
    const [editMaxPoints, setEditMaxPoints] = useState(100);
    const [saving, setSaving] = useState(false);

    const handleEdit = (wod: Wod) => {
        setEditingWod(wod);
        setEditName(wod.name);
        setEditType(wod.type);
        setEditCategory(wod.category || Categories[0]);
        setEditMaxPoints(wod.maxPoints);
    };

    const handleSave = async () => {
        if (!editingWod) return;
        setSaving(true);

        try {
            await updateDoc(doc(db, "wods", editingWod.id), {
                name: editName,
                type: editType,
                category: editCategory,
                maxPoints: editMaxPoints,
            });
            
            setEditingWod(null);
            alert('Prova atualizada com sucesso!');
        } catch (error) {
            console.error("Erro ao atualizar prova:", error);
            alert("Erro ao atualizar a prova.");
        } finally {
            setSaving(false);
        }
    };

    const handleCancel = () => {
        setEditingWod(null);
        setEditName('');
        setEditType('Time');
        setEditCategory('');
        setEditMaxPoints(100);
    };

    const handleDelete = async (wodId: string, wodName: string) => {
        if (!window.confirm(`Tem certeza que deseja DELETAR a prova "${wodName}"? Todos os resultados vinculados serão afetados!`)) {
            return;
        }

        try {
            await deleteDoc(doc(db, "wods", wodId));
            alert(`Prova "${wodName}" deletada com sucesso!`);
        } catch (error) {
            console.error("Erro ao deletar prova:", error);
            alert("Erro ao deletar a prova.");
        }
    };

    const getStatusLabel = (status: string) => {
        const labels: Record<string, string> = {
            'not started': '❌ Não Iniciada',
            'in progress': '🏃 Em Andamento',
            'computing': '⏳ Computando',
            'completed': '✅ Finalizada'
        };
        return labels[status] || status.toUpperCase();
    };

    return (
        <>
            {/* Modal de Edição */}
            {editingWod && (
                <div style={{
                    position: 'fixed',
                    top: '50%',
                    left: '50%',
                    transform: 'translate(-50%, -50%)',
                    background: '#2a2a2a',
                    border: '2px solid #33cc33',
                    borderRadius: '12px',
                    padding: '2rem',
                    zIndex: 1000,
                    minWidth: '400px',
                    maxWidth: '90vw'
                }}>
                    <h3 style={{ marginBottom: '1rem', color: '#33cc33' }}>Editar Prova (WOD)</h3>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                        <input
                            type="text"
                            placeholder="Nome da Prova"
                            value={editName}
                            onChange={(e) => setEditName(e.target.value)}
                            style={{ padding: '0.75rem', borderRadius: '8px', background: '#333', color: '#fff', border: '1px solid #555' }}
                        />
                        
                        <select
                            value={editCategory}
                            onChange={(e) => setEditCategory(e.target.value)}
                            style={{ padding: '0.75rem', borderRadius: '8px', background: '#333', color: '#fff', border: '1px solid #555' }}
                        >
                            {Categories.map(cat => (
                                <option key={cat} value={cat}>{cat}</option>
                            ))}
                        </select>

                        <select
                            value={editType}
                            onChange={(e) => setEditType(e.target.value as WodType)}
                            style={{ padding: '0.75rem', borderRadius: '8px', background: '#333', color: '#fff', border: '1px solid #555' }}
                        >
                            {WodTypes.map(t => (
                                <option key={t} value={t}>{t}</option>
                            ))}
                        </select>

                        <input
                            type="number"
                            placeholder="Pontos Máximos"
                            value={editMaxPoints}
                            onChange={(e) => setEditMaxPoints(parseInt(e.target.value))}
                            min="1"
                            style={{ padding: '0.75rem', borderRadius: '8px', background: '#333', color: '#fff', border: '1px solid #555' }}
                        />

                        <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
                            <button 
                                onClick={handleSave} 
                                disabled={saving}
                                style={{ 
                                    flex: 1, 
                                    padding: '0.75rem', 
                                    background: 'linear-gradient(135deg, #33cc33, #29a329)',
                                    color: 'white',
                                    border: 'none',
                                    borderRadius: '8px',
                                    cursor: 'pointer',
                                    fontWeight: 'bold'
                                }}
                            >
                                {saving ? 'Salvando...' : 'Salvar'}
                            </button>
                            <button 
                                onClick={handleCancel}
                                style={{ 
                                    flex: 1, 
                                    padding: '0.75rem', 
                                    background: '#666',
                                    color: 'white',
                                    border: 'none',
                                    borderRadius: '8px',
                                    cursor: 'pointer'
                                }}
                            >
                                Cancelar
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <table>
                <thead>
                    <tr>
                        <th>Ordem</th>
                        <th>Nome</th>
                        <th>Categoria</th>
                        <th>Tipo</th>
                        <th>Pontos Máx.</th>
                        <th>Status</th>
                        <th>Ações</th>
                    </tr>
                </thead>
                <tbody>
                    {wods.map((wod) => (
                        <tr key={wod.id}>
                            <td>#{wod.order}</td>
                            <td>{wod.name}</td>
                            <td>{wod.category || 'N/A'}</td>
                            <td>{wod.type}</td>
                            <td>{wod.maxPoints}</td>
                            <td>
                                <span style={{ fontWeight: 'bold', color: '#33cc33' }}>
                                    {getStatusLabel(wod.status)}
                                </span>
                            </td>
                            <td>
                                <button 
                                    onClick={() => handleEdit(wod)}
                                    style={{ 
                                        backgroundColor: '#33cc33', 
                                        color: 'white',
                                        marginRight: '0.5rem',
                                        padding: '0.5rem 1rem',
                                        borderRadius: '6px',
                                        border: 'none',
                                        cursor: 'pointer',
                                        marginBottom: '0.5rem'
                                    }}
                                >
                                    ✏️ Editar
                                </button>
                                <button 
                                    onClick={() => handleDelete(wod.id, wod.name)}
                                    style={{ 
                                        backgroundColor: 'red', 
                                        color: 'white',
                                        padding: '0.5rem 1rem',
                                        borderRadius: '6px',
                                        border: 'none',
                                        cursor: 'pointer'
                                    }}
                                >
                                    🗑️ Deletar
                                </button>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </>
    );
};

export default WodList;
