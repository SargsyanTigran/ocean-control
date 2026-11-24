// ---------------------------------------------------------------------------
// Simulated data for Ocean Control.
// Map coordinates are normalised (0..1) across the survey area.
// Descriptive copy is Lorem Ipsum placeholder text.
// ---------------------------------------------------------------------------

export const LOREM = {
  short: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit.',
  medium: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.',
  long: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.',
  alt: 'Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident.'
};

export const EXPEDITION = {
  code: 'EXP-0427',
  name: 'Abyssal Survey Lorem',
  vessel: 'RV Meridian',
  region: 'Sector Ipsum · Trench 04',
  start: '2025-03-02',
  end: '2025-04-18',
  day: 24,
  totalDays: 47,
  lead: 'Dr. Lorem Ipsum',
  bounds: { lat: [-12.8, -9.4], lon: [141.2, 146.6] },
  summary: LOREM.long,
  objectives: [
    { id: 'o1', label: 'Map trench floor · lorem sector A', done: true },
    { id: 'o2', label: 'Deploy seabed station Aurora', done: true },
    { id: 'o3', label: 'Sample hydrothermal vent field', done: true },
    { id: 'o4', label: 'Catalogue bioluminescent species', done: false, progress: 0.62 },
    { id: 'o5', label: 'Reach 6,000 m survey depth', done: false, progress: 0.35 },
    { id: 'o6', label: 'Recover all vehicles & data', done: false, progress: 0 }
  ]
};

// Expedition stages (timeline)
export const STAGES = [
  { id: 's1', name: 'Launch', code: 'ST-01', start: 'Mar 02', end: 'Mar 05', status: 'done', progress: 1, detail: LOREM.short },
  { id: 's2', name: 'Transit', code: 'ST-02', start: 'Mar 05', end: 'Mar 09', status: 'done', progress: 1, detail: LOREM.short },
  { id: 's3', name: 'Shelf Survey', code: 'ST-03', start: 'Mar 09', end: 'Mar 16', status: 'done', progress: 1, detail: LOREM.short },
  { id: 's4', name: 'Station Deploy', code: 'ST-04', start: 'Mar 16', end: 'Mar 21', status: 'done', progress: 1, detail: LOREM.short },
  { id: 's5', name: 'Abyssal Dive', code: 'ST-05', start: 'Mar 21', end: 'Apr 02', status: 'active', progress: 0.46, detail: LOREM.medium },
  { id: 's6', name: 'Trench Descent', code: 'ST-06', start: 'Apr 02', end: 'Apr 11', status: 'pending', progress: 0, detail: LOREM.short },
  { id: 's7', name: 'Recovery', code: 'ST-07', start: 'Apr 11', end: 'Apr 18', status: 'pending', progress: 0, detail: LOREM.short }
];

// Research submarines: each follows a looping route across the map.
export const SUBMARINES = [
  {
    id: 'sub-nautilus', type: 'vehicle', model: 'submarine', name: 'Nautilus-7', klass: 'Deep Submersible · Class IV',
    status: 'Diving', color: '#5ce1ff', crew: 3, maxDepth: 6500,
    battery: 0.78, hull: 0.96, oxygen: 0.84, speed: 2.4,
    baseDepth: 3820, depthSwing: 260, baseTemp: 2.1,
    route: [[0.30, 0.34], [0.40, 0.30], [0.52, 0.36], [0.58, 0.48], [0.50, 0.58], [0.38, 0.55], [0.30, 0.46]],
    routeSpeed: 0.010,
    description: LOREM.long
  },
  {
    id: 'sub-triton', type: 'vehicle', model: 'rov', name: 'Triton-2', klass: 'Survey ROV · Tethered',
    status: 'Surveying', color: '#7cf2c8', crew: 0, maxDepth: 4000,
    battery: 0.54, hull: 0.91, oxygen: null, speed: 1.6,
    baseDepth: 2140, depthSwing: 140, baseTemp: 3.4,
    route: [[0.66, 0.22], [0.76, 0.26], [0.82, 0.38], [0.74, 0.44], [0.64, 0.36]],
    routeSpeed: 0.013,
    description: LOREM.medium
  },
  {
    id: 'sub-abyss', type: 'vehicle', model: 'submarine-b', name: 'Abyss-Rover', klass: 'Autonomous AUV',
    status: 'Ascending', color: '#a9b8ff', crew: 0, maxDepth: 6000,
    battery: 0.31, hull: 0.88, oxygen: null, speed: 3.1,
    baseDepth: 5160, depthSwing: 380, baseTemp: 1.6,
    route: [[0.18, 0.66], [0.28, 0.74], [0.42, 0.78], [0.56, 0.72], [0.46, 0.66], [0.30, 0.62]],
    routeSpeed: 0.008,
    description: LOREM.medium
  }
];

