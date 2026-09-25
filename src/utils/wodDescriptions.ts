// Descrições das provas baseadas nas imagens fornecidas

export interface WodDescription {
  order: number; // Número da prova (1, 2, 3, etc)
  category: string; // Categoria da prova
  description: string; // Descrição completa
}

export const wodDescriptions: WodDescription[] = [
  // PROVA 1 - EVOLUTION MASCULINO
  {
    order: 1,
    category: 'Dupla Evolution Masculino',
    description: `For time: (0 a 7 min.)
150 Wallball #20lbs`
  },
  
  // PROVA 2 - EVOLUTION MASCULINO
  {
    order: 2,
    category: 'Dupla Evolution Masculino',
    description: `For time: (7 a 14 min.)
3 Rounds:
15 Toes to bar
20 Db Snatch Alt. #16kg
20 Deadlift #165lbs`
  },
  
  // PROVA 1 - EVOLUTION FEMININO
  {
    order: 8,
    category: 'Dupla Evolution Feminino',
    description: `For time: (0 a 7 min.)
150 Wallball #14lbs`
  },
  
  // PROVA 2 - EVOLUTION FEMININO
  {
    order: 9,
    category: 'Dupla Evolution Feminino',
    description: `For time: (7 a 14 min.)
3 Rounds:
10 Toes to bar
20 Db Snatch Alt. #12kg
20 Deadlift #135lbs`
  },
  
  // PROVA 1 - RX MASCULINO
  {
    order: 1,
    category: 'Dupla RX Masculino',
    description: `For time: (0 a 7 min.)
150 Wallball #20lbs`
  },
  
  // PROVA 2 - RX MASCULINO
  {
    order: 2,
    category: 'Dupla RX Masculino',
    description: `For time: (7 a 14 min.)
3 Rounds:
20 Toes to bar
20 Db Snatch Alt. #22kg
20 Deadlift #195lbs`
  },
  
  // PROVA 3 - EV FEMININO
  {
    order: 10,
    category: 'Dupla Evolution Feminino',
    description: `3 minutos de remo
Distância percorrida nos 3 minutos`
  },
  
  // PROVA 3 - EV MASCULINO
  {
    order: 3,
    category: 'Dupla Evolution Masculino',
    description: `3 minutos de remo
Distância percorrida nos 3 minutos`
  },
  
  // PROVA 3 - RX MASCULINO
  {
    order: 3,
    category: 'Dupla RX Masculino',
    description: `3 minutos de remo
Distância percorrida nos 3 minutos`
  },
  
  // PROVA 4 - EV FEMININO
  {
    order: 11,
    category: 'Dupla Evolution Feminino',
    description: `PR: (0 a 3 min.)
Atleta B
1 Snatch + 1 OHS`
  },
  
  // PROVA 5 - EV FEMININO
  {
    order: 12,
    category: 'Dupla Evolution Feminino',
    description: `AMRAP: (4 a 7 min.)
Max Burpee over the wall (1mt)

Rest: (3 a 4 min.)
Colocar a caixa no lugar para a prova 5`
  },
  
  // PROVA 4 - EV MASCULINO
  {
    order: 4,
    category: 'Dupla Evolution Masculino',
    description: `PR: (0 a 3 min.)
Atleta B
1 Snatch + 1 OHS`
  },
  
  // PROVA 5 - EV MASCULINO
  {
    order: 5,
    category: 'Dupla Evolution Masculino',
    description: `AMRAP: (4 a 7 min.)
Max Burpee over the wall (1mt)

Rest: (3 a 4 min.)
Colocar a caixa no lugar para a prova 5`
  },
  
  // PROVA 4 - RX MASCULINO
  {
    order: 4,
    category: 'Dupla RX Masculino',
    description: `PR: (0 a 3 min.)
Atleta B
1 Snatch + 1 OHS`
  },
  
  // PROVA 5 - RX MASCULINO
  {
    order: 5,
    category: 'Dupla RX Masculino',
    description: `AMRAP: (4 a 7 min.)
Max Burpee over the wall (1mt)

Rest: (3 a 4 min.)
Colocar a caixa no lugar para a prova 5`
  },
  
  // PROVA 6 - SCALE FEMININO
  {
    order: 6,
    category: 'Dupla Scale Feminino',
    description: `For time: (0 a 6 min.)
30-20-10
Ring row
Thruster #35lbs`
  },
  
  // PROVA 7 - SCALE FEMININO
  {
    order: 7,
    category: 'Dupla Scale Feminino',
    description: `For time: (7 a 10 min.)
4 rounds:
+/- 10mts Walking lunge
30 Single Under

Rest: (6 a 7 min.)`
  },
  
  // PROVA 6 - EV FEMININO
  {
    order: 6,
    category: 'Dupla Evolution Feminino',
    description: `For time: (0 a 6 min.)
20-15-10
Pull Up
30-20-10
Thruster #65lbs`
  },
  
  // PROVA 7 - EV FEMININO
  {
    order: 7,
    category: 'Dupla Evolution Feminino',
    description: `For time: (7 a 10 min.)
10-8-6-4-2
Double Under
Front rack step lunge #65

Rest: (6 a 7 min.)`
  },
  
  // PROVA 6 - EV MASCULINO
  {
    order: 6,
    category: 'Dupla Evolution Masculino',
    description: `For time: (0 a 6 min.)
20-15-10
Pull Up
30-20-10
Thruster #95lbs`
  },
  
  // PROVA 7 - EV MASCULINO
  {
    order: 7,
    category: 'Dupla Evolution Masculino',
    description: `For time: (7 a 10 min.)
10-8-6-4-2
Double Under
Front rack step lunge #95

Rest: (6 a 7 min.)`
  },
  
  // PROVA 6 - RX MASCULINO
  {
    order: 6,
    category: 'Dupla RX Masculino',
    description: `For time: (0 a 6 min.)
20-15-10
Bar Muscle Up
30-20-10
Thruster #115`
  },
  
  // PROVA 7 - RX MASCULINO
  {
    order: 7,
    category: 'Dupla RX Masculino',
    description: `For time: (7 a 10 min.)
Handstand walk (+/- 5mts)
8-6-4-2
Hang Squat Clean #165

Rest: (6 a 7 min.)
Acrescetar o peso na barra`
  },
];

