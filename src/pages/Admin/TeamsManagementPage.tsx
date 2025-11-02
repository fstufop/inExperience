import { useState, useEffect } from 'react';
import { db } from '../../firebase';
import { collection, query, onSnapshot, orderBy } from 'firebase/firestore';
import type { Team } from '../../types/Team';
import TeamForm from '../../components/Team/TeamForm';
import TeamList from '../../components/Team/TeamList';
import Loading from '../../components/Loading';
import { Categories } from '../../commons/constants/categories';

function TeamsManagementPage() {
    const [teams, setTeams] = useState<Team[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedCategory, setSelectedCategory] = useState<string>('Todas');
    const [batchDeleteMode, setBatchDeleteMode] = useState(false);
  
    useEffect(() => {
      const q = query(
        collection(db, "teams"), 
        orderBy("name", "asc")
    );
      
      const unsubscribe = onSnapshot(q, (snapshot) => {
        const fetchedTeams: Team[] = [];
        snapshot.forEach((doc) => {
          fetchedTeams.push({ id: doc.id, ...doc.data() } as Team);
        });
        setTeams(fetchedTeams);
        setLoading(false);
      }, (error) => {
        console.error("Error fetching teams:", error);
        setLoading(false);
      });
  
      return () => unsubscribe();
    }, []);
  
    return (
      <div className="admin-page-container">
        <h1>Gerenciamento de Times</h1>
        
        <TeamForm /> 
        
        <hr style={{margin: '40px 0', border: 'none', borderTop: '1px solid #444'}} />
  
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <h2>Times Cadastrados   <span style={{ 
              color: '#888',
              fontSize: '0.9rem'
            }}>
              ({selectedCategory === 'Todas' 
                ? teams.length 
                : teams.filter(t => t.category === selectedCategory).length} times)
            </span>
          </h2>
          <button
            onClick={() => setBatchDeleteMode(!batchDeleteMode)}
            style={{
              padding: '0.75rem 1.5rem',
              background: batchDeleteMode 
                ? 'linear-gradient(135deg, #f44336, #d32f2f)' 
                : 'linear-gradient(135deg, #666, #555)',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer',
              fontWeight: 'bold',
              fontSize: '0.9rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              transition: 'all 0.3s ease'
            }}
            onMouseEnter={(e) => {
              if (!batchDeleteMode) {
                e.currentTarget.style.transform = 'scale(1.05)';
              }
            }}
            onMouseLeave={(e) => {
              if (!batchDeleteMode) {
                e.currentTarget.style.transform = 'scale(1)';
              }
            }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>
              {batchDeleteMode ? 'close' : 'delete'}
            </span>
            {batchDeleteMode ? 'Cancelar Seleção' : 'Remover em Lote'}
          </button>
        </div>
        {/* Dropdown de Categoria */}
        <div style={{ 
          marginBottom: '1.5rem',
          display: 'flex',
          alignItems: 'center',
          gap: '1rem'
        }}>
          <label style={{ 
            fontSize: '1rem', 
            fontWeight: '600',
            color: 'var(--text-light, #fff)'
          }}>
            Filtrar por Categoria:
          </label>
          <select 
            value={selectedCategory} 
            onChange={(e) => setSelectedCategory(e.target.value)}
            style={{
              padding: '0.75rem 1rem',
              fontSize: '1rem',
              background: '#333',
              color: '#fff',
              border: '1px solid #555',
              borderRadius: '8px',
              cursor: 'pointer',
              minWidth: '250px'
            }}
          >
            <option value="Todas">Todas as Categorias</option>
            {Categories.map(cat => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>
        </div>

        {loading ? (
          <Loading message="Carregando times..." size="medium" />
        ) : (
          <TeamList 
            teams={selectedCategory === 'Todas' 
              ? teams 
              : teams.filter(t => t.category === selectedCategory)}
            batchDeleteMode={batchDeleteMode}
            onBatchDeleteModeChange={setBatchDeleteMode}
          />
        )}
      </div>
    );
  }

export default TeamsManagementPage;