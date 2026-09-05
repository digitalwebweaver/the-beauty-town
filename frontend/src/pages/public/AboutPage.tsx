import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Play } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import SectionError from '@/components/common/SectionError';
import ImageCarousel from '@/components/common/ImageCarousel';
import { ROUTES } from '@/constants/routes';
import { imageUrl } from '@/lib/imageUrl';
import { useStaff } from '@/services/staff.api';

// Content, photos, and copy below are scraped verbatim from
// thebeautytownsalon.com/about-us/ (fetched 2026-09-05) — the user asked
// for this page to match the real site exactly.
const HERO_AWARD_IMAGES = [
  '/brand/about/hero-award-1.png',
  '/brand/about/hero-award-2.png',
  '/brand/about/hero-award-3.png',
  '/brand/about/hero-award-4.jpg',
  '/brand/about/hero-award-5.jpg',
];

const OUR_STORY_IMAGES = ['/brand/about/our-story-1.jpeg', '/brand/about/our-story-2.jpeg'];

const GALLERY_IMAGES = [
  '/brand/about/gallery-slider-1.png',
  '/brand/about/gallery-slider-4.png',
  '/brand/about/gallery-slider-6.png',
  '/brand/about/gallery-slider-8.png',
  '/brand/about/gallery-salon-1.jpg',
  '/brand/about/gallery-salon-2.jpg',
  '/brand/about/gallery-salon-3.jpg',
  '/brand/about/gallery-salon-4.jpg',
  '/brand/about/gallery-salon-5.jpg',
  '/brand/about/gallery-salon-6.jpg',
  '/brand/about/gallery-salon-7.jpg',
  '/brand/about/gallery-salon-8.jpg',
  '/brand/about/gallery-salon-9.jpg',
  '/brand/about/gallery-salon-10.jpg',
];

const RISHIKA_BIO = [
  'Welcome to The Beauty Town, where elegance meets innovation. Founded by passionate visionaries, our mission is to redefine beauty standards and empower individuals to express themselves confidently.',
  'At the heart of The Beauty Town is our talented Co-founder Rishika Shah, a celebrated Fashion Designer and Internationally Certified Makeup Artist In Vadodara. With a keen eye for aesthetics and a dedication to perfection, she brings a unique blend of artistry and professionalism to every project. Her international certifications and extensive experience have established her as a trusted name in the beauty and fashion industry.',
  'Rishika Shah believes in the transformative power of beauty. Her approach combines creativity, Advanced techniques, and a deep understanding of individual styles to create looks that are not only stunning but also empowering.',
  "Whether you're here to discover our premium services, seek inspiration, or embark on a journey of self-expression, know that you're in expert hands. Welcome to The Beauty Town, where your beauty is our passion.",
];

const WHY_CHOOSE_US = [
  {
    title: 'Celebrity Expertise',
    body: 'Led by the renowned Payal Shah, an internationally certified makeup artist and educator with over 15 years of experience.',
  },
  {
    title: 'Trusted by Many',
    body: 'Over 700 brides, 35+ celebrities, and 250+ students trained under our academy.',
  },
  {
    title: 'Comprehensive Services',
    body: "From expert hair treatments to luxurious bridal makeup, we've got you covered.",
  },
  {
    title: 'Top-Notch Academy',
    body: 'Learn from the best in the industry with our specialized courses in makeup, hair, skin, and nails.',
  },
];

const OUR_SERVICES = [
  { title: 'Bridal Makeup', body: 'Perfecting your look for your special day.' },
  { title: 'Hair Treatments & Styling', body: 'Expert solutions for healthy, radiant hair.' },
  { title: 'Skin & Nail Care', body: 'Indulge in luxury treatments designed for you.' },
  {
    title: 'Cosmetology Academy',
    body: 'Learn the art of beauty and makeup from the experts.',
  },
];

const OUR_STORY_PARAGRAPHS = [
  "Under the visionary leadership of Payal Shah, The Beauty Town has become a trusted name in the beauty industry. Located in Vadodara, we provide a wide range of salon services, along with high-quality training programs in our academy. Payal Shah's unmatched expertise and passion for beauty have transformed countless lives, making her a sought-after name for weddings, celebrity events, and professional training. With a commitment to quality and perfection, The Beauty Town is more than a salon – it's your go-to destination for all things beauty.",
  'Our journey began with a single goal – to build the Best Unisex Salon in Vadodara where every client feels truly cared for. Today we are proud to serve brides, grooms, and everyday clients as a leading Beauty Salon in Alkapuri Vadodara. From bridal transformations to relaxing skin treatments, we cover it all under one roof – recognised as a top Bridal Salon in Vadodara in the region.',
];

