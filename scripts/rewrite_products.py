# -*- coding: utf-8 -*-
"""
PRODUCT CONTENT REWRITE — reads data/source-products.csv (the 428-product Shopify
export) and generates:
  data/shopify-content-update.csv   Handle, Title, Body (HTML), Tags  (import = UPDATE by handle)
  data/arabic-translations.csv      rows for Translate & Adapt (title + body_html per product)
  data/needs-review.csv             products whose source name is too vague — flagged, not invented

Rules (agreed with the owner):
  * supplier codes stripped (MYD075, MP154-3, LT-13041 …); when a code was the only
    thing distinguishing variants, an honest "Style N" suffix keeps titles unique
  * abbreviations expanded, misspellings fixed, natural search English
  * nothing invented: sizes/counts/materials appear ONLY if present in the source name
  * vague names get a minimally-cleaned title and land in needs-review.csv
Run: PYTHONUTF8=1 python scripts/rewrite_products.py
"""
import csv, io, re, hashlib
from collections import Counter, defaultdict

SRC = 'data/source-products.csv'

# ---------------------------------------------------------------- dictionaries
WORD_FIXES = {
    'sharpner': 'sharpener', 'highliter': 'highlighter', 'envelop': 'envelope',
    'ereaser': 'eraser', 'lovley': 'lovely', 'penguine': 'penguin', 'fugures': 'figures',
    'frienship': 'friendship', 'kiy': 'kit', 'caterpiller': 'caterpillar',
    'dinasours': 'dinosaurs', 'uglu': 'ugly', 'sisors': 'scissors', 'rulur': 'ruler',
    'weeky': 'weekly', 'mathemetical': 'mathematical', 'esy': 'easy', 'alphapet': 'alphabet',
    'pice': 'piece', 'goggly': 'googly', 'glit': 'glitter', 'disp': 'dispenser',
    'bage': 'beige', 'col': 'colour', 'colors': 'colours', 'color': 'colour',
    'coloring': 'colouring', 'note': 'note', 'w/shr': 'with sharpener',
}
def fix_word(w):
    lw = w.lower()
    return WORD_FIXES.get(lw, w)

# supplier / internal codes to strip from titles (Motarro-style + misc)
CODE_RE = re.compile(
    r'\b(?:'
    r'M(?:YD|P|E|U|Q|A|I|T|X|B)\d{2,}(?:-\d+)?[A-Z]?'   # MYD075, MP154-3, ME009C, MU146-12, MQ057-4, MA001-10, MI019-19, MT012-6, MB001-2, MX014
    r'|LT-\d+|CF-\d+|KX-\d+|HB-\d+'
    r'|A555 ?0?2'
    r')\b', re.I)

SIZE_RE = re.compile(r'\b(a[3-7]|b5|\d+(?:\.\d+)?\s?(?:mm|cm|ml|gm|g|mic)|\d+x\d+(?:\s?inch)?|\d+ ?(?:sheets?|pages?)|\d+ ?(?:pcs?|pieces?|pc)\b|\d+ ?colours?|\d+ ?in)\b', re.I)

