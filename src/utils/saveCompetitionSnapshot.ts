import { db, auth } from '../firebase';
import { collection, getDocs, addDoc, serverTimestamp, query, orderBy } from 'firebase/firestore';
import type { Team } from '../types/Team';
import type { Wod } from '../types/Wod';
import type { Result } from '../types/Result';

export async function saveCompetitionSnapshot(name: string): Promise<void> {
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
}
