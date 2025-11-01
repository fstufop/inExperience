import React from "react";
import type { Team } from "../types/Team";

interface TeamWithResult extends Team {
    rawScore?: string | number;
}

interface ScoreBoardCategoryProps {
    categoryName: string;
    teams: TeamWithResult[];
    showResult?: boolean;
}

const ScoreBoardCategory: React.FC<ScoreBoardCategoryProps> = ({ categoryName, teams, showResult = false }) => {
    // Ordena teams por totalPoints (já deve vir ordenado do Firestore, mas garantimos)
    const sortedTeams = [...teams].sort((a, b) => b.totalPoints - a.totalPoints);
    
    return (
        <div className="category-table-container">
            <h2>{categoryName}</h2>
            {teams.length === 0 ? (
                <p>Nenhum time encontrado</p>
            ) : (
                <table> 
                    <thead>
                        <tr>
                         <th>Posição</th>
                         <th>Time</th>
                         {showResult && <th>Resultado</th>}
                         <th>Total de Pontos</th>
                        </tr>
                    </thead>
                    <tbody>
                      {sortedTeams.map((team, index) => (
                        <tr key={team.id} className={index === 0 ? 'leader' : ''}>
                            <td>{index + 1}</td>
                            <td>{team.name}</td>
                            {showResult && (
                                <td className="result-cell">
                                    {team.rawScore !== undefined && team.rawScore !== null && team.rawScore !== '' 
                                        ? String(team.rawScore) 
                                        : '-'}
                                </td>
                            )}
                            <td className="points-cell">{team.totalPoints}</td>
                        </tr>
                        ))}
                    </tbody>
                </table>
            )}
        </div>
    )
}

export default ScoreBoardCategory;