import * as admin from 'firebase-admin';
// Importação do Firebase Functions V2
import { onDocumentWritten } from 'firebase-functions/v2/firestore'; 
import { onCall } from 'firebase-functions/v2/https';
import type { Wod, Result } from './types';

// Inicializa o Admin SDK
admin.initializeApp();
const db = admin.firestore();

// -------------------------------------------------------------
// CONSTANTES DE PONTUAÇÃO (A Regra Decrescente Simples)
// -------------------------------------------------------------
const DECREMENT_STEP = 5; 
const MINIMUM_AWARDED_POINTS = 10;

// ... (Mantenha as funções auxiliares isScoreBetter e calculatePoints aqui)

// Função auxiliar para converter tempo (string MM:SS) para segundos
function toSeconds(score: string | number): number {
    if (typeof score === 'number') return score;
    
    // Se é "CAP" sem tempo, retorna valor muito alto
    if (String(score).trim().toUpperCase() === 'CAP') return 999999;
    
    // Validação do formato MM:SS
    const timePattern = /^(\d{1,2}):(\d{2})$/;
    const match = String(score).trim().match(timePattern);
    
    if (!match) {
        return 999999; // Valor de erro
    }
    
    const minutes = parseInt(match[1], 10);
    const seconds = parseInt(match[2], 10);
    
    // Valida se segundos estão no range 0-59
    if (seconds >= 60) {
        return 999999;
    }
    
    return minutes * 60 + seconds;
}

function isScoreBetter(
    resultA: { rawScore: string | number; timeCapReached?: boolean; repsRemaining?: number },
    resultB: { rawScore: string | number; timeCapReached?: boolean; repsRemaining?: number },
    wodType: 'Time' | 'Reps' | 'Load'
): boolean {
    if (wodType === 'Time') {
        const timeCapA = resultA.timeCapReached || false;
        const timeCapB = resultB.timeCapReached || false;
        const repsA = resultA.repsRemaining || 0;
        const repsB = resultB.repsRemaining || 0;
        
        // Se um completou e outro não (CAP)
        if (!timeCapA && timeCapB) return true; // A completou, B não
        if (timeCapA && !timeCapB) return false; // A não completou, B sim
        
        // Se ambos completaram (sem CAP)
        if (!timeCapA && !timeCapB) {
            const secA = toSeconds(resultA.rawScore);
            const secB = toSeconds(resultB.rawScore);
            return secA < secB; // Menor tempo é melhor
        }
        
        // Ambos têm CAP: quem tem menos reps restantes é melhor
        if (repsA !== repsB) {
            return repsA < repsB; // Menos reps restantes é melhor
        }
        
        // Mesmo número de reps restantes: compara tempo (se tiver)
        const secA = toSeconds(resultA.rawScore);
        const secB = toSeconds(resultB.rawScore);
        
        // Se ambos têm tempo válido, compara
        if (secA !== 999999 && secB !== 999999) {
            return secA < secB; // Menor tempo é melhor
        }
        // Se A tem tempo e B não, A é melhor
        if (secA !== 999999 && secB === 999999) return true;
        // Se B tem tempo e A não, B é melhor
        if (secA === 999999 && secB !== 999999) return false;
        // Ambos sem tempo válido: considera iguais (retorna false para manter ordem)
        return false;
    } else { 
        const numA = Number(resultA.rawScore);
        const numB = Number(resultB.rawScore);
        
        // Valida se são números válidos
        if (isNaN(numA) || isNaN(numB)) {
            console.warn(`Números inválidos: ${resultA.rawScore} ou ${resultB.rawScore}`);
            return numA > numB; // Fallback
        }
        
        return numA > numB;
    }
}

function calculatePoints(rank: number, maxPoints: number): number {
    if (rank === 0) return 0;
    const points = maxPoints - (rank - 1) * DECREMENT_STEP;
    return Math.max(points, MINIMUM_AWARDED_POINTS);
}

