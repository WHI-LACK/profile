/* ============================================================================
   content.js — all copy and catalogue data live here.
   This is the only file you need to edit to make the site yours.

   Every product needs:
     kind     'book' | 'film' | 'podcast'
     slug     deep-link id, used for /<slug> and history.replaceState
     title, author/rowLabel
     theme    { bg, fg, cover }  -> the two colours that take over the page
     cover    { rule, ink, paper, accent, motif }  -> procedural cover artwork
   ========================================================================== */
window.PRESS = window.PRESS || {};
(function () {
  'use strict';

  var SITE = {
    brand: 'Paper & Signal',
    tagline: 'Ideas worth printing',
    intro: {
      lead: 'We publish short books about how things actually work — infrastructure, maintenance, and the unglamorous machinery behind everyday life.',
      body: 'Some of our titles are new work, some are reissues that earned a second life. All of them are made to be read twice.',
      signup: 'Sign up for our newsletter to hear when something new comes off the press.'
    },
    nav: {
      film: 'Film',
      podcast: 'Podcast',
      about: 'About',
      back: 'Back to the catalogue'
    },
    footer: {
      heading: 'About Paper & Signal',
      close: 'Close',
      contact: 'hello@paperandsignal.example',
      privacy: 'Privacy Policy',
      cookies: 'Cookie Settings',
      social: [
        { label: 'Mastodon', href: '#', icon: 'mastodon' },
        { label: 'Instagram', href: '#', icon: 'instagram' }
      ],
      note: 'Paper & Signal may collect anonymous information about how this site is used. Read our '
    },
    controlPanel: {
      title: 'Stage controls',
      hint: 'Live values for the 3D stage. Useful when tuning the look.',
      copy: 'Copy values'
    },
    newCard: {
      title: 'New this season',
      sub: 'groove — out now',
      cta: 'Read the excerpt',
      ctaSuffix: '→',
      /* which product the card links to (slug from the list above) */
      slug: 'groove',
      dismiss: 'Dismiss'
    },
    /* Optional: POST the newsletter form here (Formspree, Buttondown, your own
       endpoint...). Leave null and the form runs in demo mode. */
    signupEndpoint: null
  };

  /* --------------------------------------------------------------------------
     Cover artwork rules — each one is a small generative drawing routine in
     covers.js. They are deliberately cheap: flat shapes, no per-pixel work.
     -------------------------------------------------------------------------- */
  var BOOKS = [
    {
      kind: 'book', slug: 'global', title: 'global', author: 'Nadia Brandt',
      theme: { bg: '#101C33', fg: '#E4C67C', cover: '#12294D' },
      cover: { rule: 'globe', ink: '#0B1B38', paper: '#12294D', accent: '#D9A441', motif: '#3C5A8A' },
      facts: [['Format', 'Hardcover, 152 × 229 mm'], ['Pages', '304'], ['Published', '2026']],
      about: 'A container leaves Shenzhen on a Tuesday and is unloaded in Rotterdam on a Thursday, and nobody who touches it reads the same paperwork. This is a book about the quiet machinery — standards, cables, tariffs, insurance — that lets one product be made in nine countries and still be called a single thing.',
      buy: { label: 'Get the book', links: [{ label: 'Publisher', href: '#' }, { label: 'Sample', href: '#' }] },
      authorBio: 'Nadia Brandt reports on trade and logistics from Rotterdam.',
      praise: [
        { body: 'Makes customs paperwork read like a thriller.', name: 'T. Okafor', role: 'Freight forwarder' },
        { body: 'The best book about globalisation that never once says globalisation.', name: 'L. Marsh', role: 'Economist' }
      ]
    },
    {
      kind: 'book', slug: 'groove', title: 'groove', author: 'Ari Nakamura',
      theme: { bg: '#141310', fg: '#EDE3CB', cover: '#EDE3CB' },
      cover: { rule: 'groove', ink: '#1A1917', paper: '#EDE3CB', accent: '#FF5A2B', motif: '#8C8577' },
      facts: [['Format', 'Hardcover + 30 audio examples'], ['Chapters', '9'], ['Published', '2026']],
      about: 'Groove is not what you play, it is when you play it. This book is about the small, deliberate lateness at the heart of every good rhythm — the push, the pull, the pocket — and about what happens to a performance when the grid stops leaving room for a human.',
      buy: { label: 'Get the book', links: [{ label: 'Publisher', href: '#' }, { label: 'Listen', href: '#' }] },
      authorBio: 'Ari Nakamura plays drums and writes about time.',
      praise: [
        { body: 'Reads like a hi-hat: precise, and impossible to sit still through.', name: 'J. Deslauriers', role: 'Bassist' },
        { body: 'The clearest explanation of pocket I have read, and it is not even about music.', name: 'R. Lindqvist', role: 'Editor' }
      ]
    },
    {
      kind: 'book', slug: 'growth', title: 'Growth', author: 'Elena Duarte',
      theme: { bg: '#F1EDE0', fg: '#21503A', cover: '#2C6B45' },
      cover: { rule: 'growth', ink: '#2C6B45', paper: '#F1EDE0', accent: '#C79A2E', motif: '#9DB39F' },
      facts: [['Format', 'Hardcover'], ['Cases', '9'], ['Published', '2026']],
      about: 'Growth is not a curve you ride; it is a set of constraints you remove, in the right order. Nine cases — a bakery, a bus route, a national grid — and the two or three decisions in each that actually compounded.',
      buy: { label: 'Get the book', links: [{ label: 'Publisher', href: '#' }, { label: 'Sample', href: '#' }] },
      authorBio: 'Elena Duarte studies small firms and teaches operations in Lisbon.',
      praise: [
        { body: 'Every founder I know needs this book and most of them will resist it.', name: 'P. Arnold', role: 'Operator' }
      ]
    },
    {
      kind: 'book', slug: 'geek', title: 'Geek', author: 'Sam Whitaker',
      theme: { bg: '#0A1220', fg: '#48D6E8', cover: '#0C1220' },
      cover: { rule: 'circuit', ink: '#22406B', paper: '#0C1220', accent: '#48D6E8', motif: '#8A94A6' },
      facts: [['Format', 'Hardcover'], ['Interviews', '27'], ['Published', '2026']],
      about: 'Every system that survives has someone behind it who reads the datasheet, labels the cable, and knows why the clock drifts. A field guide to the obsessions that quietly become infrastructure.',
      buy: { label: 'Get the book', links: [{ label: 'Publisher', href: '#' }, { label: 'Sample', href: '#' }] },
      authorBio: 'Sam Whitaker has kept a lab notebook since he was eleven.',
      praise: [
        { body: 'Finally a book that treats the person on the ladder as the protagonist.', name: 'D. Achterberg', role: 'Network engineer' }
      ]
    },
    {
      kind: 'book', slug: 'game', title: 'Game', author: 'Yuki Tanaka',
      theme: { bg: '#15161B', fg: '#F0E14A', cover: '#15171C' },
      cover: { rule: 'pixel', ink: '#232732', paper: '#15171C', accent: '#F0E14A', motif: '#5E6472' },
      facts: [['Format', 'Hardcover'], ['Games studied', '18'], ['Published', '2026']],
      about: 'Play is the cheapest simulator we have. What games — boards, fields, screens — actually teach about rules, feedback, and the strange pleasure of a fair loss.',
      buy: { label: 'Get the book', links: [{ label: 'Publisher', href: '#' }, { label: 'Sample', href: '#' }] },
      authorBio: 'Yuki Tanaka designs games and studies how people learn rules.',
      praise: [
        { body: 'Turns a lifetime of playing into a theory of practice.', name: 'M. Ferreira', role: 'Game designer' }
      ]
    },
    {
      kind: 'book', slug: 'the-second-curve', title: 'The Second Curve', author: 'Tomasz Bielak',
      theme: { bg: '#4D1A28', fg: '#EBADCB', cover: '#6D2B3F' },
      cover: { rule: 'circles', ink: '#4d1a28', paper: '#ecb9cd', accent: '#f3d9e4', motif: '#8e3450' },
      about: 'Organisations rarely die of one failure. They die of a success they could not stop repeating. A short argument, illustrated with eleven case studies.',
      buy: { label: 'Buy the book', links: [{ label: 'Publisher', href: '#' }, { label: 'Sample', href: '#' }] },
      authorBio: 'Tomasz Bielak teaches strategy and has advised three national rail operators.',
      praise: [
        { body: 'Sharp, short, and impossible to unsee.', name: 'Lena Fischer', role: 'Board director' }
      ]
    },
    {
      kind: 'book', slug: 'quiet-machinery', title: 'Quiet Machinery', author: 'Priya Raman',
      theme: { bg: '#143199', fg: '#dee6ff', cover: '#9a6e45' },
      cover: { rule: 'blueprint', ink: '#143199', paper: '#dbe3f8', accent: '#f0f4ff', motif: '#3f5fc4' },
      about: 'A field guide to the equipment that fails invisibly: pumps, valves, seals, and the maintenance logs that remember what people forget.',
      buy: { label: 'Buy the book', links: [{ label: 'Publisher', href: '#' }, { label: 'Sample', href: '#' }] },
      authorBio: 'Priya Raman is a reliability engineer in the water sector.',
      praise: [
        { body: 'Finally, a book that treats a valve as a character.', name: 'Owen Hart', role: 'Plant manager' }
      ]
    },
    {
      kind: 'book', slug: 'terms-of-art', title: 'Terms of Art', author: 'Hana Sato',
      theme: { bg: '#93935F', fg: '#333032', cover: '#231f20' },
      cover: { rule: 'botanical', ink: '#33302a', paper: '#e4dfc9', accent: '#a8a270', motif: '#6f6b45' },
      about: 'Forty words that mean something precise to a trade and nothing at all outside it. A lexicography of work.',
      buy: { label: 'Buy the book', links: [{ label: 'Publisher', href: '#' }, { label: 'Sample', href: '#' }] },
      authorBio: 'Hana Sato is a translator and terminologist.',
      praise: [
        { body: 'A dictionary you can read for pleasure.', name: 'Marcus Reed', role: 'Editor' }
      ]
    },
    {
      kind: 'book', slug: 'the-understudy', title: 'The Understudy', author: 'Colin Reyes',
      theme: { bg: '#96DCED', fg: '#2f2f2f', cover: '#7F8181' },
      cover: { rule: 'ripple', ink: '#7f8181', paper: '#e6f4f7', accent: '#2f2f2f', motif: '#c2e6ee' },
      about: 'The backup generator, the second crew, the spare part in a drawer: a book about redundancy, and why we keep resenting the things that save us.',
      buy: { label: 'Buy the book', links: [{ label: 'Publisher', href: '#' }, { label: 'Sample', href: '#' }] },
      authorBio: 'Colin Reyes writes about risk and teaches at a maritime academy.',
      praise: [
        { body: 'Makes redundancy feel like a moral question.', name: 'Sara Lindqvist', role: 'Safety researcher' }
      ]
    },
    {
      kind: 'book', slug: 'nothing-wasted', title: 'Nothing Wasted', author: 'Ada Nwosu',
      theme: { bg: '#442C25', fg: '#E48244', cover: '#2C3344' },
      cover: { rule: 'arcs', ink: '#2c3344', paper: '#f0d9c4', accent: '#e48244', motif: '#b9703c' },
      about: 'A materials recovery facility is the most honest mirror a city has. One year inside one, following everything you put in the bin.',
      buy: { label: 'Buy the book', links: [{ label: 'Publisher', href: '#' }, { label: 'Sample', href: '#' }] },
      authorBio: 'Ada Nwosu reports on waste, water and land use.',
      praise: [
        { body: 'Unsentimental and unforgettable.', name: 'Grace Amadi', role: 'Environmental journalist' }
      ]
    },
    {
      kind: 'book', slug: 'the-honest-ledger', title: 'The Honest Ledger', author: 'Felix Braun',
      theme: { bg: '#222222', fg: '#FF4445', cover: '#999C9F' },
      cover: { rule: 'concentric', ink: '#20242a', paper: '#d9dcdd', accent: '#ff4445', motif: '#9a9ea1' },
      about: 'Double-entry bookkeeping is a five-hundred-year-old technology for telling the truth slowly. A short history of the ledger, and of the people who cheat it.',
      buy: { label: 'Buy the book', links: [{ label: 'Publisher', href: '#' }, { label: 'Sample', href: '#' }] },
      authorBio: 'Felix Braun is an accountant and historian of commerce.',
      praise: [
        { body: 'Surprisingly funny. Genuinely useful.', name: 'Rita Alvarez', role: 'CFO' }
      ]
    },
    {
      kind: 'book', slug: 'signal-and-noise', title: 'Signal and Noise', author: 'R. Adeyemi',
      theme: { bg: '#353f54', fg: '#0AEB9A', cover: '#262D3A' },
      cover: { rule: 'waveform', ink: '#262d3a', paper: '#dfe6ef', accent: '#0aeb9a', motif: '#5f7ba8' },
      about: 'Every control room is a bet about which numbers matter. A study of alarms, thresholds and the slow human art of deciding what to ignore.',
      buy: { label: 'Buy the book', links: [{ label: 'Publisher', href: '#' }, { label: 'Sample', href: '#' }] },
      authorBio: 'R. Adeyemi designs alarm systems for aviation and rail.',
      praise: [
        { body: 'The best explanation of alert fatigue I have read.', name: 'Jonas Weber', role: 'Human factors lead' }
      ]
    }
  ];

  var FILM = {
    kind: 'film', slug: 'the-quiet-fleet', title: 'The Quiet Fleet', rowLabel: 'A film about the ships nobody watches',
    theme: { bg: '#222222', fg: '#ffd943', cover: '#111111' },
    cover: { rule: 'starfield', ink: '#111111', paper: '#ffd943', accent: '#ffffff', motif: '#3b4353' },
    facts: [['Runtime', '94 minutes'], ['Director', 'Sofia Marchetti'], ['Format', 'DCP · 1.85:1 · 5.1']],
    synopsis: 'Four months aboard a maintenance vessel in the North Sea, and the crews who keep a hundred unremarkable machines running. Filmed over two winters with a crew of three.',
    credits: [
      ['Directed by', 'Sofia Marchetti'],
      ['Produced by', 'Paper & Signal Films'],
      ['Cinematography', 'Erik Halvorsen'],
      ['Music', 'Nils Aaberg'],
      ['Runtime', '94 minutes']
    ],
    score: [
      { name: 'Slipping the Lines', length: '4:12' },
      { name: 'Watch 04:00 – 08:00', length: '3:28' },
      { name: 'Sea State 3', length: '5:40' },
      { name: 'The Long Middle', length: '6:02' },
      { name: 'Night Shift', length: '4:55' },
      { name: 'Home Port', length: '7:18' }
    ],
    reviews: [
      { body: 'A patient, beautiful film about the least photogenic industry on earth.', publication: 'The Continental Review', author: 'M. Archer' },
      { body: 'Marchetti films machinery the way other directors film faces.', publication: 'Documentary Quarterly', author: 'P. Nunes' }
    ],
    ticker: 'Now touring small cinemas · Watch the trailer · Score available on all platforms · '
  };

  var PODCAST = {
    kind: 'podcast', slug: 'half-life', title: 'Half-Life', rowLabel: 'A Paper & Signal podcast about maintenance',
    theme: { bg: '#201819', fg: '#f3e6d2', cover: '#1d1a15' },
    cover: { rule: 'venn', ink: '#241c16', paper: '#f3e6d2', accent: '#d9503f', motif: '#8c8577' },
    facts: [['Season', 'One, four episodes'], ['Recorded', '2025 – 2026'], ['Format', 'Stereo, 30 – 50 min']],
    subtitle: 'Conversations with the people who keep things running',
    about: 'Each episode is one object, one failure, and the person who stayed with it. Recorded in kitchens, workshops and one very cold substation.',
    seasons: [
      {
        name: 'Season one',
        episodes: [
          {
            title: 'The pump that outlived its maker', duration: '38 min', published: true,
            body: 'A municipal pump installed in 1961, the three engineers who have serviced it, and what happens to a machine when the drawings are lost.',
            notes: 'Recorded in the workshop of the Rijnland pumping station. Contains one long silence that we decided to keep.',
            guests: [['Joost van Dijk', 'Mechanical engineer, 31 years on the pumps']],
            /* Any episode with a transcript array gets a "Read the transcript"
               button. The lines below are placeholder copy — write your own. */
            transcript: [
              { who: 'Joost', text: 'The pump is older than everyone who maintains it. That is the whole problem, and also the whole joke.' },
              { who: 'Host', text: 'Who has the drawings?' },
              { who: 'Joost', text: 'Nobody. There is a folder with a coffee ring on it and a page missing. We rebuilt the tolerance by measuring the wear on the shaft.' },
              { who: 'Host', text: 'So the machine teaches you how to fix it.' },
              { who: 'Joost', text: 'Every time. You cannot rush that. You can only write down what you learned for the next person.' }
            ]
          },
          {
            title: 'Alarms nobody answers', duration: '42 min', published: true,
            body: 'A control room with eleven thousand configured alarms, and the operator who spent a decade reducing them to nine hundred.',
            notes: 'The full alarm list is reproduced in the show notes, unedited.',
            guests: [['R. Adeyemi', 'Alarm designer']]
          },
          {
            title: 'Two winters on the North Sea', duration: '51 min', published: true,
            body: 'The crew of the maintenance vessel from our film, on boredom, weather, and the etiquette of shared space.',
            notes: 'Recorded aboard, so you will hear the engines.',
            guests: [['Sofia Marchetti', 'Director'], ['Erik Halvorsen', 'Cinematographer']],
            transcript: [
              { who: 'Sofia', text: 'We shot for four months and the sea was the same colour in every frame. Erik kept saying: that is the film.' },
              { who: 'Erik', text: 'You stop noticing the weather and start noticing who is on watch. That is where the story moved to.' }
            ]
          },
          { title: 'The spare part in the drawer', duration: '36 min', published: false, body: '', notes: '', guests: [] }
        ]
      }
    ]
  };

  window.PRESS.SITE = SITE;
  window.PRESS.PRODUCTS = BOOKS.concat([FILM, PODCAST]);
})();
