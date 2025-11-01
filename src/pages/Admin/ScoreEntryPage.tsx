import { useState, useEffect } from 'react';
import { db } from '../../firebase';
import { collection, query, onSnapshot, orderBy, where, doc, updateDoc, addDoc, getDocs } from 'firebase/firestore';
import type { Wod } from '../../types/Wod';
import type { Team } from '../../types/Team';
import type { Result } from '../../types/Result';
import { Categories } from '../../commons/constants/categories';
import Loading from '../../components/Loading';
import { applyTimeMask, applyWeightMask, applyRepsMask } from '../../commons/utils/inputMasks';

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
    const [isEditing, setIsEditing] = useState(false);
    const [editedScores, setEditedScores] = useState<Record<string, string>>({});
    const hasUnsavedChanges = () => {
        if (!isEditing || Object.keys(editedScores).length === 0) return false;
        
        return teams.some(team => {
            const currentValue = editedScores[team.id] || team.result?.rawScore?.toString() || '';
            const originalValue = team.result?.rawScore?.toString() || '';
            return currentValue !== originalValue;
        });
    };

    // Expor função para verificar mudanças não salvas (para interceptação de navegação)
    useEffect(() => {
        const checkUnsavedChanges = () => {
            return hasUnsavedChanges();
        };
        
        // Dispara evento customizado quando há mudanças não salvas
        window.dispatchEvent(new CustomEvent('unsavedChangesCheck', { 
            detail: { hasChanges: hasUnsavedChanges() }
        }));
        
        // Adiciona função global para AdminDashboard acessar
        (window as any).__hasUnsavedScoreChanges = checkUnsavedChanges;
        
        return () => {
            delete (window as any).__hasUnsavedScoreChanges;
        };
    }, [isEditing, editedScores, teams]);

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
            setIsEditing(false);
            setEditedScores({});
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
            // Reseta estado de edição quando dados mudam
            setIsEditing(false);
            setEditedScores({});
        });

        return () => unsubTeams();
    }, [selectedWodId, selectedCategory, wods]);

    // Proteção contra fechamento da página/tab quando há mudanças não salvas
    useEffect(() => {
        const handleBeforeUnload = (e: BeforeUnloadEvent) => {
            if (hasUnsavedChanges()) {
                e.preventDefault();
                e.returnValue = '';
            }
        };

        window.addEventListener('beforeunload', handleBeforeUnload);
        return () => window.removeEventListener('beforeunload', handleBeforeUnload);
    }, [isEditing, editedScores, teams]);

    const handleScoreInputChange = (teamId: string, value: string) => {
        if (!isEditing) return;
        
        // Aplica máscara baseado no tipo do WOD
        let maskedValue = value;
        if (currentWod?.type === 'Time') {
            maskedValue = applyTimeMask(value);
        } else if (currentWod?.type === 'Load') {
            maskedValue = applyWeightMask(value);
        } else if (currentWod?.type === 'Reps') {
            maskedValue = applyRepsMask(value);
        }
        
        setEditedScores(prev => ({
            ...prev,
            [teamId]: maskedValue
        }));
    };

    const handleEditClick = () => {
        // Inicializa editedScores com os valores atuais
        const initialScores: Record<string, string> = {};
        teams.forEach(team => {
            initialScores[team.id] = team.result?.rawScore?.toString() || '';
        });
        setEditedScores(initialScores);
        setIsEditing(true);
    };

    const handleCancelClick = () => {
        const hasChanges = teams.some(team => {
            const currentValue = editedScores[team.id] || team.result?.rawScore?.toString() || '';
            const originalValue = team.result?.rawScore?.toString() || '';
            return currentValue !== originalValue;
        });

        if (hasChanges) {
            const shouldCancel = window.confirm(
                'Você tem alterações não salvas. Deseja cancelar e descartar as alterações?'
            );
            if (!shouldCancel) return;
        }

        setIsEditing(false);
        setEditedScores({});
    };

    const handleSaveClick = async () => {
        if (!currentWod || !selectedCategory) return;

        setUpdating('all');

        try {
            const savePromises: Promise<void>[] = [];

            for (const team of teams) {
                const editedValue = editedScores[team.id];
                const originalValue = team.result?.rawScore?.toString() || '';
                
                // Só salva se o valor mudou
                if (editedValue !== originalValue) {
                    const score = editedValue?.trim() || '';
                    
                    if (!score.trim()) continue; // Pula se estiver vazio

                    const resultData = {
                        teamId: team.id,
                        wodId: selectedWodId,
                        category: selectedCategory,
                        rawScore: score,
                    };

                    const savePromise = (async () => {
                        // Verifica se já existe resultado
                        const resultsQuery = query(
                            collection(db, "results"),
                            where("wodId", "==", selectedWodId),
                            where("teamId", "==", team.id)
                        );
                        const existingSnapshot = await getDocs(resultsQuery);

                        if (!existingSnapshot.empty) {
                            const existingDocId = existingSnapshot.docs[0].id;
                            await updateDoc(doc(db, "results", existingDocId), resultData);
                        } else {
                            await addDoc(collection(db, "results"), resultData);
                        }
                    })();

                    savePromises.push(savePromise);
                }
            }

            await Promise.all(savePromises);
            setIsEditing(false);
            setEditedScores({});
            alert('Resultados salvos com sucesso!');
        } catch (error) {
            console.error("Erro ao salvar resultados:", error);
            alert("Erro ao salvar resultados. Verifique o console.");
        } finally {
            setUpdating(null);
        }
    };

    const handleCategoryChange = (newCategory: string) => {
        if (isEditing && Object.keys(editedScores).length > 0) {
            const hasChanges = teams.some(team => {
                const currentValue = editedScores[team.id] || team.result?.rawScore?.toString() || '';
                const originalValue = team.result?.rawScore?.toString() || '';
                return currentValue !== originalValue;
            });

            if (hasChanges) {
                const shouldProceed = window.confirm(
                    'Você tem alterações não salvas. Se mudar de categoria, as alterações serão perdidas. Deseja continuar?'
                );
                if (!shouldProceed) return;
                setIsEditing(false);
                setEditedScores({});
            }
        }
        setSelectedCategory(newCategory);
    };

    const handleWodChange = (newWodId: string) => {
        if (isEditing && Object.keys(editedScores).length > 0) {
            const hasChanges = teams.some(team => {
                const currentValue = editedScores[team.id] || team.result?.rawScore?.toString() || '';
                const originalValue = team.result?.rawScore?.toString() || '';
                return currentValue !== originalValue;
            });

            if (hasChanges) {
                const shouldProceed = window.confirm(
                    'Você tem alterações não salvas. Se mudar de prova, as alterações serão perdidas. Deseja continuar?'
                );
                if (!shouldProceed) return;
                setIsEditing(false);
                setEditedScores({});
            }
        }
        setSelectedWodId(newWodId);
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
        return <Loading message="Carregando provas..." size="large" />;
    }

    return (
        <div className="admin-page-container">
            <h1>
                <span className="material-symbols-outlined" style={{ verticalAlign: 'middle', marginRight: '0.5rem' }}>assessment</span>
                Registro de Resultados
            </h1>

            {/* Seletores */}
            <div className="wod-selector-card">
                <div style={{ marginBottom: '1rem' }}>
                    <label>Categoria:</label>
                    <select 
                        value={selectedCategory} 
                        onChange={(e) => handleCategoryChange(e.target.value)}
                        className="wod-select"
                        disabled={isEditing}
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
                        onChange={(e) => handleWodChange(e.target.value)}
                        className="wod-select"
                        disabled={categoryWods.length === 0 || isEditing}
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
                            <option value="not started">Não Realizada</option>
                            <option value="in progress">Em Andamento</option>
                            <option value="computing">Computando Resultado</option>
                            <option value="completed">Finalizada</option>
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
                    <div style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        marginBottom: '1rem'
                    }}>
                        <h2 style={{ margin: 0 }}>{selectedCategory} - {currentWod?.name}</h2>
                        {!isEditing && (
                            <button
                                onClick={handleEditClick}
                                disabled={teams.length === 0 || updating === 'all'}
                                style={{
                                    padding: '0.75rem 2rem',
                                    fontSize: '1rem',
                                    fontWeight: 'bold',
                                    background: 'linear-gradient(135deg, #33cc33 0%, #29a329 100%)',
                                    color: 'white',
                                    border: 'none',
                                    borderRadius: '8px',
                                    cursor: teams.length === 0 || updating === 'all' ? 'not-allowed' : 'pointer',
                                    opacity: teams.length === 0 || updating === 'all' ? 0.6 : 1,
                                    boxShadow: '0 4px 15px rgba(51, 204, 51, 0.4)',
                                    transition: 'all 0.3s ease'
                                }}
                            >
                                <span className="material-symbols-outlined small">edit</span>
                                Editar Resultados
                            </button>
                        )}
                    </div>
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
                                {teams.map((team, index) => {
                                    let currentValue = isEditing 
                                        ? (editedScores[team.id] !== undefined 
                                            ? editedScores[team.id] 
                                            : team.result?.rawScore?.toString() || '')
                                        : (team.result?.rawScore?.toString() || '');
                                    
                                    // Aplica máscara na exibição se necessário (para valores não editados)
                                    if (!isEditing || editedScores[team.id] === undefined) {
                                        if (currentWod?.type === 'Time' && currentValue) {
                                            // Se já tem formato MM:SS, deixa como está, senão aplica máscara
                                            if (!currentValue.includes(':')) {
                                                currentValue = applyTimeMask(currentValue);
                                            }
                                        }
                                    }
                                    
                                    return (
                                        <tr key={team.id}>
                                            <td>{index + 1}</td>
                                            <td>{team.name}</td>
                                            <td>
                                                <input
                                                    key={`${selectedWodId}-${team.id}-${isEditing}`}
                                                    type="text"
                                                    placeholder={getPlaceholder(currentWod?.type || '')}
                                                    value={currentValue}
                                                    onChange={(e) => handleScoreInputChange(team.id, e.target.value)}
                                                    disabled={!isEditing || updating === 'all'}
                                                    className="score-input"
                                                />
                                                {updating === team.id && (
                                                    <span className="saving-indicator">
                                                        <span className="material-symbols-outlined small">save</span>
                                                    </span>
                                                )}
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                    
                    {/* Botões de Ação - Aparecem apenas quando em modo de edição */}
                    {isEditing && (
                        <div style={{ 
                            marginTop: '1.5rem', 
                            display: 'flex', 
                            gap: '1rem', 
                            justifyContent: 'center' 
                        }}>
                            <button
                                onClick={handleCancelClick}
                                disabled={updating === 'all'}
                                style={{
                                    padding: '0.75rem 2rem',
                                    fontSize: '1rem',
                                    fontWeight: 'bold',
                                    background: '#666',
                                    color: 'white',
                                    border: 'none',
                                    borderRadius: '8px',
                                    cursor: updating === 'all' ? 'not-allowed' : 'pointer',
                                    opacity: updating === 'all' ? 0.6 : 1,
                                    transition: 'all 0.3s ease'
                                }}
                            >
                                <span className="material-symbols-outlined small">cancel</span>
                                Cancelar
                            </button>
                            <button
                                onClick={handleSaveClick}
                                disabled={updating === 'all'}
                                style={{
                                    padding: '0.75rem 2rem',
                                    fontSize: '1rem',
                                    fontWeight: 'bold',
                                    background: updating === 'all' 
                                        ? '#888' 
                                        : 'linear-gradient(135deg, #33cc33 0%, #29a329 100%)',
                                    color: 'white',
                                    border: 'none',
                                    borderRadius: '8px',
                                    cursor: updating === 'all' ? 'not-allowed' : 'pointer',
                                    opacity: updating === 'all' ? 0.6 : 1,
                                    boxShadow: '0 4px 15px rgba(51, 204, 51, 0.4)',
                                    transition: 'all 0.3s ease',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '0.5rem'
                                }}
                            >
                                {updating === 'all' ? (
                                    <>
                                        <span className="material-symbols-outlined small">schedule</span>
                                        Salvando...
                                    </>
                                ) : (
                                    <>
                                        <span className="material-symbols-outlined small">save</span>
                                        Salvar Resultados
                                    </>
                                )}
                            </button>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}

export default ScoreEntryPage;