async function updateGeneralRank(category: string): Promise<void> {
    // Buscar todos os times da categoria
    const teamsQuery = await db.collection('teams')
        .where('category', '==', category)
        .get();

    // Buscar todos os resultados da categoria para calcular desempate
    const allResultsQuery = await db.collection('results')
        .where('category', '==', category)
        .get();

    // Criar mapa de resultados por time
    const resultsByTeam = new Map<string, Array<{ wodRank: number }>>();
    allResultsQuery.docs.forEach(doc => {
        const result = doc.data();
        const teamId = result.teamId;
        if (!resultsByTeam.has(teamId)) {
            resultsByTeam.set(teamId, []);
        }
        if (result.wodRank) {
            resultsByTeam.get(teamId)!.push({ wodRank: result.wodRank });
        }
    });

    // Função para comparar times no desempate
    const compareTeamsForTiebreak = (teamA: { id: string; totalPoints: number }, teamB: { id: string; totalPoints: number }): number => {
        // Se pontos diferentes, ordena por pontos
        if (teamA.totalPoints !== teamB.totalPoints) {
            return teamB.totalPoints - teamA.totalPoints; // Mais pontos primeiro
        }

        // Empate de pontos: usar desempate por posições de WODs
        const ranksA = resultsByTeam.get(teamA.id) || [];
        const ranksB = resultsByTeam.get(teamB.id) || [];

        // Ordenar ranks de cada time (menor rank = melhor posição)
        const sortedRanksA = ranksA.map(r => r.wodRank).sort((a, b) => a - b);
        const sortedRanksB = ranksB.map(r => r.wodRank).sort((a, b) => a - b);

        // Comparar posição por posição: quem tem mais 1º lugares, depois 2º, etc.
        const maxLength = Math.max(sortedRanksA.length, sortedRanksB.length);
        for (let i = 0; i < maxLength; i++) {
            const rankA = sortedRanksA[i] ?? Infinity; // Se não tem resultado, considera pior
            const rankB = sortedRanksB[i] ?? Infinity;

            if (rankA !== rankB) {
                return rankA - rankB; // Menor rank é melhor
            }
        }

        // Se todos os ranks são iguais (muito raro), manter ordem original
        return 0;
    };

    // Criar array de times com dados
    const teams = teamsQuery.docs.map(doc => ({
        id: doc.id,
        totalPoints: doc.data().totalPoints || 0
    }));

    // Ordenar times: primeiro por pontos, depois por desempate
    teams.sort(compareTeamsForTiebreak);

    // Atribuir ranks considerando empates
    const batch = db.batch();
    let currentRank = 1;

    for (let i = 0; i < teams.length; i++) {
        const team = teams[i];
        
        // Verificar se há empate com o time anterior
        let isTied = false;
        if (i > 0) {
            const previousTeam = teams[i - 1];
            // Está empatado se tem os mesmos pontos totais
            if (team.totalPoints === previousTeam.totalPoints) {
                // Verificar se os desempates também são iguais
                const ranksA = resultsByTeam.get(team.id) || [];
                const ranksB = resultsByTeam.get(previousTeam.id) || [];
                const sortedRanksA = ranksA.map(r => r.wodRank).sort((a, b) => a - b);
                const sortedRanksB = ranksB.map(r => r.wodRank).sort((a, b) => a - b);
                
                // Verificar se têm os mesmos ranks
                if (sortedRanksA.length === sortedRanksB.length) {
                    isTied = sortedRanksA.every((rank, idx) => rank === sortedRanksB[idx]);
                }
            }
        }
        
        // Se não é empate, avançar para a próxima posição disponível
        if (!isTied) {
            currentRank = i + 1;
        }
        
        const teamRef = db.collection('teams').doc(team.id);
        batch.update(teamRef, { generalRank: currentRank });
    }

    await batch.commit();
}
// ... (Fim das funções auxiliares)

