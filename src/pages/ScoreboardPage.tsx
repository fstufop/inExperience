import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Categories } from '../commons/constants/categories';
import { db } from '../firebase';
import { collection, query, where, orderBy, onSnapshot } from 'firebase/firestore';
import ScoreBoardCategory from '../components/ScoreBoardCategory';
import type { Team } from '../types/Team';
import type { Wod } from '../types/Wod';
import WodDetailView from '../components/Wod/WodDetailView';
import logo from '../assets/logo.png';

function ScoreboardPage() {
    const navigate = useNavigate();
    const [teamsData, setTeamsData] = useState<Record<string, Team[]>>({});
    const [loading, setLoading] = useState(true);
    const [wods, setWods] = useState<Wod[]>([]);
    const [activeWodId, setActiveWodId] = useState<'general' | string>('general');
  
    useEffect(() => {
      const allUnsubscribes: (() => void)[] = [];
      

      Categories.forEach(category => {
        const q = query(
          collection(db, "teams"),
          where("category", "==", category),
          orderBy("totalPoints", "desc")
        );

        const unsubscribe = onSnapshot(q, (snapshot) => {
          const teams: Team[] = [];
          snapshot.forEach((doc) => {
            teams.push({ id: doc.id, ...doc.data() } as Team);
          });

          setTeamsData(prev => ({
            ...prev,
            [category]: teams
          }));
          setLoading(false);
        }, (error) => {
          console.error("Erro ao buscar placar em tempo real:", error);
          setLoading(false);
        });

        allUnsubscribes.push(unsubscribe);
      });

      const qWods = query(collection(db, "wods"), orderBy("order", "asc"));
      const unsubscribe = onSnapshot(qWods, (snapshot) => {
          const fetchedWods = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Wod));
          setWods(fetchedWods);
          setLoading(false);
      });
      allUnsubscribes.push(unsubscribe);

      return () => {
        allUnsubscribes.forEach(unsub => unsub());
      };
    }, []);
  
    if (loading) {
      return <div className="loading-screen">Carregando Placar...</div>;
    }
    
    return (
      <div className="scoreboard-container">
        <h1>
          <img src={logo} alt="IN Logo" />
          <span style={{ color: '#33cc33' }}>EXPERIENCE</span>
        </h1>
        <div className="tab-navigation">
          <button 
            onClick={() => setActiveWodId('general')}
            className={activeWodId === 'general' ? 'active-tab' : ''}
          >
            Placar Geral
          </button>
          
          {wods.map(wod => (
            <button 
              key={wod.id}
              onClick={() => setActiveWodId(wod.id)}
              className={activeWodId === wod.id ? 'active-tab' : ''}
            >
              {wod.name}
            </button>
          ))}
        </div>
        <div className="scoreboard-content">
          {activeWodId === 'general' ? (
            <div className="category-list">
              {Object.keys(teamsData).map(category => (
                <ScoreBoardCategory 
                  key={category} 
                  categoryName={category} 
                  teams={teamsData[category] || []} 
                />
              ))}
            </div>
          ) : (
            <WodDetailView 
              wodId={activeWodId} 
              wodName={wods.find(w => w.id === activeWodId)?.name || ''}
            />
          )}
        </div>
        
        <div style={{ 
          position: 'fixed', 
          bottom: '20px', 
          right: '20px',
          zIndex: 1000
        }}>
          <button 
            onClick={() => navigate('/admin/login')}
            style={{
              background: 'linear-gradient(135deg, #33cc33 0%, #29a329 100%)',
              padding: '12px 24px',
              borderRadius: '50px',
              border: 'none',
              color: 'white',
              fontWeight: 'bold',
              fontSize: '0.9rem',
              cursor: 'pointer',
              boxShadow: '0 4px 15px rgba(51, 204, 51, 0.4)',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              transition: 'all 0.3s ease'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'scale(1.05)';
              e.currentTarget.style.boxShadow = '0 6px 20px rgba(51, 204, 51, 0.6)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'scale(1)';
              e.currentTarget.style.boxShadow = '0 4px 15px rgba(51, 204, 51, 0.4)';
            }}
          >
            🔐 Admin
          </button>
        </div>
      </div>
    );
  }

export default ScoreboardPage;