import React, { useState, useEffect } from 'react';
import { db } from '../../firebase';
import { collection, query, where, getDocs, deleteDoc, doc, updateDoc, onSnapshot } from 'firebase/firestore';
import type { Team } from '../../types/Team';
import type { Athlete } from '../../types/Athlete';
import { Categories } from '../../commons/constants/categories';

interface TeamWithAthletes extends Team {
    athletes?: Athlete[];
}

interface TeamListProps {
    teams: Team[];
}

const TeamList: React.FC<TeamListProps> = ({ teams }) => {
    const [teamsWithAthletes, setTeamsWithAthletes] = useState<TeamWithAthletes[]>([]);
    const [editingTeam, setEditingTeam] = useState<TeamWithAthletes | null>(null);
    const [editName, setEditName] = useState('');
    const [editBox, setEditBox] = useState('');
    const [editCategory, setEditCategory] = useState('');
    const [editAthletes, setEditAthletes] = useState<Record<string, string>>({});
    const [saving, setSaving] = useState(false);
    
    // Buscar atletas para cada time
    useEffect(() => {
        if (teams.length === 0) {
            setTeamsWithAthletes([]);
            return;
        }

        const unsubscribes: (() => void)[] = [];
        const athletesMap = new Map<string, Athlete[]>();

        teams.forEach((team) => {
            const athletesQuery = query(
                collection(db, "athletes"), 
                where("teamId", "==", team.id)
            );
            
            const unsubscribe = onSnapshot(athletesQuery, (snapshot) => {
                const athletes: Athlete[] = [];
                snapshot.forEach((doc) => {
                    athletes.push({ id: doc.id, ...doc.data() } as Athlete);
                });
                // Ordena por role (Membro 1, Membro 2)
                athletes.sort((a, b) => a.role.localeCompare(b.role));
                
                athletesMap.set(team.id, athletes);
                
                // Atualiza todos os times com seus respectivos atletas
                const updatedTeams: TeamWithAthletes[] = teams.map(t => ({
                    ...t,
                    athletes: athletesMap.get(t.id) || []
                }));
                
                setTeamsWithAthletes(updatedTeams);
            });

            unsubscribes.push(unsubscribe);
        });

        return () => {
            unsubscribes.forEach(unsub => unsub());
        };
    }, [teams]);
    
    const handleEdit = (team: TeamWithAthletes) => {
        setEditingTeam(team);
        setEditName(team.name);
        setEditBox(team.box);
        setEditCategory(team.category);
        
        // Inicializa os nomes dos atletas para edição
        const athletesMap: Record<string, string> = {};
        if (team.athletes) {
            team.athletes.forEach(athlete => {
                athletesMap[athlete.id] = athlete.name;
            });
        }
        setEditAthletes(athletesMap);
    };

    const handleSave = async () => {
        if (!editingTeam) return;
        setSaving(true);

        try {
            // Atualiza o time
            await updateDoc(doc(db, "teams", editingTeam.id), {
                name: editName,
                box: editBox,
                category: editCategory,
            });
            
            // Atualiza os atletas
            const updatePromises: Promise<void>[] = [];
            Object.keys(editAthletes).forEach(athleteId => {
                const newName = editAthletes[athleteId].trim();
                if (newName) {
                    const updatePromise = updateDoc(doc(db, "athletes", athleteId), {
                        name: newName,
                    });
                    updatePromises.push(updatePromise);
                }
            });
            
            if (updatePromises.length > 0) {
                await Promise.all(updatePromises);
            }
            
            setEditingTeam(null);
            setEditAthletes({});
            alert('Time e atletas atualizados com sucesso!');
        } catch (error) {
            console.error("Erro ao atualizar time:", error);
            alert("Erro ao atualizar o time.");
        } finally {
            setSaving(false);
        }
    };

    const handleCancel = () => {
        setEditingTeam(null);
        setEditName('');
        setEditBox('');
        setEditCategory('');
        setEditAthletes({});
    };

    const handleAthleteNameChange = (athleteId: string, value: string) => {
        setEditAthletes(prev => ({
            ...prev,
            [athleteId]: value
        }));
    };

    // Função para deletar o Time e seus Atletas
    const handleDelete = async (teamId: string, teamName: string) => {
        if (!window.confirm(`Tem certeza que deseja DELETAR o time "${teamName}"? Esta ação é irreversível!`)) {
            return;
        }

        try {
            // 1. Coleta todos os atletas vinculados a este Time
            const athletesQuery = query(collection(db, "athletes"), where("teamId", "==", teamId));
            const athleteSnapshot = await getDocs(athletesQuery);

            // 2. Deleta cada atleta
            const deletePromises: Promise<void>[] = [];
            athleteSnapshot.forEach(athleteDoc => {
                deletePromises.push(deleteDoc(doc(db, "athletes", athleteDoc.id)));
            });
            await Promise.all(deletePromises);

            // 3. Deleta o Documento do Time
            await deleteDoc(doc(db, "teams", teamId));

            alert(`Time "${teamName}" deletado com sucesso (juntamente com seus atletas)!`);

            // Nota: Deveríamos também deletar os 'results' vinculados, mas vamos simplificar por enquanto.
            // Em produção, isso seria crucial para a integridade dos dados.

        } catch (error) {
            console.error("Erro ao deletar time:", error);
            alert("Erro ao deletar o time.");
        }
    };

    return (
        <>
            {/* Modal de Edição */}
            {editingTeam && (() => {
                const currentTeam = teamsWithAthletes.find(t => t.id === editingTeam.id);
                const athletes = currentTeam?.athletes || [];
                
                return (
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
                        maxWidth: '90vw',
                        maxHeight: '90vh',
                        overflowY: 'auto'
                    }}>
                        <h3 style={{ marginBottom: '1rem', color: '#33cc33' }}>Editar Time</h3>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                            <input
                                type="text"
                                placeholder="Nome do Time"
                                value={editName}
                                onChange={(e) => setEditName(e.target.value)}
                                style={{ padding: '0.75rem', borderRadius: '8px', background: '#333', color: '#fff', border: '1px solid #555' }}
                            />
                            <input
                                type="text"
                                placeholder="Box"
                                value={editBox}
                                onChange={(e) => setEditBox(e.target.value)}
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
                            
                            {/* Seção de Atletas */}
                            {athletes.length > 0 && (
                                <div style={{ marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid #555' }}>
                                    <h4 style={{ marginBottom: '0.75rem', color: '#33cc33', fontSize: '1rem' }}>Atletas</h4>
                                    {athletes.map((athlete) => (
                                        <div key={athlete.id} style={{ marginBottom: '0.75rem' }}>
                                            <label style={{ 
                                                display: 'block', 
                                                marginBottom: '0.5rem', 
                                                color: '#ccc',
                                                fontSize: '0.9rem'
                                            }}>
                                                {athlete.role}:
                                            </label>
                                            <input
                                                type="text"
                                                placeholder={`Nome do ${athlete.role}`}
                                                value={editAthletes[athlete.id] || ''}
                                                onChange={(e) => handleAthleteNameChange(athlete.id, e.target.value)}
                                                style={{ 
                                                    padding: '0.75rem', 
                                                    borderRadius: '8px', 
                                                    background: '#333', 
                                                    color: '#fff', 
                                                    border: '1px solid #555',
                                                    width: '100%'
                                                }}
                                            />
                                        </div>
                                    ))}
                                </div>
                            )}
                            
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
                );
            })()}

            <table>
                <thead>
                    <tr>
                        <th>Nome do Time</th>
                        <th>Categoria</th>
                        <th>Box</th>
                        <th>Atletas</th>
                        <th>Ações</th>
                    </tr>
                </thead>
                <tbody>
                    {teamsWithAthletes.map((team) => (
                        <tr key={team.id}>
                            <td>{team.name}</td>
                            <td>{team.category}</td>
                            <td>{team.box}</td>
                            <td>
                                {team.athletes && team.athletes.length > 0 ? (
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                        {team.athletes.map((athlete) => (
                                            <div 
                                                key={athlete.id} 
                                                style={{ 
                                                    display: 'flex', 
                                                    alignItems: 'center', 
                                                    gap: '0.5rem' 
                                                }}
                                            >
                                                <span style={{ fontSize: '0.9rem' }}>{athlete.role}:</span>
                                                <span>{athlete.name}</span>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <span style={{ color: '#888', fontSize: '0.9rem' }}>Sem atletas</span>
                                )}
                            </td>
                            <td>
                                <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
                                    <button 
                                        onClick={() => {
                                            const teamWithAthletes = teamsWithAthletes.find(t => t.id === team.id) || team;
                                            handleEdit(teamWithAthletes);
                                        }}
                                        style={{ 
                                            background: 'none',
                                            color: '#888',
                                            padding: '0.5rem',
                                            border: 'none',
                                            cursor: 'pointer',
                                            display: 'flex',
                                            alignItems: 'center',
                                            transition: 'color 0.2s',
                                            boxShadow: 'none',
                                            transform: 'none'
                                        }}
                                        title="Editar time"
                                        onMouseEnter={(e) => {
                                            e.currentTarget.style.color = '#33cc33';
                                            e.currentTarget.style.transform = 'none';
                                            e.currentTarget.style.boxShadow = 'none';
                                        }}
                                        onMouseLeave={(e) => {
                                            e.currentTarget.style.color = '#888';
                                            e.currentTarget.style.transform = 'none';
                                            e.currentTarget.style.boxShadow = 'none';
                                        }}
                                    >
                                        <span className="material-symbols-outlined">edit</span>
                                    </button>
                                    <button 
                                        onClick={() => handleDelete(team.id, team.name)} 
                                        style={{ 
                                            background: 'none',
                                            color: '#888',
                                            padding: '0.5rem',
                                            border: 'none',
                                            cursor: 'pointer',
                                            display: 'flex',
                                            alignItems: 'center',
                                            transition: 'color 0.2s',
                                            boxShadow: 'none',
                                            transform: 'none'
                                        }}
                                        title="Deletar time"
                                        onMouseEnter={(e) => {
                                            e.currentTarget.style.color = '#f44336';
                                            e.currentTarget.style.transform = 'none';
                                            e.currentTarget.style.boxShadow = 'none';
                                        }}
                                        onMouseLeave={(e) => {
                                            e.currentTarget.style.color = '#888';
                                            e.currentTarget.style.transform = 'none';
                                            e.currentTarget.style.boxShadow = 'none';
                                        }}
                                    >
                                        <span className="material-symbols-outlined">delete</span>
                                    </button>
                                </div>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </>
    );
};

export default TeamList;