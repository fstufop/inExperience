import { useState, useEffect } from 'react';
import { db } from '../../firebase';
import { collection, query, onSnapshot, orderBy, doc, updateDoc, writeBatch } from 'firebase/firestore';
import type { Wod } from '../../types/Wod';
import { wodDescriptions } from '../../utils/wodDescriptions';
import Loading from '../../components/Loading';

function UpdateWodDescriptions() {
  const [wods, setWods] = useState<Wod[]>([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [message, setMessage] = useState('');
  const [matchedDescriptions, setMatchedDescriptions] = useState<Array<{
    wod: Wod;
    description: string;
  }>>([]);

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
      
      // Match descriptions
      matchDescriptions(fetchedWods);
    }, (error) => {
      console.error("Error fetching WODs:", error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const matchDescriptions = (wodsList: Wod[]) => {
    const matches: Array<{ wod: Wod; description: string }> = [];
    
    wodsList.forEach(wod => {
      const description = wodDescriptions.find(
        desc => desc.order === wod.order && desc.category === wod.category
      );
      
      if (description) {
        matches.push({
          wod,
          description: description.description
        });
      }
    });
    
    setMatchedDescriptions(matches);
  };

  const handleUpdateAll = async () => {
    if (matchedDescriptions.length === 0) {
      setMessage('Nenhuma descrição encontrada para atualizar.');
      return;
    }

    setUpdating(true);
    setMessage('');

    try {
      const batch = writeBatch(db);
      
      matchedDescriptions.forEach(({ wod, description }) => {
        const wodRef = doc(db, "wods", wod.id);
        batch.update(wodRef, { description });
      });

      await batch.commit();
      setMessage(`✅ ${matchedDescriptions.length} descrição(ões) atualizada(s) com sucesso!`);
    } catch (error) {
      console.error("Erro ao atualizar descrições:", error);
      setMessage('❌ Erro ao atualizar descrições. Verifique o console.');
    } finally {
      setUpdating(false);
    }
  };

  const handleUpdateSingle = async (wodId: string, description: string) => {
    setUpdating(true);
    setMessage('');

    try {
      await updateDoc(doc(db, "wods", wodId), { description });
      setMessage('✅ Descrição atualizada com sucesso!');
      // Refresh
      matchDescriptions(wods);
    } catch (error) {
      console.error("Erro ao atualizar descrição:", error);
      setMessage('❌ Erro ao atualizar descrição.');
    } finally {
      setUpdating(false);
    }
  };

  if (loading) {
    return <Loading message="Carregando provas..." size="medium" />;
  }

  return (
    <div className="admin-page-container" style={{ padding: '2rem', maxWidth: '1200px', margin: '0 auto' }}>
      <h1>Atualizar Descrições das Provas</h1>
      
      <div style={{ marginBottom: '2rem', padding: '1rem', background: '#2a2a2a', borderRadius: '8px' }}>
        <p style={{ marginBottom: '1rem' }}>
          Este utilitário atualiza as descrições das provas com base nas imagens fornecidas.
        </p>
        <p style={{ marginBottom: '1rem', color: '#888' }}>
          <strong>Encontradas:</strong> {matchedDescriptions.length} provas com descrições disponíveis de {wods.length} provas cadastradas.
        </p>
        {matchedDescriptions.length > 0 && (
          <button
            onClick={handleUpdateAll}
            disabled={updating}
            style={{
              padding: '0.75rem 1.5rem',
              background: 'linear-gradient(135deg, #33cc33, #29a329)',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              cursor: updating ? 'not-allowed' : 'pointer',
              fontWeight: 'bold',
              fontSize: '1rem',
              opacity: updating ? 0.6 : 1
            }}
          >
            {updating ? 'Atualizando...' : `Atualizar Todas (${matchedDescriptions.length})`}
          </button>
        )}
      </div>

      {message && (
        <div style={{
          padding: '1rem',
          marginBottom: '1rem',
          borderRadius: '8px',
          background: message.includes('✅') ? 'rgba(76, 175, 80, 0.2)' : 'rgba(244, 67, 54, 0.2)',
          border: `1px solid ${message.includes('✅') ? '#4caf50' : '#f44336'}`,
          color: message.includes('✅') ? '#4caf50' : '#f44336'
        }}>
          {message}
        </div>
      )}

      <div style={{ marginTop: '2rem' }}>
        <h2>Provas e Descrições</h2>
        
        {matchedDescriptions.length === 0 ? (
          <p style={{ color: '#888', marginTop: '1rem' }}>
            Nenhuma descrição disponível. Verifique se as provas estão cadastradas com as categorias corretas.
          </p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginTop: '1rem' }}>
            {matchedDescriptions.map(({ wod, description }) => (
              <div
                key={wod.id}
                style={{
                  background: '#2a2a2a',
                  border: '1px solid #444',
                  borderRadius: '8px',
                  padding: '1.5rem'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
                  <div>
                    <h3 style={{ margin: '0 0 0.5rem 0', color: '#33cc33' }}>
                      #{wod.order} - {wod.name}
                    </h3>
                    <p style={{ margin: 0, color: '#888', fontSize: '0.9rem' }}>
                      Categoria: {wod.category}
                    </p>
                  </div>
                  <button
                    onClick={() => handleUpdateSingle(wod.id, description)}
                    disabled={updating}
                    style={{
                      padding: '0.5rem 1rem',
                      background: '#444',
                      color: 'white',
                      border: '1px solid #555',
                      borderRadius: '6px',
                      cursor: updating ? 'not-allowed' : 'pointer',
                      fontSize: '0.85rem',
                      opacity: updating ? 0.6 : 1
                    }}
                  >
                    Atualizar
                  </button>
                </div>
                
                <div style={{
                  background: '#1a1a1a',
                  padding: '1rem',
                  borderRadius: '6px',
                  border: '1px solid #333',
                  whiteSpace: 'pre-wrap',
                  fontFamily: 'monospace',
                  fontSize: '0.9rem',
                  lineHeight: '1.6',
                  color: '#fff'
                }}>
                  {description}
                </div>
                
                {wod.description && wod.description !== description && (
                  <div style={{ marginTop: '1rem', padding: '0.75rem', background: '#333', borderRadius: '4px' }}>
                    <p style={{ margin: '0 0 0.5rem 0', fontSize: '0.85rem', color: '#888' }}>
                      <strong>Descrição Atual:</strong>
                    </p>
                    <div style={{
                      whiteSpace: 'pre-wrap',
                      fontSize: '0.85rem',
                      color: '#aaa',
                      fontFamily: 'monospace'
                    }}>
                      {wod.description}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default UpdateWodDescriptions;

