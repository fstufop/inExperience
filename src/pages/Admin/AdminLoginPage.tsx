import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { auth } from '../../firebase';

function AdminLoginPage() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();

    const handleLogin = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        try {
            await signInWithEmailAndPassword(auth, email, password);
            navigate('/admin/'); 
          } catch (e: any) {
            console.error("Erro de Login:", e);
            if (e.code === 'auth/invalid-email' || e.code === 'auth/wrong-password' || e.code === 'auth/user-not-found') {
              setError("Credenciais inválidas. Verifique e-mail e senha.");
            } else {
              setError("Ocorreu um erro desconhecido no login.");
            }
          } finally {
            setLoading(false);
          }
    }

    return (
        <div className="login-container">
          <h2>IN Experience - Portal de Administração</h2>
          <form onSubmit={handleLogin}>
            <input
              type="email"
              placeholder="E-mail do Administrador"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
            <div style={{ position: 'relative', width: '100%' }}>
              <input
                type={showPassword ? 'text' : 'password'}
                placeholder="Senha"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                style={{ width: '100%', paddingRight: '3rem' }}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                style={{
                  position: 'absolute',
                  right: '0.5rem',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'none',
                  border: 'none',
                  color: '#888',
                  cursor: 'pointer',
                  padding: '0.5rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  transition: 'color 0.2s'
                }}
                onMouseEnter={(e) => e.currentTarget.style.color = '#33cc33'}
                onMouseLeave={(e) => e.currentTarget.style.color = '#888'}
              >
                <span className="material-symbols-outlined">
                  {showPassword ? 'visibility_off' : 'visibility'}
                </span>
              </button>
            </div>
            <button type="submit" disabled={loading}>
              {loading ? 'Entrando...' : 'Entrar'}
            </button>
          </form>
          {error && <p className="error-message">{error}</p>}
          
          <p style={{ marginTop: '20px', textAlign: 'center', color: '#888' }}>
            Não é administrador?{' '}
            <button
              onClick={() => navigate('/')}
              style={{
                background: 'none',
                border: 'none',
                color: '#33cc33',
                cursor: 'pointer',
                textDecoration: 'underline'
              }}
            >
              Acesse o Scoreboard Público
            </button>
          </p>
        </div>
      );
}

export default AdminLoginPage;