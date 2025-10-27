// Tipos para uso no Cloud Functions
// Estes tipos são copiados do frontend para manter o backend autônomo

export type WodType = 'Time' | 'Reps' | 'Load';

export interface Wod {
    id: string;
    name: string;
    type: WodType;
    category: string; // Categoria da prova
    status: 'not started' | 'in progress' | 'computing' | 'completed';
    order: number;
    maxPoints: number;
}

export interface Result {
    id: string;
    teamId: string;
    wodId: string;
    category: string;
    rawScore: string;
    wodRank?: number;
    awardedPoints?: number;
}

export interface Team {
    id: string;
    name: string;
    category: string;
    box: string;
    totalPoints: number;
    generalRank: number;
}

