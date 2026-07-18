// One-off script: migrates the hardcoded CATEGORIES (ProductCategories.jsx)
// and PRODUCTS (Shop.jsx) arrays into the Airtable base. Not idempotent —
// running twice will create duplicate records.
//
// Two fields didn't exist in the original hardcoded data and are seeded
// with placeholder best-guesses that should be reviewed/edited directly in
// Airtable (that's the whole point of Airtable being the source of truth
// going forward):
//   - Sizes / Colours: the old PRODUCTS array had no per-product size or
//     colour options at all. Seeded with generic placeholders per product
//     type (blanket/duvet sizes, sock sizes, a generic colour set).
//   - Customisable: inferred from each product's description/tag ("Any
//     Design" / customer-supplied wording => true; a single fixed motif
//     with no customer input mentioned => false). This directly controls
//     whether a customer sees the requirements/build/file-upload page
//     (§3), so it's a real business decision, not just cosmetic — double
//     check these five before relying on them:
//       Minimalist Line Art -> false, Embroidered Duvet Cover -> false,
//       everything else -> true.
require("dotenv").config();
const Airtable = require("airtable");

const API_KEY = process.env.AIRTABLE_API_KEY;
const BASE_ID = process.env.AIRTABLE_BASE_ID;
const base = new Airtable({ apiKey: API_KEY }).base(BASE_ID);

const BLANKET_SIZES = ["Single", "Double", "Queen", "King"];
const HOME_TEXTILE_SIZES = ["Standard", "King"];
const SOCK_SIZES = ["Small", "Medium", "Large"];
const GENERIC_COLOURS = ["Cream", "Grey", "Charcoal", "Navy", "Blush"];

const CATEGORIES = [
  {
    Slug: "blanket-budget",
    Label: "Budget Blankets",
    Headline: "Any design. Any photo. Yours.",
    Body: "Sublimation printing lets you put literally anything on your blanket — family portraits, pet photos, custom illustrations, gradients, full-colour patterns. No design restrictions, incredibly vibrant results.",
    Callout: "From R45 · Any Design",
    Alt: "Colourful custom sublimation blanket draped over a couch",
    "Sort Order": 0,
  },
  {
    Slug: "blanket-premium",
    Label: "Premium Blankets",
    Headline: "Restraint, elevated to an art.",
    Body: "Our premium blankets are hand-embroidered with a single motif — a monogram, a minimal line illustration, a small crest. Nothing more. The luxury is in the material and the precision of the stitch.",
    Callout: "From R120 · Minimalist Only",
    Alt: "Cream wool blanket with delicate monogram embroidery",
    "Sort Order": 1,
  },
  {
    Slug: "home-budget",
    Label: "Budget Home Textiles",
    Headline: "Your bedroom, your canvas.",
    Body: "Sublimation-printed pillow cases and duvet covers let you bring any photo or pattern to your living space. Full-colour, wash-resistant, and made to last. Great for personal use and gifting.",
    Callout: "Pillows from R25 · Duvets from R180",
    Alt: "Colourful custom printed duvet cover on a bed",
    "Sort Order": 2,
  },
  {
    Slug: "home-premium",
    Label: "Premium Home Textiles",
    Headline: "The quiet beauty of a single stitch.",
    Body: "Embroidered pillow cases and duvet covers in quality cotton. One motif, precisely placed. For those who believe that restraint is the ultimate luxury.",
    Callout: "Pillows from R85 · Duvets from R350",
    Alt: "Minimal cream duvet with embroidered accent",
    "Sort Order": 3,
  },
  {
    Slug: "socks",
    Label: "Custom Socks",
    Headline: "Your artwork, wrapped around every step.",
    Body: "Sublimation socks with edge-to-edge colour fidelity. Submit any design — patterns, portraits, logos, memes — and we print it faithfully onto a comfortable cotton-blend base.",
    Callout: "From R18 · Any Design",
    Alt: "Brightly patterned custom sublimation socks on a wooden surface",
    "Sort Order": 4,
  },
];

