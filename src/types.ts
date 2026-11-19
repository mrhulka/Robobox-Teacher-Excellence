// Shared data model. Classic script (no import/export) → these interfaces are global
// and visible to every other src file. Compiled output is type-only, so this emits nothing.

type Role = 'teacher' | 'mod' | 'ceo' | 'ops' | 'hr'; // 'mod' = coordinator, 'ceo' = leadership (Parth, Manish, Outsight)
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
  actionPlan?: string; nextVisit?: string; // added later; older records may not have them
}
interface Leave { id?: string; teacher: string; mod?: string; type: string; from: string; to: string; reason: string; status: string; decidedBy?: string; decidedAt?: string; applicant?: 'mod'; }
interface ReqLine { component: string; qty: number; }
// `lines` is the current shape; `items`/`qty`/`category` are kept so older free-text requests still render.
interface Requisition {
  id?: string; ref?: string; teacher: string; mod?: string; school?: string; project: string;
  lines?: ReqLine[]; items?: string; qty?: number; category?: string;
  note: string; status: string; createdAt?: string;
  eta?: string; opsNote?: string; fulfilledAt?: string; // set by the operations team
}
interface Task { id?: string; teacher: string; title: string; detail: string; due: string; by: string; status: string; doneAt?: string; }
interface Material { id?: string; title: string; note: string; by: string; kind: 'link' | 'file'; link?: string; fileName?: string; size?: number; mime?: string; createdAt?: string; }
interface Notice { id?: string; title: string; body: string; by: string; createdAt: string; pinned?: boolean; fileId?: string; fileName?: string; fileSize?: number; }
interface Holiday { id?: string; date: string; name: string; }
interface SchoolEvent { id?: string; school: string; teacher: string; type: string; title: string; date: string; to?: string; note: string; createdAt: string; }
// Lesson plans are per grade per week (week = its Monday). Teachers report progress per grade weekly.
interface LessonPlan { id?: string; week: string; grade: string; topic: string; activity: string; addedAt?: string; }
interface PlanUpdate { id?: string; teacher: string; week: string; grade: string; status: 'Done' | 'Partly done' | 'Not done' | 'Not my class'; reason: string; at: string; late: boolean; }
interface VisitPlan { id?: string; mod: string; school: string; date: string; note?: string; teacher?: string; status: 'Planned' | 'Done'; }

// Every collection the store holds. Keys double as STORE.get() arguments.
interface Collections {
  schools: School[]; teachers: Teacher[]; moderators: string[];
  attendance: Attendance[]; feedback: Feedback[]; leaves: Leave[];
  requests: Requisition[]; tasks: Task[]; materials: Material[]; plans: VisitPlan[];
  notices: Notice[]; holidays: Holiday[]; events: SchoolEvent[];
  lessons: LessonPlan[]; planUpdates: PlanUpdate[];
}

interface Kit { id: string; name: string; items: [string, number | string][]; } // [component, standard kit qty]
interface Leader { name: string; title: string; top: boolean; } // top = sees coordinator scores, approves leave, loads lesson plans

interface AppConfig {
  geofenceMeters: number;
  expectedStart: string;
  opsSlaDays: number;
  workDays: number[];
  ayStart: string;
  leaders: Leader[];
  kits: Kit[];
  grades: string[];
  modules: string[];
  ratingScale: { v: number; label: string }[];
  pillars: { id: string; name: string; q: string[][] }[];
  critical: [string, string, string[]][];
  judgement: { independence: string[]; improvement: string[]; action: string[] };
  rag: { green: string; amber: string; red: string };
  leaveTypes: string[];
  eventTypes: string[];
}

interface Visit {
  school: string;
  teacher: string | null;
  ratings: Record<string, number | 'na'>;
  critical: Record<string, string>;
  judgement: Record<string, string>;
  step: 'pickTeacher' | 'form';
}
