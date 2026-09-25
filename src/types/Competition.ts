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
