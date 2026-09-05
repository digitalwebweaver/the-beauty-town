import FallbackImage from '@/components/common/FallbackImage';

const IMAGES = [
  'https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?w=800&auto=format&fit=crop&q=60',
  'https://images.unsplash.com/photo-1560066984-138dadb4c035?w=800&auto=format&fit=crop&q=60',
  'https://images.unsplash.com/photo-1600948836101-f9ffda59d250?w=800&auto=format&fit=crop&q=60',
  'https://images.unsplash.com/photo-1522338140262-f46f5913618a?w=800&auto=format&fit=crop&q=60',
  'https://images.unsplash.com/photo-1512290923902-8a9f81dc236c?w=800&auto=format&fit=crop&q=60',
  'https://images.unsplash.com/photo-1570172619644-dfd03ed5d881?w=800&auto=format&fit=crop&q=60',
  'https://images.unsplash.com/photo-1610992015732-2449b76344bc?w=800&auto=format&fit=crop&q=60',
  'https://images.unsplash.com/photo-1519415943484-9fa1873496d4?w=800&auto=format&fit=crop&q=60',
  'https://images.unsplash.com/photo-1487412947147-5cebf100ffc2?w=800&auto=format&fit=crop&q=60',
  'https://images.unsplash.com/photo-1522337660859-02fbefca4702?w=800&auto=format&fit=crop&q=60',
  'https://images.unsplash.com/photo-1544161515-4ab6ce6db874?w=800&auto=format&fit=crop&q=60',
  'https://images.unsplash.com/photo-1503951914875-452162b0f3f1?w=800&auto=format&fit=crop&q=60',
];

function GalleryPage() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-12 md:px-8">
      <div className="mb-8">
        <p className="text-sm font-medium text-primary">Gallery</p>
        <h1 className="mt-2 text-4xl font-bold md:text-5xl">Our work speaks louder</h1>
        <p className="mt-3 max-w-2xl text-muted-foreground">
          A peek into the transformations, moments, and vibe at The Beauty Town.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4">
        {IMAGES.map((src, i) => (
          <div key={i} className="group relative aspect-square overflow-hidden rounded-xl bg-muted">
            <FallbackImage
              src={src}
              alt={`Gallery ${i + 1}`}
              loading="lazy"
              className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110"
            />
          </div>
        ))}
      </div>
    </div>
  );
}

export default GalleryPage;
