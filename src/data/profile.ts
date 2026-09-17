// ─────────────────────────────────────────────
// About, education, communities and skills.
// ─────────────────────────────────────────────
import { archive, projects } from './projects';

export const about = {
  paragraphs: [
    "I'm a computer science student at Chitkara University, studying AI & Future Technologies.",
    'I like the place where the technical and the creative overlap: native software that talks to hardware, interfaces people enjoy using, and AI that stays careful about the people on the other side of it.',
  ],
  interests: ['AI & AI ethics', 'building things', 'frontend', 'design', 'creative coding', 'writing', 'unusual projects'],
};

export const education = {
  school: 'Chitkara University',
  degree: 'B.E. Computer Science Engineering',
  focus: 'AI & Future Technologies',
  graduation: '2029',
  cgpa: '9.1/10',
};

// Keep these short and true. Add real responsibilities once they're confirmed.
export const communities = [
  {
    name: 'EvolveAI',
    org: 'AI club, Chitkara University',
    role: 'Graphics member',
    line: 'Visual communication and creative work with EvolveAI.',
    tone: 'lilac',
  },
  {
    name: 'DebSoc',
    org: 'Debating Society, Chitkara University',
    role: 'Member',
    line: 'Exploring argument, communication and ideas.',
    tone: 'lemon',
  },
] as const;

// Skills come from confirmed project stacks. `from` is worked out automatically.
const groups: { title: string; items: string[] }[] = [
  {
    title: 'Native & systems',
    items: ['Swift', 'SwiftUI', 'macOS', 'Android', 'VideoToolbox', 'AVFoundation', 'H.264', 'ADB', 'Socket programming'],
  },
  { title: 'Web, backend & platforms', items: ['React', 'JavaScript', 'FastAPI', 'Firebase', 'Supabase', 'IVRS'] },
  { title: 'AI', items: ['LLMs', 'AI agents', 'Prompt engineering', 'Responsible AI'] },
  { title: 'Design', items: ['UI/UX', 'Figma'] },
];

const sources = [
  ...projects.map((p) => ({ name: p.name, stack: p.stack ?? [] })),
  ...archive.map((a) => ({ name: a.name, stack: a.stack ?? [] })),
];

export const skills = groups.map((g) => ({
  ...g,
  from: sources.filter((s) => s.stack.some((t) => g.items.includes(t))).map((s) => s.name),
}));
