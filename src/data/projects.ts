// ─────────────────────────────────────────────
// Projects: one source of truth for the floppy disks, the archive cards
// and every case-study page (/projects/<slug>).
//
// House rules:
// - Only write what's confirmed. Leave a field out (or an item list empty) when you don't
//   know it yet: the site shows a styled "details coming soon" instead of guessing.
// - Links only appear once they're filled in.
// - `todo` is a note to yourself. It's never shown on the site.
// ─────────────────────────────────────────────

export type Label =
  | 'Hackathon'
  | 'Recognition'
  | 'Ongoing'
  | 'AI'
  | 'Social impact'
  | 'Product design'
  | 'Native software'
  | 'Personal project'
  | 'Workshop';

export type DiskTone = 'tomato' | 'pink' | 'lilac' | 'lemon' | 'sky' | 'mint';

/** A case-study block. Leave `body`/`items`/`groups` out to show "details coming soon". */
export type CaseSection = {
  title: string;
  kind?: 'working' | 'planned' | 'history' | 'outcome';
  body?: string;
  items?: string[];
  groups?: { title: string; items: string[] }[];
  note?: string;
};

export type Project = {
  slug: string;
  name: string;
  earlierName?: string;
  type: string; // project type / status (the event is added after it automatically)
  oneLiner?: string;
  preview?: string; // short case-study teaser for the card
  labels: Label[];
  event?: string;
  outcome?: string[]; // confirmed results only
  role?: string; // confirmed contribution only
  stack?: string[]; // confirmed technologies only
  disk: { tone: DiskTone; scribble: string };
  sections: CaseSection[];
  links: { github?: string; demo?: string };
  todo?: string[];
};

