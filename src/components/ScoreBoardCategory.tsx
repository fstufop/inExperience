import React, { useState, useEffect } from "react";
import { db } from "../firebase";
import { collection, query, where, onSnapshot } from "firebase/firestore";
import type { Team } from "../types/Team";
import type { Athlete } from "../types/Athlete";

interface TeamWithResult extends Team {
    rawScore?: string | number;
    athletes?: Athlete[];
    timeCapReached?: boolean;
    repsRemaining?: number;
    wodRank?: number;
}

interface ScoreBoardCategoryProps {
    categoryName: string;
    teams: TeamWithResult[];
    showResult?: boolean;
    wodStatus?: 'not started' | 'in progress' | 'computing' | 'completed';
}

const ScoreBoardCategory: React.FC<ScoreBoardCategoryProps> = ({ categoryName, teams, showResult = false, wodStatus }) => {
    const [teamsWithAthletes, setTeamsWithAthletes] = useState<TeamWithResult[]>([]);
    
    // Função para obter ícone e cor do status
    const getStatusInfo = (status?: string) => {
        if (!status) return null;
        const statusMap: Record<string, { icon: string; color: string }> = {
            'not started': { icon: 'cancel', color: '#f44336' },
            'in progress': { icon: 'directions_run', color: '#ff9800' },
            'computing': { icon: 'schedule', color: '#2196f3' },
            'completed': { icon: 'check_circle', color: '#4caf50' }
        };
        return statusMap[status] || null;
    };
    
    const statusInfo = getStatusInfo(wodStatus);
    
    // Buscar atletas para cada time
    useEffect(() => {
        if (teams.length === 0) {
            setTeamsWithAthletes([]);
            return;
        }

        const unsubscribes: (() => void)[] = [];
        const athletesMap = new Map<string, Athlete[]>();

        teams.forEach((team) => {
            const athletesQuery = query(
                collection(db, "athletes"), 
                where("teamId", "==", team.id)
            );
            
            const unsubscribe = onSnapshot(athletesQuery, (snapshot) => {
                const athletes: Athlete[] = [];
                snapshot.forEach((doc) => {
                    athletes.push({ id: doc.id, ...doc.data() } as Athlete);
                });
                // Ordena por role (Membro 1, Membro 2)
                athletes.sort((a, b) => a.role.localeCompare(b.role));
                
                athletesMap.set(team.id, athletes);
                
                // Atualiza todos os times com seus respectivos atletas
                const updatedTeams: TeamWithResult[] = teams.map(t => ({
                    ...t,
                    athletes: athletesMap.get(t.id) || []
                }));
                
                setTeamsWithAthletes(updatedTeams);
            });

            unsubscribes.push(unsubscribe);
        });

        return () => {
            unsubscribes.forEach(unsub => unsub());
        };
    }, [teams]);
    
    // Ordena teams por totalPoints (já deve vir ordenado do Firestore, mas garantimos)
    const sortedTeams = [...teamsWithAthletes.length > 0 ? teamsWithAthletes : teams].sort((a, b) => b.totalPoints - a.totalPoints);
    
    return (
        <div className="category-table-container">
            <h2 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                {statusInfo && (
                    <span 
                        className="material-symbols-outlined"
                        style={{ 
                            color: statusInfo.color, 
                            fontSize: '1.5rem',
                            verticalAlign: 'middle'
                        }}
                        title={wodStatus}
                    >
                        {statusInfo.icon}
                    </span>
                )}
                {categoryName}
            </h2>
            {teams.length === 0 ? (
                <p>Nenhum time encontrado</p>
            ) : (
                <table> 
                    <thead>
                        <tr>
                         <th>Posição</th>
                         <th>Time</th>
                         {showResult && <th>Resultado</th>}
                         <th>Pontos</th>
                        </tr>
                    </thead>
                    <tbody>
                      {sortedTeams.map((team, index) => {
                          const athletes = team.athletes || [];
                          const athleteNames = athletes.map(a => a.name).join(' e ');
                          
                          // Quando showResult é true (placar do WOD), usar wodRank se disponível
                          // Caso contrário, usar index + 1 (placar geral)
                          const displayPosition = showResult && (team as any).wodRank !== undefined 
                            ? (team as any).wodRank 
                            : index + 1;
                          
                          return (
                            <tr key={team.id} className={index === 0 ? 'leader' : ''}>
                                <td>{displayPosition}</td>
                                <td>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                                        <span style={{ fontWeight: '600' }}>{team.name}</span>
                                        {athleteNames && (
                                            <span style={{ 
                                                fontSize: '0.85rem', 
                                                color: '#888',
                                                fontStyle: 'italic'
                                            }}>
                                                {athleteNames}
                                            </span>
                                        )}
                                    </div>
                                </td>
                                {showResult && (
                                    <td className="result-cell">
                                        {team.rawScore !== undefined && team.rawScore !== null && team.rawScore !== ''
                                            ? (() => {
                                                // Se tiver CAP e reps restantes, formata o resultado
                                                if (team.timeCapReached && team.repsRemaining !== undefined && team.repsRemaining !== null) {
                                                    const rawScoreStr = String(team.rawScore);
                                                    if (rawScoreStr && rawScoreStr.trim()) {
                                                        return `${rawScoreStr} + ${team.repsRemaining} reps`;
                                                    } else {
                                                        return `CAP + ${team.repsRemaining} reps`;
                                                    }
                                                } else if (team.timeCapReached) {
                                                    const rawScoreStr = String(team.rawScore);
                                                    if (rawScoreStr && rawScoreStr.trim()) {
                                                        return `CAP ${rawScoreStr}`;
                                                    } else {
                                                        return 'CAP';
                                                    }
                                                }
                                                return String(team.rawScore);
                                            })()
                                            : '-'}
                                    </td>
                                )}
                                <td className="points-cell">{team.totalPoints}</td>
                            </tr>
                          );
                      })}
                    </tbody>
                </table>
            )}
        </div>
    )
}

export default ScoreBoardCategory;