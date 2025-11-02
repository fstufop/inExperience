import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { db } from '../firebase';
import { collection, query, where, orderBy, onSnapshot } from 'firebase/firestore';
import { Categories } from '../commons/constants/categories';
import type { Team } from '../types/Team';
import type { Wod } from '../types/Wod';
import type { Athlete } from '../types/Athlete';
import Loading from '../components/Loading';
import logo from '../assets/logo.png';

interface Heat {
  id: number;
  time: string;
  teams: {
    lane1?: Team; // SF - Iniciante Feminino
    lane2?: Team; // EF - Intermediário Feminino
    lane3?: Team; // EM - Intermediário Masculino
    lane4?: Team; // RXM - RX Masculino
  };
}

interface WodSchedule {
  wodNumber: number;
  wodName: string;
  heats: Heat[];
}

function SchedulePage() {
  const [teams, setTeams] = useState<Record<string, Team[]>>({});
  const [wods, setWods] = useState<Wod[]>([]);
  const [loading, setLoading] = useState(true);
  const [athletesByTeamId, setAthletesByTeamId] = useState<Record<string, Athlete[]>>({});

  useEffect(() => {
    const allUnsubscribes: (() => void)[] = [];

    // Buscar times por categoria
    Categories.forEach(category => {
      const q = query(
        collection(db, "teams"),
        where("category", "==", category),
        orderBy("name", "asc")
      );

      const unsubscribe = onSnapshot(q, (snapshot) => {
        const fetchedTeams: Team[] = [];
        snapshot.forEach((doc) => {
          fetchedTeams.push({ id: doc.id, ...doc.data() } as Team);
        });

        setTeams(prev => ({
          ...prev,
          [category]: fetchedTeams
        }));
        setLoading(false);
      }, (error) => {
        console.error("Erro ao buscar times:", error);
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

    return () => {
      allUnsubscribes.forEach(unsub => unsub());
    };
  }, []);

  // Buscar atletas para todos os times
  useEffect(() => {
    const allTeamIds = Object.values(teams).flat().map(t => t.id);
    if (allTeamIds.length === 0) {
      setAthletesByTeamId({});
      return;
    }

    const unsubscribes: (() => void)[] = [];
    const athletesMap = new Map<string, Athlete[]>();

    allTeamIds.forEach(teamId => {
      const athletesQuery = query(
        collection(db, "athletes"), 
        where("teamId", "==", teamId)
      );
      
      const unsubscribe = onSnapshot(athletesQuery, (snapshot) => {
        const athletes: Athlete[] = [];
        snapshot.forEach((doc) => {
          athletes.push({ id: doc.id, ...doc.data() } as Athlete);
        });
        // Ordena por role (Membro 1, Membro 2)
        athletes.sort((a, b) => a.role.localeCompare(b.role));
        
        athletesMap.set(teamId, athletes);
        
        // Atualiza todos os atletas
        const updatedMap: Record<string, Athlete[]> = {};
        athletesMap.forEach((athletes, id) => {
          updatedMap[id] = athletes;
        });
        
        setAthletesByTeamId(updatedMap);
      });

      unsubscribes.push(unsubscribe);
    });

    return () => {
      unsubscribes.forEach(unsub => unsub());
    };
  }, [teams]);

  // Função para obter categoria e label de uma raia baseado no time
  const getLaneCategory = (team: Team | undefined): { label: string; color: string; bgColor: string } => {
    if (!team) return { label: '', color: '#888', bgColor: 'transparent' };
    const category = team.category;
    if (category === 'Dupla Beginner Feminino') return { label: 'SF', color: '#ff9800', bgColor: 'rgba(255, 152, 0, 0.1)' };
    if (category === 'Dupla Intermediário Feminino') return { label: 'EF', color: '#2196f3', bgColor: 'rgba(33, 150, 243, 0.1)' };
    if (category === 'Dupla Intermediário Masculino') return { label: 'EM', color: '#4caf50', bgColor: 'rgba(76, 175, 80, 0.1)' };
    if (category === 'Dupla RX Masculino') return { label: 'RXM', color: '#f44336', bgColor: 'rgba(244, 67, 54, 0.1)' };
    return { label: '', color: '#888', bgColor: 'transparent' };
  };

  // Criar horários baseados no padrão da imagem
  const getHeatTimes = (wodNumber: number, heatCount: number): string[] => {
    // Horários base para cada prova conforme a imagem
    const timePatterns: Record<number, { start: string; interval: number }> = {
      1: { start: '08:00', interval: 19 }, // 8:00, 8:19, 8:38...
      2: { start: '08:00', interval: 19 }, // Mesmo padrão da Prova 1
      3: { start: '10:32', interval: 5 },  // 10:32, 10:37, 10:42...
      4: { start: '11:15', interval: 12 }, // 11:15, 11:27, 11:39...
      5: { start: '11:15', interval: 12 }, // Mesmo padrão da Prova 4
      6: { start: '12:51', interval: 28 }, // 12:51, 13:19, 13:33... (primeiro intervalo maior)
      7: { start: '12:51', interval: 28 }  // Mesmo padrão da Prova 6
    };

    const pattern = timePatterns[wodNumber] || { start: '08:00', interval: 19 };
    const times: string[] = [];
    
    // Para Prova 6 e 7, o primeiro intervalo é diferente (28min depois 14min cada)
    if (wodNumber === 6 || wodNumber === 7) {
      times.push(pattern.start); // 12:51
      let [hours, minutes] = pattern.start.split(':').map(Number);
      // Primeira bateria já está adicionada (12:51)
      // Segunda: +28min = 13:19
      minutes += 28;
      if (minutes >= 60) {
        hours += Math.floor(minutes / 60);
        minutes = minutes % 60;
      }
      times.push(`${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`);
      
      // Demais baterias: +14min cada
      for (let i = 2; i < heatCount; i++) {
        minutes += 14;
        if (minutes >= 60) {
          hours += Math.floor(minutes / 60);
          minutes = minutes % 60;
        }
        times.push(`${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`);
      }
    } else {
      // Para outras provas, intervalo fixo
      for (let i = 0; i < heatCount; i++) {
        let [hours, minutes] = pattern.start.split(':').map(Number);
        minutes += i * pattern.interval;
        if (minutes >= 60) {
          hours += Math.floor(minutes / 60);
          minutes = minutes % 60;
        }
        times.push(`${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`);
      }
    }

    return times;
  };

  // Função auxiliar para criar cronograma de um ou mais WODs agrupados
  const createWodSchedule = (wodNumbers: number[], baseWodNumber: number): WodSchedule | null => {
    // Agrupar WODs por número
    const wodsByNumber: Record<number, Wod[]> = {};
    wods.forEach(wod => {
      const match = wod.name.match(/(?:Prova|WOD)\s*(\d+)/i);
      const wodNum = match ? parseInt(match[1]) : wod.order;
      if (!wodsByNumber[wodNum]) {
        wodsByNumber[wodNum] = [];
      }
      wodsByNumber[wodNum].push(wod);
    });

    // Buscar times para todas as categorias dos WODs agrupados
    const allTeamsForWod: Record<string, Team[]> = {};
    Categories.forEach(cat => {
      // Verificar se pelo menos um dos WODs tem esta categoria
      const hasCategory = wodNumbers.some(wodNum => {
        const wodsForNumber = wodsByNumber[wodNum] || [];
        return wodsForNumber.some(w => w.category === cat);
      });
      if (hasCategory) {
        allTeamsForWod[cat] = [...(teams[cat] || [])]; // Copiar array para não modificar original
      } else {
        allTeamsForWod[cat] = [];
      }
    });

    // Criar baterias seguindo a ordem correta:
    // 1. Beginner Feminino (todas as baterias de 4 times)
    // 2. Intermediário Feminino (todas as baterias de 4 times)
    // 3. Intermediário Masculino (todas as baterias de 4 times)
    // 4. RX Masculino (todas as baterias de 4 times)
    // Se uma categoria não completa 4, combina com a próxima

    const heats: Heat[] = [];
    let heatIndex = 0;

    // Função para criar uma bateria
    const createHeat = (): Heat => {
      const heatTimes = getHeatTimes(baseWodNumber, 100); // Usar baseWodNumber para os horários
      return {
        id: heatIndex + 1,
        time: heatTimes[heatIndex] || '00:00',
        teams: {}
      };
    };

    // 1. Distribuir Beginner Feminino (SF)
    const beginnerFeminino = allTeamsForWod['Dupla Beginner Feminino'] || [];
    let sfIndex = 0;
    while (sfIndex < beginnerFeminino.length) {
      const heat = createHeat();
      const teamsToAdd = Math.min(4, beginnerFeminino.length - sfIndex);
      
      for (let i = 0; i < teamsToAdd && sfIndex < beginnerFeminino.length; i++) {
        const lane = i === 0 ? 'lane1' : i === 1 ? 'lane2' : i === 2 ? 'lane3' : 'lane4';
        heat.teams[lane] = beginnerFeminino[sfIndex];
        sfIndex++;
      }

      heats.push(heat);
      heatIndex++;
    }

    // 2. Distribuir Intermediário Feminino (EF)
    const intermediarioFeminino = allTeamsForWod['Dupla Intermediário Feminino'] || [];
    let efIndex = 0;
    
    // Se a última bateria de SF não tem 4 times, completar com EF
    if (heats.length > 0) {
      const lastHeat = heats[heats.length - 1];
      const emptyLanes = 4 - Object.keys(lastHeat.teams).length;
      if (emptyLanes > 0 && efIndex < intermediarioFeminino.length) {
        const lanes = (['lane1', 'lane2', 'lane3', 'lane4'] as const).filter(l => !lastHeat.teams[l]);
        for (let i = 0; i < Math.min(emptyLanes, intermediarioFeminino.length - efIndex) && i < lanes.length; i++) {
          lastHeat.teams[lanes[i]] = intermediarioFeminino[efIndex];
          efIndex++;
        }
      }
    }

    // Continuar com as baterias completas de EF
    while (efIndex < intermediarioFeminino.length) {
      const heat = createHeat();
      const teamsToAdd = Math.min(4, intermediarioFeminino.length - efIndex);
      
      for (let i = 0; i < teamsToAdd && efIndex < intermediarioFeminino.length; i++) {
        const lane = i === 0 ? 'lane1' : i === 1 ? 'lane2' : i === 2 ? 'lane3' : 'lane4';
        heat.teams[lane] = intermediarioFeminino[efIndex];
        efIndex++;
      }

      heats.push(heat);
      heatIndex++;
    }

    // 3. Distribuir Intermediário Masculino (EM)
    const intermediarioMasculino = allTeamsForWod['Dupla Intermediário Masculino'] || [];
    let emIndex = 0;
    
    // Se a última bateria de EF não tem 4 times, completar com os 3 primeiros de EM
    let emUsedInEF = 0;
    if (heats.length > 0) {
      const lastHeat = heats[heats.length - 1];
      const emptyLanes = 4 - Object.keys(lastHeat.teams).length;
      if (emptyLanes > 0 && intermediarioMasculino.length >= 3) {
        const lanes = (['lane1', 'lane2', 'lane3', 'lane4'] as const).filter(l => !lastHeat.teams[l]);
        const teamsToAdd = Math.min(3, emptyLanes, intermediarioMasculino.length); // Máximo 3 times de EM
        for (let i = 0; i < teamsToAdd && i < lanes.length; i++) {
          lastHeat.teams[lanes[i]] = intermediarioMasculino[emIndex];
          emIndex++;
          emUsedInEF++;
        }
      }
    }

    // Continuar com as baterias completas de EM (exceto a última)
    const remainingEM = intermediarioMasculino.length - emIndex;
    while (emIndex < intermediarioMasculino.length - (remainingEM % 4 === 0 ? 0 : remainingEM % 4)) {
      const heat = createHeat();
      const teamsToAdd = Math.min(4, intermediarioMasculino.length - emIndex);
      
      for (let i = 0; i < teamsToAdd && emIndex < intermediarioMasculino.length; i++) {
        const lane = i === 0 ? 'lane1' : i === 1 ? 'lane2' : i === 2 ? 'lane3' : 'lane4';
        heat.teams[lane] = intermediarioMasculino[emIndex];
        emIndex++;
      }

      heats.push(heat);
      heatIndex++;
    }

    // Última bateria de EM terá os últimos times restantes (pode ser menos que 4)
    if (emIndex < intermediarioMasculino.length) {
      const heat = createHeat();
      const remaining = intermediarioMasculino.length - emIndex;
      for (let i = 0; i < remaining && emIndex < intermediarioMasculino.length; i++) {
        const lane = i === 0 ? 'lane1' : i === 1 ? 'lane2' : i === 2 ? 'lane3' : 'lane4';
        heat.teams[lane] = intermediarioMasculino[emIndex];
        emIndex++;
      }
      heats.push(heat);
      heatIndex++;
    }

    // 4. Distribuir RX Masculino (RXM) - última bateria sempre será RXM
    const rxMasculino = allTeamsForWod['Dupla RX Masculino'] || [];
    let rxmIndex = 0;
    
    // Se a última bateria de EM não tem 4 times, completar com RXM
    if (heats.length > 0 && emIndex < intermediarioMasculino.length) {
      const lastHeat = heats[heats.length - 1];
      const emptyLanes = 4 - Object.keys(lastHeat.teams).length;
      if (emptyLanes > 0 && rxmIndex < rxMasculino.length) {
        const lanes = (['lane1', 'lane2', 'lane3', 'lane4'] as const).filter(l => !lastHeat.teams[l]);
        for (let i = 0; i < Math.min(emptyLanes, rxMasculino.length - rxmIndex) && i < lanes.length; i++) {
          lastHeat.teams[lanes[i]] = rxMasculino[rxmIndex];
          rxmIndex++;
        }
      }
    }

    // Baterias completas de RXM
    while (rxmIndex < rxMasculino.length) {
      const heat = createHeat();
      const teamsToAdd = Math.min(4, rxMasculino.length - rxmIndex);
      
      for (let i = 0; i < teamsToAdd && rxmIndex < rxMasculino.length; i++) {
        const lane = i === 0 ? 'lane1' : i === 1 ? 'lane2' : i === 2 ? 'lane3' : 'lane4';
        heat.teams[lane] = rxMasculino[rxmIndex];
        rxmIndex++;
      }

      heats.push(heat);
      heatIndex++;
    }

    if (heats.length === 0) return null;

    // Criar nome simplificado para WODs agrupados
    let wodName: string;
    if (wodNumbers.length > 1) {
      wodName = `Provas ${wodNumbers[0]} e ${wodNumbers[1]}`;
    } else {
      wodName = `Prova ${baseWodNumber}`;
    }

    return {
      wodNumber: baseWodNumber,
      wodName,
      heats
    };
  };

  // Criar cronograma de baterias
  const createSchedule = (): WodSchedule[] => {
    const schedules: WodSchedule[] = [];

    // Agrupar provas: [1,2], [3], [4,5], [6,7]
    const wodGroups = [
      [1, 2],   // Prova 1 e 2 juntas
      [3],      // Prova 3 sozinha
      [4, 5],   // Prova 4 e 5 juntas
      [6, 7]    // Prova 6 e 7 juntas
    ];

    wodGroups.forEach(group => {
      const schedule = createWodSchedule(group, group[0]); // Usar o primeiro número como base para horários
      if (schedule) {
        schedules.push(schedule);
      }
    });

    return schedules;
  };

  const schedules = createSchedule();

  if (loading) {
    return <Loading message="Carregando cronograma..." size="large" />;
  }

  return (
    <div className="scoreboard-container" style={{ padding: '2rem' }}>
      <h1>
        <img src={logo} alt="IN Logo" />
        <span className="brand-text">EXPERIENCE</span>
      </h1>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem', flexWrap: 'wrap', gap: '1rem' }}>
        <h2 style={{ 
          margin: 0,
          color: 'var(--primary-color)',
          fontSize: '2rem'
        }}>
          Cronograma de Provas
        </h2>
        <Link
          to="/"
          style={{
            padding: '0.75rem 1.5rem',
            background: 'linear-gradient(135deg, #33cc33, #29a329)',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            cursor: 'pointer',
            fontWeight: 'bold',
            fontSize: '0.9rem',
            textDecoration: 'none',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            transition: 'all 0.3s ease'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = 'scale(1.05)';
            e.currentTarget.style.boxShadow = '0 4px 15px rgba(51, 204, 51, 0.4)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'scale(1)';
            e.currentTarget.style.boxShadow = 'none';
          }}
        >
          <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>
            emoji_events
          </span>
          Placar
        </Link>
      </div>

      <div style={{ display: 'grid', gap: '2rem', marginBottom: '2rem' }}>
        {schedules.map((schedule) => (
          <div 
            key={schedule.wodNumber}
            style={{
              background: '#2a2a2a',
              borderRadius: '12px',
              padding: '1.5rem',
              border: '1px solid #444'
            }}
          >
            <h3 style={{ 
              color: 'var(--primary-color)', 
              marginBottom: '1.5rem',
              fontSize: '1.5rem',
              borderBottom: '2px solid #33cc33',
              paddingBottom: '0.5rem'
            }}>
              {schedule.wodName}
            </h3>

            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ background: '#3a3a3a' }}>
                    <th style={{ padding: '0.75rem', textAlign: 'left', borderBottom: '2px solid #33cc33' }}>
                      Bateria
                    </th>
                    <th style={{ padding: '0.75rem', textAlign: 'center', borderBottom: '2px solid #33cc33' }}>
                      Horário
                    </th>
                    <th style={{ padding: '0.75rem', textAlign: 'center', borderBottom: '2px solid #666', background: '#3a3a3a' }}>
                      Raia 1
                    </th>
                    <th style={{ padding: '0.75rem', textAlign: 'center', borderBottom: '2px solid #666', background: '#3a3a3a' }}>
                      Raia 2
                    </th>
                    <th style={{ padding: '0.75rem', textAlign: 'center', borderBottom: '2px solid #666', background: '#3a3a3a' }}>
                      Raia 3
                    </th>
                    <th style={{ padding: '0.75rem', textAlign: 'center', borderBottom: '2px solid #666', background: '#3a3a3a' }}>
                      Raia 4
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {schedule.heats.map((heat) => {
                    const lane1Category = getLaneCategory(heat.teams.lane1);
                    const lane2Category = getLaneCategory(heat.teams.lane2);
                    const lane3Category = getLaneCategory(heat.teams.lane3);
                    const lane4Category = getLaneCategory(heat.teams.lane4);
                    
                    return (
                      <tr key={heat.id} style={{ borderBottom: '1px solid #444' }}>
                        <td style={{ padding: '0.75rem', fontWeight: 'bold' }}>
                          {heat.id}ª
                        </td>
                        <td style={{ padding: '0.75rem', textAlign: 'center', fontWeight: '600', color: 'var(--primary-color)' }}>
                          {heat.time}
                        </td>
                        {[
                          { team: heat.teams.lane1, category: lane1Category },
                          { team: heat.teams.lane2, category: lane2Category },
                          { team: heat.teams.lane3, category: lane3Category },
                          { team: heat.teams.lane4, category: lane4Category }
                        ].map(({ team, category }, index) => {
                          const athletes = team ? (athletesByTeamId[team.id] || []) : [];
                          const athleteNames = athletes.map(a => a.name).join(' e ');
                          
                          return (
                            <td 
                              key={index}
                              style={{ 
                                padding: '0.75rem', 
                                textAlign: 'center',
                                background: team ? category.bgColor : 'transparent',
                                borderLeft: team ? `3px solid ${category.color}` : 'none'
                              }}
                            >
                              {team ? (
                                <div>
                                  <div style={{ fontSize: '0.7rem', color: category.color, fontWeight: 'bold', marginBottom: '0.25rem' }}>
                                    {category.label}
                                  </div>
                                  <div style={{ fontWeight: '600', marginBottom: '0.25rem' }}>
                                    {team.name}
                                  </div>
                                  {athleteNames && (
                                    <div style={{ 
                                      fontSize: '0.75rem', 
                                      color: '#888',
                                      fontStyle: 'italic'
                                    }}>
                                      {athleteNames}
                                    </div>
                                  )}
                                </div>
                              ) : '-'}
                            </td>
                          );
                        })}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        ))}
      </div>

      <div style={{ 
        marginTop: '2rem', 
        padding: '1rem', 
        background: '#1a1a1a', 
        borderRadius: '8px',
        textAlign: 'center',
        color: '#888',
        fontSize: '0.9rem'
      }}>
        <p><strong>Legenda:</strong></p>
        <p>SF = Iniciante Feminino | EF = Intermediário Feminino | EM = Intermediário Masculino | RXM = RX Masculino</p>
      </div>
    </div>
  );
}

export default SchedulePage;

