import { useState, useEffect } from 'react';
import { db } from '../../firebase';
import { collection, query, onSnapshot, addDoc, doc, getDocs, updateDoc, orderBy, where } from 'firebase/firestore';
import type { Wod } from '../../types/Wod';
import type { Team } from '../../types/Team';
import type { Result } from '../../types/Result';

function ScoreEntryPage() {
    const [wods, setWods] = useState<Wod[]>([]);
    const [teams, setTeams] = useState<Team[]>([]);
    const [selectedWodId, setSelectedWodId] = useState<string>('');
    const [selectedTeamId, setSelectedTeamId] = useState<string>('');
    const [rawScore, setRawScore] = useState('');
    const [rawUnit, setRawUnit] = useState('min:seg');
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState('');

    const currentWod = wods.find(w => w.id === selectedWodId);
    const currentTeam = teams.find(t => t.id === selectedTeamId);
    
    useEffect(() => {
        const qWods = query(collection(db, "wods"), orderBy("order", "asc"));
        const qTeams = query(collection(db, "teams"), orderBy("name", "asc"));

        const unsubWods = onSnapshot(qWods, (snap) => {
            const fetched = snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Wod));
            setWods(fetched);
            if (fetched.length > 0 && !selectedWodId) setSelectedWodId(fetched[0].id);
        });

        const unsubTeams = onSnapshot(qTeams, (snap) => {
            const fetched = snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Team));
            setTeams(fetched);
            if (fetched.length > 0 && !selectedTeamId) setSelectedTeamId(fetched[0].id);
        });

        return () => { unsubWods(); unsubTeams(); };
    }, []);

    // 2. Atualiza a unidade de pontuação quando o WOD muda
    useEffect(() => {
        if (currentWod) {
            if (currentWod.type === 'Time') setRawUnit('min:seg');
            else if (currentWod.type === 'Reps') setRawUnit('reps');
            else if (currentWod.type === 'Load') setRawUnit('lb/kg');
        }
    }, [currentWod]);


    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setMessage('');

        if (!selectedWodId || !selectedTeamId || !rawScore || !currentTeam || !currentWod) {
            setMessage('Selecione a prova, o time e insira a pontuação bruta.');
            setLoading(false);
            return;
        }

        try {
            // Verifica se o resultado já existe (evita duplicidade, trata como UPDATE)
            const existingResultQuery = query(
                collection(db, "results"),
                where("wodId", "==", selectedWodId),
                where("teamId", "==", selectedTeamId)
            );
            const existingSnapshot = await getDocs(existingResultQuery);

            const resultData: Omit<Result, 'id' | 'wodRank' | 'awardedPoints'> = {
                teamId: selectedTeamId,
                wodId: selectedWodId,
                category: currentTeam.category,
                rawScore: rawScore,
            };

            if (!existingSnapshot.empty) {
                const existingDocId = existingSnapshot.docs[0].id;
                await updateDoc(doc(db, "results", existingDocId), resultData);
                setMessage(`Resultado atualizado para ${currentTeam.name} no ${currentWod.name}!`);
            } else {
                await addDoc(collection(db, "results"), resultData);
                setMessage(`Novo resultado inserido para ${currentTeam.name} no ${currentWod.name}!`);
            }
            
            setRawScore(''); 

        } catch (error) {
            console.error("Erro ao salvar resultado:", error);
            setMessage("Erro ao salvar resultado. Verifique o console.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="admin-page-container">
            <h1>Inserção de Resultados (Score Entry)</h1>

            <form onSubmit={handleSubmit} className="score-entry-form">
                {/* 1. SELEÇÃO DA PROVA */}
                <label>Prova (WOD):</label>
                <select value={selectedWodId} onChange={(e) => setSelectedWodId(e.target.value)} required>
                    <option value="" disabled>Selecione o WOD</option>
                    {wods.map(wod => (
                        <option key={wod.id} value={wod.id}>{wod.order}. {wod.name} ({wod.type})</option>
                    ))}
                </select>

                {/* 2. FILTRO DE CATEGORIA/TIME */}
                <label>Categoria:</label>
                <select value={currentTeam?.category || ''} disabled>
                    {/* Exibe a categoria do time selecionado, mas não permite mudar aqui */}
                    <option value={currentTeam?.category || ''}>{currentTeam?.category || 'Selecione um Time primeiro'}</option>
                </select>

                <label>Time:</label>
                <select value={selectedTeamId} onChange={(e) => setSelectedTeamId(e.target.value)} required>
                    <option value="" disabled>Selecione o Time</option>
                    {/* Filtra a lista de times com base na categoria, se necessário, ou mostra todos */}
                    {teams.map(team => (
                        <option key={team.id} value={team.id}>{team.name} ({team.category})</option>
                    ))}
                </select>

                {/* 3. INSERÇÃO DO SCORE BRUTO */}
                <label>Pontuação Bruta:</label>
                <div className="raw-score-input-group">
                    <input 
                        type="text" 
                        placeholder={currentWod?.type === 'Time' ? 'Ex: 10:45' : currentWod?.type === 'Reps' ? 'Ex: 150' : 'Ex: 275'}
                        value={rawScore} 
                        onChange={(e) => setRawScore(e.target.value)} 
                        required 
                    />
                    <span>Unidade: {rawUnit}</span>
                </div>
                
                <button type="submit" disabled={loading}>
                    {loading ? 'Processando...' : 'Salvar Resultado'}
                </button>
            </form>
            {message && <p className={message.includes('sucesso') ? 'success' : 'error'}>{message}</p>}
        </div>
    );
}

export default ScoreEntryPage;