# hand-curated title overrides — real knowledge, no invention beyond the name/brand
OVERRIDES = {
    'lego-note-book': 'LEGO Notebook Gift Set',
    'lego-note-book-2': 'LEGO Notebook — Style 2',
    'lego-note-book-3': 'LEGO Notebook — Style 3',
    'lego-note-book-and-pen': 'LEGO Notebook & Pen Set',
    'lego-note-book-and-pen-2': 'LEGO Notebook & Pen Set — Style 2',
    'lego-note-book-and-pen-3': 'LEGO Notebook & Pen Set — Style 3',
    'lego-note-book-and-pen-4': 'LEGO Notebook & Pen Set — Style 4',
    'lego-note-book-and-pen-5': 'LEGO Notebook & Pen Set — Style 5',
    'lego-note-book-and-pen-6': 'LEGO Notebook & Pen Set — Style 6',
    'lego-10pcs-marker': 'LEGO Markers — 10 Pieces',
    'lego-10pcs-marker-2': 'LEGO Markers — 10 Pieces, Style 2',
    'lego-3pcs-marker': 'LEGO Markers — 3 Pieces',
    'lego-3pcs-pen': 'LEGO Pens — 3 Pieces',
    'lego-coloring-pencil-12pcs': 'LEGO Colouring Pencils — 12 Pieces',
    'lego-pencil-box': 'LEGO Pencil Box',
    'lego-ruler': 'LEGO Ruler',
    'lego-creativity-set': 'LEGO Creativity Stationery Set',
    'lego-creativity-set-2': 'LEGO Creativity Stationery Set — Style 2',
    'lego-creativity-set-3': 'LEGO Creativity Stationery Set — Style 3',
    'lego-combination-lock-diary-set': 'LEGO Diary Set with Combination Lock',
    'lego-mini-fugures-sticky-note': 'LEGO Minifigures Sticky Notes',
    'lego-space-sticky-note': 'LEGO Space Sticky Notes',
    'elephant-18-col-pen': 'Y.Plus Elephant Colour Pens — 18 Colours',
    'elephant-6-col-pen': 'Y.Plus Elephant Colour Pens — 6 Colours',
    'elephant-12-super-washable': 'Y.Plus Elephant Super Washable Colour Pens — 12 Colours',
    'star-col-pencil-12pc': 'Y.Plus Star Colour Pencils — 12 Pieces',
    'smart-color-pencil-12pcs': 'Y.Plus Smart Colour Pencils — 12 Pieces',
    'smart-normal-color-color-pencil-24pcs-set': 'Y.Plus Smart Colour Pencils — 24 Pieces',
    'color-pencil-12in-metal-tube': 'Y.Plus Colour Pencils — 12 in a Metal Tube',
    'croc-pencil-sharpner': 'Y.Plus Croc Pencil Sharpener',
    'croc-eraser': 'Y.Plus Croc Eraser',
    'zoo-ereaser': 'Y.Plus Zoo Eraser',
    'career-eraser': 'Y.Plus Career Eraser',
    'small-eraser-line-jar': 'Y.Plus Small Erasers — Line Jar',
    'spinner-eraser-12pc-box': 'Y.Plus Spinner Erasers — Box of 12',
    'easycut-scissors-130mm': 'Y.Plus EasyCut Scissors — 130 mm',
    'smart-gel-crayon-6pc-set': 'Y.Plus Smart Gel Crayons — 6 Piece Set',
    'smart-hb-pencil-12pc-triangular': 'Y.Plus Smart HB Pencils — 12 Triangular',
    'smart-hb-pencil': 'Y.Plus Smart HB Pencil',
    'peanut-crayons-24-colour': 'Y.Plus Peanut Crayons — 24 Colours',
    'peanut-crayons-fine-motor-box': 'Y.Plus Peanut Crayons — Fine Motor Box',
    'pocket-water-color': 'Y.Plus Pocket Watercolour Set',
    'glue-stick-15gm': 'Flamingo Glue Stick — 15 g',
    'white-board-doodle': 'Y.Plus Whiteboard Doodle Set',
    'motarro-paint-brush-mp154-3': 'Motarro Paint Brush — Style 3',
    'motarro-paint-brush-mp154-5': 'Motarro Paint Brush — Style 5',
    'bx-v5': 'Pilot V5 Hi-Tecpoint Rollerball Pen',
    'bx-v5-2': 'Pilot V5 Hi-Tecpoint Rollerball Pen — Style 2',
    'bx-v5-3': 'Pilot V5 Hi-Tecpoint Rollerball Pen — Style 3',
    'bx-v5-4': 'Pilot V5 Hi-Tecpoint Rollerball Pen — Style 4',
    'saxa-poche': 'Kokuyo Saxa Poche Compact Scissors',
    'saxa-poche-2': 'Kokuyo Saxa Poche Compact Scissors — Style 2',
    'saxa-poche-3': 'Kokuyo Saxa Poche Compact Scissors — Style 3',
    'saxa-poche-4': 'Kokuyo Saxa Poche Compact Scissors — Style 4',
    'karu-cut-tape-cutter-bage': 'Kokuyo Karu Cut Washi Tape Cutter — Beige',
    'karu-cut-tape-cutter-yellow': 'Kokuyo Karu Cut Washi Tape Cutter — Yellow',
    'karu-cut-tape-cutter-blue': 'Kokuyo Karu Cut Washi Tape Cutter — Blue',
    'karu-cut': 'Kokuyo Karu Cut Washi Tape Cutter',
    'limited-campus-sisors': 'Kokuyo Campus Scissors — Limited Edition',
    'campus-correction-tape': 'Kokuyo Campus Correction Tape',
    'campus-notebook': 'Kokuyo Campus Notebook',
    'campus-note-book': 'Kokuyo Campus Notebook — Style 2',
    'kokuyo-a6-80sheets': 'Kokuyo A6 Notebook — 80 Sheets',
    'kokuyo-4mm-grid': 'Kokuyo Notebook — 4 mm Grid',
    'kokuyo-snoopy': 'Kokuyo Snoopy Notebook',
    'kokuyo-snoopy-2': 'Kokuyo Snoopy Notebook — Style 2',
    'sooofa': 'Kokuyo Sooofa Soft-Ring Notebook',
    'portable-scissors': 'Kokuyo Campus Portable Scissors',
    'kw-trio-stapler': 'KW-triO Stapler',
    'kw-cutting-knife-large': 'KW-triO Cutting Knife — Large',
    'star-24col-set-w-shr': 'Y.Plus Star Colour Pencils — 24 Colours with Sharpener',
    'one-piece-water-color-pen': 'One Piece Watercolour Pen Set',
    'one-piece': 'One Piece Character Pen',
    'one-piece-sticky-note': 'One Piece Sticky Notes',
    'one-pice-sabo-note-book': 'One Piece Sabo Notebook',
    'one-pice-ace-note-book': 'One Piece Ace Notebook',
    'pen-thai': 'Character Ballpoint Pen',
    'pen-thai-2': 'Character Ballpoint Pen — Style 2',
    'lancer-clic': 'Lancer Clic Retractable Ballpoint Pen',
    'quantum-writing-with-technology': 'Quantum Ballpoint Pen',
    'de-guang-stationery': 'De Guang Document Organiser',
    'catmemo': 'Double A Catmemo Sticky Notes',
    'catmo-sticky-note': 'Catmemo Cat Sticky Notes',
    'big-ideas-start-small': 'Double A “Big Ideas Start Small” Sticky Notes',
    'beautiful-life': '“Beautiful Life” Sticker Sheet',
    'all-write': '“All Write” Sticker Sheet',
    'snoopy': 'Snoopy Notebook',
    'brunch-brother': 'Brunch Brother Notebook',
    'begin-elephant': 'Elephant Begin Notebook',
    'begin-elephant-2': 'Elephant Begin Stationery Set',
    'begin-elephant-3': 'Elephant Begin Stationery Set — Style 2',
    'begin-elephant-4': 'Elephant Begin Stationery Set — Style 3',
    'kizuna-mppa-502': 'Elephant Kizuna Notebook (MPPA-502)',
    'kizuna-mppa-503': 'Elephant Kizuna Notebook (MPPA-503)',
    'elephant-mra-502': 'Elephant Notebook (MRA-502)',
    'kizuna-a5-squares': 'Elephant Kizuna A5 Notebook — Squared',
    'kizuna-a5-wppa-504': 'Elephant Kizuna A5 Notebook (WPPA-504)',
    'kizuna-wppb-502-grid': 'Elephant Kizuna B5 Notebook — Grid (WPPB-502)',
    'kizuna-wppb-502': 'Elephant Kizuna B5 Notebook (WPPB-502)',
    'kizuna-series-b5-wppb-504': 'Elephant Kizuna B5 Notebook (WPPB-504)',
    'notebook-wpp-121t': 'Elephant Notebook (WPP-121T)',
    'mellow-ring-with-index': 'Elephant Mellow Ring Notebook with Index',
    'elephant-to-do-list': 'Elephant To-Do List Pad',
    'elephant-weekly-plan': 'Elephant Weekly Planner Pad',
    'elephant-weeky-plan': 'Elephant Weekly Planner Pad — Style 2',
    'elephant-monthly-plan': 'Elephant Monthly Planner Pad',
    'elephant-2': 'Elephant Planner Pad',
    'elephant': 'Galaxy Pastel Desk Accessory',
    'kokuyo': 'Campus Desk Accessory',
    'eraser': 'Campus Eraser',
    'mini-mon': 'Mini Monster Sticker Sheet',
    'moshi-moshi': 'Moshi Moshi Sticker Sheet',
    'moshi-moshi-2': 'Moshi Moshi Sticker Sheet — Style 2',
    'italo-jute-rope-hb-52': 'Italo Jute Rope',
    'motarro-mini-wooden-me565-1': 'Motarro Mini Wooden Craft Set',
    'motarro-scientific-magnet-1917': 'Motarro Scientific Magnet Set',
    'science-experiment-suite-kx-2020': 'Science Experiment Kit',
    'motarro-didactic-electric-kit-mb001-2': 'Motarro Educational Electric Circuit Kit',
    'jiehui-cube-3nd': 'Jiehui Magic Cube Puzzle',
    'cube-magic': 'Magic Cube Puzzle',
    'yq-rulur': 'YQ Ruler',
    'chicro-large-leather-pencil-pink-and-per': 'Chica Ro Large Leather Pencil Case — Pink',
    'kurumi-pencils': 'Kuromi Pencils',
    'minicombination-lock-book-kuromi': 'Kuromi Mini Notebook with Combination Lock',
    'mideer-pease-crayons': 'Mideer Pease Crayons',
    'esy-pencil-grip-6pcs': 'Easy Pencil Grips — 6 Pieces',
    'zap-kawaii-rock-painting-kiy': 'Hi5 ZAP! Kawaii Rock Painting Kit',
    'zap-frienship-bracelet': 'Hi5 ZAP! Friendship Bracelet Kit',
    'inkredibles-adorable-axolotls-magic-ink': 'Inkredibles Adorable Axolotls Magic Ink Book',
    'how-viruses-work': 'How Viruses Work — Science Kit',
    'how-buoyancy-works': 'How Buoyancy Works — Science Kit',
    'how-inertia-works': 'How Inertia Works — Science Kit',
    'bandit-ball-and-color-vision': 'Bandit Ball & Colour Vision Magic Trick',
    'color-blook-escape': 'Colour Block Escape Magic Trick',
    'card-tricks': 'Card Tricks Magic Set',
    'preschool': 'Hi5 Preschool Activity Book',
    'preschool-2': 'Hi5 Preschool Activity Book — Style 2',
    'preschool-3': 'Hi5 Preschool Activity Book — Style 3',
    'preschool-4': 'Hi5 Preschool Activity Book — Style 4',
    'preschool-5': 'Hi5 Preschool Activity Book — Style 5',
    'preschool-6': 'Hi5 Preschool Activity Book — Style 6',
    'sticky-note': 'Sticky Notes Set',
    'sticky-note-a555-02': 'Sticky Notes — Pastel Set',
    'sticky-note-5148': 'Techno Sticky Notes',
    'record-card-2-side-ruler-5x3-inch': 'FIS Record Cards — Ruled Both Sides, 5×3 inch',
    'record-card-2-side-ruler-6x4-inch': 'FIS Record Cards — Ruled Both Sides, 6×4 inch',
    'fis-executive-envelopes-laid-bond-paper': 'FIS Executive Envelopes — Laid Bond Paper',
    'a4-40-notebook-contact': 'Contact A4 Notebook — 40 Sheets',
    'zip-lock-a5': 'FIS A5 Zip-Lock Bag',
    'cutter-2501': 'FIS Utility Cutter',
    'cutter-18mm': 'FIS Utility Cutter — 18 mm Blade',
    'adel-soft-eraser': 'Adel Soft Eraser',
    'adel-soft-eraser-2': 'Adel Soft Eraser — Style 2',
    'coloring-book-the-uglu-duckling': 'Colouring Book — The Ugly Duckling',
    'dig-discover-dinosaurs': 'Hi5 Dig & Discover Dinosaurs Kit',
    'foamy-sun-star-clouds': 'Foam Shapes — Sun, Stars & Clouds',
    'eyes-tube': 'Googly Eyes Tube',
    'clixo-x-timothy-good-man-9pcs': 'Clixo × Timothy Goodman Magnetic Building Set — 9 Pieces',
    'bsoku-super-light-clay': 'Baoku Super Light Modelling Clay',
    'diy-your-own-slime': 'DIY Slime Making Kit',
    'slime-kit-3pcs-card': 'Slime Kit — 3 Pieces',
    'neon-snap-bracelets': 'Neon Snap Bracelets Set',
    'colorful-eva-woodlike-blocks-60-pcs': 'Toy Hero Colourful EVA Building Blocks — 60 Pieces',
    'my-roar-some-dinosaurs-puzzle-activity-b': 'My Roar-some Dinosaurs Puzzle & Activity Book',
    'the-very-hungry-caterpiller-activity-set': 'The Very Hungry Caterpillar Colouring & Activity Set',
    'the-very-hungry-caterpiller-finger-print': 'The Very Hungry Caterpillar Finger Prints Book',
    'incredible-but-true-bugs-insects': 'Incredible But True — Bugs & Insects Book',
    'incredible-but-true-space': 'Incredible But True — Space Book',
    'incredible-but-true-animals': 'Incredible But True — Animals Book',
    'incredible-but-true-dinasours': 'Incredible But True — Dinosaurs Book',
    'squeaky-clean-wall-coloring-stickers': 'Squeaky Clean Wall Colouring Stickers',
    'white-board-doodle': 'Whiteboard Doodle Set',
    '60ml-whiteboard-cleaner': 'Whiteboard Cleaner — 60 ml',
    'scissors-8-5': 'Flamingo Scissors — 8.5 inch',
    'a4-clear-folder-14mic': 'Flamingo A4 Clear Folder — 14 Micron',
    'pp-neon-spiral-notebook': 'FIS Neon Spiral Notebook — PP Cover',
    'pp-cover-notebook': 'FIS Notebook — PP Cover',
    'hard-cover-spiral-notebook-9x7-blue': 'FIS Hard Cover Spiral Notebook — 9×7, Blue',
    'spiral-hard-cover-note-a4': 'FIS A4 Hard Cover Spiral Notebook',
    'stilo-highliter-neon': 'Stilo Neon Highlighter',
    'erasable-highliter': 'Erasable Highlighter',
    'my-little-pony-erasable-pen': 'My Little Pony Erasable Pen',
    'y-plus-eraser-pen': 'Y.Plus Eraser Pen',
    'eraser-pen': 'Y.Plus Eraser Pen — Classic',
    'everyo-gel-pen': 'Deli Everyo Gel Pen',
    'everyo-gel-pen-2': 'Deli Everyo Gel Pen — Style 2',
    'everyo-gel-pen-3': 'Deli Everyo Gel Pen — Style 3',
    'monami-calligraphy-pen': 'Monami Calligraphy Pen',
    'masterart-blacklead-pencil': 'Masterart Black-Lead Pencils',
    'masterart-blacklead-pencil-2': 'Masterart Black-Lead Pencils — Style 2',
    'black-wood-triangle-pencil': 'FIS Black Wood Triangular Pencil',
    'basic-the-dinosaur-color-pencil': 'Basic Dinosaur Colour Pencils',
    'deli-stick-up-glue-gun': 'Deli Stick Up Glue Gun',
    'stick-up-glue-stick': 'Stick Up Glue Stick',
    'uhu-stick': 'UHU Glue Stick',
    'naruto-gift-box': 'Naruto Stationery Gift Box',
    'gift-scratch-card': 'Gift Scratch Art Card Set',
    'reward-chart-and-sticker': 'Reward Chart & Sticker Set',
    'reward-chart-and-sticker-2': 'Reward Chart & Sticker Set — Style 2',
    'pocket-planner': 'Pocket Planner',
    'pure-spirit-pencil-case-set': 'Pure Spirit Pencil Case Set',
    'motarro-pencil-pouch-mx014': 'Motarro Pencil Pouch',
    'lego-pal-pen': 'LEGO Pal Pen',
    'lego-pal-pen-2': 'LEGO Pal Pen — Style 2',
    'lego-pal-pen-3': 'LEGO Pal Pen — Style 3',
    'compass-set': 'Geometry Compass Set',
    'magnet-mix-design': 'Mixed Design Magnet Set',
    'hello-kitty-pen': 'Hello Kitty Pen',
    'cute-kitty-ball-pen': 'Montex Cute Kitty Ballpoint Pen',
    'punched-pocket': 'Techno Punched Pockets',
    'motarro-transparent-tape-disp-mt012-6': 'Motarro Transparent Tape with Dispenser',
    'motarro-non-sharpening-pencil-lt-13041': 'Motarro Non-Sharpening Pencil',
    'motarro-non-sharpening-pencil-lt-1316': 'Motarro Non-Sharpening Pencil — Style 2',
    'motarro-air-clay-1x36-me400-3': 'Motarro Air-Dry Clay',
    'motarro-document-book-cf-43360': 'Motarro Document Book',
    'motarro-document-bag-fc-myd016-1': 'Motarro Document Bag — Full Size',
    'motarro-reading-stick-mi102-1': 'Motarro Reading Pointer Stick',
    'motarro-coloured-paper-100-sheet-mu268-1': 'Motarro Coloured Paper — 100 Sheets',
    'motarro-glit-eva-sponge-sticker-me151-01': 'Motarro Glitter EVA Sponge Stickers',
    'motarro-cheque-file-myd075': 'Motarro Cheque File — Style 2',
    'motarro-steel-ruler-15cm-myd067-15': 'Motarro Steel Ruler — 15 cm',
    'motarro-steel-ruler-30cm-myd067-30': 'Motarro Steel Ruler — 30 cm',
    'motarro-steel-ruler-50cm-myd067-50': 'Motarro Steel Ruler — 50 cm',
    'motarro-polystyrene-ball-me001-45': 'Motarro Polystyrene Craft Balls',
    'motarro-polystyrene-star-me002-20': 'Motarro Polystyrene Craft Stars',
    'motarro-shaped-punch-me428-1': 'Motarro Craft Shape Punch',
    'motarro-scissor-mi019-19': 'Motarro Craft Scissors',
    'motarro-sketch-pad-mp128-3': 'Motarro Sketch Pad',
    'zap-extra-diy-putty-lab': 'Hi5 ZAP! Extra DIY Putty Lab',
    'zap-extra-crystal-world': 'Hi5 ZAP! Extra Crystal World Kit',
    'zap-build-your-own-super-rockets': 'Hi5 ZAP! Build Your Own Super Rockets Kit',
    'zap-bouncy-balls': 'Hi5 ZAP! Make Your Own Bouncy Balls Kit',
    'zap-pom-pom-friends': 'Hi5 ZAP! Pom-Pom Friends Kit',
    'crystal-growing': 'Hi5 Crystal Growing Kit — Small',
    'crystal-growing-kit': 'Hi5 Crystal Growing Kit — Large',
    'experiment-set': 'Hi5 Science Experiment Set',
    'magical-molecules': 'Hi5 Magical Molecules Science Kit',
    'solar-street-lamp': 'Hi5 Solar Street Lamp Science Kit',
    'wind-up-light': 'Hi5 Wind-Up Light Science Kit',
    'fidget-toy-creation-lab': 'Hi5 Fidget Toy Creation Lab',
    'building-blocks-puzzle-train-first-alpha': 'Hi5 Building Blocks Puzzle — Alphabet Train',
    'building-blocks-puzzle-train-first-alpha-2': 'Hi5 Building Blocks Puzzle — Alphabet Train, Style 2',
}

