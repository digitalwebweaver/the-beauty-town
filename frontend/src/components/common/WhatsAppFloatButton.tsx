import { MessageCircle } from 'lucide-react';
import { useSettings, SETTINGS_FALLBACK } from '@/services/settings.api';

// A persistent "chat with us" affordance on every public page — the salon's
// own WhatsApp number, same wa.me pattern already used for sharing invoices.
function WhatsAppFloatButton() {
  const settings = useSettings().data ?? SETTINGS_FALLBACK;
  const phone = settings.phone ? settings.phone.replace(/\D/g, '') : '';
  if (!phone) return null;

  const message = `Hi ${settings.name}, I'd like to know more.`;
  const href = `https://wa.me/${phone.length === 10 ? `91${phone}` : phone}?text=${encodeURIComponent(message)}`;

  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      aria-label="Chat on WhatsApp"
      className="fixed bottom-5 left-5 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-[#25D366] text-white shadow-lg transition-transform hover:scale-105"
    >
      <MessageCircle className="h-7 w-7" />
    </a>
  );
}

export default WhatsAppFloatButton;
