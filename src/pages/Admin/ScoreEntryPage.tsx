import { useState, useEffect } from 'react';
import { db } from '../../firebase';
import { collection, query, onSnapshot, orderBy, where, doc, updateDoc, addDoc, getDocs } from 'firebase/firestore';
import type { Wod } from '../../types/Wod';
import type { Team } from '../../types/Team';
import type { Result } from '../../types/Result';
import { Categories } from '../../commons/constants/categories';

interface TeamWithResult extends Team {
    result?: Result;
}

function ScoreEntryPage() {
    const [wods, setWods] = useState<Wod[]>([]);
    const [selectedCategory, setSelectedCategory] = useState<string>(Categories[0]);
    const [selectedWodId, setSelectedWodId] = useState<string>('');
    const [teams, setTeams] = useState<TeamWithResult[]>([]);
    const [loading, setLoading] = useState(true);
    const [updating, setUpdating] = useState<string | null>(null);

    // Filtrar WODs pela categoria selecionada
    const categoryWods = wods.filter(w => w.category === selectedCategory);
    const currentWod = wods.find(w => w.id === selectedWodId);
    
    useEffect(() => {
        const qWods = query(collection(db, "wods"), orderBy("order", "asc"));
        
        
        const unsubWods = onSnapshot(qWods, (snap) => {
            const fetched = snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Wod));
            setWods(fetched);
            // Seleciona o primeiro WOD da categoria após carregar
            const firstWod = fetched.filter(w => w.category === selectedCategory)[0];
            if (firstWod && !selectedWodId) {
                setSelectedWodId(firstWod.id);
            }
            setLoading(false);
        });

        return () => unsubWods();
    }, []);

    // Quando a categoria muda, seleciona o primeiro WOD dessa categoria
    useEffect(() => {
        const wodsForCategory = wods.filter(w => w.category === selectedCategory);
        if (wodsForCategory.length > 0 && selectedCategory) {
            const firstWod = wodsForCategory[0];
            if (firstWod && firstWod.id !== selectedWodId) {
                setSelectedWodId(firstWod.id);
            }
        }
    }, [selectedCategory, wods]);

    // Buscar times e resultados quando WOD ou categoria mudar
    useEffect(() => {
        if (!selectedWodId || !wods.length) {
            setTeams([]);
            return;
        }

        const currentWodObj = wods.find(w => w.id === selectedWodId);
        if (!currentWodObj) return;

        // Busca apenas times da categoria selecionada
        const qTeams = query(
            collection(db, "teams"), 
            where("category", "==", selectedCategory),
            orderBy("name", "asc")
        );
        
        const unsubTeams = onSnapshot(qTeams, async (snap) => {
            const fetched = snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Team));
            
            // Busca TODOS os resultados para este WOD (sem usar "in")
            const resultsQuery = query(
                collection(db, "results"),
                where("wodId", "==", selectedWodId)
            );
            const resultsSnap = await getDocs(resultsQuery);
            const results = resultsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Result));
            
            // Filtra resultados apenas para os teams desta categoria
            const teamIds = fetched.map(t => t.id);
            const filteredResults = results.filter(r => teamIds.includes(r.teamId));
            
            // Combina times com seus resultados
            const teamsWithResults = fetched.map(team => {
                const result = filteredResults.find(r => r.teamId === team.id);
                return { ...team, result };
            });

            setTeams(teamsWithResults);
        });

        return () => unsubTeams();
    }, [selectedWodId, selectedCategory, wods]);

    const handleScoreChange = async (teamId: string, score: string) => {
        if (!score.trim() || !currentWod || !selectedCategory) return;
        
        setUpdating(teamId);
        
        try {
            const team = teams.find(t => t.id === teamId);
            if (!team) return;

            const resultData = {
                teamId,
                wodId: selectedWodId,
                category: selectedCategory,
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

            {/* Seletores */}
            <div className="wod-selector-card">
                <div style={{ marginBottom: '1rem' }}>
                    <label>Categoria:</label>
                    <select 
                        value={selectedCategory} 
                        onChange={(e) => setSelectedCategory(e.target.value)}
                        className="wod-select"
                    >
                        {Categories.map(cat => (
                            <option key={cat} value={cat}>{cat}</option>
                        ))}
                    </select>
                </div>

                <div style={{ marginBottom: '1rem' }}>
                    <label>Selecione a Prova:</label>
                    <select 
                        value={selectedWodId} 
                        onChange={(e) => setSelectedWodId(e.target.value)}
                        className="wod-select"
                        disabled={categoryWods.length === 0}
                    >
                        {categoryWods.length === 0 ? (
                            <option>Nenhuma prova encontrada para esta categoria</option>
                        ) : (
                            categoryWods.map(wod => (
                                <option key={wod.id} value={wod.id}>
                                    {wod.order}. {wod.name} ({wod.type})
                                </option>
                            ))
                        )}
                    </select>
                </div>

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

            {/* Lista de Times */}
            {teams.length === 0 && selectedCategory && (
                <div style={{ 
                    background: '#333', 
                    color: '#fff', 
                    padding: '1rem', 
                    borderRadius: '8px',
                    textAlign: 'center'
                }}>
                    Nenhum time encontrado para a categoria: {selectedCategory}
                </div>
            )}

            {teams.length > 0 && (
                <div className="category-results-section">
                    <h2>{selectedCategory} - {currentWod?.name}</h2>
                    <div className="results-table-wrapper">
                        <table className="results-table">
                            <thead>
                                <tr>
                                    <th>Posição</th>
                                    <th>Time</th>
                                    <th>Resultado</th>
                                </tr>
                            </thead>
                            <tbody>
                                {teams.map((team, index) => (
                                    <tr key={team.id}>
                                        <td>{index + 1}</td>
                                        <td>{team.name}</td>
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
            )}
        </div>
    );
}

export default ScoreEntryPage;
