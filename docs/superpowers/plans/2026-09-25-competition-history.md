# Histórico de Competições — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Salvar snapshots de competições no Firestore e criar telas admin para listar e visualizar o histórico completo com ranking, resultados por WOD, WODs e times.

**Architecture:** Snapshot completo (teams + wods + results) gravado num único documento Firestore na coleção `competitions` via botão manual no admin. Duas novas páginas (`/admin/history` e `/admin/history/:id`) com 4 abas. Nenhuma coleção existente é alterada; o histórico é imutável.

**Tech Stack:** React 19, TypeScript, Firebase Firestore v12, React Router v7, Vite

**Spec:** `docs/superpowers/specs/2026-09-25-competition-history-design.md`

## Global Constraints

- Todas as rotas novas ficam sob `/admin/` e herdam o `ProtectedRoute` existente via `App.tsx`
- Sem Cloud Functions — tudo client-side com `getDocs` / `addDoc` / `getDoc`
- Histórico é somente leitura — sem edição ou exclusão de snapshots
- Seguir padrão de inline styles do projeto (sem CSS modules adicionais)
- Firebase: importar de `firebase/firestore` e `firebase/auth`; usar `db` e `auth` exportados de `../../firebase`
- Sem paginação na lista de histórico

## Review Focus

- **Nome vazio no modal:** clicar "Confirmar" com campo vazio não deve disparar save — validar `name.trim()` antes de qualquer chamada Firestore
- **Falha na leitura durante save:** se um dos `getDocs` falhar, o modal mostra mensagem de erro e não fecha — garantido pelo `try/catch` com `setError`
- **Competição inexistente no detalhe:** acessar `/admin/history/id-invalido` mostra estado "não encontrado" em vez de crash — tratado quando `snap.exists()` retorna false
- **Arrays vazios no snapshot:** competição salva sem times/wods/results renderiza as 4 abas com estado vazio sem crash — cada aba trata o array vazio explicitamente
- **Formatação de data:** `savedAt` vem como Firestore `Timestamp`; chamar `.toDate()` antes de formatar para evitar `Invalid Date`

---

### Task 1: Tipo CompetitionSnapshot

**Files:**
- Create: `src/types/Competition.ts`

**Interfaces:**
- Produces: interface `CompetitionSnapshot` usada em todas as tasks seguintes

- [ ] **Step 1: Criar o arquivo de tipos**

```typescript
// src/types/Competition.ts
import type { Timestamp } from 'firebase/firestore';
import type { Team } from './Team';
import type { Wod } from './Wod';
import type { Result } from './Result';

export interface CompetitionSnapshot {
  id: string;
  name: string;
  savedAt: Timestamp;
  savedBy: string;
  teams: Team[];
  wods: Wod[];
  results: Result[];
}
```

- [ ] **Step 2: Verificar TypeScript**

```bash
npx tsc --noEmit
```

Esperado: sem erros em `Competition.ts` nem nos tipos importados.

- [ ] **Step 3: Commit**

```bash
git add src/types/Competition.ts
git commit -m "feat: add CompetitionSnapshot type"
```

---

### Task 2: SaveCompetitionModal

**Files:**
- Create: `src/components/admin/SaveCompetitionModal.tsx`

**Interfaces:**
- Consumes: `db` e `auth` de `../../firebase`; tipos `Team`, `Wod`, `Result`
- Produces: `<SaveCompetitionModal onClose={() => void} />` — gerencia todo o fluxo de save internamente

- [ ] **Step 1: Criar o componente**

```tsx
// src/components/admin/SaveCompetitionModal.tsx
import { useState } from 'react';
import { db, auth } from '../../firebase';
import { collection, getDocs, addDoc, serverTimestamp, query, orderBy } from 'firebase/firestore';
import type { Team } from '../../types/Team';
import type { Wod } from '../../types/Wod';
import type { Result } from '../../types/Result';

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
      const [teamsSnap, wodsSnap, resultsSnap] = await Promise.all([
        getDocs(query(collection(db, 'teams'), orderBy('totalPoints', 'desc'))),
        getDocs(query(collection(db, 'wods'), orderBy('order', 'asc'))),
        getDocs(collection(db, 'results')),
      ]);

      const teams = teamsSnap.docs.map(d => ({ id: d.id, ...d.data() })) as Team[];
      const wods = wodsSnap.docs.map(d => ({ id: d.id, ...d.data() })) as Wod[];
      const results = resultsSnap.docs.map(d => ({ id: d.id, ...d.data() })) as Result[];

      await addDoc(collection(db, 'competitions'), {
        name: name.trim(),
        savedAt: serverTimestamp(),
        savedBy: auth.currentUser?.email ?? 'unknown',
        teams,
        wods,
        results,
      });

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
```

