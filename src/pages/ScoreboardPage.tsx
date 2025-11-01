import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Categories } from '../commons/constants/categories';
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
    const [teamsData, setTeamsData] = useState<Record<string, Team[]>>({});
    const [loading, setLoading] = useState(true);
    const [wods, setWods] = useState<Wod[]>([]);
    const [resultsData, setResultsData] = useState<Result[]>([]);
    const [activeWodNumber, setActiveWodNumber] = useState<number | 'general'>('general');
  
    useEffect(() => {
      const allUnsubscribes: (() => void)[] = [];
      
      // Buscar times por categoria
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

      // Buscar WODs
      const qWods = query(collection(db, "wods"), orderBy("order", "asc"));
      const unsubscribeWods = onSnapshot(qWods, (snapshot) => {
          const fetchedWods = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Wod));
          setWods(fetchedWods);
          setLoading(false);
      });
      allUnsubscribes.push(unsubscribeWods);

      // Buscar resultados
      const qResults = query(collection(db, "results"));
      const unsubscribeResults = onSnapshot(qResults, (snapshot) => {
          const fetchedResults = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Result));
          setResultsData(fetchedResults);
          setLoading(false);
      });
      allUnsubscribes.push(unsubscribeResults);


      return () => {
        allUnsubscribes.forEach(unsub => unsub());
      };
    }, []);

    // Agrupar WODs por número de ordem (1-7)
    const wodsByNumber: Record<number, Wod[]> = {};
    wods.forEach(wod => {
      const wodOrder = wod.order;
      if (!wodsByNumber[wodOrder]) {
        wodsByNumber[wodOrder] = [];
      }
      wodsByNumber[wodOrder].push(wod);
    });

    // Extrair número do WOD do nome (ex: "Prova 1 - For Time" -> 1)
    // Obter lista de números de WODs únicos (1-7)
    const wodOrders = Array.from(new Set(wods.map(w => {
      // Tentar extrair o número do nome do WOD
      const match = w.name.match(/(?:Prova|WOD)\s*(\d+)/i);
      return match ? parseInt(match[1]) : w.order;
    }))).sort((a, b) => a - b);
  
    if (loading) {
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

        <h2>
          {activeWodNumber === 'general' ? 'Placar Geral' : `WOD ${activeWodNumber}`}
        </h2>

        <div className="scoreboard-content">
          {activeWodNumber === 'general' ? (
            // Placar Geral: mostrar todas as categorias com ranking geral
            <div className="category-list">
              {Object.keys(teamsData).map(category => (
                <ScoreBoardCategory 
                  key={category} 
                  categoryName={category} 
                  teams={teamsData[category] || []} 
                  showResult={false}
                />
              ))}
            </div>
          ) : (
            // WOD específico: mostrar resultados de cada categoria para este WOD
            <div className="category-list">
              {Categories.map(category => {
                // Buscar WOD para esta categoria com este número de WOD
                const wodForCategory = wods.find(w => {
                  const match = w.name.match(/(?:Prova|WOD)\s*(\d+)/i);
                  const wodNum = match ? parseInt(match[1]) : w.order;
                  return wodNum === activeWodNumber && w.category === category;
                });
                
                // Se não há WOD para esta categoria com este número, pular
                if (!wodForCategory) return null;
                
                // Função para obter ícone e cor do status
                const getStatusInfo = (status: string) => {
                  const statusMap: Record<string, { icon: string; label: string; color: string }> = {
                    'not started': { icon: 'cancel', label: 'Não Realizada', color: '#f44336' },
                    'in progress': { icon: 'running', label: 'Em Andamento', color: '#ff9800' },
                    'computing': { icon: 'schedule', label: 'Computando', color: '#2196f3' },
                    'completed': { icon: 'check_circle', label: 'Finalizada', color: '#4caf50' }
                  };
                  return statusMap[status] || { icon: 'help', label: status, color: '#888' };
                };
                
                const statusInfo = getStatusInfo(wodForCategory.status);
                
                // Buscar resultados deste WOD para esta categoria
                const wodResults = resultsData.filter(r => 
                  r.wodId === wodForCategory.id && r.category === category
                );
                
                // Combinar times com seus resultados para este WOD
                const teamsWithWodResults = (teamsData[category] || []).map(team => {
                  const teamResult = wodResults.find(r => r.teamId === team.id);
                  return {
                    ...team,
                    wodResult: teamResult
                  };
                });
                
                // Ordenar por ranking do WOD (wodRank), mantendo todos os times
                const sortedTeams = teamsWithWodResults
                  .sort((a, b) => {
                    // Times com resultado primeiro
                    if (!a.wodResult && b.wodResult) return 1;
                    if (a.wodResult && !b.wodResult) return -1;
                    // Ambos com ou sem resultado, ordenar por rank
                    return (a.wodResult?.wodRank || 999) - (b.wodResult?.wodRank || 999);
                  });
                
                return (
                    <div key={category} style={{ marginBottom: '2rem' }}>
                        <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.75rem',
                            marginBottom: '1rem',
                            padding: '0.75rem 1rem',
                            background: '#2a2a2a',
                            borderRadius: '8px',
                            border: `1px solid ${statusInfo.color}`
                        }}>
                            <span 
                                className="material-symbols-outlined"
                                style={{ color: statusInfo.color, fontSize: '24px' }}
                            >
                                {statusInfo.icon}
                            </span>
                            <div style={{ flex: 1 }}>
                                <h3 style={{ 
                                    color: statusInfo.color, 
                                    margin: 0, 
                                    fontSize: '1.1rem',
                                    fontWeight: '600'
                                }}>
                                    {wodForCategory.name} - {wodForCategory.type}
                                </h3>
                                <span style={{ 
                                    color: '#888', 
                                    fontSize: '0.9rem' 
                                }}>
                                    Status: {statusInfo.label}
                                </span>
                            </div>
                        </div>
                        <ScoreBoardCategory
                            categoryName={category}
                            teams={sortedTeams.map(({ wodResult, ...team }) => ({
                                ...team,
                                totalPoints: wodResult?.awardedPoints || 0,
                                rawScore: wodResult?.rawScore
                            }))} 
                            showResult={true}
                        />
                    </div>
                );
              })}
            </div>
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
