import { Link } from 'react-router-dom';
import { Camera, Globe, Mail, MapPin, Phone } from 'lucide-react';
import { ROUTES } from '@/constants/routes';
import { useSettings, SETTINGS_FALLBACK } from '@/services/settings.api';

function Footer() {
  const settings = useSettings().data ?? SETTINGS_FALLBACK;

  return (
    <footer className="bg-brand-maroon-dark text-white/70">
      <div className="mx-auto max-w-7xl px-4 py-14 md:px-8">
        <div className="grid gap-10 sm:grid-cols-2 md:grid-cols-4">
          <div>
            <div className="mb-3 flex items-center gap-2.5">
              <img src="/brand/logo.png" alt="" className="h-10 w-10 object-contain" />
              <span className="font-display text-lg font-semibold text-white">{settings.name}</span>
            </div>
            <p className="text-sm">{settings.tagline}</p>
            <p className="mt-3 text-xs uppercase tracking-wider text-brand-gold/80">
              Think beauty, think us
            </p>
          </div>

          <div>
            <h4 className="mb-4 font-display text-sm font-semibold text-white">Contact Us</h4>
            <ul className="space-y-3 text-sm">
              <li className="flex items-start gap-2">
                <MapPin className="mt-0.5 h-4 w-4 flex-shrink-0 text-brand-gold" />
                <span>{settings.address}</span>
              </li>
              <li className="flex items-center gap-2">
                <Phone className="h-4 w-4 flex-shrink-0 text-brand-gold" />
                <span>{settings.phone}</span>
              </li>
              <li className="flex items-center gap-2">
                <Mail className="h-4 w-4 flex-shrink-0 text-brand-gold" />
                <span>{settings.email}</span>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="mb-4 font-display text-sm font-semibold text-white">Links</h4>
            <ul className="space-y-2.5 text-sm">
              <li>
                <Link to={ROUTES.home} className="hover:text-brand-gold">
                  Home
                </Link>
              </li>
              <li>
                <Link to={ROUTES.about} className="hover:text-brand-gold">
                  About Us
                </Link>
              </li>
              <li>
                <Link to={ROUTES.services} className="hover:text-brand-gold">
                  Services
                </Link>
              </li>
              <li>
                <Link to={ROUTES.gallery} className="hover:text-brand-gold">
                  Gallery
                </Link>
              </li>
              <li>
                <Link to={ROUTES.contact} className="hover:text-brand-gold">
                  Contact
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="mb-4 font-display text-sm font-semibold text-white">Get In Touch</h4>
            <div className="flex gap-3">
              <a
                href={settings.instagram_url ?? undefined}
                target="_blank"
                rel="noreferrer"
                className="flex h-10 w-10 items-center justify-center rounded-full border border-white/20 hover:border-brand-gold hover:text-brand-gold"
                aria-label="Instagram"
              >
                <Camera className="h-4 w-4" />
              </a>
              <a
                href={settings.facebook_url ?? undefined}
                target="_blank"
                rel="noreferrer"
                className="flex h-10 w-10 items-center justify-center rounded-full border border-white/20 hover:border-brand-gold hover:text-brand-gold"
                aria-label="Facebook"
              >
                <Globe className="h-4 w-4" />
              </a>
            </div>
            <h4 className="mb-2 mt-6 font-display text-sm font-semibold text-white">
              Working Hours
            </h4>
            <p className="text-sm">{settings.hours}</p>
          </div>
        </div>

        <div className="mt-10 flex flex-col items-center gap-2 border-t border-white/10 pt-6 text-center text-xs sm:flex-row sm:justify-between">
          <p>
            © {new Date().getFullYear()} {settings.name}. All rights reserved.
          </p>
          <p>
            Developed by{' '}
            <a
              href="https://digitalwebweaver.com"
              target="_blank"
              rel="noreferrer"
              className="font-medium text-brand-gold hover:underline"
            >
              Digital Web Weaver
            </a>{' '}
            — Software Development Company
          </p>
        </div>
      </div>
    </footer>
  );
}

export default Footer;
