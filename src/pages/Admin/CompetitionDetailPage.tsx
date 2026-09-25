import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { db } from '../../firebase';
import { doc, getDoc } from 'firebase/firestore';
import type { CompetitionSnapshot } from '../../types/Competition';
import type { Team } from '../../types/Team';
import type { Wod } from '../../types/Wod';
import type { Result } from '../../types/Result';
import Loading from '../../components/Loading';
import { Categories } from '../../commons/constants/categories';

type Tab = 'scoreboard' | 'wod-results' | 'wods' | 'teams';

export default function CompetitionDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [competition, setCompetition] = useState<CompetitionSnapshot | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<Tab>('scoreboard');

  useEffect(() => {
    if (!id) return;
    const fetch = async () => {
      try {
        const snap = await getDoc(doc(db, 'competitions', id));
        setCompetition(snap.exists() ? ({ id: snap.id, ...snap.data() } as CompetitionSnapshot) : null);
      } catch (err) {
        console.error('Erro ao carregar competição:', err);
        setCompetition(null);
      } finally {
        setLoading(false);
      }
    };
    fetch();
  }, [id]);

  if (loading) return <Loading message="Carregando competição..." size="medium" />;

  if (!competition) {
    return (
      <div className="admin-page-container" style={{ textAlign: 'center', padding: '4rem' }}>
        <span className="material-symbols-outlined" style={{ fontSize: '4rem', color: '#f44336', display: 'block', marginBottom: '1rem' }}>
          error
        </span>
        <h2>Competição não encontrada</h2>
        <button
          onClick={() => navigate('/admin/history')}
          style={{ marginTop: '1rem', padding: '0.75rem 1.5rem', background: '#333', color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer' }}
        >
          Voltar ao Histórico
        </button>
      </div>
    );
  }

  const formatDate = (savedAt: CompetitionSnapshot['savedAt']) => {
    if (!savedAt) return '—';
    return savedAt.toDate().toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
  };

  const tabs: { id: Tab; label: string; icon: string }[] = [
    { id: 'scoreboard', label: 'Scoreboard', icon: 'emoji_events' },
    { id: 'wod-results', label: 'Resultados por WOD', icon: 'assessment' },
    { id: 'wods', label: 'WODs', icon: 'assignment' },
    { id: 'teams', label: 'Times', icon: 'groups' },
  ];

  return (
    <div className="admin-page-container">
      <button
        onClick={() => navigate('/admin/history')}
        style={{ background: 'none', border: 'none', color: '#888', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '0.5rem', padding: 0 }}
      >
        <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>arrow_back</span>
        Histórico
      </button>

      <h1 style={{ margin: '0 0 0.25rem' }}>{competition.name}</h1>
      <p style={{ color: '#888', margin: '0 0 1.5rem', fontSize: '0.9rem' }}>
        Salvo em {formatDate(competition.savedAt)} por {competition.savedBy}
      </p>

      <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', marginBottom: '1.5rem' }}>
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            style={{
              padding: '0.75rem 1.25rem', border: 'none', borderRadius: '8px',
              cursor: 'pointer', fontWeight: 'bold', fontSize: '0.9rem',
              display: 'flex', alignItems: 'center', gap: '0.5rem',
              background: activeTab === tab.id ? 'linear-gradient(135deg, #33cc33, #29a329)' : '#333',
              color: '#fff', transition: 'all 0.2s ease',
            }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>{tab.icon}</span>
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === 'scoreboard' && <ScoreboardTab teams={competition.teams} />}
      {activeTab === 'wod-results' && (
        <WodResultsTab wods={competition.wods} results={competition.results} teams={competition.teams} />
      )}
      {activeTab === 'wods' && <WodsTab wods={competition.wods} />}
      {activeTab === 'teams' && <TeamsTab teams={competition.teams} />}
    </div>
  );
}

function ScoreboardTab({ teams }: { teams: Team[] }) {
  return (
    <div>
      {Categories.map(category => {
        const categoryTeams = [...teams]
          .filter(t => t.category === category)
          .sort((a, b) => (a.generalRank || Infinity) - (b.generalRank || Infinity));
        if (categoryTeams.length === 0) return null;
        return (
          <div key={category} style={{ marginBottom: '2rem' }}>
            <h2 style={{ borderBottom: '1px solid #333', paddingBottom: '0.5rem' }}>{category}</h2>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ color: '#888', fontSize: '0.85rem', textAlign: 'left' }}>
                  <th style={{ padding: '0.5rem' }}>Posição</th>
                  <th style={{ padding: '0.5rem' }}>Time</th>
                  <th style={{ padding: '0.5rem' }}>Box</th>
                  <th style={{ padding: '0.5rem', textAlign: 'right' }}>Pontos</th>
                </tr>
              </thead>
              <tbody>
                {categoryTeams.map((team, i) => (
                  <tr key={team.id} style={{ borderTop: '1px solid #2a2a2a', background: i === 0 ? 'rgba(51,204,51,0.08)' : 'transparent' }}>
                    <td style={{ padding: '0.75rem 0.5rem', fontWeight: 'bold', color: i === 0 ? '#33cc33' : '#fff' }}>
                      {team.generalRank || i + 1}º
                    </td>
                    <td style={{ padding: '0.75rem 0.5rem' }}>{team.name}</td>
                    <td style={{ padding: '0.75rem 0.5rem', color: '#888' }}>{team.box}</td>
                    <td style={{ padding: '0.75rem 0.5rem', textAlign: 'right', fontWeight: 'bold' }}>{team.totalPoints}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        );
      })}
    </div>
  );
}

function WodResultsTab({ wods, results, teams }: { wods: Wod[]; results: Result[]; teams: Team[] }) {
  return (
    <div>
      {wods.map(wod => {
        const wodResults = results
          .filter(r => r.wodId === wod.id)
          .sort((a, b) => a.wodRank - b.wodRank);
        return (
          <div key={wod.id} style={{ marginBottom: '2rem' }}>
            <h2 style={{ borderBottom: '1px solid #333', paddingBottom: '0.5rem' }}>
              {wod.name}
              <span style={{ fontSize: '0.8rem', color: '#888', marginLeft: '0.75rem', fontWeight: 'normal' }}>
                {wod.category} · {wod.type}
              </span>
            </h2>
            {wodResults.length === 0 ? (
              <p style={{ color: '#888' }}>Sem resultados registrados.</p>
            ) : (
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ color: '#888', fontSize: '0.85rem', textAlign: 'left' }}>
                    <th style={{ padding: '0.5rem' }}>Rank</th>
                    <th style={{ padding: '0.5rem' }}>Time</th>
                    <th style={{ padding: '0.5rem' }}>Resultado</th>
                    <th style={{ padding: '0.5rem', textAlign: 'right' }}>Pts</th>
                  </tr>
                </thead>
                <tbody>
                  {wodResults.map((result, i) => {
                    const team = teams.find(t => t.id === result.teamId);
                    const score = result.timeCapReached && result.repsRemaining !== undefined
                      ? `CAP + ${result.repsRemaining} reps`
                      : result.timeCapReached
                      ? 'CAP'
                      : String(result.rawScore);
                    return (
                      <tr key={result.id} style={{ borderTop: '1px solid #2a2a2a' }}>
                        <td style={{ padding: '0.75rem 0.5rem', color: i === 0 ? '#33cc33' : '#fff', fontWeight: 'bold' }}>
                          {result.wodRank}º
                        </td>
                        <td style={{ padding: '0.75rem 0.5rem' }}>{team?.name ?? result.teamId}</td>
                        <td style={{ padding: '0.75rem 0.5rem', color: '#aaa' }}>{score}</td>
                        <td style={{ padding: '0.75rem 0.5rem', textAlign: 'right' }}>{result.awardedPoints}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        );
      })}
    </div>
  );
}

function WodsTab({ wods }: { wods: Wod[] }) {
  const statusLabel: Record<string, string> = {
    'not started': 'Não iniciado',
    'in progress': 'Em andamento',
    'computing': 'Apurando',
    'completed': 'Concluído',
  };
  const statusColor: Record<string, string> = {
    'not started': '#f44336',
    'in progress': '#ff9800',
    'computing': '#2196f3',
    'completed': '#4caf50',
  };
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '1rem' }}>
      {wods.map(wod => (
        <div key={wod.id} style={{ background: '#1e1e1e', borderRadius: '10px', padding: '1.25rem', border: '1px solid #333' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
            <h3 style={{ margin: 0, fontSize: '1rem' }}>{wod.name}</h3>
            <span style={{ fontSize: '0.75rem', color: statusColor[wod.status] ?? '#888', fontWeight: 'bold' }}>
              {statusLabel[wod.status] ?? wod.status}
            </span>
          </div>
          <p style={{ margin: '0 0 0.5rem', color: '#888', fontSize: '0.85rem' }}>{wod.category}</p>
          <div style={{ display: 'flex', gap: '1rem', fontSize: '0.85rem', color: '#aaa' }}>
            <span>Tipo: {wod.type}</span>
            <span>Máx: {wod.maxPoints} pts</span>
          </div>
        </div>
      ))}
    </div>
  );
}

function TeamsTab({ teams }: { teams: Team[] }) {
  return (
    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
      <thead>
        <tr style={{ color: '#888', fontSize: '0.85rem', textAlign: 'left' }}>
          <th style={{ padding: '0.5rem' }}>Pos.</th>
          <th style={{ padding: '0.5rem' }}>Time</th>
          <th style={{ padding: '0.5rem' }}>Box</th>
          <th style={{ padding: '0.5rem' }}>Categoria</th>
          <th style={{ padding: '0.5rem', textAlign: 'right' }}>Pontos</th>
        </tr>
      </thead>
      <tbody>
        {[...teams]
          .sort((a, b) => (a.generalRank || Infinity) - (b.generalRank || Infinity))
          .map((team, i) => (
            <tr key={team.id} style={{ borderTop: '1px solid #2a2a2a' }}>
              <td style={{ padding: '0.75rem 0.5rem', color: '#888' }}>{team.generalRank || i + 1}º</td>
              <td style={{ padding: '0.75rem 0.5rem', fontWeight: '600' }}>{team.name}</td>
              <td style={{ padding: '0.75rem 0.5rem', color: '#888' }}>{team.box}</td>
              <td style={{ padding: '0.75rem 0.5rem', color: '#888', fontSize: '0.85rem' }}>{team.category}</td>
              <td style={{ padding: '0.75rem 0.5rem', textAlign: 'right', fontWeight: 'bold' }}>{team.totalPoints}</td>
            </tr>
          ))}
      </tbody>
    </table>
  );
}
