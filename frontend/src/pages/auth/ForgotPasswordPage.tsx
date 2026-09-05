import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { AxiosError } from 'axios';
import { ArrowLeft, Loader2, MailCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import PasswordInput from '@/components/common/PasswordInput';
import { ROUTES } from '@/constants/routes';
import { useAuth } from '@/hooks/useAuth';

const emailSchema = z.object({
  email: z.string().email('Enter a valid email'),
});
type EmailValues = z.infer<typeof emailSchema>;

const resetSchema = z.object({
  otp: z
    .string()
    .length(6, 'Code is 6 digits')
    .regex(/^\d{6}$/, 'Code must be digits'),
  newPassword: z.string().min(6, 'At least 6 characters'),
});
type ResetValues = z.infer<typeof resetSchema>;

function apiError(err: unknown, fallback: string): string {
  if (err instanceof AxiosError) {
    return err.response?.data?.error?.message ?? err.message ?? fallback;
  }
  return fallback;
}

function ForgotPasswordPage() {
  const navigate = useNavigate();
  const { requestPasswordReset, confirmPasswordReset } = useAuth();
  const [step, setStep] = useState<'email' | 'reset' | 'done'>('email');
  const [pendingEmail, setPendingEmail] = useState('');
  const [loading, setLoading] = useState(false);

  const emailForm = useForm<EmailValues>({
    resolver: zodResolver(emailSchema),
    defaultValues: { email: '' },
  });
  const resetForm = useForm<ResetValues>({
    resolver: zodResolver(resetSchema),
    defaultValues: { otp: '', newPassword: '' },
  });

  const onRequestEmail = async (values: EmailValues) => {
    setLoading(true);
    try {
      await requestPasswordReset(values.email);
      setPendingEmail(values.email);
      setStep('reset');
      toast.success('If that email is registered, a code has been sent.');
    } catch (err) {
      toast.error(apiError(err, 'Could not send reset code'));
    } finally {
      setLoading(false);
    }
  };

  const onConfirmReset = async (values: ResetValues) => {
    setLoading(true);
    try {
      await confirmPasswordReset(pendingEmail, values.otp, values.newPassword);
      setStep('done');
      toast.success('Password reset — sign in with your new password.');
    } catch (err) {
      toast.error(apiError(err, 'Invalid or expired code'));
    } finally {
      setLoading(false);
    }
  };

  if (step === 'done') {
    return (
      <div className="text-center">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-primary/10 text-primary">
          <MailCheck className="h-7 w-7" />
        </div>
        <h1 className="mt-6 text-2xl font-bold">Password reset</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Your password has been changed. You've been signed out everywhere for security — sign in
          again with your new password.
        </p>
        <Button className="mt-8 w-full" onClick={() => navigate(ROUTES.login)}>
          Back to sign in
        </Button>
      </div>
    );
  }

  if (step === 'reset') {
    return (
      <div>
        <button
          onClick={() => setStep('email')}
          className="mb-4 inline-flex items-center text-xs text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="mr-1 h-3 w-3" /> Change email
        </button>

        <h1 className="text-3xl font-bold tracking-tight">Enter your code</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          If <span className="font-medium text-foreground">{pendingEmail}</span> is registered,
          we've emailed a 6-digit code. It expires in 15 minutes.
        </p>

        <form onSubmit={resetForm.handleSubmit(onConfirmReset)} className="mt-8 space-y-4">
          <div className="space-y-2">
            <Label htmlFor="otp">Code</Label>
            <Input
              id="otp"
              maxLength={6}
              inputMode="numeric"
              placeholder="123456"
              autoFocus
              {...resetForm.register('otp')}
            />
            {resetForm.formState.errors.otp && (
              <p className="text-xs text-destructive">{resetForm.formState.errors.otp.message}</p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="newPassword">New password</Label>
            <PasswordInput
              id="newPassword"
              placeholder="••••••••"
              {...resetForm.register('newPassword')}
            />
            <p className="text-xs text-muted-foreground">At least 6 characters.</p>
            {resetForm.formState.errors.newPassword && (
              <p className="text-xs text-destructive">
                {resetForm.formState.errors.newPassword.message}
              </p>
            )}
          </div>

          <Button type="submit" className="w-full" disabled={loading}>
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Reset password
          </Button>
        </form>
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-3xl font-bold tracking-tight">Forgot password?</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Enter your email and we&apos;ll send you a 6-digit reset code.
      </p>

      <form onSubmit={emailForm.handleSubmit(onRequestEmail)} className="mt-8 space-y-4">
        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
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
          Send reset code
        </Button>
      </form>

      <p className="mt-8 text-center text-sm text-muted-foreground">
        Remembered it?{' '}
        <Link to={ROUTES.login} className="font-medium text-primary hover:underline">
          Back to sign in
        </Link>
      </p>
    </div>
  );
}

export default ForgotPasswordPage;
