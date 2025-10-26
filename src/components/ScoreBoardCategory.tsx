import React from "react";
import type { Team } from "../types/Team";

interface ScoreBoardCategoryProps {
    categoryName: string;
    teams: Team[];
}

const ScoreBoardCategory: React.FC<ScoreBoardCategoryProps> = ({ categoryName, teams }) => {
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
                         <th>Box</th>
                         <th>Total de Pontos</th>
                        </tr>
                    </thead>
                    <tbody>
                      {teams.map((team, index) => (
                        <tr key={team.id} className={team.generalRank === 1 ? 'leader' : ''}>
                            <td>{index + 1}</td> {/* O Rank é dado pela ordem da query no Firestore */}
                            <td>{team.name}</td>
                            <td>{team.box}</td>
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