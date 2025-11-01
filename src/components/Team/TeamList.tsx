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
    const [editingTeam, setEditingTeam] = useState<Team | null>(null);
    const [editingAthlete, setEditingAthlete] = useState<Athlete | null>(null);
    const [editName, setEditName] = useState('');
    const [editBox, setEditBox] = useState('');
    const [editCategory, setEditCategory] = useState('');
    const [editAthleteName, setEditAthleteName] = useState('');
    const [saving, setSaving] = useState(false);
    const [savingAthlete, setSavingAthlete] = useState(false);
    
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
    
    const handleEdit = (team: Team) => {
        setEditingTeam(team);
        setEditName(team.name);
        setEditBox(team.box);
        setEditCategory(team.category);
    };

    const handleSave = async () => {
        if (!editingTeam) return;
        setSaving(true);

        try {
            await updateDoc(doc(db, "teams", editingTeam.id), {
                name: editName,
                box: editBox,
                category: editCategory,
            });
            
            setEditingTeam(null);
            alert('Time atualizado com sucesso!');
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
    };

    const handleEditAthlete = (athlete: Athlete) => {
        setEditingAthlete(athlete);
        setEditAthleteName(athlete.name);
    };

    const handleSaveAthlete = async () => {
        if (!editingAthlete) return;
        setSavingAthlete(true);

        try {
            await updateDoc(doc(db, "athletes", editingAthlete.id), {
                name: editAthleteName,
            });
            
            setEditingAthlete(null);
            setEditAthleteName('');
            alert('Atleta atualizado com sucesso!');
        } catch (error) {
            console.error("Erro ao atualizar atleta:", error);
            alert("Erro ao atualizar o atleta.");
        } finally {
            setSavingAthlete(false);
        }
    };

    const handleCancelAthlete = () => {
        setEditingAthlete(null);
        setEditAthleteName('');
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
            {editingTeam && (
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

            {/* Modal de Edição de Atleta */}
            {editingAthlete && (
                <div style={{
                    position: 'fixed',
                    top: '50%',
                    left: '50%',
                    transform: 'translate(-50%, -50%)',
                    background: '#2a2a2a',
                    border: '2px solid #33cc33',
                    borderRadius: '12px',
                    padding: '2rem',
                    zIndex: 1001,
                    minWidth: '400px',
                    maxWidth: '90vw'
                }}>
                    <h3 style={{ marginBottom: '1rem', color: '#33cc33' }}>Editar Atleta</h3>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                        <input
                            type="text"
                            placeholder="Nome do Atleta"
                            value={editAthleteName}
                            onChange={(e) => setEditAthleteName(e.target.value)}
                            style={{ padding: '0.75rem', borderRadius: '8px', background: '#333', color: '#fff', border: '1px solid #555' }}
                        />
                        <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
                            <button 
                                onClick={handleSaveAthlete} 
                                disabled={savingAthlete}
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
                                {savingAthlete ? 'Salvando...' : 'Salvar'}
                            </button>
                            <button 
                                onClick={handleCancelAthlete}
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
                                                <button
                                                    onClick={() => handleEditAthlete(athlete)}
                                                    style={{
                                                        padding: '0.25rem 0.5rem',
                                                        fontSize: '0.75rem',
                                                        background: '#555',
                                                        color: 'white',
                                                        border: 'none',
                                                        borderRadius: '4px',
                                                        cursor: 'pointer',
                                                        marginLeft: '0.5rem'
                                                    }}
                                                    title="Editar atleta"
                                                >
                                                    ✏️
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <span style={{ color: '#888', fontSize: '0.9rem' }}>Sem atletas</span>
                                )}
                            </td>
                            <td>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                    <button 
                                        onClick={() => handleEdit(team)}
                                        style={{ 
                                            backgroundColor: '#33cc33', 
                                            color: 'white',
                                            padding: '0.5rem 1rem',
                                            borderRadius: '6px',
                                            border: 'none',
                                            cursor: 'pointer',
                                            fontSize: '0.9rem'
                                        }}
                                    >
                                        ✏️ Editar Time
                                    </button>
                                    <button 
                                        onClick={() => handleDelete(team.id, team.name)} 
                                        style={{ 
                                            backgroundColor: 'red', 
                                            color: 'white',
                                            padding: '0.5rem 1rem',
                                            borderRadius: '6px',
                                            border: 'none',
                                            cursor: 'pointer',
                                            fontSize: '0.9rem'
                                        }}
                                    >
                                        🗑️ Deletar
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