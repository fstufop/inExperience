// Tipos para uso no Cloud Functions
// Estes tipos são copiados do frontend para manter o backend autônomo

export type WodType = 'Time' | 'Reps' | 'Load';

export interface Wod {
    id: string;
    name: string;
    type: WodType;
    status: 'open' | 'closed' | 'in progress';
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

