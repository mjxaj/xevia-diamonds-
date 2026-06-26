// Seeds the DB with the design portfolio (15 earring designs from the PDF),
// site collections, default site settings, and the initial admin user.
require('dotenv').config();
const bcrypt = require('bcryptjs');
const { db, run, get, setSetting, getSetting } = require('./db');

const DEFAULT_SETTINGS = {
  site_name: process.env.SITE_NAME || 'XEVIA',
  site_tagline: process.env.SITE_TAGLINE || 'Fine Jewellery Atelier',
  site_established: process.env.SITE_ESTABLISHED || '1924',
  contact_email: process.env.CONTACT_EMAIL || 'enquiries@xeviadiamonds.com',
  contact_phone: process.env.CONTACT_PHONE || '+91 92033 26281',
  contact_address: process.env.CONTACT_ADDRESS || 'India',
  hero_eyebrow: 'Established 1924',
  hero_title_line1: 'XEVIA Fine',
  hero_title_line2: 'Jewellery',
  hero_image:
    'https://lh3.googleusercontent.com/aida-public/AB6AXuAUDbAjJM66SBf17VYIGWLuo58N7U_ZfC49wBnk9fwJEYhpKlGbKWYZzYA42w8KzRsOFq9PS4POILLfad126Ql-7QLdfJr3WfeMgsjOx20nlppteR4-gXc-jgLvuiDF0Oq0mj6Fbqu4d-8G45dXmyR1PLEaxPPQ52932WtlrFSfSiCNg3l-T0RIoZNMqTvGv0PcpzPa3JKRoVg9LV60rt91sTxPiIfVPKO2By-LM28S_r3MdXggKb9zGFSpKyOL6VZc9QjqQfUiFHc',
  about_heading: 'A Heritage of Craft',
  about_body:
    'Xevia is a Jaipur-rooted atelier creating contemporary fine jewellery in 14K and 18K gold, set with ethically sourced natural diamonds and rare gemstones. Every piece is hand-finished by master artisans whose craft has been passed down across generations.',
  imagine_heading: 'Xevia Imagine',
  imagine_body:
    'Your vision, our master craft. Design your own legacy through our interactive digital atelier, guided by the world\'s finest artisans.',
  newsletter_heading: 'Join the Private Circle',
  newsletter_body:
    'Receive exclusive invitations to private viewings and early access to our High Jewellery collections.',
  enquiry_thank_you:
    'Thank you. Your enquiry has been received — our team will reach out within 24 hours.',
};

for (const [k, v] of Object.entries(DEFAULT_SETTINGS)) {
  if (!getSetting(k)) setSetting(k, v);
}

const COLLECTIONS = [
  {
    slug: 'earrings',
    name: 'Earrings',
    tagline: 'Sculpted Brilliance',
    description:
      'Studs, drops and climbers — set with natural diamonds, carved gemstones and 18K gold.',
    image_url: '/images/products/design-diamond-teardrop-stud-satin.jpg',
  },
  {
    slug: 'rings',
    name: 'Rings',
    tagline: 'Forever, Set in Gold',
    description:
      'Engagement, eternity and signature rings — handcrafted with natural diamonds and rare gemstones.',
    image_url: '/images/products/design-floral-branch-ring-satin.jpg',
  },
  {
    slug: 'necklaces',
    name: 'Necklaces',
    tagline: 'Celestial Drape',
    description:
      'Chokers, lariats and pendant necklaces — designed to grace the décolletage with quiet luxury.',
    image_url: '/images/products/design-gaze-choker-satin.jpg',
  },
  {
    slug: 'bracelets',
    name: 'Bracelets',
    tagline: 'Wrist Worn Light',
    description:
      'Delicate chain bracelets and tennis bangles — set with shimmering accent diamonds.',
    image_url: '/images/products/design-leaf-motif-satin.jpg',
  },
  {
    slug: 'high-jewellery',
    name: 'High Jewellery',
    tagline: 'Singular Pieces',
    description:
      'One-of-a-kind statement pieces — fancy-colour diamonds, carved stones, and platinum settings.',
    image_url: '/images/products/design-solar-drop-canary-yellow-satin.jpg',
  },
  {
    slug: 'custom',
    name: 'Custom',
    tagline: 'Personal Legacy',
    description:
      'Bespoke commissions designed alongside our master artisans — your idea, our craft.',
    image_url: '/images/products/design-rose-amethyst-cluster-satin.jpg',
  },
];

