import { Link } from 'react-router-dom';
import { ArrowRight, ArrowUpRight, Star } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import FallbackImage from '@/components/common/FallbackImage';
import { ROUTES } from '@/constants/routes';
import { useAuth } from '@/hooks/useAuth';

// This page mirrors thebeautytownsalon.com's real homepage — same section
// order, same copy, same photos (hosted locally from her site under
// /public/brand so the page doesn't depend on the reference site staying
// up). The only additions are the booking CTAs, which the reference site
// doesn't need since it has no booking flow of its own.

const ESTEEMED_CLIENTS = [
  { name: 'Tanishq', logo: '/brand/clients/tanishq.png' },
  { name: 'Nutty Affair', logo: '/brand/clients/nutty-affair.png' },
  { name: 'SRD Jewel', logo: '/brand/clients/srd-jewel.png' },
  { name: 'Aura Jewels', logo: '/brand/clients/aura.png' },
  { name: 'Sequinze', logo: '/brand/clients/sequinze.png' },
  { name: 'Gauri Alkapuri', logo: '/brand/clients/gauri.webp' },
  { name: 'Sara Gandevikar Jewellers', logo: '/brand/clients/sara.png' },
  { name: 'The IOS Store', logo: '/brand/clients/ios-store.png' },
  { name: 'Pandav', logo: '/brand/clients/pandav.png' },
];

// All converted to WebP (was a mix of unoptimized PNG/JPEG — some PNGs
// were 90%+ smaller as photographic WebP) — see Phase 5 of the
// production-readiness plan.
const ACHIEVEMENT_PHOTOS = [
  '/brand/gallery/achievements/1.webp',
  '/brand/gallery/achievements/2.webp',
  '/brand/gallery/achievements/3.webp',
  '/brand/gallery/achievements/4.webp',
  '/brand/gallery/achievements/5.webp',
];

const CELEBRITY_PHOTOS = [
  '/brand/gallery/celebrity/2.webp',
  '/brand/gallery/celebrity/3.webp',
  '/brand/gallery/celebrity/5.webp',
  '/brand/gallery/celebrity/9.webp',
  '/brand/gallery/celebrity/10.webp',
  '/brand/gallery/celebrity/12.webp',
  '/brand/gallery/celebrity/14.webp',
  '/brand/gallery/celebrity/15.webp',
  '/brand/gallery/celebrity/design-15.webp',
  '/brand/gallery/celebrity/design-16.webp',
];

// Eyebrow + heading pair, reused across every section on this page.
function SectionEyebrow({
  label,
  title,
  onDark,
  center,
}: {
  label: string;
  title: string;
  onDark?: boolean;
  center?: boolean;
}) {
  return (
    <div className={center ? 'text-center' : ''}>
      <p
        className={`text-xs font-semibold uppercase tracking-[0.2em] ${onDark ? 'text-brand-gold' : 'text-brand-maroon'}`}
      >
        {label}
      </p>
      <h2
        className={`mt-2 font-display text-3xl font-semibold md:text-4xl ${onDark ? 'text-white' : 'text-foreground'}`}
      >
        {title}
      </h2>
    </div>
  );
}

