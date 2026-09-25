import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { db } from '../../firebase';
import { collection, getDocs, query, orderBy } from 'firebase/firestore';
import type { CompetitionSnapshot } from '../../types/Competition';
import Loading from '../../components/Loading';

type CompetitionCard = Pick<CompetitionSnapshot, 'id' | 'name' | 'savedAt' | 'savedBy' | 'teams'>;

export default function CompetitionHistoryPage() {
  const navigate = useNavigate();
  const [competitions, setCompetitions] = useState<CompetitionCard[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetch = async () => {
      try {
        const q = query(collection(db, 'competitions'), orderBy('savedAt', 'desc'));
        const snap = await getDocs(q);
        setCompetitions(snap.docs.map(d => ({ id: d.id, ...d.data() })) as CompetitionCard[]);
      } catch (err) {
        console.error('Erro ao carregar histórico:', err);
      } finally {
        setLoading(false);
      }
    };
    fetch();
  }, []);

  const formatDate = (savedAt: CompetitionSnapshot['savedAt']) => {
    if (!savedAt) return '—';
    return savedAt.toDate().toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
  };

  if (loading) return <Loading message="Carregando histórico..." size="medium" />;

  return (
    <div className="admin-page-container">
      <h1>Histórico de Competições</h1>

      {competitions.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '4rem', color: '#888' }}>
          <span className="material-symbols-outlined" style={{ fontSize: '4rem', display: 'block', marginBottom: '1rem' }}>
            history
          </span>
          <p>Nenhuma competição salva ainda.</p>
          <p style={{ fontSize: '0.9rem' }}>
            Use o botão "Salvar Competição" no Scoreboard para criar um registro.
          </p>
        </div>
      ) : (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
          gap: '1.5rem',
          marginTop: '1.5rem',
        }}>
          {competitions.map(comp => (
            <div
              key={comp.id}
              style={{
                background: '#1e1e1e', borderRadius: '12px', padding: '1.5rem',
                border: '1px solid #333', display: 'flex', flexDirection: 'column', gap: '0.75rem',
              }}
            >
              <h2 style={{ margin: 0, fontSize: '1.2rem', color: '#fff' }}>{comp.name}</h2>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                <span style={{ color: '#888', fontSize: '0.85rem' }}>
                  <span className="material-symbols-outlined" style={{ fontSize: '14px', verticalAlign: 'middle', marginRight: '4px' }}>
                    calendar_today
                  </span>
                  {formatDate(comp.savedAt)}
                </span>
                <span style={{ color: '#888', fontSize: '0.85rem' }}>
                  <span className="material-symbols-outlined" style={{ fontSize: '14px', verticalAlign: 'middle', marginRight: '4px' }}>
                    groups
                  </span>
                  {comp.teams?.length ?? 0} times
                </span>
                <span style={{ color: '#888', fontSize: '0.85rem' }}>
                  <span className="material-symbols-outlined" style={{ fontSize: '14px', verticalAlign: 'middle', marginRight: '4px' }}>
                    person
                  </span>
                  {comp.savedBy}
                </span>
              </div>
              <button
                onClick={() => navigate(`/admin/history/${comp.id}`)}
                style={{
                  marginTop: 'auto', padding: '0.75rem 1rem',
                  background: 'linear-gradient(135deg, #33cc33, #29a329)',
                  color: '#fff', border: 'none', borderRadius: '8px',
                  cursor: 'pointer', fontWeight: 'bold', fontSize: '0.9rem',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem',
                }}
              >
                <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>open_in_new</span>
                Ver detalhes
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
