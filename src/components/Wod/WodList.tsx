import React from 'react';
import { db } from '../../firebase';
import { deleteDoc, doc, updateDoc } from 'firebase/firestore';
import type { Wod } from '../../types/Wod';

interface WodListProps {
    wods: Wod[];
}

const WodList: React.FC<WodListProps> = ({ wods }) => {
    const handleDelete = async (wodId: string, wodName: string) => {
        if (!window.confirm(`Tem certeza que deseja DELETAR a prova "${wodName}"? Todos os resultados vinculados serão afetados!`)) {
            return;
        }

        try {
            await deleteDoc(doc(db, "wods", wodId));
            alert(`Prova "${wodName}" deletada com sucesso!`);
        } catch (error) {
            console.error("Erro ao deletar prova:", error);
            alert("Erro ao deletar a prova.");
        }
    };

    const handleToggleStatus = async (wod: Wod) => {
        const newStatus = wod.status === 'closed' ? 'open' : 'closed';
        try {
            await updateDoc(doc(db, "wods", wod.id), {
                status: newStatus
            });
        } catch (error) {
            console.error("Erro ao atualizar status:", error);
        }
    };

    return (
        <table>
            <thead>
                <tr>
                    <th>Ordem</th>
                    <th>Nome</th>
                    <th>Tipo</th>
                    <th>Pontos Máx.</th>
                    <th>Status</th>
                    <th>Ações</th>
                </tr>
            </thead>
            <tbody>
                {wods.map((wod) => (
                    <tr key={wod.id}>
                        <td>#{wod.order}</td>
                        <td>{wod.name}</td>
                        <td>{wod.type}</td>
                        <td>{wod.maxPoints}</td>
                        <td>
                            <span 
                                onClick={() => handleToggleStatus(wod)}
                                style={{ 
                                    cursor: 'pointer', 
                                    fontWeight: 'bold',
                                    color: wod.status === 'closed' ? 'red' : 'green' 
                                }}
                            >
                                {wod.status.toUpperCase()}
                            </span>
                        </td>
                        <td>
                            <button onClick={() => handleDelete(wod.id, wod.name)}>Deletar</button>
                            {/* Um botão de Edição seria útil aqui */}
                        </td>
                    </tr>
                ))}
            </tbody>
        </table>
    );
};

export default WodList;