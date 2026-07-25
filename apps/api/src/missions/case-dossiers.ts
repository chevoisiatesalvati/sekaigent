/** Canonical dossier pages for known regions / mission titles. */

export type CaseDoc = {
  id: string;
  kind: string;
  title: string;
  body: string;
};

export const HARBOR_CASE: CaseDoc[] = [
  {
    id: "h1",
    kind: "cable",
    title: "Night shift rota — Pier 7",
    body: "Clerk Voss clocks out at 01:10. Relief arrives 01:25. Manifests leave the cage only between those fifteen minutes when the seal book sits open on the counter.",
  },
  {
    id: "h2",
    kind: "rumor",
    title: "Dockside talk",
    body: "Someone claims the crate labels are painted over with fish oil brands. Half the pier believes it; the other half laughs. No one has checked under the oil.",
  },
  {
    id: "h3",
    kind: "ledger",
    title: "Wharfinger ledger (partial)",
    body: "Row 41B: 'dry goods / sealed / do not bribe gate'. Row 41C scratched out. A tip jar by the gate has three fresh coins — likely a red herring for anyone watching money instead of paper.",
  },
  {
    id: "h4",
    kind: "witness",
    title: "Watchman statement",
    body: "Saw a courier with a stamped envelope at 00:40 near the crane. Courier whistled. Watchman looked away. Envelope was empty when recovered later — decoy.",
  },
  {
    id: "h5",
    kind: "clipping",
    title: "Harbor Gazette scrap",
    body: "City council promises 'transparent shipping'. Article mentions bribes as 'local custom'. Irrelevant to tonight's cage; written three weeks ago.",
  },
  {
    id: "h6",
    kind: "photo_note",
    title: "Sketch: cage lock",
    body: "Padlock faces the water. Shadow from the crane arm covers the keyhole from 00:55 to 01:20. Stealth path exists if you stay in that shadow — no need for force.",
  },
];

export const EMBASSY_CASE: CaseDoc[] = [
  {
    id: "e1",
    kind: "cable",
    title: "Security detail brief",
    body: "Ambassador's courier rotates every forty minutes through the east gallery. Detail will escalate if any guest names the ambassador aloud in the foyer.",
  },
  {
    id: "e2",
    kind: "witness",
    title: "Coat check attendant",
    body: "Grey overcoat with a torn lining always returns at :15 past. Owner never tips. Attendant thinks they are staff. Torn lining hides a paper slip with a room number — signal.",
  },
  {
    id: "e3",
    kind: "rumor",
    title: "Garden party gossip",
    body: "Someone will 'dance with the ambassador's niece' as a password. That password was retired last month. Using it marks you as amateur.",
  },
  {
    id: "e4",
    kind: "ledger",
    title: "Visitor book (page 12)",
    body: "Three 'journalists' signed in after noon. Two left. One remains in the reading room with a camera that has no film — theatre, not tradecraft.",
  },
  {
    id: "e5",
    kind: "clipping",
    title: "Society column",
    body: "Champagne shortages at Neutral Embassy. Entirely irrelevant. Printed to fill space.",
  },
];

export const ARCHIVE_CASE: CaseDoc[] = [
  {
    id: "a1",
    kind: "ledger",
    title: "Ash wing index",
    body: "Shelf R-9 holds redacted ledgers. Night clerk walks R-aisle at :00 and :30. Between passes the aisle is empty for twelve minutes.",
  },
  {
    id: "a2",
    kind: "cable",
    title: "Internal memo",
    body: "Do not remove pages without the ash stamp. Forensic dust on R-9 pages will mark gloves. Bring cotton, not leather.",
  },
  {
    id: "a3",
    kind: "rumor",
    title: "Stack whisper",
    body: "A ghost in the west stacks steals ink. West stacks are sealed tonight — ignore.",
  },
  {
    id: "a4",
    kind: "photo_note",
    title: "Shelf sketch",
    body: "R-9 third binder from left has a bent corner. That binder holds the page. Force will tear the corner and leave a story.",
  },
];

export const REGION_CASE: Record<string, CaseDoc[]> = {
  harbor: HARBOR_CASE,
  embassy: EMBASSY_CASE,
  archive: ARCHIVE_CASE,
};

export const REGION_SOLUTION: Record<string, string> = {
  harbor:
    "Signal: night gap + crane shadow. Noise: fish oil rumor, tip jar, empty decoy envelope, old gazette.",
  embassy:
    "Signal: torn lining / room slip. Noise: retired dance password, empty-camera journalist, champagne column.",
  archive:
    "Signal: R-9 timing + cotton. Noise: west-stack ghost rumor.",
};
