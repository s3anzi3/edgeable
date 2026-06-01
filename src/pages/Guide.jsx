import { Link } from 'react-router-dom';
import { ArrowLeft, AlertTriangle, ShieldAlert } from 'lucide-react';
import AppShell, { PageHeader } from '../components/AppShell.jsx';
import { useAuth } from '../AuthContext.jsx';
import { Card, CardContent } from '../components/ui/card.jsx';

function Section({ title, children }) {
  return (
    <section className="space-y-2">
      <h2 className="font-display text-lg font-semibold tracking-tight">{title}</h2>
      <div className="space-y-3 text-sm leading-relaxed text-foreground/85">{children}</div>
    </section>
  );
}

function Bullets({ items }) {
  return (
    <ul className="ml-5 list-disc space-y-1 marker:text-muted-foreground">
      {items.map((it, i) => (
        <li key={i}>{it}</li>
      ))}
    </ul>
  );
}

export default function Guide() {
  const { role } = useAuth();
  const backTo = role === 'admin' ? '/admin' : '/dashboard';

  return (
    <AppShell container="medium">
      <Link
        to={backTo}
        className="mb-2 inline-flex items-center gap-1 text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" /> Back
      </Link>

      <PageHeader
        title="How to Tail My Bets"
        description="Understanding my card, units, and bankroll strategy."
      />

      {/* Top disclaimer */}
      <Card className="mb-6 border-warning/30 bg-warning/5">
        <CardContent className="flex gap-3 p-4 text-sm text-foreground/85">
          <ShieldAlert className="h-5 w-5 shrink-0 text-warning" />
          <p>
            You must be 21+ (or legal age where you live). This is for entertainment and education —
            not financial advice — and no result is ever guaranteed. Only bet what you can afford to
            lose. If gambling stops being fun, step away; help is available 24/7 at{' '}
            <strong className="text-foreground">1‑800‑GAMBLER</strong>.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="space-y-7 p-5 sm:p-7">
          <p className="text-sm leading-relaxed text-muted-foreground">
            This guide explains exactly how to read my betting card, what each part means, and how to
            responsibly tail my plays over the long term. And yes — a lot of this was drafted with AI,
            but read it anyway. It gets across everything I'd want you to know.
          </p>

          <Section title="1. How to Read the Card">
            <figure className="my-1 overflow-hidden rounded-lg border border-border">
              <img
                src="/guide-card.jpg"
                alt="Example betting card: each row shows the bet, odds, game and time, and units wagered."
                className="block w-full"
              />
            </figure>
            <p>Using the card above as a reference, each row is one individual wager. From left to right:</p>

            <div>
              <div className="font-medium text-foreground">Left side — the bet itself</div>
              <p className="mt-1">What I'm betting on:</p>
              <Bullets items={[
                'A spread (e.g. +3, -2)',
                'A total (Over / Under)',
                'A first-half line (1H)',
                'A game and start time',
              ]} />
              <p className="mt-2">Examples: <span className="font-mono text-xs">OSU -2 · Under 5.5 · ATL +3 · Under 109.5 (1H)</span></p>
              <p className="mt-1">This is the actual market selection you should be placing.</p>
            </div>

            <div>
              <div className="font-medium text-foreground">Middle — the odds</div>
              <p className="mt-1">
                Next to the bet are the odds I personally locked in (e.g. -110, -105, -101). Keep in mind:
              </p>
              <Bullets items={[
                'Odds vary by sportsbook',
                'Lines can move quickly',
                "You won't always match my exact odds",
              ]} />
              <p className="mt-2">
                That's why I strongly recommend having access to as many sportsbooks as possible. The more
                books you have, the closer you'll get to my number (or even beat it), the more long-term
                edge you preserve, and the less value you bleed over time. You don't need to match my exact
                odds, but getting close matters — I send cards in advance for a reason. If odds didn't
                matter, I'd just upload to Action Network and fire the card 10 minutes before tip-off.
              </p>
            </div>

            <div>
              <div className="font-medium text-foreground">Right side — units (“x.xu”)</div>
              <p className="mt-1">
                The number on the far right (e.g. 4.5u, 5.25u) is how many units I'm wagering on that play.
                A unit is a fixed, small fraction of your bankroll — not a set dollar amount for everyone.
                You convert it to a dollar figure once, then never change it.
              </p>
              <Bullets items={[
                'If 1 unit = $10, then 5u = $50',
                'If 1 unit = $100, then 5u = $500',
              ]} />
              <p className="mt-2">
                You decide what a unit is before you start, and it should never change based on emotion or
                confidence.
              </p>
            </div>
          </Section>

          <Section title="2. Why Units Matter More Than Dollars">
            <p>On the official card, I avoid flat betting and any “feel for the amount” approach. Units let me:</p>
            <Bullets items={[
              'Scale bets properly',
              'Control risk',
              'Stay consistent through swings',
              'Avoid emotional decisions (this is the most important)',
            ]} />
            <p>
              Some plays carry more edge than others — that's why unit size varies. I use a rough model to
              decide how much to wager on each bet. That said, there will be times I put more on a play than
              the math strictly justifies, based on personal feel — and I'll usually tell the channel when
              I've juiced the risk. If I don't say anything, a good rule of thumb: anything over 6 units has
              some personal opinion baked in.
            </p>
          </Section>

          {/* Variance — emphasized */}
          <section className="space-y-2">
            <h2 className="font-display text-lg font-semibold tracking-tight">
              3. Volatility: What You MUST Be Prepared For
            </h2>
            <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-sm leading-relaxed text-foreground/85">
              <div className="mb-2 flex items-center gap-2 font-medium text-destructive">
                <AlertTriangle className="h-4 w-4" /> The most important section.
              </div>
              <p>If you tail my bets, you will experience:</p>
              <Bullets items={[
                'Days where I go 0–10',
                'Weeks where I lose 100+ units',
                'Even full months that net -200 units',
              ]} />
              <p className="mt-2">
                This is not a mistake, a collapse, or a sign the strategy “stopped working.” This is variance.
              </p>
              <p className="mt-2">
                If you're checking your balance after every bet, tilting after one bad day, chasing losses,
                or scaling units emotionally — this approach is not for you.
              </p>
            </div>
          </section>

          <Section title="4. Recommended Starting Bankroll">
            <p>
              <strong className="text-foreground">Minimum: 500 units.</strong> This lets you survive
              drawdowns, stick to the system, and avoid emotional decision-making.
            </p>
            <p>
              <strong className="text-foreground">What I personally run: 1,000 units.</strong> Once I turned
              21, I split my bankroll into 1,000 units. At that size, I rarely have more than 0.5% of my
              bankroll on a single wager — so I don't feel the need to watch the games, and I don't tilt when
              a bet loses. The whole goal is to stay out of any position where I'd get emotional.
            </p>
          </Section>

          <Section title="5. Long-Term Mindset">
            <p>At the end of the day: it's your money, your bankroll, your responsibility.</p>
            <p>
              You're always free to reach out with questions — I genuinely want your betting experience to go
              well, and I'm happy to give advice. But I can't manage your account and I can't monitor your
              actions. The discipline is on you.
            </p>
          </Section>

          <Section title="6. Final Notes">
            <p>If you choose to tail:</p>
            <Bullets items={[
              'Respect the units',
              'Respect your bankroll',
              'Respect the variance',
              'Trust the long-term edge',
            ]} />
            <p>
              I hope you profit from this. And even if you don't, I hope you walk away understanding what
              profitable, disciplined gambling actually looks like.
            </p>
          </Section>
        </CardContent>
      </Card>

      <p className="mt-6 px-1 text-xs leading-relaxed text-muted-foreground">
        Responsible gambling: only bet what you can afford to lose, and only if you're 21+ (or legal age in
        your area). This service is for entertainment and education, not financial advice, and no outcome is
        guaranteed. If gambling stops being fun or starts causing harm, please step away — help is available
        24/7 at 1‑800‑GAMBLER.
      </p>
    </AppShell>
  );
}
