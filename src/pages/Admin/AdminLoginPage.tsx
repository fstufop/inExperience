import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { auth } from '../../firebase';

function AdminLoginPage() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();

    const handleLogin = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        try {
            await signInWithEmailAndPassword(auth, email, password);
            navigate('/admin/dashboard'); 
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
          <h2>Acesso de Gestão (Admin)</h2>
          <form onSubmit={handleLogin}>
            <input
              type="email"
              placeholder="E-mail do Administrador"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
            <input
              type="password"
              placeholder="Senha"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
            <button type="submit" disabled={loading}>
              {loading ? 'Entrando...' : 'Entrar'}
            </button>
          </form>
          {error && <p className="error-message">{error}</p>}
        </div>
      );
}

export default AdminLoginPage;