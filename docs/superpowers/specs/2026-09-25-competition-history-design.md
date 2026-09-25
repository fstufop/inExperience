# Histórico de Competições

## Objetivo

Permitir que o admin salve um snapshot dos dados da competição corrente (times, WODs, resultados) como registro histórico permanente. Admins podem acessar uma tela dedicada para listar e visualizar competições anteriores com ranking, resultados por WOD, lista de WODs e lista de times.

---

## Modelo de Dados

Nova coleção Firestore: `competitions`

```typescript
interface CompetitionSnapshot {
  id: string;
  name: string;        // nome definido pelo admin (ex: "IN Experience 2024")
  savedAt: Timestamp;  // serverTimestamp() no momento do save
  savedBy: string;     // email do admin autenticado
  teams: Team[];       // snapshot completo dos times com totalPoints e generalRank
  wods: Wod[];         // snapshot completo das provas
  results: Result[];   // snapshot completo de todos os resultados
}
```

**Estratégia:** snapshot completo embutido num único documento. Nenhuma coleção existente é alterada. O histórico é imutável após o save — mudanças futuras nos dados correntes não afetam registros anteriores.

Limite Firestore (1MB/documento) é confortável para o volume esperado (~50 times, ~10 WODs, ~500 resultados).

---

## Arquitetura

### Novas páginas

| Rota | Componente | Descrição |
|------|-----------|-----------|
| `/admin/history` | `CompetitionHistoryPage` | Lista de competições salvas |
| `/admin/history/:id` | `CompetitionDetailPage` | Visualização completa de uma competição |

### Novo componente

- `SaveCompetitionModal` — modal com campo de texto para nome + botão confirmar. Disparado pelo botão "Salvar Competição" em `ScoreboardAdmin`.

### Arquivos alterados

| Arquivo | Mudança |
|---------|---------|
| `Sidebar.tsx` | Novo item "Histórico" (ícone `history`) antes do "Sair" |
| `AdminDashboard.tsx` | Registrar rotas `/history` e `/history/:id` |
| `App.tsx` | Nenhuma mudança necessária (herda das rotas do `AdminLayout`) |
| `ScoreboardAdmin.tsx` | Botão "Salvar Competição" que abre o modal |

---

## Fluxo de Save

1. Admin clica "Salvar Competição" em `ScoreboardAdmin`
2. `SaveCompetitionModal` abre com campo de texto para nome
3. Admin digita o nome e clica "Confirmar"
4. Frontend executa 3 leituras paralelas: `getDocs(teams)`, `getDocs(wods)`, `getDocs(results)`
5. Monta `CompetitionSnapshot` com `savedAt: serverTimestamp()` e `savedBy: auth.currentUser.email`
6. `addDoc(collection(db, 'competitions'), snapshot)` — escrita única atômica
7. Modal fecha; toast de sucesso exibido

---

## Fluxo de Leitura

**Lista (`CompetitionHistoryPage`):**
- `getDocs` na coleção `competitions` ordenado por `savedAt` descendente
- Cards com: nome, data formatada (dd/MM/yyyy), número de times participantes
- Botão "Ver detalhes" em cada card navega para `/admin/history/:id`

**Detalhe (`CompetitionDetailPage`):**
- `getDoc(doc(db, 'competitions', id))` — leitura única, todos os dados já embutidos
- 4 abas:
  - **Scoreboard** — ranking por categoria (usa `totalPoints` e `generalRank` do snapshot)
  - **Resultados por WOD** — para cada WOD, lista times com `rawScore` e `awardedPoints`
  - **WODs** — cards com nome, tipo, categoria, status e `maxPoints`
  - **Times** — tabela com nome, box, categoria, `totalPoints`, `generalRank`

---

## Constraints

- Funcionalidade exclusivamente admin (rotas protegidas por `ProtectedRoute` existente)
- Nenhuma Cloud Function — tudo client-side
- Sem paginação na lista de histórico (volume de competições é pequeno)
- Histórico é somente leitura — sem edição ou exclusão de snapshots