// -------------------------------------------------------------
// CLOUD FUNCTION PRINCIPAL - V2
// -------------------------------------------------------------

export const calculateScores = onDocumentWritten('results/{resultId}', async (event) => {
    // A sintaxe V2 usa 'event.data.after' e 'event.data.before' para os documentos

    const resultAfter = event.data?.after.data();
    const resultBefore = event.data?.before.data();
    
    // Se um resultado foi deletado, atualizar os pontos do time
    if (!resultAfter && resultBefore) {
        console.log('Result deleted, updating team points');
        const deletedResult = resultBefore;
        const teamId = deletedResult.teamId;
        const category = deletedResult.category;
        
        if (teamId) {
            const teamRef = db.collection('teams').doc(teamId);
            const teamDoc = await teamRef.get();
            
            if (teamDoc.exists) {
                // Recalcular pontos do time baseado nos resultados restantes
                const allTeamResultsSnap = await db.collection('results')
                    .where('teamId', '==', teamId)
                    .get();
                
                const totalPoints = allTeamResultsSnap.docs.reduce((sum, doc) => 
                    sum + (doc.data().awardedPoints || 0), 0);
                
                await teamRef.update({ totalPoints });
                console.log(`Updated team ${teamId} totalPoints to ${totalPoints}`);
                
                // Atualizar rank geral da categoria
                if (category) {
                    await updateGeneralRank(category);
                }
            }
        }
        return null;
    }
    
    // Não processa se o documento não existir após a escrita (mas não havia antes)
    if (!resultAfter) {
        console.log('Result does not exist, skipping calculation');
        return null;
    } 

    const { wodId } = resultAfter;
    if (!wodId) {
        console.log('No wodId found in result, skipping');
        return null;
    }
    
    console.log(`Calculating scores for WOD ${wodId}`);

    // 1. Coleta a Prova (WOD) e todos os Resultados dessa Prova/Categoria
    const wodSnap = await db.collection('wods').doc(wodId).get();
    const wod = wodSnap.data() as Wod;
    if (!wod || !wod.category) {
        console.log(`WOD ${wodId} not found or has no category`);
        return null;
    }
    
    console.log(`WOD found: ${wod.name}, type: ${wod.type}, category: ${wod.category}, maxPoints: ${wod.maxPoints}`);

    // Busca resultados apenas da categoria do WOD
    const resultsQuery = await db.collection('results')
        .where('wodId', '==', wodId)
        .where('category', '==', wod.category)
        .get();

    const allResults: (Result & { id: string })[] = resultsQuery.docs.map(doc => ({ id: doc.id, ...doc.data() } as Result & { id: string }));
    
    console.log(`Found ${allResults.length} results for WOD ${wodId}, category ${wod.category}`);

    // Filtrar apenas resultados de times que existem no banco
    const teamIds = [...new Set(allResults.map(r => r.teamId))];
    const existingTeamIds = new Set<string>();
    
    // Verificar quais times existem
    for (const teamId of teamIds) {
        const teamRef = db.collection('teams').doc(teamId);
        const teamDoc = await teamRef.get();
        if (teamDoc.exists) {
            existingTeamIds.add(teamId);
        } else {
            console.warn(`Time ${teamId} não existe, filtrando seus resultados`);
        }
    }

    // Filtrar resultados apenas de times existentes
    const results = allResults.filter(r => existingTeamIds.has(r.teamId));
    
    console.log(`Processing ${results.length} valid results (${allResults.length - results.length} results filtrados de times inexistentes)`);
    console.log('Sample result:', results[0] ? {
        rawScore: results[0].rawScore,
        timeCapReached: results[0].timeCapReached,
        repsRemaining: results[0].repsRemaining
    } : 'No results');

    // Função auxiliar para verificar se dois resultados são iguais
    // Usa a mesma lógica de comparação de isScoreBetter para garantir consistência
    const areResultsEqual = (
        resultA: { rawScore: string | number; timeCapReached?: boolean; repsRemaining?: number },
        resultB: { rawScore: string | number; timeCapReached?: boolean; repsRemaining?: number },
        wodType: 'Time' | 'Reps' | 'Load'
    ): boolean => {
        const timeCapA = resultA.timeCapReached || false;
        const timeCapB = resultB.timeCapReached || false;
        const repsA = resultA.repsRemaining || 0;
        const repsB = resultB.repsRemaining || 0;

        if (wodType === 'Time') {
            // Para tempo: são iguais se têm mesmo CAP e mesmo tempo/reps restantes
            if (timeCapA !== timeCapB) return false;
            
            if (timeCapA && timeCapB) {
                // Ambos têm CAP: devem ter mesmo repsRemaining e mesmo tempo (em segundos)
                const secA = toSeconds(resultA.rawScore);
                const secB = toSeconds(resultB.rawScore);
                return repsA === repsB && secA === secB && secA !== 999999;
            } else {
                // Nenhum tem CAP: devem ter mesmo tempo (convertido para segundos)
                const secA = toSeconds(resultA.rawScore);
                const secB = toSeconds(resultB.rawScore);
                return secA === secB && secA !== 999999;
            }
        } else {
            // Para Reps ou Load: são iguais se têm mesmo rawScore numérico
            const numA = Number(resultA.rawScore);
            const numB = Number(resultB.rawScore);
            return !isNaN(numA) && !isNaN(numB) && numA === numB;
        }
    };

    // 2. ATRIBUIÇÃO DE RANK (Ordering) com suporte a empates
    const validResults = results.filter(r => r.rawScore !== undefined && r.rawScore !== null && r.rawScore !== '');
    console.log(`Found ${validResults.length} valid results out of ${results.length} total`);
    
    // Ordenar resultados
    const sortedResults = validResults.sort((a, b) => {
        const isAisBetter = isScoreBetter(
            { rawScore: a.rawScore, timeCapReached: a.timeCapReached || false, repsRemaining: a.repsRemaining || 0 },
            { rawScore: b.rawScore, timeCapReached: b.timeCapReached || false, repsRemaining: b.repsRemaining || 0 },
            wod.type as Wod['type']
        );
        return isAisBetter ? -1 : 1;
    });

    // Atribuir ranks considerando empates
    // Quando há empate, todos os empatados recebem o mesmo rank
    // O próximo rank após um empate pula as posições ocupadas pelos empatados
    const rankedResults: Array<Result & { id: string; wodRank: number; awardedPoints: number }> = [];
    let currentRank = 1;
    
    for (let i = 0; i < sortedResults.length; i++) {
        const result = sortedResults[i];
        
        // Verificar se há empate com o resultado anterior
        let isTied = false;
        if (i > 0) {
            const previousResult = sortedResults[i - 1];
            isTied = areResultsEqual(
                { rawScore: result.rawScore, timeCapReached: result.timeCapReached || false, repsRemaining: result.repsRemaining || 0 },
                { rawScore: previousResult.rawScore, timeCapReached: previousResult.timeCapReached || false, repsRemaining: previousResult.repsRemaining || 0 },
                wod.type as Wod['type']
            );
        }
        
        // Se não é empate, calcular o próximo rank disponível
        // O rank deve ser baseado no número de resultados já processados + 1
        // Isso garante que após um empate, o próximo rank pula as posições ocupadas
        if (!isTied) {
            // Contar quantos resultados únicos (sem empates consecutivos) já foram processados
            currentRank = i + 1;
        }
        // Se é empate, mantém o currentRank do resultado anterior
        
        // Calcular pontos baseado na posição
        const points = calculatePoints(currentRank, wod.maxPoints);
        
        console.log(`Ranking: ${result.rawScore} -> Rank ${currentRank}, Points ${points}${isTied ? ' (empate)' : ''}`);
        
        rankedResults.push({
            ...result,
            wodRank: currentRank,
            awardedPoints: points
        });
    }
        
    // 3. ATUALIZAÇÃO DOS RESULTADOS NO BATCH (Lote)
    const batch = db.batch();
    const teamsToUpdate = new Set<string>();

    for (const r of rankedResults) {
        const ref = db.collection('results').doc(r.id);
        batch.update(ref, {
            wodRank: r.wodRank,
            awardedPoints: r.awardedPoints
        });
        teamsToUpdate.add(r.teamId); 
    }

    // 4. ATUALIZAÇÃO DO PLACAR GERAL DOS TIMES (Total Points)
    // Todos os teamIds já foram verificados anteriormente, então todos devem existir
    for (const teamId of Array.from(teamsToUpdate)) {
        // Verificar novamente por segurança
        const teamRef = db.collection('teams').doc(teamId);
        const teamDoc = await teamRef.get();
        if (!teamDoc.exists) {
            console.warn(`Time ${teamId} não encontrado durante atualização de totalPoints, pulando`);
            continue;
        }

        const allTeamResultsSnap = await db.collection('results')
            .where('teamId', '==', teamId)
            .get();

        const totalPoints = allTeamResultsSnap.docs.reduce((sum, doc) => 
            sum + (doc.data().awardedPoints || 0), 0);

        batch.update(teamRef, { totalPoints: totalPoints });
    }

    // 5. EXECUÇÃO DO BATCH
    if (rankedResults.length > 0) {
        console.log(`Updating ${rankedResults.length} results and ${teamsToUpdate.size} teams`);
        try {
            await batch.commit();
            console.log('Batch committed successfully');
        } catch (error: any) {
            console.error('Erro ao commitar batch:', error);
            // Se o erro for relacionado a times inexistentes, ainda assim queremos salvar os resultados
            // Criar batch separado apenas com atualizações de resultados
            const resultsBatch = db.batch();
            for (const r of rankedResults) {
                const ref = db.collection('results').doc(r.id);
                resultsBatch.update(ref, {
                    wodRank: r.wodRank,
                    awardedPoints: r.awardedPoints
                });
            }
            await resultsBatch.commit();
            console.log('Batch de resultados commitado com sucesso (sem atualização de times)');
        }
    } else {
        console.log('No ranked results to update');
    }

    // 6. ATRIBUIÇÃO DO RANK GERAL
    // Se houve alguma alteração de pontos, o rank geral precisa ser reavaliado.
    await updateGeneralRank(wod.category);
    
    return null;
});

