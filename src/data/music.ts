// ─────────────────────────────────────────────
// The record collection
//
// ADDING A RECORD: copy a block, fill in what you know, drop it in the list.
// Anything you leave out is simply not shown — nothing is invented for you.
//
// COVER ART: put the image in src/assets/covers/ and import it at the top,
// then set `cover`. Until then the sleeve is typeset by hand, which is honest
// and still looks like a real sleeve.
//
// AUDIO: no audio files ship with the site (they'd be someone else's recordings),
// so `listen` is where the record actually plays. The turntable spins for real;
// it never pretends to be playing sound.
// ─────────────────────────────────────────────
import type { ImageMetadata } from 'astro';

export type Record = {
  id: string;
  title: string;
  artist: string;
  album?: string;
  year?: string;
  genre?: string;
  /** Why this one. Shown under the deck when the record is on. */
  note?: string;
  moods?: string[];
  cover?: ImageMetadata;
  /** Where to actually listen. Only shown once filled in. */
  listen?: { spotify?: string; apple?: string; youtube?: string; other?: { label: string; href: string } };
  /** The sleeve's paper colour and the record label's colour, used until a cover exists. */
  sleeve: { paper: string; ink: string; label: string };
  todo?: string[];
};

export const records: Record[] = [
  {
    id: 'sweet',
    title: 'Sweet',
    artist: 'Cigarettes After Sex',
    sleeve: { paper: '#e8e4f3', ink: '#2a2440', label: '#b9a6fb' },
    todo: ['album + year', 'genre', 'why you love it', 'mood tags', 'streaming link', 'cover image'],
  },
  {
    id: 'crane-wives',
    title: '',
    artist: 'The Crane Wives',
    sleeve: { paper: '#f7e2cf', ink: '#4a2c1c', label: '#ff8a63' },
    todo: ['which song', 'album + year', 'genre', 'why you love it', 'mood tags', 'streaming link', 'cover image'],
  },
];

/** The handwritten line in the corner of the room. */
export const roomNote = 'things I listen to when my brain gets too loud.';
export const deckLabel = 'currently on repeat';
