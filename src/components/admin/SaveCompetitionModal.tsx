import { useState } from 'react';
import { saveCompetitionSnapshot } from '../../utils/saveCompetitionSnapshot';

interface SaveCompetitionModalProps {
  onClose: () => void;
}

export default function SaveCompetitionModal({ onClose }: SaveCompetitionModalProps) {
  const [name, setName] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const handleSave = async () => {
    if (!name.trim()) {
      setError('Por favor, insira o nome da competição.');
      return;
    }
    setSaving(true);
    setError('');
    try {
      await saveCompetitionSnapshot(name.trim());
      alert(`Competição "${name.trim()}" salva com sucesso!`);
      onClose();
    } catch (err) {
      console.error('Erro ao salvar competição:', err);
      setError('Erro ao salvar. Tente novamente.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      style={{
        position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999,
      }}
      onClick={(e) => { if (e.target === e.currentTarget && !saving) onClose(); }}
    >
      <div style={{
        background: '#1e1e1e', borderRadius: '12px', padding: '2rem',
        width: '100%', maxWidth: '480px', boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
      }}>
        <h2 style={{ margin: '0 0 1.5rem', color: '#fff' }}>Salvar Competição</h2>

        <label style={{ display: 'block', marginBottom: '0.5rem', color: '#aaa', fontSize: '0.9rem' }}>
          Nome da competição
        </label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter' && !saving) handleSave(); }}
          placeholder="Ex: IN Experience 2024"
          disabled={saving}
          style={{
            width: '100%', padding: '0.75rem 1rem', fontSize: '1rem',
            background: '#333', color: '#fff', border: '1px solid #555',
            borderRadius: '8px', boxSizing: 'border-box', marginBottom: '1rem',
          }}
        />

        {error && (
          <p style={{ color: '#f44336', marginBottom: '1rem', fontSize: '0.9rem' }}>{error}</p>
        )}

        <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end' }}>
          <button
            onClick={onClose}
            disabled={saving}
            style={{
              padding: '0.75rem 1.5rem', background: '#444', color: '#fff',
              border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold',
            }}
          >
            Cancelar
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            style={{
              padding: '0.75rem 1.5rem',
              background: saving ? '#555' : 'linear-gradient(135deg, #33cc33, #29a329)',
              color: '#fff', border: 'none', borderRadius: '8px',
              cursor: saving ? 'not-allowed' : 'pointer', fontWeight: 'bold',
            }}
          >
            {saving ? 'Salvando...' : 'Confirmar'}
          </button>
        </div>
      </div>
    </div>
  );
}