const PRODUCTS = [
  {
    Name: "Custom Photo Blanket",
    Category: "blanket-budget",
    Subtitle: "Budget · Sublimation",
    Price: 45,
    Tag: "Any Design",
    Rating: 4.8,
    Reviews: 124,
    "Image Fallback Colour": "#C4A882",
    Badge: "Most Popular",
    Description: "Full-colour sublimation print. Upload any photo, pattern or artwork.",
    Sizes: BLANKET_SIZES,
    Colours: GENERIC_COLOURS,
    Customisable: true,
    Active: true,
  },
  {
    Name: "Pattern Throw",
    Category: "blanket-budget",
    Subtitle: "Budget · Sublimation",
    Price: 55,
    Tag: "Any Design",
    Rating: 4.7,
    Reviews: 89,
    "Image Fallback Colour": "#B8956A",
    Badge: null,
    Description: "Vivid all-over pattern printing on a soft, lightweight fleece throw.",
    Sizes: BLANKET_SIZES,
    Colours: GENERIC_COLOURS,
    Customisable: true,
    Active: true,
  },
  {
    Name: "Monogram Blanket",
    Category: "blanket-premium",
    Subtitle: "Premium · Embroidered",
    Price: 120,
    Tag: "Minimalist",
    Rating: 5.0,
    Reviews: 42,
    "Image Fallback Colour": "#D4C4A8",
    Badge: "Handcrafted",
    Description: "Precision thread embroidery of your initials or a simple monogram on a luxury wool-blend.",
    Sizes: BLANKET_SIZES,
    Colours: GENERIC_COLOURS,
    Customisable: true,
    Active: true,
  },
  {
    Name: "Minimalist Line Art",
    Category: "blanket-premium",
    Subtitle: "Premium · Embroidered",
    Price: 140,
    Tag: "Minimalist",
    Rating: 4.9,
    Reviews: 31,
    "Image Fallback Colour": "#C8B89A",
    Badge: null,
    Description: "Single-colour line illustration embroidered cleanly on a neutral ground. Timeless.",
    Sizes: BLANKET_SIZES,
    Colours: GENERIC_COLOURS,
    Customisable: false,
    Active: true,
  },
  {
    Name: "Custom Ankle Socks",
    Category: "socks",
    Subtitle: "Socks · Sublimation",
    Price: 18,
    Tag: "Any Design",
    Rating: 4.8,
    Reviews: 211,
    "Image Fallback Colour": "#9A7B5C",
    Badge: "Best Seller",
    Description: "Full-wrap sublimation on premium cotton-blend. Your design, exactly.",
    Sizes: SOCK_SIZES,
    Colours: GENERIC_COLOURS,
    Customisable: true,
    Active: true,
  },
  {
    Name: "Custom Crew Socks",
    Category: "socks",
    Subtitle: "Socks · Sublimation",
    Price: 22,
    Tag: "Any Design",
    Rating: 4.9,
    Reviews: 178,
    "Image Fallback Colour": "#8A6B4E",
    Badge: null,
    Description: "Crew-length with edge-to-edge print. Ideal for gifting, teams, or personal expression.",
    Sizes: SOCK_SIZES,
    Colours: GENERIC_COLOURS,
    Customisable: true,
    Active: true,
  },
  {
    Name: "Custom Pillow Case",
    Category: "pillow-budget",
    Subtitle: "Budget · Sublimation",
    Price: 25,
    Tag: "Any Design",
    Rating: 4.7,
    Reviews: 66,
    "Image Fallback Colour": "#BFA882",
    Badge: null,
    Description: "Sublimation-printed pillow case with vibrant, wash-resistant colour on a smooth polyester cover.",
    Sizes: HOME_TEXTILE_SIZES,
    Colours: GENERIC_COLOURS,
    Customisable: true,
    Active: true,
  },
  {
    Name: "Embroidered Pillow Case",
    Category: "pillow-premium",
    Subtitle: "Premium · Embroidered",
    Price: 85,
    Tag: "Minimalist",
    Rating: 4.9,
    Reviews: 19,
    "Image Fallback Colour": "#D8CCBA",
    Badge: "Handcrafted",
    Description: "Crisp cotton pillow case with a hand-embroidered monogram or minimal motif. A quiet luxury.",
    Sizes: HOME_TEXTILE_SIZES,
    Colours: GENERIC_COLOURS,
    Customisable: true,
    Active: true,
  },
  {
    Name: "Custom Duvet Cover",
    Category: "duvet-budget",
    Subtitle: "Budget · Sublimation",
    Price: 180,
    Tag: "Any Design",
    Rating: 4.6,
    Reviews: 38,
    "Image Fallback Colour": "#C4A86E",
    Badge: "New",
    Description: "Full-surface sublimation on a soft microfibre duvet cover. Make your bedroom entirely your own.",
    Sizes: BLANKET_SIZES,
    Colours: GENERIC_COLOURS,
    Customisable: true,
    Active: true,
  },
  {
    Name: "Embroidered Duvet Cover",
    Category: "duvet-premium",
    Subtitle: "Premium · Embroidered",
    Price: 350,
    Tag: "Minimalist",
    Rating: 5.0,
    Reviews: 9,
    "Image Fallback Colour": "#E0D4BC",
    Badge: "Luxury",
    Description: "100% cotton duvet cover with a single refined embroidered motif. Understated, enduring quality.",
    Sizes: BLANKET_SIZES,
    Colours: GENERIC_COLOURS,
    Customisable: false,
    Active: true,
  },
];

function chunk(arr, size) {
  const out = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

async function createAll(tableName, records) {
  const created = [];
  for (const batch of chunk(records, 10)) {
    const result = await base(tableName).create(
      batch.map((fields) => ({ fields })),
      { typecast: true },
    );
    created.push(...result);
  }
  return created;
}

async function main() {
  if (!API_KEY || !BASE_ID) {
    console.error("AIRTABLE_API_KEY and AIRTABLE_BASE_ID must be set in server/.env");
    process.exit(1);
  }

  console.log("Seeding Categories...");
  const categories = await createAll("Categories", CATEGORIES);
  console.log(`Created ${categories.length} categories.`);

  console.log("Seeding Products...");
  const products = await createAll("Products", PRODUCTS);
  console.log(`Created ${products.length} products.`);
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