// Underwater stations
export const STATIONS = [
  { id: 'st-aurora', type: 'station', model: 'station', name: 'Aurora Base', klass: 'Seabed Habitat', x: 0.46, y: 0.44, depth: 3240, status: 'Online', power: 0.92, crew: 6, description: LOREM.long },
  { id: 'st-halcyon', type: 'station', model: 'relay', name: 'Halcyon Relay', klass: 'Acoustic Relay', x: 0.72, y: 0.31, depth: 1980, status: 'Online', power: 0.71, crew: 0, description: LOREM.medium },
  { id: 'st-caldera', type: 'station', model: 'probe', name: 'Caldera Probe', klass: 'Sensor Array', x: 0.24, y: 0.70, depth: 4870, status: 'Standby', power: 0.44, crew: 0, description: LOREM.medium }
];

// Discovered creatures and sites
export const CREATURES = [
  {
    id: 'cr-lumen', type: 'creature', model: 'jellyfish', name: 'Lumen Medusa', latin: 'Loremia lucida',
    x: 0.36, y: 0.40, depth: 1240, size: '0.4 m', rarity: 'Uncommon', biolum: true,
    discovered: '2025-03-12', by: 'Nautilus-7', temp: 4.1, status: 'Catalogued', description: LOREM.long
  },
  {
    id: 'cr-angler', type: 'creature', model: 'anglerfish', name: 'Ember Angler', latin: 'Ipsumichthys ignis',
    x: 0.54, y: 0.52, depth: 3710, size: '0.22 m', rarity: 'Rare', biolum: true,
    discovered: '2025-03-23', by: 'Nautilus-7', temp: 2.2, status: 'Under study', description: LOREM.long
  },
  {
    id: 'cr-squid', type: 'creature', model: 'squid', name: 'Abyssal Squid', latin: 'Dolorteuthis magna',
    x: 0.40, y: 0.74, depth: 5020, size: '3.8 m', rarity: 'Very rare', biolum: false,
    discovered: '2025-03-27', by: 'Abyss-Rover', temp: 1.5, status: 'Observed', description: LOREM.long
  },
  {
    id: 'cr-nautilus', type: 'creature', model: 'nautilus', name: 'Spiral Nautilus', latin: 'Ametoceras spira',
    x: 0.78, y: 0.40, depth: 640, size: '0.18 m', rarity: 'Common', biolum: false,
    discovered: '2025-03-10', by: 'Triton-2', temp: 8.6, status: 'Catalogued', description: LOREM.medium
  },
  {
    id: 'cr-vent', type: 'site', model: 'vent', name: 'Vent Garden', latin: 'Hydrothermal field',
    x: 0.60, y: 0.62, depth: 2890, size: '120 m', rarity: 'Site', biolum: false,
    discovered: '2025-03-19', by: 'Triton-2', temp: 38.4, status: 'Sampled', description: LOREM.long
  },
  {
    id: 'cr-ribbon', type: 'creature', model: 'eel', name: 'Ribbon Eel', latin: 'Consectetur vitta',
    x: 0.26, y: 0.52, depth: 2310, size: '1.1 m', rarity: 'Uncommon', biolum: true,
    discovered: '2025-03-25', by: 'Nautilus-7', temp: 2.9, status: 'Under study', description: LOREM.medium
  }
];

export const CREW = [
  { name: 'Dr. Lorem Ipsum', role: 'Expedition Lead', station: 'RV Meridian' },
  { name: 'A. Dolor', role: 'Pilot · Nautilus-7', station: 'Nautilus-7' },
  { name: 'S. Amet', role: 'Marine Biologist', station: 'Aurora Base' },
  { name: 'C. Adipiscing', role: 'Geophysicist', station: 'RV Meridian' },
  { name: 'E. Tempor', role: 'ROV Operator', station: 'RV Meridian' },
  { name: 'M. Aliqua', role: 'Systems Engineer', station: 'Aurora Base' }
];

export const LOGS = [
  { t: '06:42', who: 'Nautilus-7', msg: 'Lorem ipsum dolor sit amet · descent to 3,800 m' },
  { t: '05:18', who: 'Aurora Base', msg: 'Consectetur adipiscing elit · power cycle complete' },
  { t: '03:55', who: 'Abyss-Rover', msg: 'Sed do eiusmod tempor · sonar sweep logged' },
  { t: '01:07', who: 'Triton-2', msg: 'Ut enim ad minim veniam · vent sample stored' },
  { t: '23:30', who: 'RV Meridian', msg: 'Duis aute irure dolor · weather window holds' }
];

// Depth profile for the mission chart (day → max depth in metres)
export const DEPTH_PROFILE = [
  0, 120, 340, 300, 820, 1240, 980, 1500, 1880, 2100, 1960, 2450, 2890, 2600,
  3050, 3240, 3100, 3480, 3710, 3560, 3900, 4380, 4870, 5020
];

// Pull the survey layout toward the centre of the map so markers sit in the
// open area between the floating panels.
const fit = ([x, y]) => [0.48 + (x - 0.5) * 0.68, 0.47 + (y - 0.5) * 0.8];
SUBMARINES.forEach((s) => { s.route = s.route.map(fit); });
[...STATIONS, ...CREATURES].forEach((o) => { [o.x, o.y] = fit([o.x, o.y]); });

export const ALL_OBJECTS = () => [...SUBMARINES, ...STATIONS, ...CREATURES];
export const findObject = (id) => ALL_OBJECTS().find((o) => o.id === id);
