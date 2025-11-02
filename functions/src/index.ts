import * as admin from 'firebase-admin';
// Importação do Firebase Functions V2
import { onDocumentWritten } from 'firebase-functions/v2/firestore'; 
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
            const toSeconds = (score: string | number): number => {
                if (typeof score === 'number') return score;
                
                // Se é "CAP" sem tempo, retorna valor muito alto
                if (score.trim().toUpperCase() === 'CAP') return 999999;
                
                // Validação mais rigorosa do formato MM:SS
                const timePattern = /^(\d{1,2}):(\d{2})$/;
                const match = score.trim().match(timePattern);
                
                if (!match) {
                    console.warn(`Formato de tempo inválido: ${score}`);
                    return 999999; // Valor de erro
                }
                
                const minutes = parseInt(match[1], 10);
                const seconds = parseInt(match[2], 10);
                
                // Valida se segundos estão no range 0-59
                if (seconds >= 60) {
                    console.warn(`Segundos inválidos no tempo: ${score}`);
                    return 999999;
                }
                
                return minutes * 60 + seconds;
            };
            const secA = toSeconds(resultA.rawScore);
            const secB = toSeconds(resultB.rawScore);
            return secA < secB; // Menor tempo é melhor
        }
        
        // Ambos têm CAP: quem tem menos reps restantes é melhor
        if (repsA !== repsB) {
            return repsA < repsB; // Menos reps restantes é melhor
        }
        
        // Mesmo número de reps restantes: compara tempo (se tiver)
        const toSeconds = (score: string | number): number => {
            if (typeof score === 'number') return score;
            
            // Se é "CAP" sem tempo, retorna valor muito alto
            if (score.trim().toUpperCase() === 'CAP') return 999999;
            
            const timePattern = /^(\d{1,2}):(\d{2})$/;
            const match = score.trim().match(timePattern);
            if (!match) return 999999;
            const minutes = parseInt(match[1], 10);
            const seconds = parseInt(match[2], 10);
            if (seconds >= 60) return 999999;
            return minutes * 60 + seconds;
        };
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
    const teamsQuery = await db.collection('teams')
        .where('category', '==', category)
        .orderBy('totalPoints', 'desc')
        .get();

    const batch = db.batch();

    teamsQuery.docs.forEach((doc, index) => {
        const teamRef = db.collection('teams').doc(doc.id);
        const newRank = index + 1;
        batch.update(teamRef, { generalRank: newRank });
    });

    await batch.commit();
}
// ... (Fim das funções auxiliares)

// -------------------------------------------------------------
// CLOUD FUNCTION PRINCIPAL - V2
// -------------------------------------------------------------

export const calculateScores = onDocumentWritten('results/{resultId}', async (event) => {
    // A sintaxe V2 usa 'event.data.after' e 'event.data.before' para os documentos

    const resultAfter = event.data?.after.data();
    
    // Não processa se o documento não existir após a escrita (deleção)
    if (!resultAfter) {
        console.log('Result deleted, skipping calculation');
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

    // 2. ATRIBUIÇÃO DE RANK (Ordering)
    const validResults = results.filter(r => r.rawScore !== undefined && r.rawScore !== null && r.rawScore !== '');
    console.log(`Found ${validResults.length} valid results out of ${results.length} total`);
    
    const rankedResults = validResults
        .sort((a, b) => {
            const isAisBetter = isScoreBetter(
                { rawScore: a.rawScore, timeCapReached: a.timeCapReached || false, repsRemaining: a.repsRemaining || 0 },
                { rawScore: b.rawScore, timeCapReached: b.timeCapReached || false, repsRemaining: b.repsRemaining || 0 },
                wod.type as Wod['type']
            );
            return isAisBetter ? -1 : 1;
        })
        .map((result, index) => {
            const rank = index + 1;
            const points = calculatePoints(rank, wod.maxPoints);
            console.log(`Ranking: ${result.rawScore} -> Rank ${rank}, Points ${points}`);
            return {
                ...result,
                wodRank: rank,
                awardedPoints: points
            };
        });
        
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