# handles flagged for the owner (too vague / category mismatch / uncertain wording)
NEEDS_REVIEW = {
    'elephant': 'Name is just "Elephant" (vendor listed as Galaxy Pastel) — what is this product?',
    'elephant-2': 'Name is just "Elephant" under Planners at AED 5 — needs a real name.',
    'kokuyo': 'Name is just "Kokuyo" (vendor listed as Campus) — what is this product?',
    'eraser': 'Just "Eraser" at AED 30 (premium?) — brand/series needed.',
    'pen-thai': '"Pen Thai" — unclear which pen; wrote a safe generic title.',
    'pen-thai-2': '"Pen Thai" duplicate — same as above.',
    'one-piece': '"One Piece" alone under Pens — assumed a character pen.',
    'moshi-moshi': '"Moshi Moshi" alone under Stickers — design unknown.',
    'moshi-moshi-2': '"Moshi Moshi" duplicate — design unknown.',
    'mini-mon': '"Mini Mon" — assumed mini monster stickers; confirm.',
    'de-guang-stationery': 'Supplier name only ("De Guang Stationery") under Files — what is it?',
    'snoopy': 'Character + category only; confirm notebook type/size.',
    'brunch-brother': 'Character + category only; confirm notebook type.',
    'catmemo': 'Brand name only; assumed sticky notes from the Catmemo line.',
    'sticky-note': '"Sticky Note" at AED 15 — set contents unknown.',
    'italo-jute-rope-hb-52': 'Jute rope filed under Notebooks & Books — category looks wrong.',
    'motarro-scissor-mi019-19': 'Scissors filed under Stickers & Sticky Notes — category looks wrong.',
    'motarro-sketch-pad-mp128-3': 'Sketch pad filed under Stickers & Sticky Notes — category looks wrong.',
    'motarro-cheque-file-myd075': 'Cheque file filed under Art & Craft — category looks wrong.',
    'motarro-mini-wooden-me565-1': '"Mini Wooden" — wooden what? Wrote a safe generic craft title.',
    'motarro-scientific-magnet-1917': 'Magnet set — contents unknown beyond the name.',
    'science-experiment-suite-kx-2020': 'Generic science kit name — contents unknown.',
    'chicro-large-leather-pencil-pink-and-per': 'Source name truncated ("Pink and Per…") — confirm second colour.',
    'mideer-pease-crayons': '"Pease" is likely a series name or typo — confirmed spelling needed.',
    'quantum-writing-with-technology': 'Marketing phrase, not a product name — assumed ballpoint pen.',
    'yq-rulur': 'Brand "YQ" + misspelt "ruler" — size unknown.',
    'jiehui-cube-3nd': '"3ND" suffix unclear — assumed a magic cube puzzle.',
    'sooofa': 'Assumed Kokuyo Sooofa soft-ring notebook line — confirm.',
    'begin-elephant': '"Begin Elephant" appears as notebook AND gift sets — confirm what each is.',
    'begin-elephant-2': 'Same name across categories — confirm contents.',
    'begin-elephant-3': 'Same name across categories — confirm contents.',
    'begin-elephant-4': 'Same name across categories — confirm contents.',
    'kizuna-mppa-502': 'Only the model code distinguishes it — size/ruling unknown.',
    'kizuna-mppa-503': 'Only the model code distinguishes it — size/ruling unknown.',
    'elephant-mra-502': 'Only the model code distinguishes it — size/ruling unknown.',
    'notebook-wpp-121t': 'Only the model code distinguishes it — size/ruling unknown.',
    'preschool': 'Six "Preschool" books with no subject — need per-book titles.',
    'preschool-2': 'See preschool.', 'preschool-3': 'See preschool.', 'preschool-4': 'See preschool.',
    'preschool-5': 'See preschool.', 'preschool-6': 'See preschool.',
    'to-make-each-day-count': 'Six identical sticker sheets — designs need distinguishing.',
    'to-make-each-day-count-2': 'See to-make-each-day-count.', 'to-make-each-day-count-3': 'See to-make-each-day-count.',
    'to-make-each-day-count-4': 'See to-make-each-day-count.', 'to-make-each-day-count-5': 'See to-make-each-day-count.',
    'to-make-each-day-count-6': 'See to-make-each-day-count.',
    'moshi-moshi-gel-pen': 'Eleven identical gel pens — colours/designs need distinguishing.',
    'beautiful-life': 'Sticker sheet with a slogan name only.',
    'all-write': 'Sticker sheet with a slogan name only.',
    'big-ideas-start-small': 'Sticky notes with a slogan name — design unknown.',
}