function AboutPage() {
  const [videoOpen, setVideoOpen] = useState(false);
  const { data: staff, isLoading, isError, refetch } = useStaff();

  return (
    <div>
      {/* Hero */}
      <section className="bg-brand-cream">
        <div className="mx-auto grid max-w-7xl gap-10 px-4 py-14 md:grid-cols-2 md:items-center md:px-8 md:py-20">
          <ImageCarousel
            images={HERO_AWARD_IMAGES}
            alt="Payal Shah receives an award from a celebrity at a formal event"
            className="aspect-[4/5] w-full max-w-md rounded-2xl shadow-md"
          />

          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-maroon">
              Transforming beauty
            </p>
            <h1 className="mt-3 font-display text-4xl font-semibold text-brand-maroon-dark md:text-5xl">
              About The Beauty Town - Trusted Makeup Artist in Vadodara
            </h1>
            <p className="mt-4 text-muted-foreground">
              Welcome to The Beauty Town, where every client receives expert care and personalized
              attention. With a strong focus on enhancing your natural charm, we offer top-notch
              services to nourish, repair, and rejuvenate your beauty. Whether it&apos;s a glowing
              complexion, revitalized hair, or elegant styling, we are committed to bringing out the
              best in you. Step into a world where beauty meets expertise and experience treatments
              designed just for you.
            </p>

            <button
              type="button"
              onClick={() => setVideoOpen(true)}
              className="group relative mt-6 block aspect-video w-full overflow-hidden rounded-2xl shadow-md"
            >
              <img
                src="/brand/about/hero-video-poster.jpg"
                alt="Watch The Beauty Town's video"
                className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
              />
              <span className="absolute inset-0 bg-black/25 transition-colors group-hover:bg-black/35" />
              <span className="absolute inset-0 flex items-center justify-center">
                <span className="flex h-16 w-16 items-center justify-center rounded-full bg-white text-brand-maroon shadow-lg transition-transform group-hover:scale-110">
                  <Play className="h-6 w-6 fill-current" />
                </span>
              </span>
            </button>
          </div>
        </div>
      </section>

      <Dialog open={videoOpen} onOpenChange={setVideoOpen}>
        <DialogContent className="max-w-3xl overflow-hidden p-0" showCloseButton>
          <DialogTitle className="sr-only">The Beauty Town</DialogTitle>
          <div className="aspect-video w-full bg-black">
            {videoOpen && (
              <iframe
                src="https://www.youtube.com/embed/aB7mvNO8Zkc?autoplay=1"
                title="The Beauty Town"
                className="h-full w-full"
                allow="autoplay; encrypted-media; picture-in-picture"
                allowFullScreen
              />
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Scrolling ticker */}
      <div className="overflow-hidden border-y bg-brand-maroon-dark py-4" aria-hidden="true">
        <div className="flex w-max animate-marquee">
          {Array.from({ length: 2 }).map((_, group) => (
            <div key={group} className="flex shrink-0">
              {Array.from({ length: 6 }).map((_, i) => (
                <span
                  key={i}
                  className="flex items-center whitespace-nowrap px-6 font-display text-lg text-white/90"
                >
                  The Beauty Town Salon
                  <span className="ml-6 text-brand-gold">•</span>
                </span>
              ))}
            </div>
          ))}
        </div>
      </div>

      {/* Co-founder */}
      <section className="mx-auto max-w-7xl px-4 py-16 md:px-8">
        <div className="grid gap-10 md:grid-cols-2 md:items-center">
          <img
            src="/brand/about/cofounder-rishika.jpeg"
            alt="Rishika Shah, Co-founder of The Beauty Town"
            loading="lazy"
            className="mx-auto aspect-[3/4] w-full max-w-sm rounded-2xl object-cover shadow-md md:mx-0"
          />
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-maroon">
              Co-founder the beauty town
            </p>
            <h2 className="mt-2 font-display text-3xl font-semibold text-brand-maroon-dark">
              Rishika Shah
            </h2>
            <p className="mt-1 text-sm font-medium text-foreground">
              Fashion Designer/International Certified Makeup Artist
            </p>
            <div className="mt-4 space-y-3 text-sm text-muted-foreground">
              {RISHIKA_BIO.map((para, i) => (
                <p key={i}>{para}</p>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Why choose us */}
      <section className="bg-brand-cream">
        <div className="mx-auto grid max-w-7xl gap-10 px-4 py-16 md:grid-cols-2 md:items-center md:px-8">
          <div>
            <h2 className="font-display text-3xl font-semibold text-brand-maroon-dark">
              Why Choose Us?
            </h2>
            <ul className="mt-6 space-y-4">
              {WHY_CHOOSE_US.map((item) => (
                <li key={item.title} className="flex gap-3 text-sm">
                  <span className="mt-1.5 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-brand-maroon" />
                  <p className="text-muted-foreground">
                    <span className="font-semibold text-brand-maroon-dark">{item.title}:</span>{' '}
                    {item.body}
                  </p>
                </li>
              ))}
            </ul>
          </div>
          <img
            src="/brand/about/why-choose-collage.avif"
            alt="Bridal makeovers by The Beauty Town"
            loading="lazy"
            className="w-full rounded-2xl shadow-md"
          />
        </div>
      </section>

      {/* Our services */}
      <section className="mx-auto max-w-7xl px-4 py-16 md:px-8">
        <div className="grid gap-10 md:grid-cols-2 md:items-center">
          <img
            src="/brand/about/our-services.avif"
            alt="Stylist styling a client's hair at The Beauty Town"
            loading="lazy"
            className="w-full rounded-2xl shadow-md"
          />
          <div>
            <h2 className="font-display text-3xl font-semibold text-brand-maroon-dark">
              Our Services
            </h2>
            <p className="mt-3 text-sm text-muted-foreground">
              We offer a wide range of personalized services to meet all your beauty needs:
            </p>
            <ul className="mt-5 space-y-3 text-sm">
              {OUR_SERVICES.map((s) => (
                <li key={s.title}>
                  <span className="font-semibold text-brand-maroon-dark">{s.title}:</span>{' '}
                  <span className="text-muted-foreground">{s.body}</span>
                </li>
              ))}
            </ul>
            <Button asChild className="mt-6 bg-brand-maroon text-white hover:bg-brand-maroon/90">
              <Link to={ROUTES.services}>Visit Now</Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Our story */}
      <section className="bg-brand-cream">
        <div className="mx-auto grid max-w-7xl gap-10 px-4 py-16 md:grid-cols-2 md:items-center md:px-8">
          <div>
            <h2 className="font-display text-3xl font-semibold text-brand-maroon-dark">
              Our Story
            </h2>
            <div className="mt-4 space-y-4 text-sm text-muted-foreground">
              {OUR_STORY_PARAGRAPHS.map((para, i) => (
                <p key={i}>{para}</p>
              ))}
            </div>
          </div>
          <ImageCarousel
            images={OUR_STORY_IMAGES}
            alt="Our story"
            className="mx-auto aspect-[3/4] w-full max-w-sm rounded-2xl shadow-md md:mx-0"
          />
        </div>
      </section>

      {/* Gallery strip */}
      <section className="mx-auto max-w-7xl px-4 py-16 md:px-8">
        <div className="flex gap-4 overflow-x-auto pb-2">
          {GALLERY_IMAGES.map((src) => (
            <img
              key={src}
              src={src}
              alt=""
              loading="lazy"
              className="h-64 w-44 flex-shrink-0 rounded-xl object-cover shadow-sm sm:h-80 sm:w-56"
            />
          ))}
        </div>
      </section>

      {/* Our team — a real, live feature of this app (not on the reference
          site), kept as a bonus below the real content above. */}
      <section className="border-t bg-muted/30">
        <div className="mx-auto max-w-7xl px-4 py-16 md:px-8">
          <div className="mb-10">
            <p className="text-sm font-medium text-primary">Our team</p>
            <h2 className="mt-2 text-3xl font-bold md:text-4xl">The Beauty Town family</h2>
          </div>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {isLoading &&
              Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-32 rounded-lg" />
              ))}
            {isError && <SectionError onRetry={() => refetch()} />}
            {staff?.map((s) => (
              <Card key={s.user_id}>
                <CardContent className="flex gap-4 p-6">
                  <Avatar className="h-16 w-16">
                    <AvatarImage src={imageUrl(s.avatar_url)} alt={s.name} />
                    <AvatarFallback>{s.name.slice(0, 2)}</AvatarFallback>
                  </Avatar>
                  <div>
                    <h3 className="font-semibold">{s.name}</h3>
                    <p className="text-xs text-muted-foreground">{s.role_title}</p>
                    <p className="mt-2 text-sm text-muted-foreground">{s.bio}</p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}

export default AboutPage;
