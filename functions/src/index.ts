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
function isScoreBetter(scoreA: string | number, scoreB: string | number, wodType: 'Time' | 'Reps' | 'Load'): boolean {
    if (wodType === 'Time') {
        const toSeconds = (score: string | number): number => {
            if (typeof score === 'number') return score;
            
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
        const secA = toSeconds(scoreA);
        const secB = toSeconds(scoreB);
        return secA < secB; 
    } else { 
        const numA = Number(scoreA);
        const numB = Number(scoreB);
        
        // Valida se são números válidos
        if (isNaN(numA) || isNaN(numB)) {
            console.warn(`Números inválidos: ${scoreA} ou ${scoreB}`);
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
    if (!resultAfter) return null; 

    const { wodId, category } = resultAfter;
    if (!wodId || !category) return null;

    // A lógica de busca, ranqueamento e atualização é a mesma:

    // 1. Coleta a Prova (WOD) e todos os Resultados dessa Prova/Categoria
    const wodSnap = await db.collection('wods').doc(wodId).get();
    const wod = wodSnap.data() as Wod;
    if (!wod) return null;

    // ... (restante da lógica de busca de resultados, ranqueamento, batch update)

    const resultsQuery = await db.collection('results')
        .where('wodId', '==', wodId)
        .where('category', '==', category)
        .get();

    const results: (Result & { id: string })[] = resultsQuery.docs.map(doc => ({ id: doc.id, ...doc.data() } as Result & { id: string }));

    // 2. ATRIBUIÇÃO DE RANK (Ordering)
    const rankedResults = results
        .filter(r => r.rawScore !== undefined && r.rawScore !== null)
        .sort((a, b) => {
            const isAisBetter = isScoreBetter(a.rawScore, b.rawScore, wod.type as Wod['type']);
            return isAisBetter ? -1 : 1;
        })
        .map((result, index) => ({
            ...result,
            wodRank: index + 1,
            awardedPoints: calculatePoints(index + 1, wod.maxPoints)
        }));
        
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
    for (const teamId of Array.from(teamsToUpdate)) {
        const allTeamResultsSnap = await db.collection('results')
            .where('teamId', '==', teamId)
            .get();

        const totalPoints = allTeamResultsSnap.docs.reduce((sum, doc) => 
            sum + (doc.data().awardedPoints || 0), 0);

        const teamRef = db.collection('teams').doc(teamId);
        batch.update(teamRef, { totalPoints: totalPoints });
    }

    // 5. EXECUÇÃO DO BATCH
    await batch.commit();

    // 6. ATRIBUIÇÃO DO RANK GERAL
    // Se houve alguma alteração de pontos, o rank geral precisa ser reavaliado.
    await updateGeneralRank(category);
    
    return null;
}); 