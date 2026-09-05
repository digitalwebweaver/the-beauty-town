import { useState } from 'react';
import { toast } from 'sonner';
import { Loader2, Save } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
import PageHeader from '@/components/common/PageHeader';
import { apiError } from '@/lib/apiError';
import {
  SETTINGS_FALLBACK,
  useSettings,
  useUpdateSettings,
  type SettingsDto,
  type UpdateSettingsInput,
} from '@/services/settings.api';

interface FormState {
  name: string;
  tagline: string;
  address: string;
  phone: string;
  email: string;
  gstin: string;
  hours: string;
  instagramUrl: string;
  facebookUrl: string;
  otpLoginEnabled: boolean;
}

function toFormState(s: SettingsDto): FormState {
  return {
    name: s.name ?? '',
    tagline: s.tagline ?? '',
    address: s.address ?? '',
    phone: s.phone ?? '',
    email: s.email ?? '',
    gstin: s.gstin ?? '',
    hours: s.hours ?? '',
    instagramUrl: s.instagram_url ?? '',
    facebookUrl: s.facebook_url ?? '',
    otpLoginEnabled: s.otp_login_enabled,
  };
}

function SettingsPage() {
  const settingsQuery = useSettings();
  const updateMut = useUpdateSettings();

  const [form, setForm] = useState<FormState>(toFormState(SETTINGS_FALLBACK));

  // Seed the editable form from the real row once it arrives (the query
  // starts out on placeholder data so the page never renders empty) — and
  // again after every successful save, so the form reflects what's
  // actually stored. Adjusting state during render (not in an effect) is
  // the pattern React recommends for "sync local state to an incoming
  // prop/query result": it re-renders immediately with the fresh values
  // instead of committing a stale frame first.
  const [seededFrom, setSeededFrom] = useState(settingsQuery.data);
  if (settingsQuery.data && !settingsQuery.isPlaceholderData && settingsQuery.data !== seededFrom) {
    setSeededFrom(settingsQuery.data);
    setForm(toFormState(settingsQuery.data));
  }

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const save = async () => {
    if (form.name.trim().length < 2) {
      return toast.error('Salon name is required');
    }
    const patch: UpdateSettingsInput = {
      name: form.name.trim(),
      tagline: form.tagline.trim() || null,
      address: form.address.trim() || null,
      phone: form.phone.trim() || null,
      email: form.email.trim() || null,
      gstin: form.gstin.trim() || null,
      hours: form.hours.trim() || null,
      instagramUrl: form.instagramUrl.trim() || null,
      facebookUrl: form.facebookUrl.trim() || null,
      otpLoginEnabled: form.otpLoginEnabled,
    };
    try {
      await updateMut.mutateAsync(patch);
      toast.success('Settings saved');
    } catch (err) {
      toast.error(apiError(err, 'Could not save settings'));
    }
  };

  return (
    <div>
      <PageHeader
        title="Salon Settings"
        description="Shown across the public site and printed on every receipt — the source of truth for your business details."
      />

      <Card>
        <CardContent className="space-y-6 p-6">
          <div>
            <h3 className="text-sm font-semibold">Identity</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Your salon's name and tagline, shown in the navbar, sidebar, and footer.
            </p>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="s-name">Salon name *</Label>
                <Input
                  id="s-name"
                  value={form.name}
                  onChange={(e) => set('name', e.target.value)}
                  placeholder="The Beauty Town"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="s-tagline">Tagline</Label>
                <Input
                  id="s-tagline"
                  value={form.tagline}
                  onChange={(e) => set('tagline', e.target.value)}
                  placeholder="Your beauty, our craft."
                />
              </div>
            </div>
          </div>

          <Separator />

          <div>
            <h3 className="text-sm font-semibold">Contact</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Used on the Contact page, the footer, and printed on every POS slip and A4 invoice.
            </p>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="s-phone">Phone</Label>
                <Input
                  id="s-phone"
                  value={form.phone}
                  onChange={(e) => set('phone', e.target.value)}
                  placeholder="+91 91578 19391"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="s-email">Email</Label>
                <Input
                  id="s-email"
                  type="email"
                  value={form.email}
                  onChange={(e) => set('email', e.target.value)}
                  placeholder="hello@yoursalon.in"
                />
              </div>
            </div>
            <div className="mt-4 space-y-2">
              <Label htmlFor="s-address">Address</Label>
              <Textarea
                id="s-address"
                rows={2}
                value={form.address}
                onChange={(e) => set('address', e.target.value)}
                placeholder="First Floor, Vidhi Square Complex, B.P.C. Road, Alkapuri, Vadodara, Gujarat 390007"
              />
            </div>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="s-hours">Business hours</Label>
                <Input
                  id="s-hours"
                  value={form.hours}
                  onChange={(e) => set('hours', e.target.value)}
                  placeholder="Mon-Sun, 10:00 AM - 9:00 PM"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="s-gstin">GSTIN (optional)</Label>
                <Input
                  id="s-gstin"
                  value={form.gstin}
                  onChange={(e) => set('gstin', e.target.value)}
                  placeholder="Leave blank if not GST-registered"
                />
              </div>
            </div>
          </div>

          <Separator />

          <div>
            <h3 className="text-sm font-semibold">Social links</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Shown as icons in the site footer. Leave blank to hide either one.
            </p>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="s-instagram">Instagram URL</Label>
                <Input
                  id="s-instagram"
                  value={form.instagramUrl}
                  onChange={(e) => set('instagramUrl', e.target.value)}
                  placeholder="https://instagram.com/yoursalon"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="s-facebook">Facebook URL</Label>
                <Input
                  id="s-facebook"
                  value={form.facebookUrl}
                  onChange={(e) => set('facebookUrl', e.target.value)}
                  placeholder="https://facebook.com/yoursalon"
                />
              </div>
            </div>
          </div>

          <Separator />

          <div>
            <h3 className="text-sm font-semibold">Customer login</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Customers always sign in with email + password (and Google, if configured). Turn this
              on to also let them use a one-time email code instead.
            </p>
            <div className="mt-4 flex items-center justify-between rounded-lg border p-4">
              <div>
                <p className="font-medium">Allow OTP login for customers</p>
                <p className="text-sm text-muted-foreground">
                  When off, the login and register pages only show the password form.
                </p>
              </div>
              <Switch
                checked={form.otpLoginEnabled}
                onCheckedChange={(v) => set('otpLoginEnabled', v)}
              />
            </div>
          </div>

          <div className="flex justify-end pt-2">
            <Button onClick={save} disabled={updateMut.isPending}>
              {updateMut.isPending ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Save className="mr-2 h-4 w-4" />
              )}
              Save changes
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default SettingsPage;
