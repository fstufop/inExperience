import React from 'react';
import { db } from '../../firebase';
import { collection, query, where, getDocs, deleteDoc, doc } from 'firebase/firestore';
import type { Team } from '../../types/Team';

interface TeamListProps {
    teams: Team[];
}

const TeamList: React.FC<TeamListProps> = ({ teams }) => {
    
    // Função para deletar o Time e seus Atletas
    const handleDelete = async (teamId: string, teamName: string) => {
        if (!window.confirm(`Tem certeza que deseja DELETAR o time "${teamName}"? Esta ação é irreversível!`)) {
            return;
        }

        try {
            // 1. Coleta todos os atletas vinculados a este Time
            const athletesQuery = query(collection(db, "athletes"), where("teamId", "==", teamId));
            const athleteSnapshot = await getDocs(athletesQuery);

            // 2. Deleta cada atleta
            const deletePromises: Promise<void>[] = [];
            athleteSnapshot.forEach(athleteDoc => {
                deletePromises.push(deleteDoc(doc(db, "athletes", athleteDoc.id)));
            });
            await Promise.all(deletePromises);

            // 3. Deleta o Documento do Time
            await deleteDoc(doc(db, "teams", teamId));

            alert(`Time "${teamName}" deletado com sucesso (juntamente com seus atletas)!`);

            // Nota: Deveríamos também deletar os 'results' vinculados, mas vamos simplificar por enquanto.
            // Em produção, isso seria crucial para a integridade dos dados.

        } catch (error) {
            console.error("Erro ao deletar time:", error);
            alert("Erro ao deletar o time.");
        }
    };

    return (
        <table>
            <thead>
                <tr>
                    <th>Nome do Time</th>
                    <th>Categoria</th>
                    <th>Box</th>
                    <th>Ações</th>
                </tr>
            </thead>
            <tbody>
                {teams.map((team) => (
                    <tr key={team.id}>
                        <td>{team.name}</td>
                        <td>{team.category}</td>
                        <td>{team.box}</td>
                        <td>
                            {/* Você pode adicionar um botão de Edição aqui */}
                            <button onClick={() => handleDelete(team.id, team.name)} style={{ backgroundColor: 'red', color: 'white' }}>Deletar</button>
                        </td>
                    </tr>
                ))}
            </tbody>
        </table>
    );
};

export default TeamList;