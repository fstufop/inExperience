import { useState, useEffect } from 'react';
import { db } from '../../firebase';
import { collection, query, onSnapshot, orderBy, where, doc, updateDoc, addDoc, getDocs, deleteField } from 'firebase/firestore';
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
    const [editedTimeCaps, setEditedTimeCaps] = useState<Record<string, boolean>>({});
    const [editedRepsRemaining, setEditedRepsRemaining] = useState<Record<string, string>>({});
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

    const handleTimeCapChange = (teamId: string, checked: boolean) => {
        if (!isEditing) return;
        
        setEditedTimeCaps(prev => ({
            ...prev,
            [teamId]: checked
        }));
        
        // Se desmarcar CAP, limpar repetições faltantes
        if (!checked) {
            setEditedRepsRemaining(prev => {
                const newState = { ...prev };
                delete newState[teamId];
                return newState;
            });
        }
    };

    const handleRepsRemainingChange = (teamId: string, value: string) => {
        if (!isEditing) return;
        
        // Apenas números
        const numericValue = value.replace(/\D/g, '');
        
        setEditedRepsRemaining(prev => ({
            ...prev,
            [teamId]: numericValue
        }));
    };

    const handleEditClick = () => {
        // Inicializa editedScores com os valores atuais
        const initialScores: Record<string, string> = {};
        const initialTimeCaps: Record<string, boolean> = {};
        const initialRepsRemaining: Record<string, string> = {};
        
        teams.forEach(team => {
            initialScores[team.id] = team.result?.rawScore?.toString() || '';
            initialTimeCaps[team.id] = team.result?.timeCapReached || false;
            initialRepsRemaining[team.id] = team.result?.repsRemaining?.toString() || '';
        });
        
        setEditedScores(initialScores);
        setEditedTimeCaps(initialTimeCaps);
        setEditedRepsRemaining(initialRepsRemaining);
        setIsEditing(true);
    };

    const handleCancelClick = () => {
        const hasChanges = teams.some(team => {
            const currentScore = editedScores[team.id] || team.result?.rawScore?.toString() || '';
            const originalScore = team.result?.rawScore?.toString() || '';
            const currentTimeCap = editedTimeCaps[team.id] ?? team.result?.timeCapReached ?? false;
            const originalTimeCap = team.result?.timeCapReached ?? false;
            const currentReps = editedRepsRemaining[team.id] || team.result?.repsRemaining?.toString() || '';
            const originalReps = team.result?.repsRemaining?.toString() || '';
            
            return currentScore !== originalScore || 
                   currentTimeCap !== originalTimeCap || 
                   currentReps !== originalReps;
        });

        if (hasChanges) {
            const shouldCancel = window.confirm(
                'Você tem alterações não salvas. Deseja cancelar e descartar as alterações?'
            );
            if (!shouldCancel) return;
        }

        setIsEditing(false);
        setEditedScores({});
        setEditedTimeCaps({});
        setEditedRepsRemaining({});
    };

    const handleSaveClick = async () => {
        if (!currentWod || !selectedCategory) return;

        setUpdating('all');

        try {
            const savePromises: Promise<void>[] = [];

            for (const team of teams) {
                const editedValue = editedScores[team.id];
                const originalValue = team.result?.rawScore?.toString() || '';
                const editedTimeCap = editedTimeCaps[team.id] ?? team.result?.timeCapReached ?? false;
                const originalTimeCap = team.result?.timeCapReached ?? false;
                const editedReps = editedRepsRemaining[team.id] || '';
                const originalReps = team.result?.repsRemaining?.toString() || '';
                
                // Só salva se algum valor mudou
                const scoreChanged = editedValue !== originalValue;
                const timeCapChanged = editedTimeCap !== originalTimeCap;
                const repsChanged = editedReps !== originalReps;
                
                if (scoreChanged || timeCapChanged || repsChanged) {
                    const score = editedValue?.trim() || '';
                    
                    // Se não tem score e não tem CAP, pula
                    if (!score.trim() && !editedTimeCap) continue;

                    // Para CAP, precisa de um rawScore válido (pode ser o tempo ou "CAP")
                    let finalRawScore = score;
                    if (editedTimeCap && currentWod?.type === 'Time') {
                        // Se tem CAP mas não tem tempo, usa "CAP" como rawScore
                        if (!score.trim()) {
                            finalRawScore = 'CAP';
                        }
                    }
                    
                    // Não pode salvar sem rawScore
                    if (!finalRawScore.trim()) continue;

                    const resultData: any = {
                        teamId: team.id,
                        wodId: selectedWodId,
                        category: selectedCategory,
                        rawScore: finalRawScore,
                    };

                    // Adiciona campos de CAP apenas se for tipo Time
                    if (currentWod?.type === 'Time') {
                        if (editedTimeCap) {
                            resultData.timeCapReached = true;
                            if (editedReps && parseInt(editedReps) > 0) {
                                resultData.repsRemaining = parseInt(editedReps);
                            } else {
                                // Se tem CAP mas não tem reps, define como null explicitamente
                                resultData.repsRemaining = null;
                            }
                        } else {
                            // Se não tem CAP, define explicitamente como false
                            resultData.timeCapReached = false;
                            // Não incluir repsRemaining no objeto (será removido apenas em update)
                        }
                    }
                    
                    console.log('Salvando resultado:', {
                        teamId: team.id,
                        rawScore: finalRawScore,
                        timeCapReached: resultData.timeCapReached,
                        repsRemaining: resultData.repsRemaining
                    });

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
                            
                            // Para update, criar objeto separado que pode incluir deleteField()
                            const updateData: any = {
                                ...resultData,
                                _forceUpdate: Date.now() // Campo temporário para forçar atualização
                            };
                            
                            // Se não tem CAP e é tipo Time, remover repsRemaining usando deleteField()
                            if (currentWod?.type === 'Time' && !editedTimeCap) {
                                updateData.repsRemaining = deleteField();
                            }
                            
                            // Força atualização mesmo que os dados sejam iguais para disparar a Cloud Function
                            await updateDoc(doc(db, "results", existingDocId), updateData);
                            
                            // Remove o campo temporário imediatamente após
                            await updateDoc(doc(db, "results", existingDocId), {
                                _forceUpdate: deleteField()
                            });
                        } else {
                            // Para addDoc, criar objeto sem campos que usariam deleteField()
                            const createData = { ...resultData };
                            // Não incluir repsRemaining se não tiver CAP (ou manter como undefined/null)
                            if (currentWod?.type === 'Time' && !editedTimeCap) {
                                // Não incluir o campo repsRemaining no novo documento
                                delete createData.repsRemaining;
                            }
                            await addDoc(collection(db, "results"), createData);
                        }
                    })();

                    savePromises.push(savePromise);
                }
            }

            await Promise.all(savePromises);
            setIsEditing(false);
            setEditedScores({});
            setEditedTimeCaps({});
            setEditedRepsRemaining({});
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
        if (type === 'Time') return 'Ex: 04:45';
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
                                    {currentWod?.type === 'Time' && (
                                        <>
                                            <th>CAP</th>
                                            <th>Reps Restantes</th>
                                        </>
                                    )}
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
                                    
                                    // Valores para CAP e Reps Restantes
                                    const timeCapValue = isEditing 
                                        ? (editedTimeCaps[team.id] !== undefined 
                                            ? editedTimeCaps[team.id] 
                                            : team.result?.timeCapReached ?? false)
                                        : (team.result?.timeCapReached ?? false);
                                    
                                    const repsRemainingValue = isEditing
                                        ? (editedRepsRemaining[team.id] !== undefined
                                            ? editedRepsRemaining[team.id]
                                            : team.result?.repsRemaining?.toString() || '')
                                        : (team.result?.repsRemaining?.toString() || '');
                                    
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
                                            {currentWod?.type === 'Time' && (
                                                <>
                                                    <td>
                                                        <input
                                                            type="checkbox"
                                                            checked={timeCapValue}
                                                            onChange={(e) => handleTimeCapChange(team.id, e.target.checked)}
                                                            disabled={!isEditing || updating === 'all'}
                                                            style={{
                                                                width: '20px',
                                                                height: '20px',
                                                                cursor: (!isEditing || updating === 'all') ? 'not-allowed' : 'pointer'
                                                            }}
                                                        />
                                                    </td>
                                                    <td>
                                                        <input
                                                            type="text"
                                                            placeholder="Ex: 10"
                                                            value={repsRemainingValue}
                                                            onChange={(e) => handleRepsRemainingChange(team.id, e.target.value)}
                                                            disabled={!isEditing || !timeCapValue || updating === 'all'}
                                                            className="score-input"
                                                            style={{
                                                                opacity: timeCapValue ? 1 : 0.5,
                                                                width: '100px'
                                                            }}
                                                        />
                                                    </td>
                                                </>
                                            )}
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