for (const c of COLLECTIONS) {
  const existing = get('SELECT id FROM collections WHERE slug = ?', c.slug);
  if (existing) {
    run(
      'UPDATE collections SET name=?, tagline=?, description=?, image_url=? WHERE id=?',
      c.name,
      c.tagline,
      c.description,
      c.image_url,
      existing.id
    );
  } else {
    run(
      'INSERT INTO collections (slug, name, tagline, description, image_url) VALUES (?,?,?,?,?)',
      c.slug,
      c.name,
      c.tagline,
      c.description,
      c.image_url
    );
  }
}

function colId(slug) {
  const r = get('SELECT id FROM collections WHERE slug = ?', slug);
  return r ? r.id : null;
}

const PRODUCTS = [
  {
    slug: 'diamond-teardrop-stud',
    name: 'Diamond Teardrop Stud Earrings',
    collection: 'earrings',
    short: 'Double-teardrop open-frame studs in 18K yellow gold, pavé-set diamonds.',
    description:
      'A double-teardrop silhouette in 18K yellow gold, pavé-set with brilliant-cut natural diamonds. A study in restraint — quiet, architectural, infinitely wearable.',
    metal: '18K Yellow Gold (High-Polish Finish)',
    stones: 'Natural Diamonds, Round Brilliant',
    carat_weight: '~0.20 ct (Pair)',
    dimensions: '13.0 × 11.0 mm',
    price_range: 'On enquiry',
    primary_image: '/images/products/design-01.jpg',
    is_featured: 1,
  },
  {
    slug: 'green-apatite-diamond-drop',
    name: 'Green Apatite & Diamond Drop Earrings',
    collection: 'earrings',
    short: 'Pear-cut green apatite drops framed by huggie-set diamonds.',
    description:
      'Pear-cut green apatite drops cradled in 18K yellow gold, framed by sixteen round-brilliant accent diamonds and a diamond-pavé huggie hoop.',
    metal: '18K Yellow Gold (High-Polish Finish)',
    stones: 'Green Apatite (Pear Cut) + Natural Diamonds',
    carat_weight: '~2.50 ct (Pair)',
    dimensions: '29.0 × 15.6 mm',
    price_range: 'On enquiry',
    primary_image: '/images/products/design-02.jpg',
    is_featured: 1,
  },
  {
    slug: 'pink-amethyst-teardrop-dangle',
    name: 'Pink Amethyst Teardrop Dangle Earrings',
    collection: 'earrings',
    short: 'Pear-cut pink amethyst with marquise diamond accents.',
    description:
      'A pear-cut pink amethyst suspended from a pavé huggie hoop, framed by marquise and round-brilliant accent diamonds. Romantic, painterly, light on the lobe.',
    metal: '18K Yellow Gold',
    stones: 'Pink Amethyst + Natural Diamond',
    carat_weight: '~1.23 ct (Pair)',
    dimensions: '28.0 × 7.5 mm',
    price_range: 'On enquiry',
    primary_image: '/images/products/design-03.jpg',
  },
  {
    slug: 'morganite-blossom-drop',
    name: 'Morganite Blossom Drop Earrings',
    collection: 'earrings',
    short: 'Oval morganite top with pear-cut morganite drop and sapphire cluster.',
    description:
      'An oval-cut morganite crowns a marquise sapphire blossom, finished with a pear-cut morganite drop. Set in 18K yellow gold with a high-polish finish.',
    metal: '18K Yellow Gold (High-Polish Finish)',
    stones: 'Natural Morganite + White Sapphire',
    carat_weight: '~1.90 ct (Pair)',
    dimensions: '27.0 × 6.5 mm',
    price_range: 'On enquiry',
    primary_image: '/images/products/design-04.jpg',
    is_featured: 1,
  },
  {
    slug: 'lotus-blossom-drop',
    name: 'Lotus Blossom Drop Earrings',
    collection: 'earrings',
    short: 'Openwork lotus in 18K yellow gold with marquise diamond accents.',
    description:
      'A sculpted lotus blossom in openwork 18K yellow gold, set with marquise and round-brilliant diamond accents. Drawn from temple architecture, made for the everyday.',
    metal: '18K Yellow Gold (High-Polish Finish)',
    stones: 'Natural Diamond, Marquise & Round Brilliant',
    carat_weight: '~0.36 ct (Pair)',
    dimensions: '28.0 × 13.0 mm',
    price_range: 'On enquiry',
    primary_image: '/images/products/design-05.jpg',
  },
  {
    slug: 'butterfly-floral-drop',
    name: 'Butterfly Floral Drop Earrings',
    collection: 'earrings',
    short: 'Aquamarine-set butterfly wreath with pear-drop sapphire.',
    description:
      'A wreath of natural aquamarine blossoms with a butterfly motif, finished with a pear-cut white sapphire drop. 18K yellow gold throughout.',
    metal: '18K Yellow Gold (Polished Finish)',
    stones: 'Natural Aquamarine + White Sapphire',
    carat_weight: '~0.43 ct (Pair)',
    dimensions: '32.5 × 14.0 mm',
    price_range: 'On enquiry',
    primary_image: '/images/products/design-06.jpg',
  },
  {
    slug: 'butterfly-blossom-climber',
    name: 'Butterfly Blossom Climber Earrings',
    collection: 'earrings',
    short: 'Climber ear cuffs with butterfly, pink enamel petals and sapphires.',
    description:
      'A climber silhouette that traces the curve of the ear — pink enamel petals, white sapphires and a green enamel centre. Crafted in 18K yellow gold.',
    metal: '18K Yellow Gold (High-Polish Finish)',
    stones: 'White Sapphire + Pink & Green Enamel',
    carat_weight: '~0.45 ct (Pair)',
    dimensions: '17.0 × 15.2 mm',
    price_range: 'On enquiry',
    primary_image: '/images/products/design-07.jpg',
  },
  {
    slug: 'dainty-blossom-drop',
    name: 'Dainty Blossom Drop Earrings',
    collection: 'earrings',
    short: 'Leaf-and-bloom drops with cubic zirconia centre and white enamel.',
    description:
      'A dainty leaf-and-bloom silhouette with white-sapphire stem accents, white-enamel leaves and a brilliant cubic zirconia drop centre. 18K yellow gold.',
    metal: '18K Yellow Gold (High-Polish Finish)',
    stones: 'White Sapphire + Natural Diamond + Cubic Zirconia',
    carat_weight: '~1.45 ct (Pair)',
    dimensions: '20.5 × 8.2 mm',
    price_range: 'On enquiry',
    primary_image: '/images/products/design-08.jpg',
  },
  {
    slug: 'lavender-blossom-drop',
    name: 'Lavender Blossom Drop Earrings',
    collection: 'high-jewellery',
    short: 'Carved lavender amethyst tulip drops on a paved gold huggie.',
    description:
      'Carved lavender-amethyst tulip drops, paved-diamond huggie hoops and a sculpted gold-bead tip. A statement piece — sculptural, painterly, singular.',
    metal: '18K Yellow Gold',
    stones: 'Lavender Amethyst (Carved) + Natural Diamond',
    carat_weight: '~4.30 ct (Pair)',
    dimensions: '33.0 × 11.0 mm',
    price_range: 'On enquiry',
    primary_image: '/images/products/design-09.jpg',
    is_featured: 1,
  },
  {
    slug: 'golden-ribbon-drops',
    name: 'Golden Ribbon Drops',
    collection: 'earrings',
    short: 'Two-tone molten-drop studs in 14K gold and rhodium silver.',
    description:
      'A two-tone molten drop — 14K yellow gold meeting rhodium-plated silver — with a pavé-set diamond crown and pink crystal teardrop. Screw-back posts for everyday wear.',
    metal: '14K Yellow Gold + Rhodium-Plated Silver',
    stones: 'Pavé Diamonds + Pink Crystal',
    carat_weight: '—',
    dimensions: '35 mm overall length',
    price_range: 'On enquiry',
    primary_image: '/images/products/design-10.jpg',
  },
  {
    slug: 'geometric-green-chevron',
    name: 'Geometric Green Chevron Earrings',
    collection: 'high-jewellery',
    short: 'Round-cut green tourmaline chevron set with a diamond pavé halo.',
    description:
      'A geometric chevron silhouette — round-cut green tourmaline framed by a double diamond pavé arc in 18K yellow gold. Modern, architectural, unmistakable.',
    metal: '18K Yellow Gold',
    stones: 'Green Tourmaline + Natural Diamond',
    carat_weight: '~0.85 ct centre + ~0.25 ct pavé (each)',
    dimensions: '~3.5 mm centre stone',
    price_range: 'On enquiry',
    primary_image: '/images/products/design-11.jpg',
  },
  {
    slug: 'solar-drop-canary-yellow',
    name: 'Solar Drop — Canary Yellow Diamond',
    collection: 'high-jewellery',
    short: 'Pear-cut canary yellow diamond drops with marquise diamond cluster.',
    description:
      'A pear-cut canary-yellow diamond suspended from a marquise-diamond cluster, set in platinum (Plat 950). A high-jewellery piece for the most singular occasions.',
    metal: 'Platinum 950',
    stones: 'Canary Yellow Diamond + Marquise Diamonds',
    carat_weight: '~6.30 ct (Pair)',
    dimensions: '—',
    price_range: 'Price on application',
    primary_image: '/images/products/design-12.jpg',
    is_featured: 1,
  },
  {
    slug: 'tulip-drop-rose-gold',
    name: 'Tulip Drop Earrings — Rose Gold',
    collection: 'earrings',
    short: 'Frosted quartz/opal tulip cradled in pavé-diamond rose gold.',
    description:
      'A frosted quartz / opal cabochon tulip cradled in 14K rose gold, capped with a pavé-diamond hinge mechanism. Soft, romantic, weightless.',
    metal: '14K Rose Gold',
    stones: 'Frosted Quartz / Opal Cabochon + Pavé Diamonds',
    carat_weight: '~0.10 ct (Pair, pavé)',
    dimensions: '10 mm cabochon',
    price_range: 'On enquiry',
    primary_image: '/images/products/design-13.jpg',
  },
  {
    slug: 'rose-amethyst-cluster',
    name: 'Rosé Amethyst Cluster Earrings',
    collection: 'custom',
    short: 'Pink teardrop with amber marquise and amethyst cluster in rose gold.',
    description:
      'A composition of pink teardrop, amber-marquise and a large round amethyst — set in 14K rose gold. Soft, painterly, a bespoke-feel cluster.',
    metal: '14K Rose Gold',
    stones: 'Pink Topaz + Amber Marquise + Amethyst',
    carat_weight: '~3.5 ct (Pair, total)',
    dimensions: 'Main teardrop 7 × 5 mm',
    price_range: 'On enquiry',
    primary_image: '/images/products/design-14.jpg',
  },
  {
    slug: 'cats-eye-floral',
    name: 'Cat\'s Eye Floral Earrings',
    collection: 'earrings',
    short: 'Cat\'s eye petals around a brilliant CZ centre, gold-plated brass.',
    description:
      'A floral silhouette of cat\'s-eye petals set around a brilliant cubic-zirconia centre. 14K gold-plated brass base — a gentle entry to the floral atelier.',
    metal: '14K Gold-Plated Brass',
    stones: 'Cat\'s Eye + Cubic Zirconia',
    carat_weight: '—',
    dimensions: '~3.5 mm petals',
    price_range: 'On enquiry',
    primary_image: '/images/products/design-15.jpg',
  },

  // ============== NEW: EARRINGS (4) ==============
  {
    slug: 'dragonfly-earrings',
    name: 'Dragonfly Earrings',
    collection: 'earrings',
    short: 'Sculpted dragonfly silhouette with pavé diamond wings.',
    description:
      'A delicate dragonfly motif rendered in 18K yellow gold with pavé-set diamond wings and a coloured-stone body. A whisper of summer for the lobe.',
    metal: '18K Yellow Gold',
    stones: 'Natural Diamonds + Coloured Gemstone',
    carat_weight: '~0.18 ct (Pair)',
    dimensions: '~16 × 14 mm',
    price_range: 'On enquiry',
  },
  {
    slug: 'leaf-drop-earrings',
    name: 'Leaf Drop Earrings',
    collection: 'earrings',
    short: 'Botanical leaf drops in 18K gold with diamond veins.',
    description:
      'Hand-finished leaf drops in 18K yellow gold, traced with delicate pavé-diamond veining. A nature study cast in precious metal.',
    metal: '18K Yellow Gold',
    stones: 'Natural Diamonds, Round Brilliant',
    carat_weight: '~0.22 ct (Pair)',
    dimensions: '~22 × 9 mm',
    price_range: 'On enquiry',
  },
  {
    slug: 't-bar-teardrop-dangle-earrings',
    name: 'T-Bar Teardrop Dangle Earrings',
    collection: 'earrings',
    short: 'T-bar tops with delicate teardrop pendants.',
    description:
      'Refined T-bar earrings finished with a slim chain and teardrop pendant. Architectural restraint meets feminine movement.',
    metal: '18K Yellow Gold',
    stones: 'Natural Diamonds',
    carat_weight: '~0.15 ct (Pair)',
    dimensions: '~24 × 4 mm',
    price_range: 'On enquiry',
  },
  {
    slug: 'thaya',
    name: 'Thaya Earrings',
    collection: 'earrings',
    short: 'Modern minimal sculptural earring in 18K gold.',
    description:
      'A modern minimal sculptural earring — clean lines, polished gold and a single accent stone. Designed for the everyday extraordinary.',
    metal: '18K Yellow Gold',
    stones: 'Natural Diamond Accent',
    carat_weight: '~0.10 ct (Pair)',
    dimensions: '~14 × 8 mm',
    price_range: 'On enquiry',
  },

  // ============== NEW: RINGS (4) ==============
  {
    slug: 'floral-branch-ring',
    name: 'Floral Branch Ring',
    collection: 'rings',
    short: 'Sculpted branch silhouette set with diamonds and a coloured-stone bloom.',
    description:
      'A botanical branch curls around the finger, hand-set with round-brilliant diamonds and crowned with a coloured-stone bloom. 18K yellow gold.',
    metal: '18K Yellow Gold',
    stones: 'Natural Diamonds + Coloured Centre',
    carat_weight: '~0.40 ct (Total)',
    dimensions: 'US sizes 5–8 (resizable)',
    price_range: 'On enquiry',
    is_featured: 1,
  },
  {
    slug: 'floral-leaf-ring',
    name: 'Floral Leaf Ring',
    collection: 'rings',
    short: 'Stacking ring with sculpted leaf shoulders.',
    description:
      'Slim stacking ring with sculpted leaf shoulders embracing a central round-brilliant diamond. 18K yellow gold.',
    metal: '18K Yellow Gold',
    stones: 'Natural Diamond, Round Brilliant',
    carat_weight: '~0.18 ct centre',
    dimensions: 'US sizes 5–8 (resizable)',
    price_range: 'On enquiry',
  },
  {
    slug: 'snake-ring',
    name: 'Serpent Ring',
    collection: 'rings',
    short: 'Coiled serpent silhouette set with pavé diamonds.',
    description:
      'A coiled serpent silhouette in 18K yellow gold, pavé-set with brilliant-cut diamonds along the spine. A symbol of eternal renewal.',
    metal: '18K Yellow Gold',
    stones: 'Natural Diamonds, Round Brilliant',
    carat_weight: '~0.32 ct (Total)',
    dimensions: 'US sizes 5–9 (resizable)',
    price_range: 'On enquiry',
  },
  {
    slug: 'vine-with-thorns',
    name: 'Vine With Thorns Ring',
    collection: 'rings',
    short: 'Sculpted vine ring with thorn detail and accent diamonds.',
    description:
      'A sculpted vine wraps the finger, finished with delicate thorn detail and accent diamonds at the crown. 18K yellow gold.',
    metal: '18K Yellow Gold',
    stones: 'Natural Diamond Accents',
    carat_weight: '~0.20 ct (Total)',
    dimensions: 'US sizes 5–8 (resizable)',
    price_range: 'On enquiry',
  },

  // ============== NEW: NECKLACES (4) ==============
  {
    slug: 'gaze-choker',
    name: 'Gaze Choker',
    collection: 'necklaces',
    short: 'Pendant choker with a singular pavé motif on a fine chain.',
    description:
      'A pavé-set pendant on a fine 18K yellow gold chain, sitting close to the collarbone. Quietly arresting.',
    metal: '18K Yellow Gold',
    stones: 'Natural Diamonds, Round Brilliant',
    carat_weight: '~0.35 ct (Total)',
    dimensions: '14"–16" adjustable',
    price_range: 'On enquiry',
    is_featured: 1,
  },
  {
    slug: 'leaf-and-teardrop',
    name: 'Leaf & Teardrop Necklace',
    collection: 'necklaces',
    short: 'Sculpted leaf above a teardrop pavé pendant.',
    description:
      'A sculpted leaf cradles a teardrop pavé pendant, suspended from a fine 18K yellow gold chain. Botanical, elegant, modern.',
    metal: '18K Yellow Gold',
    stones: 'Natural Diamonds + Coloured Centre',
    carat_weight: '~0.40 ct (Total)',
    dimensions: '16"–18" adjustable',
    price_range: 'On enquiry',
  },
  {
    slug: 'v-shape-diamond-necklace',
    name: 'V-Shape Diamond Necklace',
    collection: 'necklaces',
    short: 'Graduated V-silhouette necklace set with brilliant diamonds.',
    description:
      'A graduated V-silhouette necklace set with round-brilliant diamonds — celebratory, timeless, lengthening.',
    metal: '18K Yellow Gold',
    stones: 'Natural Diamonds, Round Brilliant',
    carat_weight: '~1.20 ct (Total)',
    dimensions: '16"–18" adjustable',
    price_range: 'On enquiry',
  },
  {
    slug: 'f1688-e',
    name: 'Pavé Pendant Necklace',
    collection: 'necklaces',
    short: 'Statement pavé pendant on a fine chain.',
    description:
      'A statement pavé pendant suspended from a fine 18K yellow gold chain. Engineered for everyday luxe.',
    metal: '18K Yellow Gold',
    stones: 'Natural Diamonds, Round Brilliant',
    carat_weight: '~0.55 ct (Total)',
    dimensions: '16" + 2" extender',
    price_range: 'On enquiry',
  },

  // ============== NEW: BRACELETS (2) ==============
  {
    slug: 'leaf-motif',
    name: 'Leaf Motif Bracelet',
    collection: 'bracelets',
    short: 'Fine chain bracelet with diamond-set leaf stations.',
    description:
      'A fine 18K yellow gold chain bracelet, set with diamond leaf stations along its length. Whisper-light, every day.',
    metal: '18K Yellow Gold',
    stones: 'Natural Diamonds, Round Brilliant',
    carat_weight: '~0.30 ct (Total)',
    dimensions: '7" adjustable',
    price_range: 'On enquiry',
    is_featured: 1,
  },
  {
    slug: 'star-charm-bracelets',
    name: 'Star Charm Bracelet',
    collection: 'bracelets',
    short: 'Articulated chain with diamond-set star charms.',
    description:
      'An articulated fine chain bracelet with diamond-set star charms suspended at intervals. Celestial, playful, refined.',
    metal: '18K Yellow Gold',
    stones: 'Natural Diamonds + White Sapphires',
    carat_weight: '~0.25 ct (Total)',
    dimensions: '7" adjustable',
    price_range: 'On enquiry',
  },
];