// -------------------------------------------------------------
// CLOUD FUNCTION CALLABLE - Deletar todos os resultados de um WOD
// -------------------------------------------------------------

export const deleteWodResults = onCall(async (request) => {
    const { wodId } = request.data;

    if (!wodId || typeof wodId !== 'string') {
        throw new Error('wodId é obrigatório e deve ser uma string');
    }

    try {
        console.log(`Deletando todos os resultados do WOD ${wodId}`);

        // Buscar o WOD para obter a categoria
        const wodDoc = await db.collection('wods').doc(wodId).get();
        if (!wodDoc.exists) {
            throw new Error('WOD não encontrado');
        }

        const wod = wodDoc.data() as Wod;
        const category = wod.category;

        // Buscar todos os resultados do WOD
        const resultsQuery = await db.collection('results')
            .where('wodId', '==', wodId)
            .get();

        if (resultsQuery.empty) {
            return { 
                success: true, 
                message: 'Nenhum resultado encontrado para deletar',
                deletedCount: 0 
            };
        }

        // Deletar todos os resultados em batch
        const batch = db.batch();
        const teamIdsToUpdate = new Set<string>();

        resultsQuery.docs.forEach((doc) => {
            const result = doc.data() as Result;
            teamIdsToUpdate.add(result.teamId);
            batch.delete(doc.ref);
        });

        await batch.commit();
        console.log(`Deletados ${resultsQuery.docs.length} resultados do WOD ${wodId}`);

        // Atualizar pontos totais dos times afetados
        const updatePromises = Array.from(teamIdsToUpdate).map(async (teamId) => {
            const teamRef = db.collection('teams').doc(teamId);
            const teamDoc = await teamRef.get();
            
            if (!teamDoc.exists) {
                console.warn(`Time ${teamId} não encontrado durante atualização de pontos`);
                return;
            }

            // Buscar todos os resultados restantes do time
            const allTeamResultsSnap = await db.collection('results')
                .where('teamId', '==', teamId)
                .get();

            const totalPoints = allTeamResultsSnap.docs.reduce((sum, doc) => 
                sum + (doc.data().awardedPoints || 0), 0);

            await teamRef.update({ totalPoints });
        });

        await Promise.all(updatePromises);

        // Atualizar o rank geral da categoria
        if (category) {
            await updateGeneralRank(category);
        }

        return { 
            success: true, 
            message: `Todos os resultados do WOD foram deletados com sucesso`,
            deletedCount: resultsQuery.docs.length 
        };

    } catch (error: any) {
        console.error('Erro ao deletar resultados do WOD:', error);
        throw new Error(`Erro ao deletar resultados: ${error.message}`);
    }
});

