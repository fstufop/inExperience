import { useState, useEffect } from 'react';
import { db } from '../../firebase';
import { collection, query, onSnapshot, orderBy, where, doc, updateDoc, addDoc, getDocs } from 'firebase/firestore';
import type { Wod } from '../../types/Wod';
import type { Team } from '../../types/Team';
import type { Result } from '../../types/Result';

interface TeamWithResult extends Team {
    result?: Result;
}

function ScoreEntryPage() {
    const [wods, setWods] = useState<Wod[]>([]);
    const [selectedWodId, setSelectedWodId] = useState<string>('');
    const [teamsByCategory, setTeamsByCategory] = useState<Record<string, TeamWithResult[]>>({});
    const [loading, setLoading] = useState(true);
    const [updating, setUpdating] = useState<string | null>(null);

    const currentWod = wods.find(w => w.id === selectedWodId);
    
    useEffect(() => {
        const qWods = query(collection(db, "wods"), orderBy("order", "asc"));
        
        const unsubWods = onSnapshot(qWods, (snap) => {
            const fetched = snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Wod));
            setWods(fetched);
            if (fetched.length > 0 && !selectedWodId) setSelectedWodId(fetched[0].id);
            setLoading(false);
        });

        return () => unsubWods();
    }, []);

    useEffect(() => {
        if (!selectedWodId || !currentWod || !currentWod.category) return;

        // Busca apenas times da categoria da prova
        const qTeams = query(
            collection(db, "teams"), 
            where("category", "==", currentWod.category),
            orderBy("name", "asc")
        );
        
        const unsubTeams = onSnapshot(qTeams, async (snap) => {
            const fetched = snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Team));
            
            // Busca resultados para este WOD
            const resultsQuery = query(
                collection(db, "results"),
                where("wodId", "==", selectedWodId)
            );
            const resultsSnap = await getDocs(resultsQuery);
            const results = resultsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Result));
            
            // Combina times com seus resultados
            const teamsWithResults = fetched.map(team => {
                const result = results.find(r => r.teamId === team.id);
                return { ...team, result };
            });

            // Agrupa por categoria (mesmo sendo uma categoria única, mantemos a estrutura)
            const grouped: Record<string, TeamWithResult[]> = {
                [currentWod.category]: teamsWithResults
            };

            setTeamsByCategory(grouped);
        });

        return () => unsubTeams();
    }, [selectedWodId, currentWod]);

    const handleScoreChange = async (teamId: string, score: string) => {
        if (!score.trim() || !currentWod || !currentWod.category) return;
        
        setUpdating(teamId);
        
        try {
            const team = Object.values(teamsByCategory).flat().find(t => t.id === teamId);
            if (!team) return;

            const resultData = {
                teamId,
                wodId: selectedWodId,
                category: currentWod.category,
                rawScore: score,
            };

            // Verifica se já existe resultado
            const resultsQuery = query(
                collection(db, "results"),
                where("wodId", "==", selectedWodId),
                where("teamId", "==", teamId)
            );
            const existingSnapshot = await getDocs(resultsQuery);

            if (!existingSnapshot.empty) {
                const existingDocId = existingSnapshot.docs[0].id;
                await updateDoc(doc(db, "results", existingDocId), resultData);
            } else {
                await addDoc(collection(db, "results"), resultData);
            }
        } catch (error) {
            console.error("Erro ao salvar resultado:", error);
            alert("Erro ao salvar resultado. Verifique o console.");
        } finally {
            setUpdating(null);
        }
    };

    const handleStatusChange = async (newStatus: Wod['status']) => {
        if (!currentWod) return;
        
        try {
            await updateDoc(doc(db, "wods", currentWod.id), { status: newStatus });
        } catch (error) {
            console.error("Erro ao atualizar status:", error);
            alert("Erro ao atualizar status da prova.");
        }
    };

    const getPlaceholder = (type: string) => {
        if (type === 'Time') return 'Ex: 10:45';
        if (type === 'Reps') return 'Ex: 150';
        return 'Ex: 275';
    };

    if (loading) {
        return <div className="loading-screen">Carregando provas...</div>;
    }

    return (
        <div className="admin-page-container">
            <h1>📊 Inserção de Resultados</h1>

            {/* Seletor de Prova com Status */}
            <div className="wod-selector-card">
                <label>Selecione a Prova:</label>
                <select 
                    value={selectedWodId} 
                    onChange={(e) => setSelectedWodId(e.target.value)}
                    className="wod-select"
                >
                    {wods.map(wod => (
                        <option key={wod.id} value={wod.id}>
                            {wod.order}. {wod.name} ({wod.type})
                        </option>
                    ))}
                </select>

                {currentWod && (
                    <div className="status-selector">
                        <label>Status da Prova:</label>
                        <select 
                            value={currentWod.status} 
                            onChange={(e) => handleStatusChange(e.target.value as Wod['status'])}
                            className="status-select"
                        >
                            <option value="not started">❌ Não Realizada</option>
                            <option value="in progress">🏃 Em Andamento</option>
                            <option value="computing">⏳ Computando Resultado</option>
                            <option value="completed">✅ Finalizada</option>
                        </select>
                    </div>
                )}
            </div>

            {/* Aviso se o WOD não tem categoria */}
            {currentWod && !currentWod.category && (
                <div style={{ 
                    background: '#ff9800', 
                    color: '#000', 
                    padding: '1rem', 
                    borderRadius: '8px',
                    marginBottom: '1rem'
                }}>
                    ⚠️ Esta prova não possui categoria definida. Adicione uma categoria nas configurações da prova.
                </div>
            )}

            {/* Lista de Times por Categoria */}
            {Object.entries(teamsByCategory).length === 0 && currentWod?.category && (
                <div style={{ 
                    background: '#333', 
                    color: '#fff', 
                    padding: '1rem', 
                    borderRadius: '8px',
                    textAlign: 'center'
                }}>
                    Nenhum time encontrado para a categoria: {currentWod.category}
                </div>
            )}

            {Object.entries(teamsByCategory).map(([category, teams]) => (
                <div key={category} className="category-results-section">
                    <h2>{category}</h2>
                    <div className="results-table-wrapper">
                        <table className="results-table">
                            <thead>
                                <tr>
                                    <th>Posição</th>
                                    <th>Time</th>
                                    <th>Box</th>
                                    <th>Resultado</th>
                                </tr>
                            </thead>
                            <tbody>
                                {teams.map((team, index) => (
                                    <tr key={team.id}>
                                        <td>{index + 1}</td>
                                        <td>{team.name}</td>
                                        <td>{team.box}</td>
                                        <td>
                                            <input
                                                type="text"
                                                placeholder={getPlaceholder(currentWod?.type || '')}
                                                defaultValue={team.result?.rawScore?.toString() || ''}
                                                onBlur={(e) => handleScoreChange(team.id, e.target.value)}
                                                disabled={updating === team.id}
                                                className="score-input"
                                            />
                                            {updating === team.id && <span className="saving-indicator">💾</span>}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            ))}
        </div>
    );
}

export default ScoreEntryPage;