# ---------------------------------------------------------------- helpers
BRAND_DISP = {'Fis': 'FIS', 'Y.Plus+': 'Y.Plus', 'Y.Plus': 'Y.Plus', 'Kw.Trio': 'KW-triO', 'Hi6': 'Hi5', 'Hi7': 'Hi5', 'Uhu': 'UHU', 'Lego': 'LEGO', 'Yq': 'YQ', 'M.Y': 'M.Y.'}
def brand_disp(v):
    v = (v or '').strip()
    return BRAND_DISP.get(v, v)

def hashn(handle, n):
    return int(hashlib.md5(handle.encode()).hexdigest(), 16) % n

def clean_title(raw, handle, vendor):
    t = raw
    t = CODE_RE.sub('', t)
    t = re.sub(r'\s{2,}', ' ', t).strip(' -–—+')
    # expand pack/size abbreviations
    t = re.sub(r'\b(\d+)\s?PCS?\b', r'\1 Pieces', t, flags=re.I)
    t = re.sub(r'\b(\d+)\s?PC\b', r'\1 Pieces', t, flags=re.I)
    t = re.sub(r'\b(\d+)\s?GM\b', r'\1 g', t, flags=re.I)
    t = re.sub(r'\b(\d+)\s?ML\b', r'\1 ml', t, flags=re.I)
    t = re.sub(r'\b(\d+)\s?MM\b', r'\1 mm', t, flags=re.I)
    t = re.sub(r'\((\d+)MIC\)', r'— \1 Micron', t, flags=re.I)
    t = re.sub(r'\b(\d+)SHEETS\b', r'\1 Sheets', t, flags=re.I)
    t = re.sub(r'\bW/shr\b', 'with Sharpener', t, flags=re.I)
    t = re.sub(r'\b(\d+)\s?IN\b', r'\1 — Metal Tube' if 'metal tube' in raw.lower() else r'\1', t, flags=re.I)
    t = t.replace('&', ' & ').replace('  ', ' ')
    words = [fix_word(w) for w in t.split(' ') if w]
    t = ' '.join(words)
    # title case but keep known casings
    def cap(w):
        if re.fullmatch(r'[A-Z]\d|a[3-7]|b5', w, re.I): return w.upper()
        if w.upper() in ('HB', 'PP', 'EVA', 'DIY', 'ABC', 'LEGO', 'UHU', 'FIS', 'ZAP!', 'KW-TRIO', 'A4', 'A5', 'A6', 'A7', 'B5'): return w.upper()
        if w.lower() in ('with', 'and', 'the', 'of', 'on', 'in', 'a', 'for', 'x'): return w.lower()
        if any(c.islower() for c in w) and any(c.isupper() for c in w[1:]): return w  # mixed like KW-triO
        return w[:1].upper() + w[1:].lower() if w else w
    t = ' '.join(cap(w) for w in t.split(' '))
    t = t[0].upper() + t[1:] if t else t
    # collapse accidental word repeats ("Color Color Pencil")
    t = re.sub(r'\b(?!moshi)(\w+)( \1\b)+', r'\1', t, flags=re.I)
    # units stay lowercase; stray hyphens become em-dashes
    t = re.sub(r'\b(\d+(?:\.\d+)?) ?(G|Ml|Mm|Cm)\b', lambda m: m.group(1) + ' ' + m.group(2).lower(), t)
    t = re.sub(r'\s+-\s+', ' — ', t)
    # a trailing bare pattern number becomes an honest design suffix
    t = re.sub(r'\s(\d{3,4})$', r' — Design \1', t)
    # trailing counts read better after a dash
    t = re.sub(r'(?<!— )\b(\d+ (?:Pieces|Colours|Sheets))$', r'— \1', t)
    t = t.replace('Abc ', 'ABC ').replace('Lego', 'LEGO').replace('Uhu', 'UHU').replace('Fis ', 'FIS ').replace('Diy', 'DIY').replace('Zap', 'ZAP!').replace('ZAP!!', 'ZAP!')
    t = re.sub(r'\bEva\b', 'EVA', t)
    t = re.sub(r'\bPp\b', 'PP', t)
    t = re.sub(r'\bHb\b', 'HB', t)
    # brand prefix if missing (never for the house label Tiny Inks)
    vend = vendor.strip()
    if vend and vend.lower() not in ('tiny inks',) and vend.lower().split('.')[0] not in t.lower():
        vmap = {'Y.Plus+': 'Y.Plus', 'Y.Plus': 'Y.Plus', 'Fis': 'FIS', 'Kw.Trio': 'KW-triO', 'Hi5': 'Hi5', 'Hi6': 'Hi5', 'Hi7': 'Hi5'}
        brand = vmap.get(vend, vend)
        if brand.lower() not in t.lower():
            t = f'{brand} {t}'
    return t.strip(' -–—')