export const projects: Project[] = [
  {
    slug: 'conduit',
    name: 'Conduit',
    earlierName: 'PUL',
    type: 'Personal project · native software',
    oneLiner: 'Wireless Android-to-Mac integration: mirror your phone, control it from your Mac, and use it as an input device.',
    preview:
      'Screen mirroring with hardware H.264 decoding, mouse, trackpad and keyboard control, two-way clipboard, phone audio on the Mac, and automatic reconnection.',
    labels: ['Personal project', 'Native software'],
    stack: ['Swift', 'SwiftUI', 'macOS', 'Android', 'VideoToolbox', 'H.264', 'AVFoundation', 'ADB', 'Socket programming'],
    disk: { tone: 'tomato', scribble: 'conduit' },
    sections: [
      {
        title: 'What it is',
        body: 'Conduit is the final direction of my Android-to-Mac device integration project. It grew out of PUL, the earlier working version, and Conduit is the name it carries forward.',
      },
      {
        title: 'Working features',
        kind: 'working',
        groups: [
          {
            title: 'Screen',
            items: [
              'Wireless Android-to-Mac screen mirroring',
              'Hardware H.264 screen decoding',
              'Phone screen can stay off while mirroring continues',
            ],
          },
          {
            title: 'Control',
            items: [
              'Mouse and trackpad control',
              'Tap, drag, swipe, scroll and long-press',
              'Mac keyboard input',
              'Phone as a trackpad / input device',
              'Haptic feedback and media-key support',
            ],
          },
          {
            title: 'Sharing',
            items: ['Two-way clipboard', 'Phone audio forwarded to Mac speakers', 'Live phone camera access on the Mac', 'IMU streaming'],
          },
          {
            title: 'Connection',
            items: ['Wi-Fi, no cable', 'Automatic reconnection after unplugging, sleeping or waking'],
          },
        ],
      },
      {
        title: 'Under the hood',
        items: ['Native macOS and Android components', 'Socket-based communication', 'Scrcpy protocol work and debugging'],
      },
      { title: 'Planned next', kind: 'planned' },
      {
        title: 'Earlier: PUL',
        kind: 'history',
        body: 'PUL was the earlier working version of this project, before it became Conduit.',
      },
    ],
    links: {},
    todo: [
      'Planned / future Conduit features',
      'What changed between PUL and Conduit',
      'Your role (e.g. solo build?)',
      'GitHub or demo link, screenshots or a video',
    ],
  },
  {
    slug: 'sahaas',
    name: 'Sahaas',
    type: 'Ongoing project',
    oneLiner:
      'A crowdsourced civic and mental-health support platform for people affected by atrocities and prolonged legal and social difficulties.',
    preview:
      'Built around continuous support rather than one-time reporting: reaching people across channels, noticing early signs of distress, and routing them toward counselling, legal aid, compensation and protection.',
    labels: ['Ongoing', 'Hackathon', 'Social impact', 'AI'],
    event: 'Smart India Hackathon',
    stack: ['React', 'FastAPI', 'Firebase', 'Supabase', 'LLMs', 'IVRS'],
    disk: { tone: 'pink', scribble: 'sahaas' },
    sections: [
      {
        title: 'Who it is for',
        body: 'People affected by atrocities often go through prolonged legal and social difficulties. Sahaas focuses on continuous support through that time, not only a one-time report.',
      },
      {
        title: 'What it is designed to do',
        note: 'Ongoing project: these are the ideas it is being built around, and not all of them are live yet.',
        items: [
          'Multi-channel access: web reporting, IVRS / helpline, and SMS, chatbot, mobile or web interfaces where applicable',
          'Early signal identification',
          'Distress and support-pattern analysis',
          'Routing people toward counselling, legal aid, compensation and protection',
          'Trauma-informed interaction design',
          'Continuous support rather than one-time reporting',
        ],
      },
      { title: 'My role' },
      { title: 'Where it is now', kind: 'outcome', body: 'Ongoing, connected to the Smart India Hackathon.' },
    ],
    links: {},
    todo: ['Your role / contribution', 'What is built so far vs. planned', 'SIH stage or result', 'Links or screenshots'],
  },
  {
    slug: 'mind-pop',
    name: 'Mind Pop',
    type: 'Hackathon project',
    oneLiner: 'An AI study tool with a neo-brutalist design.',
    preview: 'Selected in the top 15 of roughly 400 teams at HackNWin 2025, with a shoutout from GDG Jalandhar.',
    labels: ['Hackathon', 'Recognition', 'AI', 'Product design'],
    event: 'HackNWin Hackathon · CGC · 2025',
    outcome: ['Top 15 of ~400 teams', 'Shoutout from GDG Jalandhar'],
    disk: { tone: 'lilac', scribble: 'mind pop' },
    sections: [
      { title: 'The idea', body: 'An AI study tool, designed in a neo-brutalist style.' },
      { title: 'Features' },
      { title: 'My role' },
      {
        title: 'Outcome',
        kind: 'outcome',
        items: ['Selected in the top 15 teams out of approximately 400', 'Received a shoutout from GDG Jalandhar'],
      },
    ],
    links: {},
    todo: ['Feature list', 'Technologies', 'Your contribution', 'Links or screenshots'],
  },
  {
    slug: 'kinetic',
    name: 'Kinetic',
    type: 'Agentic AI hackathon project',
    labels: ['Hackathon', 'Recognition', 'AI'],
    outcome: ['₹6000 prize'],
    disk: { tone: 'lemon', scribble: 'kinetic' },
    sections: [
      { title: 'The idea' },
      { title: 'What it does' },
      { title: 'My role' },
      { title: 'Outcome', kind: 'outcome', items: ['₹6000 prize'] },
    ],
    links: {},
    todo: [
      'Exact hackathon name',
      'One-line description + short preview',
      'Features',
      'Technologies',
      'Your contribution',
      'What the ₹6000 prize was for (placement / track)',
      'Links or screenshots',
    ],
  },
  {
    slug: 'verifai',
    name: 'VerifAI',
    type: 'Hackathon project',
    oneLiner: 'An AI system for identifying and analysing bias in decision-making, such as job and loan applications.',
    labels: ['Hackathon', 'AI'],
    event: 'Hack Helix 6.0 · Thapar · ~100 teams',
    disk: { tone: 'sky', scribble: 'verifai' },
    sections: [
      {
        title: 'The idea',
        body: 'VerifAI is an AI system focused on identifying and analysing bias in decision-making systems, such as job applications, loan applications and similar decisions.',
      },
      { title: 'Features' },
      { title: 'My role' },
      { title: 'At the event', items: ['Competed among approximately 100 teams at Hack Helix 6.0, Thapar'] },
      { title: 'Result', kind: 'outcome' },
    ],
    links: {},
    todo: ['Final result', 'Features', 'Technologies', 'Your contribution', 'Links or screenshots'],
  },
  {
    slug: 'kinetic-city',
    name: 'Kinetic City',
    type: 'Hackathon project',
    labels: ['Hackathon'],
    event: 'Finvasia Hackathon',
    disk: { tone: 'mint', scribble: 'kinetic city' },
    sections: [{ title: 'The idea' }, { title: 'What it does' }, { title: 'My role' }, { title: 'Demo' }, { title: 'Outcome', kind: 'outcome' }],
    links: {},
    todo: ['Description / problem statement', 'Features', 'Technologies', 'Your contribution', 'Demo link', 'Outcome'],
  },
];

// ─────────────────────────────────────────────
// Archive: smaller things that shouldn't compete with the featured disks.
// ─────────────────────────────────────────────

export type ArchiveItem = {
  name: string;
  type: string;
  labels: Label[];
  description?: string;
  points?: string[];
  stack?: string[];
  links: { github?: string; demo?: string };
  todo?: string[];
};

export const archive: ArchiveItem[] = [
  {
    name: 'CommonGround',
    type: 'Community hobby platform',
    labels: ['Product design'],
    description: 'A platform designed to help people find communities and people who share their interests.',
    points: [
      'Hobby discovery, groups, mentors, workshops, chat and location exploration',
      'User research, responsive interface and design-system work',
    ],
    stack: ['React', 'JavaScript', 'UI/UX', 'Figma'],
    links: {},
  },
  {
    name: 'Student Support & Wellbeing AI Agent',
    type: 'Conversational AI assistant',
    labels: ['AI'],
    description: 'An assistant for students dealing with workload, deadlines and stress.',
    points: [
      'Focused on contextual prompting and responsible AI',
      'Considered privacy, context retention, emotional dependency and escalation boundaries',
    ],
    stack: ['AI agents', 'LLMs', 'Prompt engineering', 'Responsible AI'],
    links: {},
  },
  {
    name: 'Vibe to Viable study app',
    type: 'Workshop build',
    labels: ['Workshop', 'AI'],
    description: 'An AI study app made during the Vibe to Viable workshop.',
    links: {},
    todo: ['What it does', 'Technologies', 'Links'],
  },
];
