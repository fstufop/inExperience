import { useState, useEffect } from 'react';
import { Categories } from '../commons/constants/categories';
import { db } from '../firebase';
import { collection, query, where, orderBy, onSnapshot } from 'firebase/firestore';
import ScoreBoardCategory from '../components/ScoreBoardCategory';
import type { Team } from '../types/Team';
import type { Wod } from '../types/Wod';
import WodDetailView from '../components/Wod/WodDetailView';

function ScoreboardPage() {
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
        <h1>🏆 Placar da Competição</h1>
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
      </div>
    );
  }

export default ScoreboardPage;