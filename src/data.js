// All imagery lives in /public/images and is served from the site root.
export const img = (name) => `/images/${name}.jpg`

export const NAV = [
  { id: 'arrival', label: 'Arrival' },
  { id: 'suite', label: 'Suite 512' },
  { id: 'dining', label: 'Dining' },
  { id: 'spa', label: 'Spa' },
  { id: 'reserve', label: 'Reserve' },
]

// The arrival journey, told in the order a guest walks it.
export const CHAPTERS = [
  {
    id: 'lobby',
    image: 'lobby',
    step: 'II',
    kicker: 'The Grand Lobby',
    title: 'Where the river light comes indoors',
    text:
      'Crystal chandeliers, hand-knotted carpets and a floor of Makrana marble that holds the glow of a thousand diyas. A marigold urli greets every arrival, refreshed at dawn.',
  },
  {
    id: 'reception',
    image: 'reception',
    step: 'III',
    kicker: 'Reception',
    title: 'A welcome, not a check-in',
    text:
      'No queues and no paperwork. Your host receives you beneath the gilded arch with saffron sherbet and a garland of jasmine while your suite is readied.',
  },
  {
    id: 'key',
    image: 'key',
    step: 'IV',
    kicker: 'The Key',
    title: 'Brass, silk and the number 512',
    text:
      'Every suite still opens with a hand-cast brass key and a silk tassel in palace maroon. Keep it after you leave; the house considers it a keepsake.',
  },
  {
    id: 'corridor',
    image: 'corridor',
    step: 'V',
    kicker: 'The Long Gallery',
    title: 'A corridor lit like a festival',
    text:
      'Carved arches, velvet drapes and lanterns every few paces line the walk to your door. Along the walls hang paintings of the ghats from the palace’s own collection.',
  },
]

export const SUITE = [
  {
    image: 'room1',
    label: 'The Bedchamber',
    text: 'A hand-carved rosewood bed faces the Ganga through a scalloped jharokha arch.',
  },
  {
    image: 'room2',
    label: 'Sunrise View',
    text: 'Draw the curtains at 5:40 am and the boats and temples of the ghats turn gold.',
  },
  {
    image: 'room3',
    label: 'The Bath',
    text: 'A freestanding tub set in marble, with the river as your only neighbour.',
  },
]

export const SUITE_FACTS = [
  ['92 m²', 'Suite'],
  ['King', 'Carved bed'],
  ['Ganga', 'Facing'],
  ['24 h', 'Butler'],
]

export const ROOM_TYPES = [
  { value: 'palace', label: 'Palace Room', price: 38000 },
  { value: 'ganga', label: 'Ganga View Suite', price: 62000 },
  { value: 'suite512', label: 'Maharaja Suite 512', price: 118000 },
]
