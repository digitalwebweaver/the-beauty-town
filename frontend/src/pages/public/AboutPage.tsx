import { Award, HeartHandshake, Leaf, Sparkles } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import SectionError from '@/components/common/SectionError';
import { SALON_INFO } from '@/lib/mockData';
import { imageUrl } from '@/lib/imageUrl';
import { useStaff } from '@/services/staff.api';

function AboutPage() {
  const { data: staff, isLoading, isError, refetch } = useStaff();

  return (
    <div>
      <section className="border-b bg-muted/30">
        <div className="mx-auto max-w-7xl px-4 py-16 md:px-8 md:py-24">
          <p className="text-sm font-medium text-primary">About us</p>
          <h1 className="mt-2 max-w-3xl text-4xl font-bold md:text-5xl">
            Where confidence begins and beauty flourishes.
          </h1>
          <p className="mt-6 max-w-2xl text-lg text-muted-foreground">
            {SALON_INFO.name} is celebrity makeup artist Payal Shah&apos;s studio and salon in
            Vadodara — one of the city&apos;s most trusted names for bridal makeup, hair, skin, and
            nail care. We believe great service is a mix of skill, warmth, and respect for your
            time.
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-16 md:px-8">
        <div className="grid gap-6 sm:grid-cols-2 md:grid-cols-4">
          {[
            {
              icon: Award,
              title: 'Celebrity expertise',
              body: 'Led by celebrity makeup artist Payal Shah, trusted across Vadodara.',
            },
            {
              icon: HeartHandshake,
              title: 'People first',
              body: 'Long-standing team, fair pay, ongoing global training.',
            },
            {
              icon: Leaf,
              title: 'Clean & safe',
              body: 'Hospital-grade sanitation, disposable tools, patch-tested formulas.',
            },
            {
              icon: Sparkles,
              title: 'Premium brands',
              body: "L'Oréal Professionnel, Kerastase, O3+, Wella, Schwarzkopf.",
            },
          ].map((v) => (
            <Card key={v.title}>
              <CardContent className="p-6">
                <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <v.icon className="h-5 w-5" />
                </div>
                <h3 className="font-semibold">{v.title}</h3>
                <p className="mt-2 text-sm text-muted-foreground">{v.body}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

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
