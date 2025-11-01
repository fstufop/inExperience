interface MenuItem {
  id: string;
  label: string;
  icon: string;
  path: string;
  badge?: string;
}

const menuItems: MenuItem[] = [
  { id: 'scoreboard', label: 'Scoreboard', icon: 'emoji_events', path: '/admin/scoreboard' },
  { id: 'scores', label: 'Registrar Resultados', icon: 'assessment', path: '/admin/score-entry' },
  { id: 'teams', label: 'Cadastrar Times', icon: 'groups', path: '/admin/teams' },
  { id: 'wods', label: 'Cadastrar Provas (WODs)', icon: 'assignment', path: '/admin/wods' },
  { id: 'logout', label: 'Sair', icon: 'logout', path: '/admin/login' },
];

interface SidebarProps {
  activeItem: string;
  onItemClick: (path: string) => void;
}

export default function Sidebar({ activeItem, onItemClick }: SidebarProps) {
  return (
    <div className="admin-sidebar">
      <div className="sidebar-header">
        <div className="logo-container">
          <span className="logo-text">IN EXPERIENCE</span>
        </div>
      </div>
      
      <nav className="sidebar-nav">
        {menuItems.map((item) => (
          <div
            key={item.id}
            className={`sidebar-item ${activeItem === item.id ? 'active' : ''}`}
            onClick={() => onItemClick(item.path)}
          >
            <span className="sidebar-icon">
              <span className="material-symbols-outlined">{item.icon}</span>
            </span>
            <span className="sidebar-label">{item.label}</span>
            {item.badge && (
              <span className="sidebar-badge">{item.badge}</span>
            )}
          </div>
        ))}
      </nav>
    </div>
  );
}