// -------------------------------------------------------------
// CLOUD FUNCTION CALLABLE - Recalcular pontos de uma categoria
// -------------------------------------------------------------

export const recalculateCategoryPoints = onCall(async (request) => {
    const { category } = request.data;

    if (!category || typeof category !== 'string') {
        throw new Error('category é obrigatório e deve ser uma string');
    }

    try {
        console.log(`Recalculando pontos para a categoria ${category}`);

        // Buscar todos os times da categoria
        const teamsQuery = await db.collection('teams')
            .where('category', '==', category)
            .get();

        if (teamsQuery.empty) {
            return {
                success: true,
                message: `Nenhum time encontrado para a categoria ${category}`,
                updatedCount: 0
            };
        }

        let updatedCount = 0;
        const BATCH_LIMIT = 500; // Limite do Firestore
        let batch = db.batch();
        let batchCount = 0;

        // Para cada time, recalcular pontos baseado nos resultados existentes
        for (const teamDoc of teamsQuery.docs) {
            const teamId = teamDoc.id;
            
            // Buscar todos os resultados do time
            const allTeamResultsSnap = await db.collection('results')
                .where('teamId', '==', teamId)
                .get();

            const totalPoints = allTeamResultsSnap.docs.reduce((sum, doc) => 
                sum + (doc.data().awardedPoints || 0), 0);

            const teamRef = db.collection('teams').doc(teamId);
            batch.update(teamRef, { totalPoints });
            batchCount++;
            updatedCount++;
            
            console.log(`Recalculated team ${teamId} totalPoints to ${totalPoints}`);

            // Se o batch atingiu o limite, commitar e criar novo
            if (batchCount >= BATCH_LIMIT) {
                await batch.commit();
                console.log(`Committed batch with ${batchCount} updates`);
                batch = db.batch();
                batchCount = 0;
            }
        }

        // Commitar o último batch se houver operações pendentes
        if (batchCount > 0) {
            await batch.commit();
            console.log(`Committed final batch with ${batchCount} updates`);
        }

        console.log(`Updated ${updatedCount} teams in category ${category}`);

        // Atualizar rank geral da categoria
        await updateGeneralRank(category);

        return {
            success: true,
            message: `Pontos recalculados com sucesso para a categoria ${category}`,
            updatedCount
        };

    } catch (error: any) {
        console.error('Erro ao recalcular pontos:', error);
        throw new Error(`Erro ao recalcular pontos: ${error.message}`);
    }
}); 