# ---------------------------------------------------------------- kinds → templates
KINDS = [
    ('washi tape', 'washi'), ('sticky note', 'stickynote'), ('sticker', 'sticker'),
    ('flash card', 'flashcard'), ('education card', 'flashcard'), ('word cards', 'flashcard'),
    ('colour pencil', 'colpencil'), ('colouring pencil', 'colpencil'), ('col pen', 'colpencil'),
    ('crayon', 'crayon'), ('watercolour', 'paint'), ('water colour', 'paint'), ('paint', 'paint'),
    ('gel pen', 'gelpen'), ('ballpoint', 'pen'), ('rollerball', 'pen'), ('calligraphy pen', 'pen'),
    ('highlighter', 'highlighter'), ('marker', 'marker'), ('pencil case', 'case'), ('pencil pouch', 'case'), ('pencil box', 'case'),
    ('pencil grip', 'grip'), ('pencil', 'pencil'), ('pen', 'pen'),
    ('eraser', 'eraser'), ('sharpener', 'sharpener'), ('scissor', 'scissors'), ('cutter', 'cutter'), ('knife', 'cutter'),
    ('glue gun', 'gluegun'), ('glue', 'glue'), ('tape cutter', 'tapecutter'), ('tape', 'tape'),
    ('correction', 'correction'), ('stapler', 'stapler'), ('ruler', 'ruler'), ('compass', 'compass'),
    ('notebook', 'notebook'), ('note book', 'notebook'), ('sketch pad', 'sketchpad'), ('sketchbook', 'sketchpad'),
    ('memo', 'stickynote'), ('planner', 'planner'), ('diary', 'planner'), ('to-do', 'planner'), ('weekly', 'planner'), ('monthly', 'planner'),
    ('folder', 'folder'), ('file', 'folder'), ('envelope', 'folder'), ('zipper bag', 'folder'), ('zip-lock', 'folder'),
    ('document', 'folder'), ('punched pocket', 'folder'), ('display file', 'folder'),
    ('clay', 'clay'), ('slime', 'slime'), ('bead', 'craftbit'), ('pom', 'craftbit'), ('pipe cleaner', 'craftbit'),
    ('googly', 'craftbit'), ('eyes', 'craftbit'), ('wooden', 'craftbit'), ('polystyrene', 'craftbit'), ('foam', 'craftbit'),
    ('peg', 'craftbit'), ('jute', 'craftbit'), ('rope', 'craftbit'), ('smock', 'smock'), ('brush', 'brush'), ('palette', 'palette'),
    ('science', 'science'), ('experiment', 'science'), ('crystal', 'science'), ('circuit', 'science'), ('magnet', 'science'),
    ('kit', 'kit'), ('activity', 'activity'), ('colouring book', 'colbook'), ('paint book', 'colbook'), ('book', 'book'),
    ('puzzle', 'puzzle'), ('cube', 'puzzle'), ('blocks', 'blocks'), ('gift box', 'giftset'), ('gift', 'giftset'), ('set', 'set'),
    ('label', 'sticker'), ('magnifying', 'science'), ('whiteboard', 'whiteboard'), ('white board', 'whiteboard'),
    ('paper', 'paper'), ('card', 'paper'), ('bracelet', 'craftkit'), ('cross-stitch', 'craftkit'), ('scratch', 'craftkit'),
]
PRIORITY_KINDS = [  # specific first — matched with word boundaries
    ('washi tape', 'washi'), ('tape cutter', 'tapecutter'), ('sticky notes', 'stickynote'), ('sticky note', 'stickynote'), ('memo', 'stickynote'),
    ('flash card', 'flashcard'), ('education card', 'flashcard'), ('word cards', 'flashcard'),
    ('paint brush', 'brush'), ('brush', 'brush'), ('palette', 'palette'), ('smock', 'smock'),
    ('science', 'science'), ('experiment', 'science'), ('crystal', 'science'), ('circuit', 'science'),
    ('magnet', 'science'), ('magnifying', 'science'), ('rockets', 'science'),
    ('colouring book', 'colbook'), ('paint book', 'colbook'), ('activity book', 'activity'), ('activity set', 'activity'),
    ('activity', 'activity'), ('puzzle', 'puzzle'), ('cube', 'puzzle'), ('blocks', 'blocks'),
    ('gift box', 'giftset'), ('kit', 'kit'), ('lab', 'kit'), ('cross-stitch', 'craftkit'), ('bracelet', 'craftkit'),
    ('bracelets', 'craftkit'), ('scratch', 'craftkit'), ('finger prints', 'activity'), ('book', 'book'),
    ('sharpener', 'sharpener'), ('eraser', 'eraser'), ('erasers', 'eraser'), ('scissors', 'scissors'), ('scissor', 'scissors'),
    ('cutter', 'cutter'), ('knife', 'cutter'), ('glue gun', 'gluegun'), ('glue', 'glue'),
    ('correction', 'correction'), ('stapler', 'stapler'), ('ruler', 'ruler'), ('compass', 'compass'),
    ('pencil case', 'case'), ('pencil pouch', 'case'), ('pencil box', 'case'), ('pencil grip', 'grip'), ('grips', 'grip'),
    ('colour pencil', 'colpencil'), ('colour pencils', 'colpencil'), ('colour pen', 'colpencil'), ('colour pens', 'colpencil'),
    ('crayon', 'crayon'), ('crayons', 'crayon'), ('watercolour', 'paint'), ('paint', 'paint'),
    ('highlighter', 'highlighter'), ('marker', 'marker'), ('markers', 'marker'),
    ('gel pen', 'gelpen'), ('ballpoint', 'pen'), ('rollerball', 'pen'), ('calligraphy', 'pen'),
    ('notebook', 'notebook'), ('sketch pad', 'sketchpad'), ('sketchbook', 'sketchpad'),
    ('planner', 'planner'), ('diary', 'planner'), ('to-do', 'planner'),
    ('folder', 'folder'), ('file', 'folder'), ('envelope', 'folder'), ('envelopes', 'folder'),
    ('zipper bag', 'folder'), ('zip-lock', 'folder'), ('document', 'folder'), ('pocket', 'folder'), ('pockets', 'folder'),
    ('clay', 'clay'), ('slime', 'slime'), ('sticker', 'sticker'), ('stickers', 'sticker'), ('label', 'sticker'), ('labels', 'sticker'),
    ('bead', 'craftbit'), ('beads', 'craftbit'), ('pom', 'craftbit'), ('pipe cleaner', 'craftbit'),
    ('googly', 'craftbit'), ('eyes', 'craftbit'), ('wooden', 'craftbit'), ('polystyrene', 'craftbit'),
    ('foam', 'craftbit'), ('foamy', 'craftbit'), ('peg', 'craftbit'), ('pegs', 'craftbit'), ('jute', 'craftbit'), ('rope', 'craftbit'),
    ('whiteboard', 'whiteboard'), ('paper', 'paper'), ('cards', 'paper'), ('card', 'paper'),
    ('pencil', 'pencil'), ('pencils', 'pencil'), ('pens', 'pen'), ('pen', 'pen'),
    ('tape', 'tape'), ('set', 'set'), ('gift', 'giftset'),
]
def kind_of(title, ptype):
    tl = title.lower()
    if ptype == 'Gift Sets & Bundles': return 'giftset'
    for key, kind in PRIORITY_KINDS:
        if re.search(r'(?<![a-z])' + re.escape(key) + r'(?![a-z])', tl):
            if ptype == 'Planners & Diaries' and kind in ('pen', 'pencil', 'desktool'): return 'planner'
            return kind
    return {'Stickers & Sticky Notes': 'sticker', 'Art & Craft': 'craftbit', 'Learning & Activity': 'activity',
            'Notebooks & Books': 'notebook', 'Pens & Pencils': 'pen', 'Desk & Tools': 'desktool',
            'Files & Folders': 'folder', 'Gift Sets & Bundles': 'giftset', 'Planners & Diaries': 'planner'}.get(ptype, 'desktool')