function HomePage() {
  const { isAuthenticated, role } = useAuth();
  const bookHref = isAuthenticated && role === 'customer' ? ROUTES.book : ROUTES.guestBook;

  return (
    <div>
      {/* ---------- Hero ---------- */}
      <section className="relative overflow-hidden bg-brand-maroon-dark">
        <div className="mx-auto grid min-h-[85vh] max-w-7xl lg:grid-cols-[minmax(0,480px)_1fr]">
          <div className="relative z-10 flex flex-col justify-end px-4 py-14 md:px-8 md:py-16">
            <h1 className="font-display text-3xl font-semibold leading-tight text-white md:text-4xl">
              Makeup Studio in Vadodara &ndash; Where Beauty Meets Confidence.
            </h1>
            <p className="mt-5 max-w-md text-white/75">
              Experience luxury, expert care, and a personalized touch to enhance your beauty and
              boost your confidence every day.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Button
                size="lg"
                asChild
                className="bg-brand-gold text-brand-maroon-dark hover:bg-brand-gold/90"
              >
                <Link to={bookHref}>
                  Book Appointment
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
              <Button
                size="lg"
                variant="outline"
                asChild
                className="border-white/30 bg-transparent text-white hover:bg-white/10 hover:text-white"
              >
                <Link to={ROUTES.services}>Explore Services</Link>
              </Button>
            </div>
          </div>

          <div className="relative min-h-[320px]">
            <FallbackImage
              src="/brand/hero-bg.webp"
              alt="Golden ballroom interior with chandeliers and ornate details"
              className="absolute inset-0 h-full w-full object-cover"
              loading="eager"
              fetchPriority="high"
            />
            <img
              src="/brand/hero-couple.webp"
              alt="Bride and groom in traditional Indian wedding attire, styled by The Beauty Town"
              className="absolute bottom-0 right-[6%] h-[92%] w-auto object-contain drop-shadow-2xl"
              loading="eager"
              fetchPriority="high"
            />
            <div className="absolute inset-0 bg-gradient-to-r from-brand-maroon-dark via-brand-maroon-dark/10 to-transparent lg:bg-gradient-to-r lg:from-brand-maroon-dark lg:via-transparent lg:to-transparent" />
          </div>
        </div>
      </section>

      {/* ---------- Founder ---------- */}
      <section className="mx-auto max-w-7xl px-4 py-20 md:px-8">
        <div className="grid gap-12 lg:grid-cols-[380px_1fr] lg:items-center">
          <FallbackImage
            src="/brand/payal-shah.webp"
            alt="Payal Shah"
            className="mx-auto aspect-[4/5] w-full max-w-sm rounded-2xl border-4 border-brand-cream object-cover shadow-xl"
          />

          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-maroon">
              Founder The Beauty Town
            </p>
            <h2 className="mt-2 font-display text-3xl font-semibold md:text-4xl">Payal Shah</h2>
            <p className="mt-1 text-sm font-medium text-muted-foreground">
              Celebrity Makeup Artist | Educator Cosmetologist
            </p>
            <p className="mt-5 max-w-2xl text-muted-foreground">
              Payal Shah, a renowned celebrity and Bridal makeup artist with over 15 years of
              experience, is celebrated for her exceptional bridal makeup artistry. Based in
              Vadodara, she owns a flourishing Makeup Studio and Salon that has become a go-to
              destination for beauty enthusiasts. Additionally, Payal runs a prestigious academy
              offering professional training in makeup, hair, skin, and nails, empowering aspiring
              artists to excel in the beauty industry. Her collaborations with leading brands,
              celebrity clientele, and engaging seminars have established her as a prominent and
              trusted figure in the beauty world. Payal&apos;s dedication and expertise continue to
              inspire and redefine beauty standards.
            </p>
            <Button asChild className="mt-5 bg-brand-maroon text-white hover:bg-brand-maroon/90">
              <Link to={ROUTES.about}>
                Read More <ArrowUpRight className="ml-1.5 h-4 w-4" />
              </Link>
            </Button>

            <div className="mt-8 grid grid-cols-2 gap-6 border-t pt-6 sm:grid-cols-3 md:grid-cols-5">
              {[
                { n: '15+', l: 'Years of Expertise' },
                { n: '35+', l: 'Celebrities Styled' },
                { n: '45+', l: 'Skincare Experts' },
                { n: '1000+', l: 'Makeovers' },
                { n: '120+', l: 'Treatments' },
              ].map((s) => (
                <div key={s.l}>
                  <p className="font-display text-2xl font-semibold text-brand-maroon">{s.n}</p>
                  <p className="mt-1 text-xs text-muted-foreground">{s.l}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ---------- Achievements ---------- */}
      <section className="bg-brand-cream">
        <div className="mx-auto max-w-7xl px-4 py-20 md:px-8">
          <div className="grid gap-12 lg:grid-cols-[380px_1fr] lg:items-start">
            <div>
              <FallbackImage
                src={ACHIEVEMENT_PHOTOS[0]}
                alt="Payal Shah receiving an award on stage at a formal event"
                className="aspect-square w-full rounded-2xl object-cover shadow-lg"
              />
              <div className="mt-4 grid grid-cols-3 gap-3 sm:grid-cols-4">
                {ACHIEVEMENT_PHOTOS.slice(1).map((src, i) => (
                  <FallbackImage
                    key={i}
                    src={src}
                    alt="Payal Shah at an award ceremony"
                    className="aspect-square w-full rounded-lg object-cover shadow-sm"
                  />
                ))}
              </div>
            </div>

            <div>
              <SectionEyebrow label="The Beauty Town" title="Our Achievements" />
              <div className="mt-5 space-y-4 text-muted-foreground">
                <p>
                  Payal Shah is an internationally certified celebrity makeup artist and
                  cosmetologist, recognized for her expertise and artistry. Her excellence has been
                  acknowledged by renowned personalities, as she has been awarded by legendary
                  singer Udit Narayan and celebrated Bollywood actresses Mahima Chaudhary, Sonali
                  Sehgal, Nikita Dutta, Garima Goel, Riaa Sen, Valimaa Hussain, and Ishita Dutta.
                  These honors not only highlight her exceptional talent but also showcase the
                  industry&apos;s appreciation for her contribution to the world of beauty and
                  glamour.
                </p>
                <p>
                  In addition to this prestigious win, Payal has also earned recognition in various
                  other accolades that highlight her immense talent and contribution to the beauty
                  and fashion industry. She has been awarded at the Nidhi Foundation 3 Star Seminar
                  as the Best Makeup Artist, further showcasing her exceptional skills in the beauty
                  industry. Her association as the Beauty Partner and Makeup Artist for
                  Gujarat&apos;s Top Model Seasons 3, 4, 5, and 6 reflects the trust placed in her
                  abilities and her longstanding reputation in the industry. Furthermore,
                  Payal&apos;s expertise has been acknowledged with her role as a judge at
                  prestigious events such as the Samast Rajasthan Jain Yuva Sangathan and The
                  Diamond City Beauty Carnival.
                </p>
                <p>
                  Her incredible journey also includes receiving the Indian Star&apos;s Award 2023
                  for Celebrity Makeup Artist, which stands as a testament to her success and impact
                  in the industry. Other recognitions include the Gujarati Virla Award and the
                  Indian Star&apos;s Award for Makeup Artist, both of which reinforce her position
                  as a top professional in her field. Additionally, her affiliation with the Beauty
                  Club Association (BCAI) speaks to her continued dedication to shaping and
                  advancing the beauty and modeling industry.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ---------- Esteemed clients ---------- */}
      <section className="bg-brand-cream">
        <div className="mx-auto max-w-7xl px-4 pb-14 md:px-8">
          <SectionEyebrow label="The Beauty Town" title="Our Esteemed Client" center />
        </div>
        <div className="border-y bg-background">
          <div className="mx-auto grid max-w-7xl grid-cols-2 divide-x divide-y sm:grid-cols-3 md:grid-cols-5 lg:grid-cols-9 lg:divide-y-0">
            {ESTEEMED_CLIENTS.map((c) => (
              <div key={c.name} className="flex items-center justify-center p-6">
                <img
                  src={c.logo}
                  alt={c.name}
                  className="h-14 w-full object-contain"
                  title={c.name}
                />
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ---------- Testimonial ---------- */}
      <section className="bg-brand-cream py-20">
        <div className="mx-auto max-w-7xl px-4 md:px-8">
          <div className="mb-10 flex flex-wrap items-end justify-between gap-6">
            <SectionEyebrow label="The Beauty Town" title="Testimonial" />
            <div className="flex items-center gap-3 rounded-xl border bg-background px-4 py-3">
              <Badge className="border-none bg-brand-maroon/10 text-brand-maroon">GOOD</Badge>
              <div>
                <div className="flex">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Star key={i} className="h-3.5 w-3.5 fill-brand-maroon text-brand-maroon" />
                  ))}
                </div>
                <p className="text-xs text-muted-foreground">Based on 226 Google reviews</p>
              </div>
            </div>
          </div>

          <div className="grid gap-6 md:grid-cols-2">
            {[
              {
                name: 'Divya Shah',
                when: '1 year ago',
                quote:
                  'I was a bit skeptical about getting makeup done as a bride, but Payal Shah at Beauty Town made me feel completely at ease. They listened to my concerns, understood my vision, and delivered a flawless look.',
              },
              {
                name: 'Kalyani Patel',
                when: '1 year ago',
                quote:
                  'I had a great experience getting ready for my wedding functions. A special mention to Payal, the makeup artist who made me look gorgeous — highly recommend Beauty Town.',
              },
            ].map((t) => (
              <Card key={t.name}>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <Avatar>
                        <AvatarFallback>{t.name.slice(0, 2)}</AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="text-sm font-semibold">{t.name}</p>
                        <div className="flex">
                          {Array.from({ length: 5 }).map((_, i) => (
                            <Star key={i} className="h-3 w-3 fill-brand-maroon text-brand-maroon" />
                          ))}
                        </div>
                      </div>
                    </div>
                    <span className="text-xs text-muted-foreground">{t.when}</span>
                  </div>
                  <p className="mt-4 text-sm text-muted-foreground">&ldquo;{t.quote}&rdquo;</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* ---------- Celebrity ---------- */}
      <section className="bg-brand-cream pb-20">
        <div className="mx-auto max-w-7xl px-4 md:px-8">
          <SectionEyebrow label="The Beauty Town" title="Celebrity" center />
        </div>
        <div className="mt-10 flex gap-4 overflow-x-auto px-4 pb-2 md:px-8">
          {CELEBRITY_PHOTOS.map((src, i) => (
            <FallbackImage
              key={i}
              src={src}
              alt={`Celebrity association ${i + 1}`}
              className="h-64 w-64 flex-shrink-0 rounded-xl object-cover shadow-sm"
            />
          ))}
        </div>
      </section>
    </div>
  );
}

export default HomePage;
