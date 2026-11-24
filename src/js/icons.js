// Thin line icons (24x24, stroke-based)
const wrap = (body, size = 22) =>
  `<svg class="ico" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round">${body}</svg>`;

const P = {
  map: '<path d="M3 6.5l6-2.5 6 2.5 6-2.5v13.5l-6 2.5-6-2.5-6 2.5z"/><path d="M9 4v13.5M15 6.5V20"/>',
  library: '<circle cx="12" cy="12" r="8.5"/><path d="M12 3.5v3M12 17.5v3M3.5 12h3M17.5 12h3"/><circle cx="12" cy="12" r="3"/>',
  mission: '<path d="M4 20V4"/><path d="M4 5h12l-2.5 3.5L16 12H4"/><circle cx="18" cy="18" r="2"/>',
  saved: '<path d="M6.5 3.5h11v17l-5.5-4-5.5 4z"/>',
  settings: '<circle cx="12" cy="12" r="3"/><path d="M12 2.5v3M12 18.5v3M2.5 12h3M18.5 12h3M5.3 5.3l2.1 2.1M16.6 16.6l2.1 2.1M5.3 18.7l2.1-2.1M16.6 7.4l2.1-2.1"/>',
  logo: '<path d="M2.5 14c2-2 3.5-2 5.5 0s3.5 2 5.5 0 3.5-2 5.5 0"/><path d="M2.5 18.5c2-2 3.5-2 5.5 0s3.5 2 5.5 0 3.5-2 5.5 0"/><circle cx="12" cy="7" r="3.5"/>',
  depth: '<path d="M12 3v16"/><path d="M7 14l5 5 5-5"/><path d="M4 3h16"/>',
  pressure: '<circle cx="12" cy="13" r="8"/><path d="M12 13l4-4"/><path d="M9 3h6"/>',
  temp: '<path d="M10 4a2 2 0 014 0v10a4 4 0 11-4 0z"/><path d="M12 10v6"/>',
  sub: '<path d="M3 13c0-2.5 3-4 9-4s9 1.5 9 4-3 4-9 4-9-1.5-9-4z"/><path d="M10 9V6h4v3"/><circle cx="15" cy="13" r="1.2"/>',
  progress: '<circle cx="12" cy="12" r="8.5"/><path d="M12 3.5A8.5 8.5 0 0120.5 12"/>',
  timeline: '<path d="M3 12h18"/><circle cx="6" cy="12" r="2"/><circle cx="12" cy="12" r="2"/><circle cx="18" cy="12" r="2"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  minus: '<path d="M5 12h14"/>',
  target: '<circle cx="12" cy="12" r="7"/><path d="M12 2v4M12 18v4M2 12h4M18 12h4"/>',
  layers: '<path d="M12 3l9 5-9 5-9-5z"/><path d="M3 13l9 5 9-5"/>',
  close: '<path d="M6 6l12 12M18 6L6 18"/>',
  info: '<circle cx="12" cy="12" r="8.5"/><path d="M12 11v5M12 8h.01"/>',
  rotate: '<path d="M20 12a8 8 0 11-2.3-5.7"/><path d="M20 4v4h-4"/>',
  bookmark: '<path d="M6.5 3.5h11v17l-5.5-4-5.5 4z"/>',
  search: '<circle cx="11" cy="11" r="6.5"/><path d="M20 20l-4.2-4.2"/>',
  creature: '<path d="M4 12c3-5 9-5 13 0-4 5-10 5-13 0z"/><path d="M17 12l4-3v6z"/><circle cx="8.5" cy="11.3" r=".8"/>',
  station: '<path d="M5 15a7 7 0 0114 0"/><path d="M3 15h18M7 15v5M17 15v5M12 8V4"/>',
  site: '<path d="M8 20l2-9h4l2 9"/><path d="M10 7c0-2 4-2 4-4M12 11c0-2 3-2 3-4"/>',
  clock: '<circle cx="12" cy="12" r="8.5"/><path d="M12 7v5l3 2"/>',
  signal: '<path d="M5 19v-3M9.5 19v-6M14 19v-9M18.5 19V5"/>',
  battery: '<rect x="3" y="7.5" width="16" height="9" rx="1.5"/><path d="M21 10.5v3"/>',
  user: '<circle cx="12" cy="8" r="3.5"/><path d="M5 20c1-4 4-5.5 7-5.5s6 1.5 7 5.5"/>',
  trash: '<path d="M4.5 7h15M9 7V4.5h6V7M6.5 7l1 13h9l1-13"/>',
  arrow: '<path d="M5 12h14M13 6l6 6-6 6"/>',
  check: '<path d="M5 12.5l4.5 4.5L19 7.5"/>',
  min: '<path d="M6 12h12"/>',
  max: '<rect x="6" y="6" width="12" height="12" rx="1"/>',
  reset: '<path d="M4 12a8 8 0 102.3-5.7"/><path d="M4 4v4h4"/>',
  eye: '<path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12z"/><circle cx="12" cy="12" r="3"/>'
};

export const icon = (name, size) => wrap(P[name] || P.info, size);
