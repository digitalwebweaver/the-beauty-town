import type { ServiceDto } from '@/services/services.api';

export interface ServiceSection {
  title: string;
  images: string[];
  services: ServiceDto[];
}

interface SectionRule {
  title: string;
  images: string[];
  /** A service belongs to the first rule (in array order) whose test matches. */
  test: (service: ServiceDto) => boolean;
  /**
   * Where this section renders on the page, top to bottom — independent of
   * this rule's position above. The services API returns services sorted
   * alphabetically by name, so without an explicit display order sections
   * would appear in whatever order their first alphabetical service happens
   * to hit a rule (e.g. "Acrylic Extension" would put Nail Art first) —
   * matching the real site's own section order instead.
   */
  order: number;
}

const nameMatches = (re: RegExp) => (s: ServiceDto) => re.test(s.name);
const inCategory = (key: string) => (s: ServiceDto) => s.category_key === key;

// Array order below governs MATCHING priority only — more specific patterns
// (tiered hair colour/texture, named wax types, etc.) must come before the
// generic per-category catch-alls they'd otherwise fall into. A catch-all is
// always scoped to its own category (never a bare `true`) — otherwise it
// would swallow every later category's leftovers too, since rules are tried
// in one flat list. Each rule's `order` field (not its array position)
// governs the section's actual DISPLAY order — see groupIntoSections.
const FEMALE_RULES: SectionRule[] = [
  {
    title: 'Hair Texture',
    images: ['/brand/services/female/hair-texture.avif'],
    test: nameMatches(/^(Rebonding|Smoothening|Hair Botox|Nanoplastia)\s*\(/),
    order: 2,
  },
  {
    title: 'Hair Wash & Blow Dry',
    images: ['/brand/services/female/hair-wash.avif', '/brand/services/female/blow-dry.avif'],
    test: nameMatches(/^Hair Wash & Blow Dry\s*\(/),
    order: 4,
  },
  {
    title: 'Hair Colour',
    images: ['/brand/services/female/hair-colour.avif', '/brand/services/female/hair-colour1.avif'],
    test: nameMatches(
      /^(Root Touch Up|Ammonia Free Root Touch Up|Global Colour|Pre-Lightening|Highlights Per Streak|Highlights Creative Colour|Tropical Highlights|Balayage|All Types Creative Hair Colour)/
    ),
    order: 5,
  },
  {
    title: 'Hair Spa',
    images: ['/brand/services/female/hair-spa.avif'],
    test: nameMatches(/Hair Spa/i),
    order: 3,
  },
  {
    title: 'Female Hair',
    images: ['/brand/services/female/hair.avif'],
    test: inCategory('female-hair'), // catch-all remainder of the hair category
    order: 1,
  },
  {
    title: 'Threading',
    images: ['/brand/services/female/threading.avif'],
    test: nameMatches(/Threading$/),
    order: 6,
  },
  {
    title: 'Wax (Honey Wax)',
    images: ['/brand/services/female/wax-honey.avif'],
    test: nameMatches(/Wax \(Honey\)$/),
    order: 8,
  },
  {
    title: 'Liposoluble Wax',
    images: ['/brand/services/female/wax-liposoluble.avif'],
    test: nameMatches(/Wax \(Liposoluble\)$/),
    order: 9,
  },
  {
    title: 'Detan / Scrub',
    images: ['/brand/services/female/detan.avif'],
    test: nameMatches(/Detan\/Scrub$/),
    order: 10,
  },
  {
    title: 'Mask',
    images: ['/brand/services/female/mask.avif'],
    test: nameMatches(/Mask$/),
    order: 13,
  },
  {
    title: 'Bleach',
    images: ['/brand/services/female/bleach.avif'],
    test: nameMatches(/Bleach$/),
    order: 18,
  },
  {
    title: 'Facial (Advance)',
    images: ['/brand/services/female/facial-advance.avif'],
    test: nameMatches(/^Facial \(Advance\)/),
    order: 14,
  },
  {
    title: 'Facial (Premium)',
    images: ['/brand/services/female/facial-premium.avif'],
    test: nameMatches(/^Facial \(Premium\)/),
    order: 15,
  },
  {
    title: 'Facial (Exclusive)',
    images: ['/brand/services/female/facial-exclusive.avif'],
    test: nameMatches(/^Facial \(Exclusive\)/),
    order: 16,
  },
  {
    title: 'Nail Art',
    images: ['/brand/services/female/nail-art.avif', '/brand/services/female/nail-art-2.avif'],
    test: nameMatches(
      /^(Express Nail Art|Normal Nail Paint|Gel Polish|Normal Paint Remover|Gel Paint Remover|Semi Remover Extension|Acrylic Remover|One Finger Art|Ombre Nail Art|Refilling Acrylic|Refilling Gel|Semi Extension|Acrylic Extension|Gel Extension)/
    ),
    order: 17,
  },
  {
    title: 'Hands Feet Zone',
    images: ['/brand/services/female/hands-feet.avif', '/brand/services/female/hands-feet-2.avif'],
    test: inCategory('female-nails'), // catch-all remainder of the nails category
    order: 11,
  },
  {
    title: 'Body',
    images: ['/brand/services/female/body.avif'],
    test: nameMatches(
      /^(Basic Body Massage|Premium Body Massage|Body Reflexology|Detoxifying Pack & Wrap|Body Polish)$/
    ),
    order: 12,
  },
  {
    title: 'Massage',
    images: ['/brand/services/female/massage.avif'],
    // Not anchored to the end — e.g. "Head Massage (Spa)" still belongs here.
    test: nameMatches(/Massage/),
    order: 7,
  },
  {
    title: 'Make Up',
    images: ['/brand/services/female/makeup.avif'],
    test: inCategory('female-makeup'),
    order: 19,
  },
];

const MALE_RULES: SectionRule[] = [
  {
    title: 'Hair Wash & Blow Dry',
    images: ['/brand/services/male/blow-dry.avif'],
    test: nameMatches(/^Hair Wash & Blow Dry\s*\(/),
    order: 2,
  },
  {
    title: 'Hair Spa',
    images: ['/brand/services/male/hair-spa.avif'],
    test: nameMatches(/Hair Spa/i),
    order: 3,
  },
  {
    title: 'Male Hair',
    images: ['/brand/services/male/hair.avif'],
    test: inCategory('male-hair'), // catch-all remainder of the hair category
    order: 1,
  },
  {
    title: 'Grooming',
    images: ['/brand/services/male/hair.avif'],
    test: inCategory('male-grooming'),
    order: 1.5,
  },
  {
    title: 'Wax',
    images: ['/brand/services/male/wax.avif'],
    test: nameMatches(/Wax \(Honey\)$/),
    order: 4,
  },
  {
    title: 'Liposoluble Wax',
    images: ['/brand/services/male/wax-liposoluble.avif'],
    test: nameMatches(/Wax \(Liposoluble\)$/),
    order: 5,
  },
  {
    title: 'Detan / Scrub',
    images: ['/brand/services/male/detan.avif'],
    test: nameMatches(/Detan\/Scrub$/),
    order: 6,
  },
  {
    title: 'Mask',
    images: ['/brand/services/male/mask.avif'],
    test: nameMatches(/Mask$/),
    order: 10,
  },
  {
    title: 'Facial (Basic)',
    images: ['/brand/services/male/facial-basic.avif'],
    test: nameMatches(/^Facial \(Basic\)/),
    order: 12,
  },
  {
    title: 'Facial (Premium)',
    images: ['/brand/services/male/facial-premium.avif'],
    test: nameMatches(/^Facial \(Premium\)/),
    order: 13,
  },
  {
    title: 'Facial (Advance)',
    images: ['/brand/services/male/facial-advance.avif'],
    test: nameMatches(/^Facial \(Advance\)/),
    order: 14,
  },
  {
    title: 'Hands Feet Zone',
    images: ['/brand/services/male/hands-feet.webp'],
    test: inCategory('male-nails'),
    order: 7,
  },
  {
    title: 'Reflexology',
    images: ['/brand/services/male/reflexology.avif'],
    test: nameMatches(/Reflexology$/),
    order: 9,
  },
  {
    title: 'Body',
    images: ['/brand/services/male/body.avif'],
    test: nameMatches(
      /^(Basic Body Massage|Premium Body Massage|Body Polish|Detoxifying Pack & Wrap)$/
    ),
    order: 8,
  },
  {
    title: 'Massage',
    images: ['/brand/services/male/massage.avif'],
    // Not anchored to the end — e.g. "Head Massage (Spa)" still belongs here.
    test: nameMatches(/Massage/),
    order: 11,
  },
];

// Each service is filed under exactly one section (first matching rule,
// array order), then sections are emitted in their intended DISPLAY order
// (each rule's `order` field) rather than the order they were first
// encountered — see the SectionRule.order doc comment above for why that
// distinction matters.
export function groupIntoSections(
  services: ServiceDto[],
  gender: 'male' | 'female'
): ServiceSection[] {
  const rules = gender === 'male' ? MALE_RULES : FEMALE_RULES;
  const sections = new Map<string, ServiceSection & { order: number }>();

  for (const service of services) {
    const rule = rules.find((r) => r.test(service));
    if (!rule) continue;
    let section = sections.get(rule.title);
    if (!section) {
      section = { title: rule.title, images: rule.images, services: [], order: rule.order };
      sections.set(rule.title, section);
    }
    section.services.push(service);
  }

  return Array.from(sections.values()).sort((a, b) => a.order - b.order);
}
