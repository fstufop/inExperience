import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { signOut } from 'firebase/auth';
import { auth } from '../../firebase';
import Sidebar from '../../components/admin/Sidebar';

export default function AdminLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  
  // Identifica o item ativo baseado na rota atual
  const getActiveItem = () => {
    if (location.pathname.includes('/teams')) return 'teams';
    if (location.pathname.includes('/wods')) return 'wods';
    if (location.pathname.includes('/score-entry')) return 'scores';
    if (location.pathname.includes('/scoreboard')) return 'scoreboard';
    return 'scoreboard'; // default
  };

  const handleItemClick = async (path: string) => {
    if (path === '/admin/login') {
      const confirmLogout = window.confirm(
        'Tem certeza que deseja sair? Você será desconectado do painel administrativo.'
      );
      
      if (!confirmLogout) {
        return;
      }
      
      try {
        await signOut(auth);
        navigate('/admin/login');
      } catch (error) {
        alert('Ocorreu um erro ao fazer logout. Por favor, tente novamente.');
      }
      return;
    }
    navigate(path);
  };

  return (
    <div className="admin-layout">
      <Sidebar 
        activeItem={getActiveItem()} 
        onItemClick={handleItemClick} 
      />
      <div className="admin-main-content">
        <Outlet />
      </div>
    </div>
  );
}

