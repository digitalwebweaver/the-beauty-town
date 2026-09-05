import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { ArrowLeft, KeyRound, Loader2, Lock, MailCheck } from 'lucide-react';
import { AxiosError } from 'axios';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import PasswordInput from '@/components/common/PasswordInput';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ROUTES } from '@/constants/routes';
import { useAuth } from '@/hooks/useAuth';
import { useSettings } from '@/services/settings.api';
import type { UserRole } from '@/types';

function routeForRole(role: UserRole): string {
  if (role === 'admin') return ROUTES.admin;
  if (role === 'staff') return ROUTES.staff;
  return ROUTES.customerDashboard;
}

function apiError(err: unknown, fallback: string): string {
  if (err instanceof AxiosError) {
    return err.response?.data?.error?.message ?? err.message ?? fallback;
  }
  return fallback;
}

// -------------------------- Password (everyone) --------------------------
const passwordSchema = z.object({
  email: z.string().email('Enter a valid email'),
  password: z.string().min(6, 'At least 6 characters'),
});
type PasswordValues = z.infer<typeof passwordSchema>;

function PasswordForm() {
  const navigate = useNavigate();
  const { passwordLogin } = useAuth();
  const [loading, setLoading] = useState(false);

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<PasswordValues>({
    resolver: zodResolver(passwordSchema),
    defaultValues: { email: '', password: '' },
  });

  const onSubmit = async (v: PasswordValues) => {
    setLoading(true);
    try {
      const user = await passwordLogin(v.email, v.password);
      toast.success(`Welcome, ${user.name}!`);
      navigate(routeForRole(user.role));
    } catch (err) {
      toast.error(apiError(err, 'Login failed'));
    } finally {
      setLoading(false);
    }
  };

  const fill = (email: string, password: string) => {
    setValue('email', email);
    setValue('password', password);
  };

  return (
    <div>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input id="email" type="email" placeholder="you@example.com" {...register('email')} />
          {errors.email && <p className="text-xs text-destructive">{errors.email.message}</p>}
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label htmlFor="password">Password</Label>
            <Link
              to={ROUTES.forgotPassword}
              className="text-xs text-muted-foreground hover:text-foreground"
            >
              Forgot password?
            </Link>
          </div>
          <PasswordInput id="password" placeholder="••••••••" {...register('password')} />
          {errors.password && <p className="text-xs text-destructive">{errors.password.message}</p>}
        </div>

        <Button type="submit" className="w-full" disabled={loading}>
          {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Sign in
        </Button>
      </form>

      {/* Dev-only convenience — never render seeded credentials in a real build. */}
      {import.meta.env.DEV && (
        <div className="mt-6">
          <div className="relative">
            <Separator />
            <span className="absolute left-1/2 top-0 -translate-x-1/2 -translate-y-1/2 whitespace-nowrap bg-background px-2 text-xs uppercase text-muted-foreground">
              Dev-only demo accounts
            </span>
          </div>
          <div className="mt-3 grid grid-cols-3 gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => fill('admin@salon.com', 'Admin@123')}
            >
              <Lock className="mr-1 h-3 w-3" /> Admin
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => fill('rahul.staff@salon.com', 'Staff@123')}
            >
              <Lock className="mr-1 h-3 w-3" /> Staff
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => fill('priya@example.com', 'Customer@123')}
            >
              <Lock className="mr-1 h-3 w-3" /> Customer
            </Button>
          </div>
          <p className="mt-2 text-center text-xs text-muted-foreground">
            Click a button to auto-fill, then hit Sign in
          </p>
        </div>
      )}
    </div>
  );
}

// -------------------------- OTP (customer, admin-toggleable) --------------------------
const otpEmailSchema = z.object({
  email: z.string().email('Enter a valid email'),
});
type OtpEmailValues = z.infer<typeof otpEmailSchema>;

const otpVerifySchema = z.object({
  otp: z
    .string()
    .length(6, 'OTP is 6 digits')
    .regex(/^\d{6}$/, 'OTP must be digits'),
});
type OtpVerifyValues = z.infer<typeof otpVerifySchema>;

