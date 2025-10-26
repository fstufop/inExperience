interface MenuItem {
  id: string;
  label: string;
  icon: string;
  path: string;
  badge?: string;
}

const menuItems: MenuItem[] = [
  { id: 'scoreboard', label: 'Scoreboard', icon: '🏆', path: '/admin/scoreboard' },
  { id: 'teams', label: 'Times', icon: '👥', path: '/admin/teams' },
  { id: 'wods', label: 'Provas (WODs)', icon: '📋', path: '/admin/wods' },
  { id: 'scores', label: 'Resultados', icon: '📊', path: '/admin/score-entry' },
  { id: 'logout', label: 'Sair', icon: '🚪', path: '/admin/login' },
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
          <span className="sidebar-toggle" onClick={() => {/* TODO: toggle sidebar */}}>
            ←
          </span>
        </div>
      </div>
      
      <nav className="sidebar-nav">
        {menuItems.map((item) => (
          <div
            key={item.id}
            className={`sidebar-item ${activeItem === item.id ? 'active' : ''}`}
            onClick={() => onItemClick(item.path)}
          >
            <span className="sidebar-icon">{item.icon}</span>
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

