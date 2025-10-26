import { useState, useEffect } from 'react';
import { db } from '../../firebase';
import { collection, query, onSnapshot, orderBy } from 'firebase/firestore';
import type { Team } from '../../types/Team';
import TeamForm from '../../components/Team/TeamForm';
import TeamList from '../../components/Team/TeamList'; 

function TeamsManagementPage() {
    const [teams, setTeams] = useState<Team[]>([]);
    const [loading, setLoading] = useState(true);
  
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
  
        <h2>Times Cadastrados ({teams.length})</h2>
        {loading ? (
          <p>Carregando times...</p>
        ) : (
          <TeamList teams={teams} />
        )}
      </div>
    );
  }

export default TeamsManagementPage;