- [ ] **Step 2: Verificar TypeScript**

```bash
npx tsc --noEmit
```

Esperado: sem erros em `SaveCompetitionModal.tsx`.

- [ ] **Step 3: Commit**

```bash
git add src/components/admin/SaveCompetitionModal.tsx
git commit -m "feat: add SaveCompetitionModal component"
```

---

### Task 3: Integrar modal em ScoreboardAdmin

**Files:**
- Modify: `src/pages/Admin/ScoreboardAdmin.tsx`

**Interfaces:**
- Consumes: `SaveCompetitionModal` de `../../components/admin/SaveCompetitionModal`
- Produces: página `/admin/scoreboard` com botão fixo "Salvar Competição" (laranja, acima do botão de login existente)

- [ ] **Step 1: Reescrever ScoreboardAdmin**

O arquivo atual contém apenas `export default function ScoreboardAdmin() { return <ScoreboardPage />; }`. Substituir por:

```tsx
// src/pages/Admin/ScoreboardAdmin.tsx
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
```

- [ ] **Step 2: Verificar TypeScript**

```bash
npx tsc --noEmit
```

- [ ] **Step 3: Testar manualmente no browser**

```bash
npm run dev
```

Navegar para `/admin/scoreboard`. Verificar:
- Botão laranja "Salvar Competição" aparece fixo no canto inferior direito, acima do botão 🔐
- Clicar abre o modal com campo de texto
- Campo vazio → erro "Por favor, insira o nome da competição."
- Campo preenchido → loading "Salvando..." → modal fecha
- Firestore Console (`competitions`) mostra documento criado com `name`, `savedAt`, `savedBy`, `teams[]`, `wods[]`, `results[]`
- Cancelar e clicar fora do modal fecha sem salvar

- [ ] **Step 4: Commit**

```bash
git add src/pages/Admin/ScoreboardAdmin.tsx
git commit -m "feat: add save competition button and modal to ScoreboardAdmin"
```

---

### Task 4: CompetitionHistoryPage

**Files:**
- Create: `src/pages/Admin/CompetitionHistoryPage.tsx`

**Interfaces:**
- Consumes: `CompetitionSnapshot` de `../../types/Competition`, `db` de `../../firebase`, `Loading` de `../../components/Loading`
- Produces: página `/admin/history` com cards de competições e navegação para detalhe

- [ ] **Step 1: Criar o componente**