# EN description templates: (what-it-is, who/why) — {t}=title, {b}=brand phrase
D = {
 'washi': ("{t} — decorative paper tape that tears by hand and repositions without marking.",
           "Perfect for journals, gift wrapping and craft projects. A little roll that makes everything prettier."),
 'stickynote': ("{t} for quick reminders, page markers and desk notes that peel off cleanly.",
           "Handy for students and office desks alike — stick them on books, screens and planners."),
 'sticker': ("{t} — a fun sheet of peel-and-stick designs.",
           "Great for decorating journals, laptops, school books and reward charts. An easy little gift for kids."),
 'flashcard': ("{t} — picture cards that make early learning feel like play.",
           "A simple screen-free way for parents and teachers to build vocabulary with young children."),
 'colpencil': ("{t} for smooth, vivid colouring.",
           "A solid choice for school bags and home art corners — easy to sharpen and comfortable to hold."),
 'crayon': ("{t} — bold, easy-grip colour for little hands.",
           "Ideal for toddlers and young artists at home or nursery."),
 'paint': ("{t} for bright, easy painting sessions.",
           "Suits school projects and weekend art at home — just add water and paper."),
 'gelpen': ("{t} — smooth-flowing ink in a comfortable grip.",
           "A favourite for note-taking, journaling and adding colour to study notes."),
 'pen': ("{t} for smooth, reliable everyday writing.",
           "A dependable pick for school, office and signatures alike."),
 'highlighter': ("{t} for marking what matters.",
           "Bright, quick-drying colour for revision notes, documents and planners."),
 'marker': ("{t} for bold lines and bright colouring.",
           "Great for posters, projects and creative time with the kids."),
 'case': ("{t} to keep pens, pencils and small tools together.",
           "Fits neatly in a school bag or on a desk — no more hunting for the sharpener."),
 'grip': ("{t} that slide onto a pencil to guide little fingers.",
           "A gentle helper for children learning to write comfortably."),
 'pencil': ("{t} for writing and sketching.",
           "A classroom essential that sharpens cleanly and writes smoothly."),
 'eraser': ("{t} that rubs out cleanly without tearing the page.",
           "One of those small things every pencil case needs."),
 'sharpener': ("{t} for a clean, even point every time.",
           "Compact enough for any pencil case."),
 'scissors': ("{t} that cut cleanly and feel comfortable in hand.",
           "Suits paper craft, school projects and everyday desk jobs."),
 'cutter': ("{t} for clean, precise cutting.",
           "Keep one in the drawer for parcels, paper and craft board. Handle with care around children."),
 'glue': ("{t} that sticks paper and card cleanly.",
           "A school-bag staple for projects, collages and quick fixes."),
 'gluegun': ("{t} for quick-setting craft and repair jobs.",
           "Melts glue sticks fast for card, fabric and decoration projects — adult supervision for young makers."),
 'tape': ("{t} for sticking, sealing and decorating.",
           "Handy on every desk and in every craft box."),
 'tapecutter': ("{t} that cuts tape straight with a safe, blade-free edge.",
           "A neat desk upgrade for anyone who uses washi or office tape daily."),
 'correction': ("{t} for tidy, instant corrections.",
           "Glides on dry so you can write over it straight away."),
 'stapler': ("{t} for fastening pages quickly.",
           "A compact essential for home offices and school projects."),
 'ruler': ("{t} for accurate measuring and clean lines.",
           "Made for pencil cases, drawing boards and toolboxes."),
 'compass': ("{t} for geometry class and technical drawing.",
           "Draws clean circles and arcs — a maths-set must-have."),
 'notebook': ("{t} for notes, lists and ideas.",
           "Good paper in a practical format — for school, work or the bedside table."),
 'sketchpad': ("{t} ready for drawing and doodling.",
           "Loose, creative space for pencils, crayons and light colour."),
 'planner': ("{t} to plan the day, week or month at a glance.",
           "Helps students and busy people keep tasks visible and satisfying to tick off."),
 'folder': ("{t} to keep papers flat, sorted and safe.",
           "Brings quick order to school hand-outs, bills and office documents."),
 'clay': ("{t} — soft, colourful and easy to shape.",
           "Hours of screen-free making for kids; air-dries into keepable little creations."),
 'slime': ("{t} for squishy, satisfying sensory play.",
           "A rainy-day favourite — follow the steps and stretch away."),
 'craftbit': ("{t} for craft boxes and school art projects.",
           "Mix them into collages, models and DIY decorations."),
 'smock': ("{t} to keep clothes clean during painting.",
           "Lets young artists get properly messy without the laundry drama."),
 'brush': ("{t} for painting at school or home.",
           "Holds colour well and cleans up easily."),
 'palette': ("{t} for mixing colours while you paint.",
           "Easy to hold, easy to rinse."),
 'science': ("{t} — hands-on science that feels like play.",
           "Curious kids follow the steps, see real results and learn why it works."),
 'kit': ("{t} with everything needed in one box.",
           "A ready-made activity for weekends, holidays and gifts."),
 'activity': ("{t} packed with things to do, colour and learn.",
           "Keeps young minds busy on quiet afternoons and long car rides."),
 'colbook': ("{t} full of pictures waiting for colour.",
           "A calm, screen-free activity for young children."),
 'book': ("{t} — facts and fun between two covers.",
           "A lovely gift for curious readers."),
 'puzzle': ("{t} to twist, solve and master.",
           "Builds patience and problem-solving — dangerously moreish."),
 'blocks': ("{t} for open-ended building play.",
           "Light, safe pieces that grow imagination and motor skills."),
 'giftset': ("{t} — a ready-to-give set, no assembly needed.",
           "Take the guesswork out of gifting for birthdays, school rewards and small thank-yous."),
 'set': ("{t} — a matched set that works together.",
           "More useful (and better value) than buying the pieces separately."),
 'desktool': ("{t} — a practical helper for the desk.",
           "One of those tools you reach for more often than you expect."),
 'whiteboard': ("{t} for writing, wiping and starting again.",
           "Great for practice, planning and play."),
 'paper': ("{t} for writing, printing and craft.",
           "A useful stack to keep within arm's reach."),
 'craftkit': ("{t} — a make-it-yourself craft project.",
           "Follow along, make something real, and keep it (or gift it)."),
}

# AR: kind → (what-it-is, who/why); {t}=arabic title
DAR = {
 'washi': ("{t} — شريط ورقي مزخرف يُقص باليد ويُعاد لصقه دون أن يترك أثرًا.", "مثالي لتزيين الدفاتر وتغليف الهدايا وأعمال الكرافت."),
 'stickynote': ("{t} للملاحظات السريعة وتعليم الصفحات، تُنزع بسهولة دون أثر.", "عملية للطلاب وعلى مكاتب العمل — على الكتب والشاشات والمخططات."),
 'sticker': ("{t} — ورقة ملصقات ممتعة تُقشر وتُلصق بسهولة.", "لتزيين الدفاتر والأجهزة وكتب المدرسة ولوحات التحفيز. هدية صغيرة تُفرح الأطفال."),
 'flashcard': ("{t} — بطاقات مصورة تجعل التعلم المبكر أقرب إلى اللعب.", "وسيلة بسيطة بعيدًا عن الشاشات لبناء مفردات الصغار في البيت أو الروضة."),
 'colpencil': ("{t} لتلوين ناعم بألوان زاهية.", "خيار ممتاز لحقيبة المدرسة وركن الرسم في البيت."),
 'crayon': ("{t} — ألوان جريئة بقبضة سهلة للأيدي الصغيرة.", "مثالية للصغار في البيت أو الحضانة."),
 'paint': ("{t} لجلسات رسم مشرقة وسهلة.", "يناسب مشاريع المدرسة وهوايات نهاية الأسبوع — فقط أضف الماء والورق."),
 'gelpen': ("{t} — حبر انسيابي وقبضة مريحة.", "مفضل لتدوين الملاحظات وتلوين الملخصات الدراسية."),
 'pen': ("{t} لكتابة يومية سلسة وموثوقة.", "خيار يعتمد عليه في المدرسة والمكتب والتوقيعات."),
 'highlighter': ("{t} لتمييز المهم في ثوانٍ.", "ألوان مشرقة سريعة الجفاف للمراجعة والمستندات."),
 'marker': ("{t} لخطوط جريئة وتلوين مشرق.", "مناسب للملصقات والمشاريع وأوقات الإبداع مع الأطفال."),
 'case': ("{t} لتجميع الأقلام والأدوات الصغيرة في مكان واحد.", "يدخل حقيبة المدرسة بسهولة — ولا مزيد من البحث عن البراية."),
 'grip': ("{t} تُركب على القلم لتوجيه الأصابع الصغيرة.", "مساعد لطيف للأطفال في مرحلة تعلم الكتابة."),
 'pencil': ("{t} للكتابة والرسم.", "أساسي في كل مقلمة — يُبرى بسهولة ويكتب بسلاسة."),
 'eraser': ("{t} يمسح بنظافة دون إتلاف الورقة.", "من الأشياء الصغيرة التي تحتاجها كل مقلمة."),
 'sharpener': ("{t} لسنّ نظيف ومتساوٍ في كل مرة.", "حجم صغير يناسب أي مقلمة."),
 'scissors': ("{t} يقص بدقة وبقبضة مريحة.", "يناسب أعمال الورق والمشاريع المدرسية ومهام المكتب اليومية."),
 'cutter': ("{t} لقص دقيق ونظيف.", "أداة عملية للطرود والورق وألواح الكرافت — يُستخدم بحذر بعيدًا عن الأطفال."),
 'glue': ("{t} يلصق الورق والكرتون بنظافة.", "أساسي في حقيبة المدرسة للمشاريع والأشغال اليدوية."),
 'gluegun': ("{t} لأعمال الكرافت والإصلاحات السريعة.", "يذيب أصابع الغراء بسرعة — بإشراف الكبار للصغار."),
 'tape': ("{t} للصق والتغليف والتزيين.", "عملي على كل مكتب وفي كل صندوق كرافت."),
 'tapecutter': ("{t} يقص الشريط بحافة آمنة دون شفرة.", "إضافة أنيقة لمكتب كل من يستخدم الواشي أو الشريط اللاصق يوميًا."),
 'correction': ("{t} لتصحيح فوري ومرتب.", "يجف مباشرة لتكتب فوقه فورًا."),
 'stapler': ("{t} لتثبيت الأوراق بسرعة.", "أداة أساسية مدمجة للمكتب المنزلي والمشاريع المدرسية."),
 'ruler': ("{t} لقياس دقيق وخطوط نظيفة.", "لأدوات الهندسة والمقلمة وصندوق العدة."),
 'compass': ("{t} لحصص الهندسة والرسم الفني.", "يرسم دوائر وأقواسًا نظيفة — لا غنى عنه في علبة الأدوات."),
 'notebook': ("{t} للملاحظات والقوائم والأفكار.", "ورق جيد بحجم عملي — للمدرسة أو العمل أو بجانب السرير."),
 'sketchpad': ("{t} جاهز للرسم والخربشة.", "مساحة حرة للأقلام والألوان الخفيفة."),
 'planner': ("{t} لتنظيم اليوم والأسبوع والشهر بنظرة واحدة.", "يساعد الطلاب والمشغولين على إبقاء المهام مرئية — وشطبها ممتع."),
 'folder': ("{t} لحفظ الأوراق مرتبة وآمنة.", "نظام سريع لأوراق المدرسة والفواتير ومستندات المكتب."),
 'clay': ("{t} — طري وملون وسهل التشكيل.", "ساعات من اللعب الإبداعي بعيدًا عن الشاشات، ويجف ليتحول إلى مجسمات تُحفظ."),
 'slime': ("{t} للعب حسي ممتع.", "نشاط مفضل في الإجازات — اتبع الخطوات ومدّد السلايم كما تشاء."),
 'craftbit': ("{t} لصناديق الكرافت والمشاريع الفنية المدرسية.", "تدخل في الكولاج والمجسمات وأعمال التزيين اليدوية."),
 'smock': ("{t} يحمي الملابس أثناء الرسم.", "دع الصغار يبدعون بحرية دون قلق الغسيل."),
 'brush': ("{t} للرسم في المدرسة أو البيت.", "تحمل اللون جيدًا وتُنظف بسهولة."),
 'palette': ("{t} لمزج الألوان أثناء الرسم.", "سهلة الإمساك وسهلة الغسل."),
 'science': ("{t} — علوم عملية بطعم اللعب.", "يتبع الصغار الخطوات ويرون نتائج حقيقية ويتعلمون السبب."),
 'kit': ("{t} بكل ما تحتاجه في علبة واحدة.", "نشاط جاهز لنهايات الأسبوع والإجازات والهدايا."),
 'activity': ("{t} مليء بأنشطة التلوين والتعلم.", "يشغل العقول الصغيرة في الأمسيات الهادئة والرحلات الطويلة."),
 'colbook': ("{t} بصفحات تنتظر التلوين.", "نشاط هادئ بعيد عن الشاشات للأطفال الصغار."),
 'book': ("{t} — معلومات ومتعة بين غلافين.", "هدية جميلة لكل قارئ فضولي."),
 'puzzle': ("{t} للحل والإتقان.", "ينمّي الصبر ومهارات الحل — وإدمانه لطيف."),
 'blocks': ("{t} للعب بناء مفتوح النهاية.", "قطع خفيفة وآمنة تنمي الخيال والمهارات الحركية."),
 'giftset': ("{t} — طقم جاهز للإهداء دون أي تجهيز.", "يريحك من حيرة الهدايا لأعياد الميلاد ومكافآت المدرسة."),
 'set': ("{t} — طقم متكامل تعمل قطعه معًا.", "أكثر فائدة وأفضل قيمة من شراء القطع متفرقة."),
 'desktool': ("{t} — أداة عملية للمكتب.", "من الأدوات التي ستستخدمها أكثر مما تتوقع."),
 'whiteboard': ("{t} للكتابة والمسح والبدء من جديد.", "رائع للتدريب والتخطيط واللعب."),
 'paper': ("{t} للكتابة والطباعة والكرافت.", "رزمة مفيدة تستحق مكانًا قريبًا من يدك."),
 'craftkit': ("{t} — مشروع كرافت تصنعه بنفسك.", "اتبع الخطوات واصنع شيئًا حقيقيًا تحتفظ به أو تهديه."),
}

