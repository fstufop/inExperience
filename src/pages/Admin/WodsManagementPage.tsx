import { useState, useEffect } from 'react';
import { db } from '../../firebase';
import { collection, query, onSnapshot, orderBy } from 'firebase/firestore';
import type { Wod } from '../../types/Wod';
import WodForm from '../../components/Wod/WodForm';
import WodList from '../../components/Wod/WodList';
import Loading from '../../components/Loading';

function WodsManagementPage() {
  const [wods, setWods] = useState<Wod[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const q = query(
        collection(db, "wods"), 
        orderBy("order", "asc")
    );
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const fetchedWods: Wod[] = [];
      snapshot.forEach((doc) => {
        fetchedWods.push({ id: doc.id, ...doc.data() } as Wod);
      });
      setWods(fetchedWods);
      setLoading(false);
    }, (error) => {
      console.error("Error fetching WODs:", error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  return (
    <div className="admin-page-container">
      <h1>Configuração de Provas (WODs)</h1>
      
      {/* 1. Formulário para Adicionar Nova Prova */}
      {/* Passamos o número de WODs para sugerir a próxima ordem */}
      <WodForm nextOrder={wods.length + 1} /> 
      
      <hr style={{margin: '40px 0'}} />

      {/* 2. Lista de Provas Existentes */}
      <h2>WODs Cadastrados ({wods.length})</h2>
      {loading ? (
        <Loading message="Carregando provas..." size="medium" />
      ) : (
        <WodList wods={wods} />
      )}
    </div>
  );
}

export default WodsManagementPage;