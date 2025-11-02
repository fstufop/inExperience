import { useState } from 'react';
import { db } from '../../firebase';
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

function BatchTeamRegister() {
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<{
    success: string[];
    errors: string[];
  } | null>(null);

  const handleBatchRegister = async () => {
    if (!window.confirm('Tem certeza que deseja cadastrar todos os times? Esta ação irá criar os times e atletas no banco de dados.')) {
      return;
    }

    setLoading(true);
    setResults(null);

    const resultsData = {
      success: [] as string[],
      errors: [] as string[],
    };

    try {
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

            resultsData.success.push(`${team.name} (${category})`);
          } catch (error: any) {
            const errorMsg = `${team.name} (${category}): ${error.message || error}`;
            resultsData.errors.push(errorMsg);
          }
        }
      }

      setResults(resultsData);
      alert(`Cadastro concluído!\n\nSucessos: ${resultsData.success.length}\nErros: ${resultsData.errors.length}`);
    } catch (error) {
      console.error('Erro geral no cadastro em lote:', error);
      alert('Erro ao executar cadastro em lote. Verifique o console.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      padding: '2rem',
      background: '#2a2a2a',
      borderRadius: '12px',
      border: '2px solid #33cc33',
      marginBottom: '2rem'
    }}>
      <h2 style={{ color: '#33cc33', marginBottom: '1rem' }}>Cadastro em Lote de Times</h2>
      <p style={{ color: '#ccc', marginBottom: '1.5rem' }}>
        Este script irá cadastrar todos os times e atletas listados abaixo no banco de dados.
      </p>
      
      <div style={{ marginBottom: '1.5rem' }}>
        <h3 style={{ color: '#fff', marginBottom: '0.5rem' }}>Times a serem cadastrados:</h3>
        {Object.entries(teamsData).map(([category, teams]) => (
          <div key={category} style={{ marginBottom: '1rem' }}>
            <strong style={{ color: '#33cc33' }}>{category}:</strong>
            <ul style={{ marginLeft: '1.5rem', marginTop: '0.5rem', color: '#ccc' }}>
              {teams.map((team, idx) => (
                <li key={idx}>
                  {team.name} ({team.atleta1} e {team.atleta2})
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      <button
        onClick={handleBatchRegister}
        disabled={loading}
        style={{
          padding: '1rem 2rem',
          background: loading 
            ? '#666' 
            : 'linear-gradient(135deg, #33cc33, #29a329)',
          color: 'white',
          border: 'none',
          borderRadius: '8px',
          cursor: loading ? 'not-allowed' : 'pointer',
          fontWeight: 'bold',
          fontSize: '1rem'
        }}
      >
        {loading ? 'Cadastrando...' : 'Cadastrar Todos os Times'}
      </button>

      {results && (
        <div style={{ marginTop: '2rem', padding: '1rem', background: '#1a1a1a', borderRadius: '8px' }}>
          <h3 style={{ color: '#33cc33', marginBottom: '1rem' }}>Resultados:</h3>
          
          <div style={{ marginBottom: '1rem' }}>
            <strong style={{ color: '#4caf50' }}>✓ Sucessos ({results.success.length}):</strong>
            <ul style={{ marginLeft: '1.5rem', marginTop: '0.5rem', color: '#ccc' }}>
              {results.success.map((item, idx) => (
                <li key={idx}>{item}</li>
              ))}
            </ul>
          </div>

          {results.errors.length > 0 && (
            <div>
              <strong style={{ color: '#f44336' }}>✗ Erros ({results.errors.length}):</strong>
              <ul style={{ marginLeft: '1.5rem', marginTop: '0.5rem', color: '#f44336' }}>
                {results.errors.map((item, idx) => (
                  <li key={idx}>{item}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default BatchTeamRegister;

