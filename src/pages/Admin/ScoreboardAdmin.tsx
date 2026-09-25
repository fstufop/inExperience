import { useState } from 'react';
import ScoreboardPage from '../ScoreboardPage';
import SaveCompetitionModal from '../../components/admin/SaveCompetitionModal';

export default function ScoreboardAdmin() {
  const [modalOpen, setModalOpen] = useState(false);

  return (
    <>
      <ScoreboardPage />
      <button
        onClick={() => setModalOpen(true)}
        style={{
          position: 'fixed', bottom: '80px', right: '20px', zIndex: 1000,
          background: 'linear-gradient(135deg, #ff9800, #f57c00)',
          padding: '12px 20px', borderRadius: '50px', border: 'none',
          color: 'white', fontWeight: 'bold', fontSize: '0.9rem',
          cursor: 'pointer', boxShadow: '0 4px 15px rgba(255, 152, 0, 0.4)',
          display: 'flex', alignItems: 'center', gap: '8px', transition: 'all 0.3s ease',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.transform = 'scale(1.05)';
          e.currentTarget.style.boxShadow = '0 6px 20px rgba(255, 152, 0, 0.6)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.transform = 'scale(1)';
          e.currentTarget.style.boxShadow = '0 4px 15px rgba(255, 152, 0, 0.4)';
        }}
      >
        <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>save</span>
        Salvar Competição
      </button>
      {modalOpen && <SaveCompetitionModal onClose={() => setModalOpen(false)} />}
    </>
  );
}
