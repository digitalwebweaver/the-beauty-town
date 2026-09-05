import { useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { AxiosError } from 'axios';
import { Camera, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Switch } from '@/components/ui/switch';
import PageHeader from '@/components/common/PageHeader';
import PasswordInput from '@/components/common/PasswordInput';
import { useAuth } from '@/hooks/useAuth';
import { usePushSubscription } from '@/hooks/usePushSubscription';
import { imageUrl } from '@/lib/imageUrl';
import { digitsOnly, lettersOnly, nameInputProps, phoneInputProps } from '@/lib/inputHelpers';
import { useUpdateProfile, useUploadAvatar } from '@/services/users.api';
import type { NotificationPrefs } from '@/types';

const DEFAULT_PREFS: NotificationPrefs = {
  appointmentReminders: true,
  promotionalOffers: false,
  newsletter: true,
};

const NOTIFICATION_ITEMS: {
  key: keyof NotificationPrefs;
  label: string;
  sub: string;
}[] = [
  {
    key: 'appointmentReminders',
    label: 'Appointment reminders',
    sub: 'Receive SMS 24 hours before your appointment.',
  },
  {
    key: 'promotionalOffers',
    label: 'Promotional offers',
    sub: 'Occasional emails about new services and discounts.',
  },
  {
    key: 'newsletter',
    label: 'Newsletter',
    sub: 'Monthly styling tips and salon updates.',
  },
];

// Phone is optional here — unlike a customer, a staff/admin account can
// legitimately have none on file yet (it isn't collected at creation).
const schema = z.object({
  name: z
    .string()
    .min(2, 'Enter your full name')
    .regex(/^[A-Za-z\s.'-]+$/, 'Name cannot contain numbers'),
  phone: z
    .string()
    .regex(/^\d{10}$/, 'Phone must be exactly 10 digits')
    .optional()
    .or(z.literal('')),
});
type FormValues = z.infer<typeof schema>;

function apiError(err: unknown, fallback: string): string {
  if (err instanceof AxiosError) {
    return err.response?.data?.error?.message ?? err.message ?? fallback;
  }
  return fallback;
}

const passwordSchema = z
  .object({
    currentPassword: z.string().min(1, 'Enter your current password'),
    newPassword: z.string().min(6, 'At least 6 characters'),
    confirmNewPassword: z.string(),
  })
  .refine((v) => v.newPassword === v.confirmNewPassword, {
    message: "Passwords don't match",
    path: ['confirmNewPassword'],
  });
type PasswordFormValues = z.infer<typeof passwordSchema>;

function ChangePasswordCard() {
  const { changePassword } = useAuth();
  const [loading, setLoading] = useState(false);
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<PasswordFormValues>({
    resolver: zodResolver(passwordSchema),
    defaultValues: { currentPassword: '', newPassword: '', confirmNewPassword: '' },
  });

  const onSubmit = async (values: PasswordFormValues) => {
    setLoading(true);
    try {
      await changePassword(values.currentPassword, values.newPassword);
      toast.success('Password changed — you stay signed in here; other devices were signed out.');
      reset();
    } catch (err) {
      toast.error(apiError(err, 'Could not change password'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="lg:col-span-3">
      <CardHeader>
        <CardTitle>Change password</CardTitle>
      </CardHeader>
      <CardContent>
        <form
          onSubmit={handleSubmit(onSubmit)}
          className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3"
        >
          <div className="space-y-2">
            <Label htmlFor="currentPassword">Current password</Label>
            <PasswordInput id="currentPassword" {...register('currentPassword')} />
            {errors.currentPassword && (
              <p className="text-xs text-destructive">{errors.currentPassword.message}</p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="newPassword">New password</Label>
            <PasswordInput id="newPassword" {...register('newPassword')} />
            {errors.newPassword && (
              <p className="text-xs text-destructive">{errors.newPassword.message}</p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="confirmNewPassword">Confirm new password</Label>
            <PasswordInput id="confirmNewPassword" {...register('confirmNewPassword')} />
            {errors.confirmNewPassword && (
              <p className="text-xs text-destructive">{errors.confirmNewPassword.message}</p>
            )}
          </div>
          <div className="sm:col-span-2 lg:col-span-3">
            <Button type="submit" disabled={loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Update password
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

// Shared by all three roles — reached from the account dropdown in
// DashboardHeader. Personal info + password apply to everyone; the
// marketing-notification card only makes sense for customers.
function ProfilePage() {
  const { user } = useAuth();
  const isCustomer = user?.role === 'customer';
  const push = usePushSubscription();
  const updateMut = useUpdateProfile();
  const uploadMut = useUploadAvatar();
  const fileRef = useRef<HTMLInputElement>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | undefined>();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: user?.name ?? '',
      phone: user?.phone ?? '',
    },
  });

  const onSubmit = async (values: FormValues) => {
    try {
      await updateMut.mutateAsync(values);
      toast.success('Profile updated');
    } catch (err) {
      toast.error(apiError(err, 'Update failed'));
    }
  };

  const prefs = user?.notificationPrefs ?? DEFAULT_PREFS;

  const togglePref = async (key: keyof NotificationPrefs, checked: boolean) => {
    try {
      await updateMut.mutateAsync({ notificationPrefs: { [key]: checked } });
    } catch (err) {
      toast.error(apiError(err, 'Could not save preference'));
    }
  };

  const onFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setAvatarPreview(URL.createObjectURL(file));
    try {
      const url = await uploadMut.mutateAsync(file);
      await updateMut.mutateAsync({ avatarUrl: url });
      toast.success('Photo updated');
    } catch (err) {
      toast.error(apiError(err, 'Upload failed'));
      setAvatarPreview(undefined);
    }
  };

  return (
    <div>
      <PageHeader title="My Profile" description="Manage your account details and password." />

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-1">
          <CardContent className="flex flex-col items-center p-8 text-center">
            <Avatar className="h-24 w-24">
              <AvatarImage src={avatarPreview ?? imageUrl(user?.avatarUrl)} alt={user?.name} />
              <AvatarFallback className="text-2xl">{user?.name?.slice(0, 2)}</AvatarFallback>
            </Avatar>
            <h3 className="mt-4 text-lg font-semibold">{user?.name}</h3>
            <p className="text-sm capitalize text-muted-foreground">{user?.role}</p>
            <p className="mt-3 text-xs text-muted-foreground">
              Member since{' '}
              {user?.createdAt ? new Date(user.createdAt).toLocaleDateString('en-IN') : ''}
            </p>
            <input ref={fileRef} type="file" accept="image/*" hidden onChange={onFile} />
            <Button
              variant="outline"
              size="sm"
              className="mt-6 w-full"
              onClick={() => fileRef.current?.click()}
              disabled={uploadMut.isPending}
            >
              {uploadMut.isPending ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Camera className="mr-2 h-4 w-4" />
              )}
              Change photo
            </Button>
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Personal information</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Full name</Label>
                <Input
                  id="name"
                  {...nameInputProps}
                  {...register('name', {
                    onChange: (e) => {
                      e.target.value = lettersOnly(e.target.value);
                    },
                  })}
                />
                {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="email">Email (read-only)</Label>
                  <Input id="email" type="email" value={user?.email ?? ''} disabled />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone">Phone</Label>
                  <Input
                    id="phone"
                    {...phoneInputProps}
                    {...register('phone', {
                      onChange: (e) => {
                        e.target.value = digitsOnly(e.target.value);
                      },
                    })}
                  />
                  {errors.phone && (
                    <p className="text-xs text-destructive">{errors.phone.message}</p>
                  )}
                </div>
              </div>

              <Button type="submit" disabled={updateMut.isPending}>
                {updateMut.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Save changes
              </Button>
            </form>
          </CardContent>
        </Card>

        {isCustomer && (
          <Card className="lg:col-span-3">
            <CardHeader>
              <CardTitle>Notification preferences</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {NOTIFICATION_ITEMS.map((item) => (
                <div key={item.key} className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-medium">{item.label}</p>
                    <p className="text-sm text-muted-foreground">{item.sub}</p>
                  </div>
                  <Switch
                    checked={prefs[item.key]}
                    onCheckedChange={(v) => togglePref(item.key, v)}
                    disabled={updateMut.isPending}
                  />
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        {!isCustomer && (
          <Card className="lg:col-span-3">
            <CardHeader>
              <CardTitle>Push notifications</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-medium">Push notifications on this device</p>
                  <p className="text-sm text-muted-foreground">
                    {push.supported
                      ? 'Get an instant alert here for new bookings, cancellations, and unconfirmed bookings closing in — free, no WhatsApp or SMS required.'
                      : "This browser doesn't support push notifications — try a recent Chrome, Edge, or Safari."}
                  </p>
                  {push.permission === 'denied' && (
                    <p className="mt-1 text-xs text-destructive">
                      Notifications are blocked for this site in your browser settings — allow them
                      there first.
                    </p>
                  )}
                </div>
                <Switch
                  checked={push.subscribed}
                  onCheckedChange={(v) => (v ? push.enable() : push.disable())}
                  disabled={!push.supported || push.loading || push.permission === 'denied'}
                />
              </div>
            </CardContent>
          </Card>
        )}

        <ChangePasswordCard />
      </div>
    </div>
  );
}

export default ProfilePage;