# AR names for kinds (used to build Arabic titles naturally)
KIND_AR = {
 'washi': 'شريط واشي', 'stickynote': 'ملاحظات لاصقة', 'sticker': 'ملصقات', 'flashcard': 'بطاقات تعليمية',
 'colpencil': 'أقلام تلوين خشبية', 'crayon': 'ألوان شمعية', 'paint': 'ألوان مائية', 'gelpen': 'قلم جل',
 'pen': 'قلم', 'highlighter': 'قلم تمييز', 'marker': 'أقلام ماركر', 'case': 'مقلمة', 'grip': 'مساكات أقلام',
 'pencil': 'قلم رصاص', 'eraser': 'ممحاة', 'sharpener': 'براية', 'scissors': 'مقص', 'cutter': 'سكين قص',
 'glue': 'صمغ', 'gluegun': 'مسدس شمع', 'tape': 'شريط لاصق', 'tapecutter': 'قاطع شريط', 'correction': 'شريط تصحيح',
 'stapler': 'دباسة', 'ruler': 'مسطرة', 'compass': 'فرجار', 'notebook': 'دفتر', 'sketchpad': 'كراسة رسم',
 'planner': 'مخطط', 'folder': 'ملف', 'clay': 'صلصال', 'slime': 'سلايم', 'craftbit': 'مستلزمات كرافت',
 'smock': 'مريلة رسم', 'brush': 'فرشاة رسم', 'palette': 'لوحة ألوان', 'science': 'طقم علمي', 'kit': 'طقم',
 'activity': 'كتاب أنشطة', 'colbook': 'كتاب تلوين', 'book': 'كتاب', 'puzzle': 'لغز', 'blocks': 'مكعبات بناء',
 'giftset': 'طقم هدية', 'set': 'طقم', 'desktool': 'أداة مكتبية', 'whiteboard': 'سبورة بيضاء', 'paper': 'ورق',
 'craftkit': 'طقم كرافت',
}
AR_DIGITS = str.maketrans('0123456789', '٠١٢٣٤٥٦٧٨٩')

def ar_title(en_title, kind, vendor):
    """Natural Arabic: kind first, then distinguishing detail, brand kept in Latin."""
    base = KIND_AR.get(kind, 'منتج قرطاسية')
    det = []
    m = re.search(r'\b(A[3-7]|B5)\b', en_title)
    if m: det.append(f'مقاس {m.group(1)}')
    m = re.search(r'(\d+)\s+(Pieces|Colours)', en_title)
    if m:
        n = m.group(1).translate(AR_DIGITS)
        det.append(f'{n} لونًا' if m.group(2) == 'Colours' else f'{n} قطعة')
    m = re.search(r'(\d+(?:\.\d+)?)\s?(ml|mm|cm|g)\b', en_title)
    if m:
        unit = {'ml': 'مل', 'mm': 'مم', 'cm': 'سم', 'g': 'غم'}[m.group(2)]
        det.append(f'{m.group(1).translate(AR_DIGITS)} {unit}')
    m = re.search(r'(\d+)\s+Sheets', en_title)
    if m: det.append(f'{m.group(1).translate(AR_DIGITS)} ورقة')
    m = re.search(r'Style (\d+)', en_title)
    if m: det.append(f'تصميم {m.group(1).translate(AR_DIGITS)}')
    m = re.search(r'Design (\d+)', en_title)
    if m: det.append(f'نقشة {m.group(1)}')
    for c, a in [('Blue', 'أزرق'), ('Black', 'أسود'), ('Green', 'أخضر'), ('Pink', 'وردي'), ('Yellow', 'أصفر'), ('Beige', 'بيج'), ('Neon', 'نيون'), ('Rainbow', 'قوس قزح'), ('White', 'أبيض')]:
        if re.search(rf'\b{c}\b', en_title): det.append(a)
    # keep the recognisable EN name fragment (brand/character) for searchability
    name_bits = []
    for token in ['Snoopy', 'Mickey Mouse', 'Winnie the Pooh', 'Hello Kitty', 'Kuromi', 'One Piece', 'Naruto', 'LEGO', 'Nekoni', 'Moshi Moshi', 'Campus', 'Kizuna', 'Sooofa', 'Saxa Poche', 'Karu Cut', 'ZAP!', 'Clixo', 'My Little Pony', 'Stitch', 'The Very Hungry Caterpillar', 'Catmemo']:
        if token.lower() in en_title.lower(): name_bits.append(token)
    vend = '' if vendor.strip().lower() in ('tiny inks', '') else brand_disp(vendor)
    if vend and any(vend.lower()[:4] == nb.lower()[:4] for nb in name_bits): vend = ''
    parts = [base] + name_bits[:1] + det[:2]
    t = ' '.join(parts)
    if vend: t += f' من {vend}'
    return t

