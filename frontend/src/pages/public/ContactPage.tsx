import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { AxiosError } from 'axios';
import { Loader2, Mail, MapPin, MessageCircle, Phone } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import api from '@/lib/axios';
import { SALON_INFO } from '@/lib/mockData';
import { digitsOnly, lettersOnly, nameInputProps, phoneInputProps } from '@/lib/inputHelpers';

function apiError(err: unknown, fallback: string): string {
  if (err instanceof AxiosError) {
    return err.response?.data?.error?.message ?? err.message ?? fallback;
  }
  return fallback;
}

const schema = z.object({
  name: z
    .string()
    .min(2, 'Enter your name')
    .regex(/^[A-Za-z\s.'-]+$/, 'Name cannot contain numbers'),
  email: z.string().email('Enter a valid email'),
  phone: z.string().regex(/^\d{10}$/, 'Phone must be exactly 10 digits'),
  message: z.string().min(10, 'A bit more detail please'),
});

type FormValues = z.infer<typeof schema>;

function ContactPage() {
  const [loading, setLoading] = useState(false);
  const [searchParams] = useSearchParams();
  const packageName = searchParams.get('package');

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: '',
      email: '',
      phone: '',
      message: packageName ? `I'd like to enquire about the ${packageName} package.` : '',
    },
  });

  const onSubmit = async (values: FormValues) => {
    setLoading(true);
    try {
      await api.post('/contact', values);
      toast.success("Message sent! We'll respond within 24 hours.");
      reset();
    } catch (err) {
      toast.error(apiError(err, "Couldn't send your message — try again"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-12 md:px-8">
      <div className="mb-10">
        <p className="text-sm font-medium text-primary">Contact</p>
        <h1 className="mt-2 text-4xl font-bold md:text-5xl">Let&apos;s talk</h1>
        <p className="mt-3 max-w-2xl text-muted-foreground">
          Have a question, want a consultation, or planning a bridal booking? Drop us a message.
        </p>
      </div>

      <div className="grid gap-8 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-1">
          {[
            {
              icon: MapPin,
              label: 'Visit us',
              value: SALON_INFO.address,
            },
            {
              icon: Phone,
              label: 'Call us',
              value: SALON_INFO.phone,
            },
            {
              icon: Mail,
              label: 'Email us',
              value: SALON_INFO.email,
            },
            {
              icon: MessageCircle,
              label: 'WhatsApp',
              value: SALON_INFO.phone,
            },
          ].map((item) => (
            <Card key={item.label}>
              <CardContent className="flex gap-3 p-5">
                <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <item.icon className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">
                    {item.label}
                  </p>
                  <p className="mt-0.5 font-medium">{item.value}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="lg:col-span-2">
          <Card>
            <CardContent className="p-6 md:p-8">
              <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="name">Name</Label>
                    <Input
                      id="name"
                      {...nameInputProps}
                      {...register('name', {
                        onChange: (e) => {
                          e.target.value = lettersOnly(e.target.value);
                        },
                      })}
                    />
                    {errors.name && (
                      <p className="text-xs text-destructive">{errors.name.message}</p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input id="email" type="email" {...register('email')} />
                    {errors.email && (
                      <p className="text-xs text-destructive">{errors.email.message}</p>
                    )}
                  </div>
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
                <div className="space-y-2">
                  <Label htmlFor="message">Message</Label>
                  <Textarea
                    id="message"
                    rows={5}
                    placeholder="How can we help?"
                    {...register('message')}
                  />
                  {errors.message && (
                    <p className="text-xs text-destructive">{errors.message.message}</p>
                  )}
                </div>
                <Button type="submit" disabled={loading} className="w-full sm:w-auto">
                  {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Send message
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

export default ContactPage;
