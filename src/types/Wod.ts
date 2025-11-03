export type WodType = 'Time' | 'Reps' | 'Load';

const WodTypesArray: WodType[] = ['Time', 'Reps', 'Load'];

export const WodTypes = WodTypesArray;

export interface Wod {
    id: string;
    name: string;
    type: WodType;
    category: string; // Categoria da prova
    status: 'not started' | 'in progress' | 'computing' | 'completed';
    order: number;
    maxPoints: number;
    description?: string; // Descrição detalhada da prova
}