```tsx
// src/pages/Admin/CompetitionHistoryPage.tsx
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { db } from '../../firebase';
import { collection, getDocs, query, orderBy } from 'firebase/firestore';
import type { CompetitionSnapshot } from '../../types/Competition';
import Loading from '../../components/Loading';

type CompetitionCard = Pick<CompetitionSnapshot, 'id' | 'name' | 'savedAt' | 'savedBy' | 'teams'>;

export default function CompetitionHistoryPage() {
  const navigate = useNavigate();
  const [competitions, setCompetitions] = useState<CompetitionCard[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetch = async () => {
      try {
        const q = query(collection(db, 'competitions'), orderBy('savedAt', 'desc'));
        const snap = await getDocs(q);
        setCompetitions(snap.docs.map(d => ({ id: d.id, ...d.data() })) as CompetitionCard[]);
      } catch (err) {
        console.error('Erro ao carregar histórico:', err);
      } finally {
        setLoading(false);
      }
    };
    fetch();
  }, []);

  const formatDate = (savedAt: CompetitionSnapshot['savedAt']) => {
    if (!savedAt) return '—';
    return savedAt.toDate().toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
  };

  if (loading) return <Loading message="Carregando histórico..." size="medium" />;

  return (
    <div className="admin-page-container">
      <h1>Histórico de Competições</h1>

      {competitions.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '4rem', color: '#888' }}>
          <span className="material-symbols-outlined" style={{ fontSize: '4rem', display: 'block', marginBottom: '1rem' }}>
            history
          </span>
          <p>Nenhuma competição salva ainda.</p>
          <p style={{ fontSize: '0.9rem' }}>
            Use o botão "Salvar Competição" no Scoreboard para criar um registro.
          </p>
        </div>
      ) : (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
          gap: '1.5rem',
          marginTop: '1.5rem',
        }}>
          {competitions.map(comp => (
            <div
              key={comp.id}
              style={{
                background: '#1e1e1e', borderRadius: '12px', padding: '1.5rem',
                border: '1px solid #333', display: 'flex', flexDirection: 'column', gap: '0.75rem',
              }}
            >
              <h2 style={{ margin: 0, fontSize: '1.2rem', color: '#fff' }}>{comp.name}</h2>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                <span style={{ color: '#888', fontSize: '0.85rem' }}>
                  <span className="material-symbols-outlined" style={{ fontSize: '14px', verticalAlign: 'middle', marginRight: '4px' }}>
                    calendar_today
                  </span>
                  {formatDate(comp.savedAt)}
                </span>
                <span style={{ color: '#888', fontSize: '0.85rem' }}>
                  <span className="material-symbols-outlined" style={{ fontSize: '14px', verticalAlign: 'middle', marginRight: '4px' }}>
                    groups
                  </span>
                  {comp.teams?.length ?? 0} times
                </span>
                <span style={{ color: '#888', fontSize: '0.85rem' }}>
                  <span className="material-symbols-outlined" style={{ fontSize: '14px', verticalAlign: 'middle', marginRight: '4px' }}>
                    person
                  </span>
                  {comp.savedBy}
                </span>
              </div>
              <button
                onClick={() => navigate(`/admin/history/${comp.id}`)}
                style={{
                  marginTop: 'auto', padding: '0.75rem 1rem',
                  background: 'linear-gradient(135deg, #33cc33, #29a329)',
                  color: '#fff', border: 'none', borderRadius: '8px',
                  cursor: 'pointer', fontWeight: 'bold', fontSize: '0.9rem',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem',
                }}
              >
                <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>open_in_new</span>
                Ver detalhes
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Verificar TypeScript**

```bash
npx tsc --noEmit
```

- [ ] **Step 3: Commit**

```bash
git add src/pages/Admin/CompetitionHistoryPage.tsx
git commit -m "feat: add CompetitionHistoryPage"
```

---

### Task 5: CompetitionDetailPage

**Files:**
- Create: `src/pages/Admin/CompetitionDetailPage.tsx`

**Interfaces:**
- Consumes: `CompetitionSnapshot` de `../../types/Competition`, `db` de `../../firebase`, `useParams` e `useNavigate` de `react-router-dom`, `Categories` de `../../commons/constants/categories`
- Produces: página `/admin/history/:id` com 4 abas: Scoreboard, Resultados por WOD, WODs, Times

- [ ] **Step 1: Criar o componente**

```tsx
// src/pages/Admin/CompetitionDetailPage.tsx
import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { db } from '../../firebase';
import { doc, getDoc } from 'firebase/firestore';
import type { CompetitionSnapshot } from '../../types/Competition';
import type { Team } from '../../types/Team';
import type { Wod } from '../../types/Wod';
import type { Result } from '../../types/Result';
import Loading from '../../components/Loading';
import { Categories } from '../../commons/constants/categories';

type Tab = 'scoreboard' | 'wod-results' | 'wods' | 'teams';

