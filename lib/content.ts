export const img = (name: string) => `/images/${name}.jpg`

// Every image the journey shows; the preloader waits for all of them.
export const ALL_IMAGES = [
  'bahar',
  'darwaza',
  'lobby',
  'reception',
  'key',
  'corridor',
  'room1',
  'room2',
  'room3',
  'restaurant',
  'spa',
].map(img)

// Scene names for the on-screen counter, in timeline order. `at` is a label in the master timeline.
export const SCENES = [
  { at: 'hero', name: 'Arrival' },
  { at: 'darwaza', name: 'The Doors' },
  { at: 'lobby', name: 'Grand Lobby' },
  { at: 'reception', name: 'Reception' },
  { at: 'key', name: 'The Key' },
  { at: 'corridor', name: 'The Long Gallery' },
  { at: 'rooms', name: 'Suite 512' },
  { at: 'restaurant', name: 'Kashi Darbar' },
] as const

export const ROOMS = [
  {
    image: 'room1',
    kicker: 'Suite 512 · I',
    title: 'The Maharaja Bedchamber',
    lines: [
      'A hand-carved rosewood bed faces the river through a scalloped jharokha arch.',
      'Silk, velvet and lamplight, turned down each evening as the aarti begins.',
    ],
  },
  {
    image: 'room2',
    kicker: 'Suite 512 · II',
    title: 'Sunrise over the Ganga',
    lines: [
      'Draw the curtains at dawn and the ghats turn gold before your eyes.',
      'Your private balcony is the quietest seat in all of Varanasi.',
    ],
  },
  {
    image: 'room3',
    kicker: 'Suite 512 · III',
    title: 'The Marble Bath',
    lines: [
      'A freestanding tub in Makrana marble, with the river as your only neighbour.',
      'Rose petals, warm towels and oils blended fresh in our spa each morning.',
    ],
  },
] as const

export const DISHES = [
  { name: 'Galouti Kebab', note: 'on saffron sheermal' },
  { name: 'Dal Aurelia', note: 'slow-cooked overnight over coals' },
  { name: 'Banarasi Malaiyyo', note: 'winter saffron milk foam' },
  { name: 'Rabri & Rose', note: 'with Kashmiri pistachio' },
] as const

export const TIMINGS = [
  ['Breakfast', '7:00 – 10:30'],
  ['Lunch', '12:30 – 3:00'],
  ['Dinner', '7:00 – 11:00'],
] as const

export const STATS = [
  { value: 64, suffix: '', label: 'Suites & rooms' },
  { value: 84, suffix: '', label: 'Steps to the Ganga' },
  { value: 24, suffix: '/7', label: 'Butler service' },
] as const