// Inject slug-based satin / white / model images — generated via Gemini 2.5
// Flash Image. Primary = satin (champagne gold satin backdrop);
// carousel order: satin → white → model
PRODUCTS.forEach((p) => {
  p.primary_image = `/images/products/design-${p.slug}-satin.jpg`;
  p.gallery = JSON.stringify([
    `/images/products/design-${p.slug}-satin.jpg`,
    `/images/products/design-${p.slug}-white.jpg`,
    `/images/products/design-${p.slug}-model.jpg`,
  ]);
});

let order = 0;
for (const p of PRODUCTS) {
  order++;
  const collection_id = colId(p.collection);
  const existing = get('SELECT id FROM products WHERE slug = ?', p.slug);
  const fields = [
    p.name,
    collection_id,
    p.short,
    p.description,
    p.metal,
    p.stones,
    p.carat_weight,
    p.dimensions,
    p.price_range,
    p.primary_image,
    p.gallery,
    p.is_featured ? 1 : 0,
    1,
    order,
  ];
  if (existing) {
    run(
      `UPDATE products SET name=?, collection_id=?, short_description=?, description=?, metal=?, stones=?, carat_weight=?, dimensions=?, price_range=?, primary_image=?, gallery=?, is_featured=?, is_published=?, sort_order=?, updated_at=CURRENT_TIMESTAMP WHERE id=?`,
      ...fields,
      existing.id
    );
  } else {
    run(
      `INSERT INTO products (slug, name, collection_id, short_description, description, metal, stones, carat_weight, dimensions, price_range, primary_image, gallery, is_featured, is_published, sort_order) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
      p.slug,
      ...fields
    );
  }
}

// Seed admin user
const adminEmail = process.env.ADMIN_EMAIL || 'admin@xeviadiamonds.com';
const adminPassword = process.env.ADMIN_PASSWORD || 'ChangeMe123!';
const existingAdmin = get('SELECT id FROM admins WHERE email = ?', adminEmail);
if (!existingAdmin) {
  const hash = bcrypt.hashSync(adminPassword, 10);
  run('INSERT INTO admins (email, password_hash, name) VALUES (?,?,?)', adminEmail, hash, 'Admin');
  console.log(`Created admin: ${adminEmail}`);
} else {
  console.log(`Admin already exists: ${adminEmail}`);
}

const counts = {
  collections: get('SELECT COUNT(*) AS c FROM collections').c,
  products: get('SELECT COUNT(*) AS c FROM products').c,
  settings: get('SELECT COUNT(*) AS c FROM settings').c,
  admins: get('SELECT COUNT(*) AS c FROM admins').c,
};
console.log('Seed complete:', counts);
if (require.main === module) {
  db.close();
}