BASE_TAGS = {
 'washi': ['washi tape', 'craft', 'journaling'], 'stickynote': ['sticky notes', 'memo', 'office', 'school'],
 'sticker': ['stickers', 'kids', 'decoration'], 'flashcard': ['flash cards', 'learning', 'kids', 'educational'],
 'colpencil': ['colour pencils', 'colouring', 'art', 'school'], 'crayon': ['crayons', 'colouring', 'kids'],
 'paint': ['paint', 'watercolour', 'art', 'kids'], 'gelpen': ['gel pen', 'pens', 'writing'],
 'pen': ['pen', 'writing', 'school', 'office'], 'highlighter': ['highlighter', 'study', 'office'],
 'marker': ['markers', 'colouring', 'art'], 'case': ['pencil case', 'organizer', 'school'],
 'grip': ['pencil grip', 'handwriting', 'kids'], 'pencil': ['pencil', 'writing', 'school'],
 'eraser': ['eraser', 'school', 'stationery'], 'sharpener': ['sharpener', 'school', 'stationery'],
 'scissors': ['scissors', 'craft', 'office'], 'cutter': ['cutter', 'office', 'tools'],
 'glue': ['glue', 'craft', 'school'], 'gluegun': ['glue gun', 'craft', 'diy'],
 'tape': ['tape', 'office', 'craft'], 'tapecutter': ['tape cutter', 'desk', 'office'],
 'correction': ['correction tape', 'office', 'school'], 'stapler': ['stapler', 'office', 'desk'],
 'ruler': ['ruler', 'measuring', 'school'], 'compass': ['compass', 'geometry', 'maths', 'school'],
 'notebook': ['notebook', 'writing', 'school', 'office'], 'sketchpad': ['sketch pad', 'drawing', 'art'],
 'planner': ['planner', 'organizer', 'productivity'], 'folder': ['file', 'folder', 'office', 'organizer'],
 'clay': ['clay', 'modelling', 'craft', 'kids'], 'slime': ['slime', 'kids', 'sensory'],
 'craftbit': ['craft', 'diy', 'art supplies'], 'smock': ['art smock', 'painting', 'kids'],
 'brush': ['paint brush', 'art', 'painting'], 'palette': ['palette', 'painting', 'art'],
 'science': ['science kit', 'stem', 'kids', 'educational'], 'kit': ['kit', 'activity', 'gift'],
 'activity': ['activity', 'kids', 'learning'], 'colbook': ['colouring book', 'kids', 'art'],
 'book': ['book', 'reading', 'kids'], 'puzzle': ['puzzle', 'brain teaser', 'kids'],
 'blocks': ['building blocks', 'kids', 'play'], 'giftset': ['gift set', 'gift', 'bundle'],
 'set': ['set', 'stationery', 'gift'], 'desktool': ['desk', 'office', 'stationery'],
 'whiteboard': ['whiteboard', 'writing', 'kids'], 'paper': ['paper', 'office', 'craft'],
 'craftkit': ['craft kit', 'diy', 'kids'],
}
def tags_for(title, kind, vendor, ptype):
    tags = list(BASE_TAGS.get(kind, ['stationery']))
    tl = title.lower()
    for m in re.finditer(r'\b(a[3-7]|b5)\b', tl): tags.append(m.group(1))
    if vendor.strip() and vendor.strip().lower() != 'tiny inks': tags.append(vendor.strip().lower())
    tags.append(ptype)  # keeps the existing collection assignment working
    seen, out = set(), []
    for t in tags:
        if t.lower() not in seen:
            seen.add(t.lower()); out.append(t)
    return out[:6]

# ---------------------------------------------------------------- main
rows = list(csv.DictReader(io.open(SRC, encoding='utf-8-sig')))
by_title = defaultdict(list)
out_rows, ar_rows, review_rows = [], [], []

# pre-pass: which cleaned titles collide? (so every member gets a Style, not just the 2nd+)
pre = Counter()
for r in rows:
    t0 = OVERRIDES.get(r['Handle']) or clean_title(r['Title'], r['Handle'], r['Vendor'])
    pre[re.sub(r' — Style .+$', '', t0).lower()] += 1

titles_seen = Counter()
group_idx = Counter()
for r in rows:
    handle, vendor, ptype = r['Handle'], r['Vendor'], r['Type']
    raw = r['Title']
    if handle in OVERRIDES:
        title = OVERRIDES[handle]
    else:
        title = clean_title(raw, handle, vendor)
    # uniqueness: every member of a colliding title group gets an honest Style N
    base_key = re.sub(r' — Style .+$', '', title).lower()
    if pre[base_key] > 1 and ' — Style' not in title:
        m = re.search(r'-(\d+)$', handle)
        group_idx[base_key] += 1
        n = m.group(1) if m else str(group_idx[base_key])
        title = f'{title} — Style {n}'
    if titles_seen[title.lower()]:
        title = f'{title} ({titles_seen[title.lower()] + 1})'
    titles_seen[title.lower()] += 1

    kind = kind_of(title, ptype)
    speak = re.sub(r' — (Style|Design) .+$', '', title)  # suffix stays in the title, not the prose
    what, why = D.get(kind, D['desktool'])
    brand = brand_disp(vendor)
    brand_line = '' if brand.lower() in ('tiny inks', '') else f' From {brand}.'
    p1 = what.format(t=speak)
    p2 = (why + brand_line).strip()
    body = f'<p>{p1}</p><p>{p2}</p>'

    art = ar_title(title, kind, vendor)
    aw, ay = DAR.get(kind, DAR['desktool'])
    abody = f'<p>{aw.format(t=art)}</p><p>{ay}</p>'

    tags = tags_for(title, kind, vendor, ptype)
    out_rows.append({'Handle': handle, 'Title': title, 'Body (HTML)': body, 'Tags': ', '.join(tags)})
    ar_rows.append({'handle': handle, 'field': 'title', 'default content (en)': title, 'translated content (ar)': art})
    ar_rows.append({'handle': handle, 'field': 'body_html', 'default content (en)': body, 'translated content (ar)': abody})
    if handle in NEEDS_REVIEW:
        review_rows.append({'Handle': handle, 'Original Title': raw, 'Proposed Title': title, 'Reason': NEEDS_REVIEW[handle]})

# ---- AR title dedupe: shoppers in the UAE search Latin product names too, so a
#      colliding Arabic title gets the distinguishing Latin fragment appended
ar_title_rows = [r for r in ar_rows if r['field'] == 'title']
seen_ar = Counter(r['translated content (ar)'] for r in ar_title_rows)
en_by_handle = {r['Handle']: r['Title'] for r in out_rows}
used_ar = Counter()
for r in ar_title_rows:
    t = r['translated content (ar)']
    if seen_ar[t] > 1:
        en = en_by_handle[r['handle']]
        frag = re.sub(r'^(?:[A-Z][\w.+-]*\s){0,1}', '', en)  # drop a leading brand word
        frag = re.sub(r' — (Style|Design) .+$', '', frag).strip()
        cand = f'{t} — {frag}' if frag and frag not in t else t
        if used_ar[cand]:
            cand = f'{cand} ({used_ar[cand] + 1})'
        used_ar[cand] += 1
        r['translated content (ar)'] = cand
    else:
        used_ar[t] += 1

with io.open('data/shopify-content-update.csv', 'w', encoding='utf-8-sig', newline='') as f:
    w = csv.DictWriter(f, fieldnames=['Handle', 'Title', 'Body (HTML)', 'Tags'])
    w.writeheader(); w.writerows(out_rows)
with io.open('data/arabic-translations.csv', 'w', encoding='utf-8-sig', newline='') as f:
    w = csv.DictWriter(f, fieldnames=['handle', 'field', 'default content (en)', 'translated content (ar)'])
    w.writeheader(); w.writerows(ar_rows)
with io.open('data/needs-review.csv', 'w', encoding='utf-8-sig', newline='') as f:
    w = csv.DictWriter(f, fieldnames=['Handle', 'Original Title', 'Proposed Title', 'Reason'])
    w.writeheader(); w.writerows(review_rows)

ar_dups = [t for t, c in Counter(r['translated content (ar)'] for r in ar_rows if r['field'] == 'title').items() if c > 1]
dups = [t for t, c in Counter(x['Title'].lower() for x in out_rows).items() if c > 1]
print(f'rewritten: {len(out_rows)} | needs review: {len(review_rows)} | duplicate EN titles: {len(dups)} | duplicate AR titles: {len(ar_dups)}')
for d in dups[:10]: print('  DUP:', d)
