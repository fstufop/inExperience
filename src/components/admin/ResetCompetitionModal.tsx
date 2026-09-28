import { useState, useEffect } from 'react';
import { auth, db } from '../../firebase';
import { EmailAuthProvider, reauthenticateWithCredential } from 'firebase/auth';
import { collection, getDocs, writeBatch } from 'firebase/firestore';
import { saveCompetitionSnapshot } from '../../utils/saveCompetitionSnapshot';

type Step = 'warning' | 'auth' | 'loading' | 'done';

interface ResetCompetitionModalProps {
  onClose: () => void;
}

export default function ResetCompetitionModal({ onClose }: ResetCompetitionModalProps) {
  const [step, setStep] = useState<Step>('warning');
  const [saveHistory, setSaveHistory] = useState(false);
  const [historyName, setHistoryName] = useState('');
  const [password, setPassword] = useState('');
  const [counts, setCounts] = useState<{ teams: number; wods: number; results: number } | null>(null);
  const [error, setError] = useState('');
  const [status, setStatus] = useState('');

  useEffect(() => {
    Promise.all([
      getDocs(collection(db, 'teams')),
      getDocs(collection(db, 'wods')),
      getDocs(collection(db, 'results')),
    ]).then(([t, w, r]) => setCounts({ teams: t.size, wods: w.size, results: r.size }));
  }, []);

  const handleContinue = () => {
    if (saveHistory && !historyName.trim()) {
      setError('Insira o nome da competição para salvar o histórico.');
      return;
    }
    setError('');
    setStep('auth');
  };

  const handleReset = async () => {
    if (!password) {
      setError('Digite sua senha para confirmar.');
      return;
    }
    setError('');
    setStep('loading');

    try {
      const user = auth.currentUser;
      if (!user?.email) throw new Error('Usuário não autenticado.');

      setStatus('Verificando identidade...');
      const credential = EmailAuthProvider.credential(user.email, password);
      await reauthenticateWithCredential(user, credential);

      if (saveHistory) {
        setStatus('Salvando histórico...');
        await saveCompetitionSnapshot(historyName.trim());
      }

      setStatus('Apagando registros...');
      await Promise.all(['teams', 'wods', 'results'].map(deleteCollection));

      setStep('done');
    } catch (err: any) {
      console.error('Erro ao resetar:', err);
      const isWrongPassword = err.code === 'auth/wrong-password' || err.code === 'auth/invalid-credential';
      setError(isWrongPassword ? 'Senha incorreta.' : 'Erro ao resetar. Tente novamente.');
      setStep('auth');
    }
  };

  const canClose = step !== 'loading';

  return (
    <div
      style={{
        position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999,
      }}
      onClick={(e) => { if (e.target === e.currentTarget && canClose) onClose(); }}
    >
      <div style={{
        background: '#1e1e1e', borderRadius: '12px', padding: '2rem',
        width: '100%', maxWidth: '500px', boxShadow: '0 8px 32px rgba(0,0,0,0.6)',
      }}>

        {step === 'warning' && (
          <>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem' }}>
              <span className="material-symbols-outlined" style={{ fontSize: '2rem', color: '#f44336' }}>
                warning
              </span>
              <h2 style={{ margin: 0, color: '#fff' }}>Resetar Competição</h2>
            </div>

            <p style={{ color: '#aaa', marginBottom: '1.25rem', lineHeight: 1.5 }}>
              Esta ação apagará <strong style={{ color: '#fff' }}>permanentemente</strong> todos os registros atuais:
            </p>

            <div style={{ background: '#2a2a2a', borderRadius: '8px', padding: '1rem', marginBottom: '1.5rem', display: 'flex', gap: '1.5rem' }}>
              {counts ? (
                <>
                  <Stat icon="groups" label="Times" value={counts.teams} />
                  <Stat icon="assignment" label="WODs" value={counts.wods} />
                  <Stat icon="assessment" label="Resultados" value={counts.results} />
                </>
              ) : (
                <span style={{ color: '#888', fontSize: '0.9rem' }}>Carregando...</span>
              )}
            </div>

            <div
              style={{
                display: 'flex', alignItems: 'flex-start', gap: '0.75rem',
                padding: '1rem', background: '#252525', borderRadius: '8px',
                border: saveHistory ? '1px solid #33cc33' : '1px solid #333',
                cursor: 'pointer', marginBottom: '1rem', transition: 'border-color 0.2s',
              }}
              onClick={() => { setSaveHistory(v => !v); setError(''); }}
            >
              <div style={{
                width: '20px', height: '20px', borderRadius: '4px', flexShrink: 0, marginTop: '2px',
                background: saveHistory ? '#33cc33' : 'transparent',
                border: saveHistory ? '2px solid #33cc33' : '2px solid #555',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                transition: 'all 0.2s',
              }}>
                {saveHistory && (
                  <span className="material-symbols-outlined" style={{ fontSize: '14px', color: '#fff' }}>check</span>
                )}
              </div>
              <div>
                <div style={{ color: '#fff', fontWeight: 'bold', fontSize: '0.95rem' }}>
                  Salvar histórico antes de limpar
                </div>
                <div style={{ color: '#888', fontSize: '0.85rem', marginTop: '2px' }}>
                  Cria um snapshot da competição atual no Histórico
                </div>
              </div>
            </div>

            {saveHistory && (
              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', marginBottom: '0.5rem', color: '#aaa', fontSize: '0.9rem' }}>
                  Nome da competição
                </label>
                <input
                  type="text"
                  value={historyName}
                  onChange={(e) => { setHistoryName(e.target.value); setError(''); }}
                  onKeyDown={(e) => { if (e.key === 'Enter') handleContinue(); }}
                  placeholder="Ex: IN Experience 2025"
                  autoFocus
                  style={{
                    width: '100%', padding: '0.75rem 1rem', fontSize: '1rem',
                    background: '#333', color: '#fff', border: '1px solid #555',
                    borderRadius: '8px', boxSizing: 'border-box',
                  }}
                />
              </div>
            )}

            {error && <p style={{ color: '#f44336', fontSize: '0.9rem', marginBottom: '1rem' }}>{error}</p>}

            <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end' }}>
              <button onClick={onClose} style={secondaryBtn}>Cancelar</button>
              <button onClick={handleContinue} style={dangerBtn}>
                Continuar
                <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>arrow_forward</span>
              </button>
            </div>
          </>
        )}

        {step === 'auth' && (
          <>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem' }}>
              <span className="material-symbols-outlined" style={{ fontSize: '2rem', color: '#ff9800' }}>
                lock
              </span>
              <h2 style={{ margin: 0, color: '#fff' }}>Confirmar identidade</h2>
            </div>

            <p style={{ color: '#aaa', marginBottom: '1.25rem', lineHeight: 1.5 }}>
              Digite sua senha para autorizar o reset. Esta ação não pode ser desfeita.
            </p>

            <label style={{ display: 'block', marginBottom: '0.5rem', color: '#aaa', fontSize: '0.9rem' }}>
              Senha
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => { setPassword(e.target.value); setError(''); }}
              onKeyDown={(e) => { if (e.key === 'Enter') handleReset(); }}
              placeholder="Sua senha de acesso"
              autoFocus
              style={{
                width: '100%', padding: '0.75rem 1rem', fontSize: '1rem',
                background: '#333', color: '#fff', border: '1px solid #555',
                borderRadius: '8px', boxSizing: 'border-box', marginBottom: '1rem',
              }}
            />

            {error && <p style={{ color: '#f44336', fontSize: '0.9rem', marginBottom: '1rem' }}>{error}</p>}

            <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end' }}>
              <button onClick={() => { setStep('warning'); setError(''); }} style={secondaryBtn}>Voltar</button>
              <button onClick={handleReset} style={dangerBtn}>
                <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>delete_forever</span>
                Resetar tudo
              </button>
            </div>
          </>
        )}

        {step === 'loading' && (
          <div style={{ textAlign: 'center', padding: '1rem 0' }}>
            <span className="material-symbols-outlined" style={{ fontSize: '3rem', color: '#f44336', display: 'block', marginBottom: '1rem', animation: 'spin 1s linear infinite' }}>
              progress_activity
            </span>
            <p style={{ color: '#aaa', margin: 0 }}>{status}</p>
          </div>
        )}

        {step === 'done' && (
          <div style={{ textAlign: 'center', padding: '1rem 0' }}>
            <span className="material-symbols-outlined" style={{ fontSize: '3rem', color: '#33cc33', display: 'block', marginBottom: '1rem' }}>
              check_circle
            </span>
            <h2 style={{ margin: '0 0 0.5rem', color: '#fff' }}>Pronto!</h2>
            <p style={{ color: '#aaa', marginBottom: '1.5rem' }}>
              {saveHistory
                ? `Histórico salvo e registros apagados com sucesso.`
                : 'Registros apagados com sucesso.'}
            </p>
            <button onClick={onClose} style={{ ...dangerBtn, background: 'linear-gradient(135deg, #33cc33, #29a329)' }}>
              Fechar
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function Stat({ icon, label, value }: { icon: string; label: string; value: number }) {
  return (
    <div style={{ textAlign: 'center', flex: 1 }}>
      <span className="material-symbols-outlined" style={{ fontSize: '1.5rem', color: '#f44336', display: 'block' }}>{icon}</span>
      <div style={{ color: '#fff', fontWeight: 'bold', fontSize: '1.25rem' }}>{value}</div>
      <div style={{ color: '#888', fontSize: '0.8rem' }}>{label}</div>
    </div>
  );
}

async function deleteCollection(name: string) {
  const snap = await getDocs(collection(db, name));
  for (let i = 0; i < snap.docs.length; i += 500) {
    const batch = writeBatch(db);
    snap.docs.slice(i, i + 500).forEach(d => batch.delete(d.ref));
    await batch.commit();
  }
}

const secondaryBtn: React.CSSProperties = {
  padding: '0.75rem 1.5rem', background: '#444', color: '#fff',
  border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold',
};

const dangerBtn: React.CSSProperties = {
  padding: '0.75rem 1.5rem', background: 'linear-gradient(135deg, #f44336, #c62828)',
  color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer',
  fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '6px',
};
