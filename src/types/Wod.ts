export type WodType = 'Time' | 'Reps' | 'Load';

const WodTypesArray: WodType[] = ['Time', 'Reps', 'Load'];

export const WodTypes = WodTypesArray;

export interface Wod {
    id: string;
    name: string;
    type: WodType;
    status: 'open' | 'closed' | 'in progress';
    order: number;
    maxPoints: number;
}