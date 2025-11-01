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
  
        <h2>Times Cadastrados   <span style={{ 
            color: '#888',
            fontSize: '0.9rem'
          }}>
            ({selectedCategory === 'Todas' 
              ? teams.length 
              : teams.filter(t => t.category === selectedCategory).length} times)
          </span>
          </h2>
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
          />
        )}
      </div>
    );
  }

export default TeamsManagementPage;