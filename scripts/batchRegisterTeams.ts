// Script para cadastrar times em lote
// Execute este código no console do navegador quando estiver logado no admin

import { db } from '../src/firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';

// Dados dos times organizados por categoria
const teamsData = {
  'Dupla Beginner Feminino': [
    { name: 'MauNat force', atleta1: 'Maura', atleta2: 'Natalie', box: '' },
    { name: 'Mães do João', atleta1: 'Adriana', atleta2: 'Ana Paula', box: '' },
    { name: 'Too pain no gain', atleta1: 'Ana Clara', atleta2: 'Laura', box: '' },
    { name: 'C2 Cross', atleta1: 'Cristina', atleta2: 'Cíntia', box: '' },
    { name: 'Levanta e chora', atleta1: 'Ashley', atleta2: 'Carol', box: '' },
    { name: 'Chega de burpee', atleta1: 'Nair', atleta2: 'Lucineide', box: '' },
    { name: 'L-Squad', atleta1: 'Lais', atleta2: 'Luana', box: '' },
    { name: 'Ressurgência', atleta1: 'Valéria', atleta2: 'Brenda', box: '' },
  ],
  'Dupla Intermediário Feminino': [
    { name: 'So viemos pela mídia', atleta1: 'Cristina', atleta2: 'Vanessa', box: '' },
    { name: 'Entre WODs das Minas', atleta1: 'Poli', atleta2: 'Oksane', box: '' },
    { name: 'A culpa é do João', atleta1: 'Sirlei', atleta2: 'Iraty', box: '' },
    { name: 'As casca de bala', atleta1: 'Isabela', atleta2: 'Cristiane', box: '' },
    { name: '40tei', atleta1: 'Helô', atleta2: 'Raíssea', box: '' },
    { name: 'Drupa do pagode', atleta1: 'Lídia', atleta2: 'Ana Luísa', box: '' },
    { name: 'INprovisadas', atleta1: 'Alice', atleta2: 'Stefany', box: '' },
    { name: 'Paulinha e sua mochila', atleta1: 'Marina', atleta2: 'Paulinha', box: '' },
    { name: '??', atleta1: 'Natália', atleta2: 'Carol', box: '' },
  ],
  'Dupla Intermediário Masculino': [
    { name: 'PR Evolution', atleta1: 'Rafael', atleta2: 'Pauleta', box: '' },
    { name: 'Burpee Brothers', atleta1: 'Camilo', atleta2: 'Douglas', box: '' },
    { name: 'Lombar de papel', atleta1: 'Filipe', atleta2: 'Pedro', box: '' },
    { name: 'Os Minions', atleta1: 'Evandro', atleta2: 'Juliano', box: '' },
    { name: 'PR de descanso', atleta1: 'Léo', atleta2: 'Tales', box: '' },
    { name: 'Levanta que é meme', atleta1: 'Mateus', atleta2: 'Wenderson', box: '' },
    { name: 'Modo turbo', atleta1: 'Bruno', atleta2: 'Gustavo', box: '' },
    { name: 'Us míninos do Alto', atleta1: 'Thomas', atleta2: 'Tavinho', box: '' },
    { name: 'Honra ao mérito', atleta1: 'Douglas', atleta2: 'André', box: '' },
    { name: '??', atleta1: 'Tulinho', atleta2: 'Lucas', box: '' },
  ],
  'Dupla RX Masculino': [
    { name: '??', atleta1: 'Gustavo', atleta2: 'Laércio', box: '' },
    { name: 'Vai Japonês', atleta1: 'João Paulo', atleta2: 'Fábio', box: '' },
    { name: 'Apenas um show', atleta1: 'Erick', atleta2: 'Vitor', box: '' },
    { name: 'O Gordo e o magro', atleta1: 'Bernardo', atleta2: 'Lucas', box: '' },
  ],
};

// Função para cadastrar todos os times
export async function batchRegisterTeams() {
  const results = {
    success: [] as string[],
    errors: [] as string[],
  };

  for (const [category, teams] of Object.entries(teamsData)) {
    for (const team of teams) {
      try {
        // 1. Cria o Documento do Time
        const teamRef = await addDoc(collection(db, 'teams'), {
          name: team.name,
          category: category,
          box: team.box || 'N/A',
          totalPoints: 0,
          generalRank: 0,
          createdAt: serverTimestamp(),
        });

        // 2. Adiciona os Documentos dos Atletas (Membros)
        await addDoc(collection(db, 'athletes'), {
          name: team.atleta1,
          teamId: teamRef.id,
          role: 'Membro 1',
          category: category,
        });

        await addDoc(collection(db, 'athletes'), {
          name: team.atleta2,
          teamId: teamRef.id,
          role: 'Membro 2',
          category: category,
        });

        results.success.push(`${team.name} (${category})`);
        console.log(`✓ Cadastrado: ${team.name} (${category})`);
      } catch (error) {
        const errorMsg = `Erro ao cadastrar ${team.name}: ${error}`;
        results.errors.push(errorMsg);
        console.error(`✗ ${errorMsg}`);
      }
    }
  }

  console.log('\n=== Resumo ===');
  console.log(`✓ Sucessos: ${results.success.length}`);
  console.log(`✗ Erros: ${results.errors.length}`);
  
  if (results.errors.length > 0) {
    console.log('\nErros:');
    results.errors.forEach(err => console.error(err));
  }

  return results;
}

// Para executar no console do navegador:
// batchRegisterTeams();

