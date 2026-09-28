import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useCategories } from '../contexts/CategoriesContext';
import { db } from '../firebase';
import { collection, query, where, orderBy, onSnapshot } from 'firebase/firestore';
import ScoreBoardCategory from '../components/ScoreBoardCategory';
import type { Team } from '../types/Team';
import type { Wod } from '../types/Wod';
import type { Result } from '../types/Result';
import logo from '../assets/logo.png';
import Loading from '../components/Loading';

function ScoreboardPage() {
    const navigate = useNavigate();
    const { categories, categoriesLoading } = useCategories();
    const [teamsData, setTeamsData] = useState<Record<string, Team[]>>({});
    const [loading, setLoading] = useState(true);
    const [wods, setWods] = useState<Wod[]>([]);
    const [resultsData, setResultsData] = useState<Result[]>([]);
    const [activeWodNumber, setActiveWodNumber] = useState<number | 'general'>('general');

    // Effect 1: wods + results — no category dependency
    useEffect(() => {
      const unsubs: (() => void)[] = [];

      const qWods = query(collection(db, 'wods'), orderBy('order', 'asc'));
      unsubs.push(onSnapshot(qWods, (snap) => {
        setWods(snap.docs.map(d => ({ id: d.id, ...d.data() } as Wod)));
      }));

      const qResults = query(collection(db, 'results'));
      unsubs.push(onSnapshot(qResults, (snap) => {
        setResultsData(snap.docs.map(d => ({ id: d.id, ...d.data() } as Result)));
      }));

      return () => unsubs.forEach(u => u());
    }, []);

    // Effect 2: team subscriptions — recreated when categories change
    useEffect(() => {
      if (categoriesLoading) return;

      if (categories.length === 0) {
        setTeamsData({});
        setLoading(false);
        return;
      }

      // Remove stale keys from previous category set
      setTeamsData(prev => {
        const next: Record<string, Team[]> = {};
        categories.forEach(cat => { if (prev[cat]) next[cat] = prev[cat]; });
        return next;
      });

      const unsubs: (() => void)[] = [];

      categories.forEach(category => {
        const q = query(
          collection(db, 'teams'),
          where('category', '==', category),
          orderBy('totalPoints', 'desc'),
        );
        unsubs.push(onSnapshot(q, (snap) => {
          const teams: Team[] = snap.docs.map(d => ({ id: d.id, ...d.data() } as Team));
          setTeamsData(prev => ({ ...prev, [category]: teams }));
          setLoading(false);
        }, () => setLoading(false)));
      });

      return () => unsubs.forEach(u => u());
    }, [categories, categoriesLoading]);

    const wodsByNumber: Record<number, Wod[]> = {};
    wods.forEach(wod => {
      const wodOrder = wod.order;
      if (!wodsByNumber[wodOrder]) wodsByNumber[wodOrder] = [];
      wodsByNumber[wodOrder].push(wod);
    });

    const wodOrders = Array.from(new Set(wods.map(w => {
      const match = w.name.match(/(?:Prova|WOD)\s*(\d+)/i);
      return match ? parseInt(match[1]) : w.order;
    }))).sort((a, b) => a - b);

    if (loading || categoriesLoading) {
      return <Loading message="Carregando Placar..." size="large" />;
    }

    return (
      <div className="scoreboard-container">
        <h1>
          <img src={logo} alt="IN Logo" />
          <span className="brand-text">EXPERIENCE</span>
        </h1>

        <div className="tab-navigation">
          <button
            onClick={() => setActiveWodNumber('general')}
            className={activeWodNumber === 'general' ? 'active-tab' : ''}
          >
            Placar Geral
          </button>

          {wodOrders.map(wodOrder => (
            <button
              key={wodOrder}
              onClick={() => setActiveWodNumber(wodOrder)}
              className={activeWodNumber === wodOrder ? 'active-tab' : ''}
            >
              WOD {wodOrder}
            </button>
          ))}
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '1rem' }}>
          <h2 style={{ margin: 0 }}>
            {activeWodNumber === 'general' ? 'Placar Geral' : `WOD ${activeWodNumber}`}
          </h2>
          <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
            <Link
              to="/wods"
              style={{
                padding: '0.75rem 1.5rem',
                background: 'linear-gradient(135deg, #33cc33, #29a329)',
                color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer',
                fontWeight: 'bold', fontSize: '0.9rem', textDecoration: 'none',
                display: 'flex', alignItems: 'center', gap: '0.5rem', transition: 'all 0.3s ease',
              }}
              onMouseEnter={(e) => { e.currentTarget.style.transform = 'scale(1.05)'; e.currentTarget.style.boxShadow = '0 4px 15px rgba(51, 204, 51, 0.4)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.transform = 'scale(1)'; e.currentTarget.style.boxShadow = 'none'; }}
            >
              <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>description</span>
              Descrições
            </Link>
            <Link
              to="/schedule"
              style={{
                padding: '0.75rem 1.5rem',
                background: 'linear-gradient(135deg, #2196f3, #1976d2)',
                color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer',
                fontWeight: 'bold', fontSize: '0.9rem', textDecoration: 'none',
                display: 'flex', alignItems: 'center', gap: '0.5rem', transition: 'all 0.3s ease',
              }}
              onMouseEnter={(e) => { e.currentTarget.style.transform = 'scale(1.05)'; e.currentTarget.style.boxShadow = '0 4px 15px rgba(33, 150, 243, 0.4)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.transform = 'scale(1)'; e.currentTarget.style.boxShadow = 'none'; }}
            >
              <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>schedule</span>
              Cronograma
            </Link>
          </div>
        </div>

        <div className="scoreboard-content">
          {activeWodNumber === 'general' ? (
            <div className="category-list">
              {categories.map(category => {
                const teams = teamsData[category] || [];
                if (teams.length === 0) return null;
                return (
                  <ScoreBoardCategory
                    key={category}
                    categoryName={category}
                    teams={teams}
                    showResult={false}
                  />
                );
              })}
            </div>
          ) : (
            <div className="category-list">
              {categories.map(category => {
                const wodForCategory = wods.find(w => {
                  const match = w.name.match(/(?:Prova|WOD)\s*(\d+)/i);
                  const wodNum = match ? parseInt(match[1]) : w.order;
                  return wodNum === activeWodNumber && w.category === category;
                });

                if (!wodForCategory) return null;

                const wodResults = resultsData.filter(r =>
                  r.wodId === wodForCategory.id && r.category === category
                );

                const teamsWithWodResults = (teamsData[category] || []).map(team => {
                  const teamResult = wodResults.find(r => r.teamId === team.id);
                  return { ...team, wodResult: teamResult };
                });

                const sortedTeams = teamsWithWodResults.sort((a, b) => {
                  if (!a.wodResult && b.wodResult) return 1;
                  if (a.wodResult && !b.wodResult) return -1;
                  return (a.wodResult?.wodRank || 999) - (b.wodResult?.wodRank || 999);
                });

                return (
                  <div key={category} style={{ marginBottom: '2rem' }}>
                    <ScoreBoardCategory
                      categoryName={category}
                      teams={sortedTeams.map(({ wodResult, ...team }) => ({
                        ...team,
                        totalPoints: wodResult?.awardedPoints || 0,
                        rawScore: wodResult?.rawScore,
                        timeCapReached: wodResult?.timeCapReached,
                        repsRemaining: wodResult?.repsRemaining,
                        wodRank: wodResult?.wodRank,
                      }))}
                      showResult={true}
                      wodStatus={wodForCategory.status}
                    />
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div style={{ position: 'fixed', bottom: '20px', right: '20px', zIndex: 1000 }}>
          <button
            onClick={() => navigate('/admin/login')}
            style={{
              background: 'linear-gradient(135deg, #33cc33 0%, #29a329 100%)',
              padding: '12px 24px', borderRadius: '50px', border: 'none',
              color: 'white', fontWeight: 'bold', fontSize: '0.9rem', cursor: 'pointer',
              boxShadow: '0 4px 15px rgba(51, 204, 51, 0.4)',
              display: 'flex', alignItems: 'center', gap: '8px', transition: 'all 0.3s ease',
            }}
            onMouseEnter={(e) => { e.currentTarget.style.transform = 'scale(1.05)'; e.currentTarget.style.boxShadow = '0 6px 20px rgba(51, 204, 51, 0.6)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.transform = 'scale(1)'; e.currentTarget.style.boxShadow = '0 4px 15px rgba(51, 204, 51, 0.4)'; }}
          >
            🔐
          </button>
        </div>
      </div>
    );
}

export default ScoreboardPage;
