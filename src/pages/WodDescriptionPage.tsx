import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { db } from '../firebase';
import { collection, query, orderBy, onSnapshot } from 'firebase/firestore';
import { Categories } from '../commons/constants/categories';
import type { Wod } from '../types/Wod';
import Loading from '../components/Loading';
import logo from '../assets/logo.png';
import '../styles/global.css';

function WodDescriptionPage() {
  const [wods, setWods] = useState<Wod[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  useEffect(() => {
    const q = query(collection(db, "wods"), orderBy("order", "asc"));
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const fetchedWods = snapshot.docs.map(doc => ({ 
        id: doc.id, 
        ...doc.data() 
      } as Wod));
      
      setWods(fetchedWods);
      setLoading(false);
    }, (error) => {
      console.error("Erro ao buscar provas:", error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // Agrupar provas por categoria
  const wodsByCategory = wods.reduce((acc, wod) => {
    const category = wod.category || 'Sem Categoria';
    if (!acc[category]) {
      acc[category] = [];
    }
    acc[category].push(wod);
    return acc;
  }, {} as Record<string, Wod[]>);

  // Filtrar por categoria se selecionada
  const filteredCategories = selectedCategory
    ? { [selectedCategory]: wodsByCategory[selectedCategory] || [] }
    : wodsByCategory;

  // Função para formatar descrição mantendo quebras de linha
  const formatDescription = (description: string | undefined) => {
    if (!description) return null;
    
    // Dividir por quebras de linha e criar elementos <p> ou <span>
    const lines = description.split('\n').filter(line => line.trim());
    return lines.map((line, index) => {
      // Detectar padrões comuns nas descrições de provas
      const isTitle = /^(For time|AMRAP|PR|Rest|For reps|For load):/i.test(line);
      const isRound = /^\d+\s*(rounds?|Rounds?):?/i.test(line);
      const isInstruction = /^(Colocar|Acrescetar|Rest)/i.test(line);
      
      const lineStyle: React.CSSProperties = {
        marginBottom: index < lines.length - 1 ? '0.75rem' : '0',
        fontSize: isTitle ? '1.1rem' : '1rem',
        fontWeight: isTitle || isRound ? 700 : 400,
        textTransform: isTitle ? 'uppercase' : 'none',
        letterSpacing: isTitle ? '0.05em' : 'normal',
        color: isTitle || isRound ? 'var(--primary-color)' : 'var(--text-light)',
        textShadow: isTitle ? '0 0 10px rgba(51, 204, 51, 0.3)' : 'none',
      };

      return (
        <div key={index} style={lineStyle}>
          {line}
        </div>
      );
    });
  };

  // Função para obter o status em português
  const getStatusLabel = (status: string) => {
    const statusMap: Record<string, string> = {
      'not started': 'Não Iniciada',
      'in progress': 'Em Andamento',
      'computing': 'Computando',
      'completed': 'Finalizada'
    };
    return statusMap[status] || status;
  };

  // Função para obter cor do status
  const getStatusColor = (status: string) => {
    const colorMap: Record<string, string> = {
      'not started': '#888',
      'in progress': 'var(--warning)',
      'computing': 'var(--primary-color)',
      'completed': 'var(--success)'
    };
    return colorMap[status] || '#fff';
  };

  if (loading) {
    return <Loading />;
  }

  return (
    <div className="wod-description-page">
      {/* Header */}
      <header className="wod-description-header">
        <Link to="/" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <img src={logo} alt="IN Experience" style={{ height: '2rem', width: 'auto' }} />
          <h1 style={{ margin: 0, color: 'var(--primary-color)', fontSize: '1.5rem' }}>
            inExperience
          </h1>
        </Link>
        <nav style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
          <Link to="/" style={{ color: 'var(--text-light)', textDecoration: 'none' }}>
            Placar
          </Link>
          <Link to="/schedule" style={{ color: 'var(--text-light)', textDecoration: 'none' }}>
            Programação
          </Link>
        </nav>
      </header>

      <div className="wod-description-container">
        <div className="wod-description-title-section">
          <h1>Descrição das Provas</h1>
          
          {/* Filtro por Categoria */}
          <div className="category-filter">
            <button
              onClick={() => setSelectedCategory(null)}
              className={selectedCategory === null ? 'active-filter' : ''}
            >
              Todas as Categorias
            </button>
            {Categories.map(category => (
              <button
                key={category}
                onClick={() => setSelectedCategory(category)}
                className={selectedCategory === category ? 'active-filter' : ''}
              >
                {category}
              </button>
            ))}
          </div>
        </div>

        {/* Lista de Provas por Categoria */}
        <div className="wod-description-list">
          {Object.keys(filteredCategories).length === 0 ? (
            <div className="no-wods-message">
              <p>Nenhuma prova encontrada.</p>
            </div>
          ) : (
            Object.entries(filteredCategories).map(([category, categoryWods]) => (
              <div key={category} className="category-section">
                <h2 className="category-title">{category}</h2>
                
                <div className="wods-grid">
                  {categoryWods.map((wod) => (
                    <div key={wod.id} className="wod-description-card">
                      <div className="wod-card-header">
                        <div className="wod-number">#{wod.order}</div>
                        <h3 className="wod-name">{wod.name}</h3>
                        <div 
                          className="wod-status"
                          style={{ color: getStatusColor(wod.status) }}
                        >
                          <span className="material-symbols-outlined" style={{ fontSize: '1rem' }}>
                            {wod.status === 'completed' ? 'check_circle' : 
                             wod.status === 'in progress' ? 'directions_run' :
                             wod.status === 'computing' ? 'schedule' : 'cancel'}
                          </span>
                          {getStatusLabel(wod.status)}
                        </div>
                      </div>

                      <div className="wod-meta">
                        <div className="wod-meta-item">
                          <span className="material-symbols-outlined">category</span>
                          <span>{wod.type}</span>
                        </div>
                        <div className="wod-meta-item">
                          <span className="material-symbols-outlined">star</span>
                          <span>{wod.maxPoints} pts</span>
                        </div>
                      </div>

                      {wod.description ? (
                        <div className="wod-description-content">
                          {formatDescription(wod.description)}
                        </div>
                      ) : (
                        <div className="wod-no-description">
                          <p>Descrição não disponível.</p>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      <style>{`
        .wod-description-page {
          min-height: 100vh;
          background-color: var(--bg-dark);
          position: relative;
        }

        .wod-description-header {
          background: linear-gradient(180deg, #2a2a2a 0%, #1a1a1a 100%);
          border-bottom: 1px solid var(--primary-color);
          padding: var(--spacing-md);
          display: flex;
          justify-content: space-between;
          align-items: center;
          position: sticky;
          top: 0;
          z-index: 100;
          box-shadow: 0 2px 10px rgba(0, 0, 0, 0.3);
        }

        .wod-description-container {
          max-width: 1400px;
          margin: 0 auto;
          padding: var(--spacing-lg);
        }

        .wod-description-title-section {
          text-align: center;
          margin-bottom: var(--spacing-xl);
        }

        .wod-description-title-section h1 {
          color: var(--primary-color);
          margin-bottom: var(--spacing-md);
          text-shadow: 0 0 15px rgba(51, 204, 51, 0.3);
        }

        .category-filter {
          display: flex;
          gap: var(--spacing-xs);
          justify-content: center;
          flex-wrap: wrap;
          margin-top: var(--spacing-md);
        }

        .category-filter button {
          padding: 0.6rem 1.2rem;
          border-radius: 8px;
          border: 1px solid #555;
          background-color: #333;
          color: var(--text-light);
          cursor: pointer;
          transition: all 0.2s;
          font-size: 0.9rem;
        }

        .category-filter button:hover {
          background-color: #444;
          border-color: var(--primary-color);
        }

        .category-filter button.active-filter {
          background: linear-gradient(135deg, var(--primary-color), var(--primary-dark));
          border-color: var(--primary-color);
          box-shadow: 0 0 10px rgba(51, 204, 51, 0.3);
        }

        .wod-description-list {
          display: flex;
          flex-direction: column;
          gap: var(--spacing-xl);
        }

        .category-section {
          margin-bottom: var(--spacing-xl);
        }

        .category-title {
          color: var(--gold);
          margin-bottom: var(--spacing-md);
          text-shadow: 0 0 10px rgba(255, 215, 0, 0.2);
          font-size: 1.8rem;
          border-bottom: 2px solid var(--primary-color);
          padding-bottom: var(--spacing-xs);
        }

        .wods-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(350px, 1fr));
          gap: var(--spacing-md);
        }

        .wod-description-card {
          background: linear-gradient(135deg, #2a2a2a 0%, #1f1f1f 100%);
          border: 2px solid #444;
          border-radius: 12px;
          padding: var(--spacing-md);
          transition: all 0.3s;
          box-shadow: 0 4px 6px rgba(0, 0, 0, 0.3);
        }

        .wod-description-card:hover {
          border-color: var(--primary-color);
          box-shadow: 0 0 20px rgba(51, 204, 51, 0.2);
          transform: translateY(-2px);
        }

        .wod-card-header {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          margin-bottom: var(--spacing-sm);
          gap: var(--spacing-xs);
        }

        .wod-number {
          background: var(--primary-color);
          color: var(--bg-dark);
          font-weight: 800;
          padding: 0.25rem 0.5rem;
          border-radius: 4px;
          font-size: 0.9rem;
          min-width: 3rem;
          text-align: center;
        }

        .wod-name {
          flex: 1;
          color: var(--text-light);
          margin: 0;
          font-size: 1.3rem;
          font-weight: 700;
        }

        .wod-status {
          display: flex;
          align-items: center;
          gap: 0.25rem;
          font-size: 0.85rem;
          font-weight: 600;
        }

        .wod-meta {
          display: flex;
          gap: var(--spacing-md);
          margin-bottom: var(--spacing-md);
          padding-bottom: var(--spacing-sm);
          border-bottom: 1px solid #444;
        }

        .wod-meta-item {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          color: var(--text-light);
          font-size: 0.9rem;
        }

        .wod-meta-item .material-symbols-outlined {
          font-size: 1rem;
          color: var(--primary-color);
        }

        .wod-description-content {
          color: var(--text-light);
          line-height: 1.8;
          white-space: pre-wrap;
        }

        .wod-no-description {
          color: #888;
          font-style: italic;
          text-align: center;
          padding: var(--spacing-md);
        }

        .no-wods-message {
          text-align: center;
          padding: var(--spacing-xl);
          color: var(--text-light);
        }

        @media (max-width: 768px) {
          .wods-grid {
            grid-template-columns: 1fr;
          }

          .wod-description-header {
            flex-direction: column;
            gap: var(--spacing-sm);
          }

          .category-filter {
            gap: 0.5rem;
          }

          .category-filter button {
            padding: 0.5rem 1rem;
            font-size: 0.85rem;
          }
        }
      `}</style>
    </div>
  );
}

export default WodDescriptionPage;

