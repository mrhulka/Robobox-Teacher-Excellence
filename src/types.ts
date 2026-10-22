// Shared data model. Classic script (no import/export) → these interfaces are global
// and visible to every other src file. Compiled output is type-only, so this emits nothing.

type Role = 'teacher' | 'mod' | 'ceo';
type RagKey = 'green' | 'amber' | 'red';
type RagOrNone = RagKey | 'none';

interface School { id: string; name: string; mod: string; mapLink: string; locNote: string; lat: number | null; lng: number | null; teachers: string[]; }
interface Teacher { name: string; mod: string; schools: string[]; }
interface SeedData { moderators: string[]; schools: School[]; teachers: Teacher[]; }

interface User { role: Role; name: string; mod?: string; }

interface Attendance { id?: string; teacher: string; date: string; inTime: string; inSchool: string; inLate: number; inDist: number; outTime?: string; outSchool?: string; outDist?: number; }
interface Feedback {
  id?: string; mod: string; teacher: string; school: string; date: string;
  grade: string; module: string; students: number;
  ratings: Record<string, number>; critical: Record<string, string>;
  judgement: { independence: string; improvement: string; action: string };
  rag: RagKey; note: string; safety: boolean; score: number | null;
}
interface Leave { id?: string; teacher: string; mod?: string; type: string; from: string; to: string; reason: string; status: string; }
interface Requisition { id?: string; teacher: string; mod?: string; project: string; category: string; items: string; qty: number; note: string; status: string; }
interface Task { id?: string; teacher: string; title: string; detail: string; due: string; by: string; status: string; doneAt?: string; }
interface Material { id?: string; title: string; note: string; by: string; kind: 'link' | 'file'; link?: string; fileName?: string; size?: number; mime?: string; }

// Every collection the store holds. Keys double as STORE.get() arguments.
interface Collections {
  schools: School[]; teachers: Teacher[]; moderators: string[];
  attendance: Attendance[]; feedback: Feedback[]; leaves: Leave[];
  requests: Requisition[]; tasks: Task[]; materials: Material[];
}

interface AppConfig {
  geofenceMeters: number;
  expectedStart: string;
  grades: string[];
  modules: string[];
  ratingScale: { v: number; label: string }[];
  pillars: { id: string; name: string; q: string[][] }[];
  critical: [string, string, string[]][];
  judgement: { independence: string[]; improvement: string[]; action: string[] };
  rag: { green: string; amber: string; red: string };
  leaveTypes: string[];
  requestCategories: string[];
}

interface Visit {
  school: string;
  teacher: string | null;
  ratings: Record<string, number | 'na'>;
  critical: Record<string, string>;
  judgement: Record<string, string>;
  step: 'pickTeacher' | 'form';
}
