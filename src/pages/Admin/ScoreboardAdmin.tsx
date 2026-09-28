import { useState } from 'react';
import ScoreboardPage from '../ScoreboardPage';
import SaveCompetitionModal from '../../components/admin/SaveCompetitionModal';
import ResetCompetitionModal from '../../components/admin/ResetCompetitionModal';

export default function ScoreboardAdmin() {
  const [saveOpen, setSaveOpen] = useState(false);
  const [resetOpen, setResetOpen] = useState(false);

  return (
    <>
      <ScoreboardPage />

      <button
        onClick={() => setResetOpen(true)}
        style={{
          position: 'fixed', bottom: '140px', right: '20px', zIndex: 1000,
          background: 'linear-gradient(135deg, #f44336, #c62828)',
          padding: '12px 20px', borderRadius: '50px', border: 'none',
          color: 'white', fontWeight: 'bold', fontSize: '0.9rem',
          cursor: 'pointer', boxShadow: '0 4px 15px rgba(244, 67, 54, 0.4)',
          display: 'flex', alignItems: 'center', gap: '8px', transition: 'all 0.3s ease',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.transform = 'scale(1.05)';
          e.currentTarget.style.boxShadow = '0 6px 20px rgba(244, 67, 54, 0.6)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.transform = 'scale(1)';
          e.currentTarget.style.boxShadow = '0 4px 15px rgba(244, 67, 54, 0.4)';
        }}
      >
        <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>restart_alt</span>
        Resetar Competição
      </button>

      <button
        onClick={() => setSaveOpen(true)}
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

      {saveOpen && <SaveCompetitionModal onClose={() => setSaveOpen(false)} />}
      {resetOpen && <ResetCompetitionModal onClose={() => setResetOpen(false)} />}
    </>
  );
}
