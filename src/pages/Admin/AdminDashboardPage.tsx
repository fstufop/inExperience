import { auth } from '../../firebase';
import { signOut } from 'firebase/auth';
import { useNavigate } from 'react-router-dom';

function AdminDashboardPage() {
  const navigate = useNavigate();
   const handleLogout = async () => {
    try {
        await signOut(auth);
    } catch (error) {
        console.error('Erro ao sair:', error);
        alert('Ocorreu um erro ao sair. Por favor, tente novamente.');
    }
   };

   return (
    <div className="admin-dashboard-container">
      <h1>Painel do Gestor</h1>
      <p>Bem-vindo(a)! Utilize este painel para gerenciar times, provas e inserir resultados.</p>
      
      <nav>
        {/* Aqui serão os links para gestão de Times, Provas, Inserção de Pontos */}
        <button onClick={() => navigate('/admin/teams')}>Gerenciar Times</button>
        <button onClick={() => navigate('/admin/wods')}>Configurar Provas</button>
        <button onClick={() => navigate('/admin/score-entry')}>Inserir Resultados (WODs)</button>
      </nav>
      
      <button onClick={handleLogout} style={{ marginTop: '20px' }}>
        Sair (Logout)
      </button>
    </div>
  );
}

export default AdminDashboardPage;