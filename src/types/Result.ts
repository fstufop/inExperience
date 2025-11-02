export interface Result {
    id: string;
    teamId: string;
    wodId: string;
    category: string;
    rawScore: string | number;
    wodRank: number;
    awardedPoints: number;
    timeCapReached?: boolean; // Indica se atingiu o CAP
    repsRemaining?: number; // Número de repetições faltantes quando atingiu CAP
  }