function OtpForm() {
  const navigate = useNavigate();
  const { requestOtp, verifyOtp } = useAuth();
  const [step, setStep] = useState<'email' | 'otp'>('email');
  const [pendingEmail, setPendingEmail] = useState('');
  const [loading, setLoading] = useState(false);

  const emailForm = useForm<OtpEmailValues>({
    resolver: zodResolver(otpEmailSchema),
    defaultValues: { email: '' },
  });
  const verifyForm = useForm<OtpVerifyValues>({
    resolver: zodResolver(otpVerifySchema),
    defaultValues: { otp: '' },
  });

  const sendOtp = async (v: OtpEmailValues) => {
    setLoading(true);
    try {
      await requestOtp(v.email);
      setPendingEmail(v.email);
      setStep('otp');
      toast.success('OTP sent — check backend terminal in dev mode');
    } catch (err) {
      toast.error(apiError(err, 'Could not send OTP'));
    } finally {
      setLoading(false);
    }
  };

  const submitOtp = async (v: OtpVerifyValues) => {
    setLoading(true);
    try {
      const user = await verifyOtp(pendingEmail, v.otp);
      toast.success('Welcome!');
      navigate(routeForRole(user.role));
    } catch (err) {
      toast.error(apiError(err, 'Invalid OTP'));
    } finally {
      setLoading(false);
    }
  };

  if (step === 'otp') {
    return (
      <div>
        <button
          onClick={() => setStep('email')}
          className="mb-4 inline-flex items-center text-xs text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="mr-1 h-3 w-3" /> Change email
        </button>

        <div className="mb-4 flex items-start gap-3 rounded-lg border bg-muted/50 p-3">
          <MailCheck className="mt-0.5 h-5 w-5 text-primary" />
          <div>
            <p className="text-sm font-medium">Code sent to {pendingEmail}</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Dev tip: the code is printed in your backend terminal (SMTP is off in dev).
            </p>
          </div>
        </div>

        <form onSubmit={verifyForm.handleSubmit(submitOtp)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="otp">Enter 6-digit code</Label>
            <Input
              id="otp"
              maxLength={6}
              placeholder="123456"
              autoFocus
              inputMode="numeric"
              {...verifyForm.register('otp')}
            />
            {verifyForm.formState.errors.otp && (
              <p className="text-xs text-destructive">{verifyForm.formState.errors.otp.message}</p>
            )}
          </div>
          <Button type="submit" className="w-full" disabled={loading}>
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Verify & sign in
          </Button>
        </form>
      </div>
    );
  }

  return (
    <div>
      <form onSubmit={emailForm.handleSubmit(sendOtp)} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="otp-email">Email</Label>
          <Input
            id="otp-email"
            type="email"
            placeholder="you@example.com"
            {...emailForm.register('email')}
          />
          {emailForm.formState.errors.email && (
            <p className="text-xs text-destructive">{emailForm.formState.errors.email.message}</p>
          )}
        </div>
        <Button type="submit" className="w-full" disabled={loading}>
          {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          <KeyRound className="mr-2 h-4 w-4" />
          Send login code
        </Button>
      </form>

      <div className="mt-6">
        <div className="relative">
          <Separator />
          <span className="absolute left-1/2 top-0 -translate-x-1/2 -translate-y-1/2 bg-background px-2 text-xs uppercase text-muted-foreground">
            Demo customer
          </span>
        </div>
        <Button
          variant="outline"
          size="sm"
          className="mt-3 w-full"
          onClick={() => emailForm.setValue('email', 'priya@example.com')}
        >
          Fill priya@example.com
        </Button>
      </div>
    </div>
  );
}

// -------------------------- Wrapper --------------------------
function LoginPage() {
  const { data: settings } = useSettings();
  const otpEnabled = settings?.otp_login_enabled ?? false;

  return (
    <div>
      <h1 className="text-3xl font-bold tracking-tight">Welcome back</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        {otpEnabled
          ? 'Sign in with your email and password, or use a one-time code.'
          : 'Sign in with your email and password.'}
      </p>

      {otpEnabled ? (
        <Tabs defaultValue="password" className="mt-6">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="password">Password</TabsTrigger>
            <TabsTrigger value="otp">One-time code</TabsTrigger>
          </TabsList>
          <TabsContent value="password" className="mt-6">
            <PasswordForm />
          </TabsContent>
          <TabsContent value="otp" className="mt-6">
            <OtpForm />
          </TabsContent>
        </Tabs>
      ) : (
        <div className="mt-6">
          <PasswordForm />
        </div>
      )}

      <p className="mt-8 text-center text-sm text-muted-foreground">
        New customer?{' '}
        <Link to={ROUTES.register} className="font-medium text-primary hover:underline">
          Create an account
        </Link>
      </p>
    </div>
  );
}

export default LoginPage;
