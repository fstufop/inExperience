import React, { useState, useEffect } from 'react';
import { db } from '../../firebase';
import { collection, query, where, onSnapshot, orderBy } from 'firebase/firestore';
import type { Result } from '../../types/Result';
import type { Team } from '../../types/Team';

interface WodDetailViewProps {
    wodId: string;
    wodName: string;
}

// Interface para combinar o resultado com o nome do time
interface RankedResult extends Result {
    teamName: string;
}

const WodDetailView: React.FC<WodDetailViewProps> = ({ wodId, wodName }) => {
    const [categoryData, setCategoryData] = useState<Record<string, RankedResult[]>>({});
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        setLoading(true);
        // Resetamos o estado ao mudar o WOD
        setCategoryData({});
        
        // 1. Busca todos os times para mapear IDs para Nomes
        const teamsRef = collection(db, "teams");
        const teamsMap = new Map<string, Team>();
        
        // Vamos buscar todos os times de uma vez (simplificação)
        const unsubTeams = onSnapshot(teamsRef, (snap) => {
            snap.docs.forEach(doc => {
                const team = { id: doc.id, ...doc.data() } as Team;
                teamsMap.set(team.id, team);
            });
            // 2. Inicia a busca dos resultados (depois de ter os times)
            fetchWodResults();
        });

        // 3. Função para buscar os resultados do WOD em tempo real
        const fetchWodResults = () => {
            const resultsRef = collection(db, "results");
            
            // Query: Apenas resultados para o WOD selecionado
            const q = query(
                resultsRef,
                where("wodId", "==", wodId),
                // O Cloud Function garante que o wodRank é sempre atualizado e correto
                orderBy("wodRank", "asc") 
            );

            // 4. Escuta em tempo real
            const unsubscribe = onSnapshot(q, (snapshot) => {
                const resultsByCat: Record<string, RankedResult[]> = {};

                snapshot.docs.forEach((doc) => {
                    const result = { id: doc.id, ...doc.data() } as Result;
                    const team = teamsMap.get(result.teamId);

                    if (team) {
                        const rankedResult: RankedResult = {
                            ...result,
                            teamName: team.name
                        };

                        if (!resultsByCat[team.category]) {
                            resultsByCat[team.category] = [];
                        }
                        resultsByCat[team.category].push(rankedResult);
                    }
                });

                setCategoryData(resultsByCat);
                setLoading(false);
            });
            return unsubscribe; // Retorna o unsubscribe do listener principal
        };
        
        // Unsubscribes e cleanup
        let unsubResults: () => void;
        if (wodId) {
            unsubResults = fetchWodResults();
        }
        
        return () => {
            unsubTeams();
            if (unsubResults) unsubResults();
        };
    }, [wodId]); // Depende do WOD ID ativo

    if (loading) {
        return <p>Carregando resultados detalhados para {wodName}...</p>;
    }

    return (
        <div className="wod-detail-view">
            <h2>Resultados de {wodName}</h2>
            {Object.keys(categoryData).sort().map(category => (
                <div key={category} className="category-wod-table-container">
                    <h3>{category}</h3>
                    <table>
                        <thead>
                            <tr>
                                <th>Rank WOD</th>
                                <th>Time</th>
                                <th>Resultado Bruto</th>
                                <th>Pontos Conquistados</th>
                            </tr>
                        </thead>
                        <tbody>
                            {categoryData[category].map((result) => (
                                <tr key={result.id}>
                                    <td>{result.wodRank}</td>
                                    <td>{result.teamName}</td>
                                    <td>{result.rawScore}</td>
                                    <td>{result.awardedPoints}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            ))}
            {Object.keys(categoryData).length === 0 && <p>Nenhum resultado inserido para esta prova.</p>}
        </div>
    );
};

export default WodDetailView;