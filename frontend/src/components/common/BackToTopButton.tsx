import { useEffect, useState } from 'react';
import { ArrowUp } from 'lucide-react';

// A persistent "scroll to top" affordance once the visitor has scrolled past
// the first screen — mirrors the floating maroon button on every page of
// thebeautytownsalon.com.
function BackToTopButton() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const onScroll = () => setVisible(window.scrollY > 600);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  if (!visible) return null;

  return (
    <button
      type="button"
      onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
      aria-label="Back to top"
      className="fixed bottom-5 right-5 z-40 flex h-11 w-11 items-center justify-center rounded-md bg-brand-maroon text-white shadow-lg transition-transform hover:scale-105"
    >
      <ArrowUp className="h-5 w-5" />
    </button>
  );
}

export default BackToTopButton;
