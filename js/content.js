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
      sub: 'Field Notes on Speed — out now',
      cta: 'Read the excerpt',
      ctaSuffix: '→',
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
      kind: 'book', slug: 'the-long-middle', title: 'The Long Middle', author: 'Mara Ellison',
      theme: { bg: '#292432', fg: '#DBC895', cover: '#292432' },
      cover: { rule: 'marble', ink: '#10262c', paper: '#e9dfc6', accent: '#e2803f', motif: '#7fc9bd' },
      /* Optional: any [label, value] pairs you want printed on the A4 sheet.
         Delete the line and the block simply disappears. */
      facts: [['Format', 'Hardcover, 152 × 229 mm'], ['Pages', '268'], ['First published', 'March 2026']],
      about: 'Every durable thing — a bridge, a standards body, a language — spends most of its life in the middle: past the founding story, well before the ending. This book is about that long, unglamorous centre.',
      buy: { label: 'Buy the book', links: [{ label: 'Publisher', href: '#' }, { label: 'Sample', href: '#' }] },
      authorBio: 'Mara Ellison writes about institutions and the people who keep them standing. She lives in Utrecht.',
      praise: [
        { body: 'A quiet, stubborn book about the work nobody photographs.', name: 'Ivan Petrov', role: 'Historian of engineering' },
        { body: 'Ellison makes maintenance read like a thriller.', name: 'Dana Whitfield', role: 'Author of Rebar' }
      ]
    },
    {
      kind: 'book', slug: 'field-notes-on-speed', title: 'Field Notes on Speed', author: 'Idris Kwan',
      theme: { bg: '#C1B676', fg: '#18185E', cover: '#1D1D62' },
      cover: { rule: 'halftone', ink: '#1d1d62', paper: '#d8cba0', accent: '#f0e6c8', motif: '#8f8fd8' },
      about: 'Speed is rarely a single number. It is a hundred small decisions — where the queue is, who owns the handoff, what gets measured. These are notes from eleven years of watching systems get faster and slower.',
      buy: { label: 'Buy the book', links: [{ label: 'Publisher', href: '#' }, { label: 'Sample', href: '#' }] },
      authorBio: 'Idris Kwan is an operations researcher who has spent his career inside ports, hospitals and parcel networks.',
      praise: [
        { body: 'Treats latency as a human problem, which it is.', name: 'Ruth Okafor', role: 'Systems engineer' }
      ]
    },
    {
      kind: 'book', slug: 'keeping-the-lights-on', title: 'Keeping the Lights On', author: 'Nadia Oyelaran',
      theme: { bg: '#6E665B', fg: '#DFC78E', cover: '#6E665B' },
      cover: { rule: 'topo', ink: '#4a4437', paper: '#ded2b6', accent: '#c9a765', motif: '#8e8467' },
      about: 'Eleven people, one substation, and a winter that would not end. A first-hand account of the grid as a human institution rather than a diagram.',
      buy: { label: 'Buy the book', links: [{ label: 'Publisher', href: '#' }, { label: 'Sample', href: '#' }] },
      authorBio: 'Nadia Oyelaran is a former transmission engineer turned reporter.',
      praise: [
        { body: 'The best book on infrastructure written this decade.', name: 'Peter Lund', role: 'Grid operator' }
      ]
    },
    {
      kind: 'book', slug: 'ninety-percent-of-everything', title: 'Ninety Percent of Everything', author: 'Tomás Ferreira',
      theme: { bg: '#0d121f', fg: '#D0D1D4', cover: '#0d121f' },
      cover: { rule: 'contour', ink: '#0d121f', paper: '#c9cbce', accent: '#e6e7ea', motif: '#3e4a63' },
      about: 'Shipping moves the modern world on a schedule nobody outside the industry can see. A tour of ports, flags of convenience, and the economics of an industry that runs on thin margins and thick paperwork.',
      buy: { label: 'Buy the book', links: [{ label: 'Publisher', href: '#' }, { label: 'Sample', href: '#' }] },
      authorBio: 'Tomás Ferreira spent nine years as a ship agent before writing this book.',
      praise: [
        { body: 'Reads like a thriller and cites like a paper.', name: 'Aiko Tanaka', role: 'Logistics editor' }
      ]
    },
    {
      kind: 'book', slug: 'slow-company', title: 'Slow Company', author: 'June Park',
      theme: { bg: '#E2E2E2', fg: '#504F4F', cover: '#6D2B3F' },
      cover: { rule: 'stripes', ink: '#6d2b3f', paper: '#efe9e6', accent: '#c76b7f', motif: '#e2c3c8' },
      about: 'What happens when a company decides not to grow? Fifty interviews with owners who chose a ceiling on purpose — and what that choice cost them.',
      buy: { label: 'Buy the book', links: [{ label: 'Publisher', href: '#' }, { label: 'Sample', href: '#' }] },
      authorBio: 'June Park writes about small business and writes a newsletter read by 40,000 owners.',
      praise: [
        { body: 'The most useful business book I have read in years.', name: 'Devon Marsh', role: 'Founder, Hallam Tools' }
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