export default function CompetitionDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [competition, setCompetition] = useState<CompetitionSnapshot | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<Tab>('scoreboard');

  useEffect(() => {
    if (!id) return;
    const fetch = async () => {
      try {
        const snap = await getDoc(doc(db, 'competitions', id));
        setCompetition(snap.exists() ? ({ id: snap.id, ...snap.data() } as CompetitionSnapshot) : null);
      } catch (err) {
        console.error('Erro ao carregar competição:', err);
        setCompetition(null);
      } finally {
        setLoading(false);
      }
    };
    fetch();
  }, [id]);

  if (loading) return <Loading message="Carregando competição..." size="medium" />;

  if (!competition) {
    return (
      <div className="admin-page-container" style={{ textAlign: 'center', padding: '4rem' }}>
        <span className="material-symbols-outlined" style={{ fontSize: '4rem', color: '#f44336', display: 'block', marginBottom: '1rem' }}>
          error
        </span>
        <h2>Competição não encontrada</h2>
        <button
          onClick={() => navigate('/admin/history')}
          style={{ marginTop: '1rem', padding: '0.75rem 1.5rem', background: '#333', color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer' }}
        >
          Voltar ao Histórico
        </button>
      </div>
    );
  }

  const formatDate = (savedAt: CompetitionSnapshot['savedAt']) => {
    if (!savedAt) return '—';
    return savedAt.toDate().toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
  };

  const tabs: { id: Tab; label: string; icon: string }[] = [
    { id: 'scoreboard', label: 'Scoreboard', icon: 'emoji_events' },
    { id: 'wod-results', label: 'Resultados por WOD', icon: 'assessment' },
    { id: 'wods', label: 'WODs', icon: 'assignment' },
    { id: 'teams', label: 'Times', icon: 'groups' },
  ];

  return (
    <div className="admin-page-container">
      <button
        onClick={() => navigate('/admin/history')}
        style={{ background: 'none', border: 'none', color: '#888', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '0.5rem', padding: 0 }}
      >
        <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>arrow_back</span>
        Histórico
      </button>

      <h1 style={{ margin: '0 0 0.25rem' }}>{competition.name}</h1>
      <p style={{ color: '#888', margin: '0 0 1.5rem', fontSize: '0.9rem' }}>
        Salvo em {formatDate(competition.savedAt)} por {competition.savedBy}
      </p>

      <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', marginBottom: '1.5rem' }}>
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            style={{
              padding: '0.75rem 1.25rem', border: 'none', borderRadius: '8px',
              cursor: 'pointer', fontWeight: 'bold', fontSize: '0.9rem',
              display: 'flex', alignItems: 'center', gap: '0.5rem',
              background: activeTab === tab.id ? 'linear-gradient(135deg, #33cc33, #29a329)' : '#333',
              color: '#fff', transition: 'all 0.2s ease',
            }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>{tab.icon}</span>
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === 'scoreboard' && <ScoreboardTab teams={competition.teams} />}
      {activeTab === 'wod-results' && (
        <WodResultsTab wods={competition.wods} results={competition.results} teams={competition.teams} />
      )}
      {activeTab === 'wods' && <WodsTab wods={competition.wods} />}
      {activeTab === 'teams' && <TeamsTab teams={competition.teams} />}
    </div>
  );
}

function ScoreboardTab({ teams }: { teams: Team[] }) {
  return (
    <div>
      {Categories.map(category => {
        const categoryTeams = [...teams]
          .filter(t => t.category === category)
          .sort((a, b) => (a.generalRank || 0) - (b.generalRank || 0));
        if (categoryTeams.length === 0) return null;
        return (
          <div key={category} style={{ marginBottom: '2rem' }}>
            <h2 style={{ borderBottom: '1px solid #333', paddingBottom: '0.5rem' }}>{category}</h2>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ color: '#888', fontSize: '0.85rem', textAlign: 'left' }}>
                  <th style={{ padding: '0.5rem' }}>Posição</th>
                  <th style={{ padding: '0.5rem' }}>Time</th>
                  <th style={{ padding: '0.5rem' }}>Box</th>
                  <th style={{ padding: '0.5rem', textAlign: 'right' }}>Pontos</th>
                </tr>
              </thead>
              <tbody>
                {categoryTeams.map((team, i) => (
                  <tr key={team.id} style={{ borderTop: '1px solid #2a2a2a', background: i === 0 ? 'rgba(51,204,51,0.08)' : 'transparent' }}>
                    <td style={{ padding: '0.75rem 0.5rem', fontWeight: 'bold', color: i === 0 ? '#33cc33' : '#fff' }}>
                      {team.generalRank || i + 1}º
                    </td>
                    <td style={{ padding: '0.75rem 0.5rem' }}>{team.name}</td>
                    <td style={{ padding: '0.75rem 0.5rem', color: '#888' }}>{team.box}</td>
                    <td style={{ padding: '0.75rem 0.5rem', textAlign: 'right', fontWeight: 'bold' }}>{team.totalPoints}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        );
      })}
    </div>
  );
}

function WodResultsTab({ wods, results, teams }: { wods: Wod[]; results: Result[]; teams: Team[] }) {
  return (
    <div>
      {wods.map(wod => {
        const wodResults = results
          .filter(r => r.wodId === wod.id)
          .sort((a, b) => a.wodRank - b.wodRank);
        return (
          <div key={wod.id} style={{ marginBottom: '2rem' }}>
            <h2 style={{ borderBottom: '1px solid #333', paddingBottom: '0.5rem' }}>
              {wod.name}
              <span style={{ fontSize: '0.8rem', color: '#888', marginLeft: '0.75rem', fontWeight: 'normal' }}>
                {wod.category} · {wod.type}
              </span>
            </h2>
            {wodResults.length === 0 ? (
              <p style={{ color: '#888' }}>Sem resultados registrados.</p>
            ) : (
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ color: '#888', fontSize: '0.85rem', textAlign: 'left' }}>
                    <th style={{ padding: '0.5rem' }}>Rank</th>
                    <th style={{ padding: '0.5rem' }}>Time</th>
                    <th style={{ padding: '0.5rem' }}>Resultado</th>
                    <th style={{ padding: '0.5rem', textAlign: 'right' }}>Pts</th>
                  </tr>
                </thead>
                <tbody>
                  {wodResults.map((result, i) => {
                    const team = teams.find(t => t.id === result.teamId);
                    const score = result.timeCapReached && result.repsRemaining !== undefined
                      ? `CAP + ${result.repsRemaining} reps`
                      : result.timeCapReached
                      ? 'CAP'
                      : String(result.rawScore);
                    return (
                      <tr key={result.id} style={{ borderTop: '1px solid #2a2a2a' }}>
                        <td style={{ padding: '0.75rem 0.5rem', color: i === 0 ? '#33cc33' : '#fff', fontWeight: 'bold' }}>
                          {result.wodRank}º
                        </td>
                        <td style={{ padding: '0.75rem 0.5rem' }}>{team?.name ?? result.teamId}</td>
                        <td style={{ padding: '0.75rem 0.5rem', color: '#aaa' }}>{score}</td>
                        <td style={{ padding: '0.75rem 0.5rem', textAlign: 'right' }}>{result.awardedPoints}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        );
      })}
    </div>
  );
}

function WodsTab({ wods }: { wods: Wod[] }) {
  const statusLabel: Record<string, string> = {
    'not started': 'Não iniciado',
    'in progress': 'Em andamento',
    'computing': 'Apurando',
    'completed': 'Concluído',
  };
  const statusColor: Record<string, string> = {
    'not started': '#f44336',
    'in progress': '#ff9800',
    'computing': '#2196f3',
    'completed': '#4caf50',
  };
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '1rem' }}>
      {wods.map(wod => (
        <div key={wod.id} style={{ background: '#1e1e1e', borderRadius: '10px', padding: '1.25rem', border: '1px solid #333' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
            <h3 style={{ margin: 0, fontSize: '1rem' }}>{wod.name}</h3>
            <span style={{ fontSize: '0.75rem', color: statusColor[wod.status] ?? '#888', fontWeight: 'bold' }}>
              {statusLabel[wod.status] ?? wod.status}
            </span>
          </div>
          <p style={{ margin: '0 0 0.5rem', color: '#888', fontSize: '0.85rem' }}>{wod.category}</p>
          <div style={{ display: 'flex', gap: '1rem', fontSize: '0.85rem', color: '#aaa' }}>
            <span>Tipo: {wod.type}</span>
            <span>Máx: {wod.maxPoints} pts</span>
          </div>
        </div>
      ))}
    </div>
  );
}

function TeamsTab({ teams }: { teams: Team[] }) {
  return (
    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
      <thead>
        <tr style={{ color: '#888', fontSize: '0.85rem', textAlign: 'left' }}>
          <th style={{ padding: '0.5rem' }}>Pos.</th>
          <th style={{ padding: '0.5rem' }}>Time</th>
          <th style={{ padding: '0.5rem' }}>Box</th>
          <th style={{ padding: '0.5rem' }}>Categoria</th>
          <th style={{ padding: '0.5rem', textAlign: 'right' }}>Pontos</th>
        </tr>
      </thead>
      <tbody>
        {[...teams]
          .sort((a, b) => (a.generalRank || 0) - (b.generalRank || 0))
          .map((team, i) => (
            <tr key={team.id} style={{ borderTop: '1px solid #2a2a2a' }}>
              <td style={{ padding: '0.75rem 0.5rem', color: '#888' }}>{team.generalRank || i + 1}º</td>
              <td style={{ padding: '0.75rem 0.5rem', fontWeight: '600' }}>{team.name}</td>
              <td style={{ padding: '0.75rem 0.5rem', color: '#888' }}>{team.box}</td>
              <td style={{ padding: '0.75rem 0.5rem', color: '#888', fontSize: '0.85rem' }}>{team.category}</td>
              <td style={{ padding: '0.75rem 0.5rem', textAlign: 'right', fontWeight: 'bold' }}>{team.totalPoints}</td>
            </tr>
          ))}
      </tbody>
    </table>
  );
}
```

- [ ] **Step 2: Verificar TypeScript**

```bash
npx tsc --noEmit
```

- [ ] **Step 3: Commit**

```bash
git add src/pages/Admin/CompetitionDetailPage.tsx
git commit -m "feat: add CompetitionDetailPage with 4 tabs"
```

---

### Task 6: Rotas, Sidebar e estado ativo

**Files:**
- Modify: `src/App.tsx`
- Modify: `src/components/admin/Sidebar.tsx`
- Modify: `src/pages/Admin/AdminDashboard.tsx`

**Interfaces:**
- Consumes: `CompetitionHistoryPage` de `./pages/Admin/CompetitionHistoryPage`, `CompetitionDetailPage` de `./pages/Admin/CompetitionDetailPage`

- [ ] **Step 1: Adicionar item "Histórico" na Sidebar**

Em `src/components/admin/Sidebar.tsx`, inserir antes do item `logout` no array `menuItems`:

```tsx
{ id: 'history', label: 'Histórico', icon: 'history', path: '/admin/history' },
```

Array completo resultante:
```tsx
const menuItems: MenuItem[] = [
  { id: 'scoreboard', label: 'Scoreboard', icon: 'emoji_events', path: '/admin/scoreboard' },
  { id: 'scores', label: 'Registrar Resultados', icon: 'assessment', path: '/admin/score-entry' },
  { id: 'teams', label: 'Cadastrar Times', icon: 'groups', path: '/admin/teams' },
  { id: 'wods', label: 'Cadastrar Provas (WODs)', icon: 'assignment', path: '/admin/wods' },
  { id: 'history', label: 'Histórico', icon: 'history', path: '/admin/history' },
  { id: 'logout', label: 'Sair', icon: 'logout', path: '/admin/login' },
];
```

- [ ] **Step 2: Atualizar getActiveItem em AdminDashboard**

Em `src/pages/Admin/AdminDashboard.tsx`, adicionar o check de `/history` **antes** do catch-all `includes('/')`:

```tsx
const getActiveItem = () => {
  if (location.pathname.includes('/teams')) return 'teams';
  if (location.pathname.includes('/wods')) return 'wods';
  if (location.pathname.includes('/score-entry')) return 'scores';
  if (location.pathname.includes('/history')) return 'history';
  if (location.pathname.includes('/')) return 'scoreboard';
  return 'scoreboard';
};
```

- [ ] **Step 3: Adicionar rotas em App.tsx**

Importar as novas páginas após as importações existentes:

```tsx
import CompetitionHistoryPage from './pages/Admin/CompetitionHistoryPage';
import CompetitionDetailPage from './pages/Admin/CompetitionDetailPage';
```

Dentro do bloco `<Route path="/admin/" element={<AdminLayout />}>`, adicionar após a rota `score-entry`:

```tsx
<Route path="history" element={<CompetitionHistoryPage />} />
<Route path="history/:id" element={<CompetitionDetailPage />} />
```

- [ ] **Step 4: Verificar TypeScript**

```bash
npx tsc --noEmit
```

Esperado: zero erros.

- [ ] **Step 5: Testar manualmente no browser**

```bash
npm run dev
```

Verificar:
- Sidebar mostra "Histórico" com ícone `history` antes de "Sair"
- Clicar em "Histórico" navega para `/admin/history`
- Item "Histórico" fica destacado (ativo) em `/admin/history` e `/admin/history/:id`
- Lista mostra cards com nome, data, nº de times e quem salvou
- Estado vazio (sem competições) mostra mensagem com ícone `history`
- Clicar "Ver detalhes" navega para `/admin/history/:id`
- Aba Scoreboard: times agrupados por categoria, ordenados por `generalRank`, líder em verde
- Aba Resultados por WOD: resultados agrupados por WOD, com score formatado (CAP, reps, etc.)
- Aba WODs: cards com nome, categoria, tipo, maxPoints e status traduzido
- Aba Times: tabela geral com todos os times ordenados por `generalRank`
- Botão "Voltar ao Histórico" retorna para `/admin/history`
- URL inválida (ex: `/admin/history/nao-existe`) mostra "Competição não encontrada"

- [ ] **Step 6: Commit final**

```bash
git add src/App.tsx src/components/admin/Sidebar.tsx src/pages/Admin/AdminDashboard.tsx
git commit -m "feat: register history routes, add sidebar item, update active state"
```
