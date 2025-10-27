export const Categories = [
    'Dupla Beginner Feminino',
    'Dupla Intermediário Feminino',
    'Dupla Intermediário Masculino',
    'Dupla RX Masculino',
] as const;

export type CategoryType = typeof Categories[number];