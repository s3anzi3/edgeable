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

          <Section title="5. The Chase System (Baseball)">
            <p>
              Baseball is different from other sports because teams play in <strong className="text-foreground">series</strong>.
              In the NBA the Knicks might play the Bulls tonight and the Warriors tomorrow — a new opponent
              almost every night. In MLB, when the Yankees play the Orioles they'll usually face them 2–4
              games in a row. That back-to-back structure is what makes <strong className="text-foreground">“chasing”</strong>{' '}
              a bet possible: we get multiple cracks at the same edge, against the same matchup, on consecutive days.
            </p>

            <div>
              <div className="font-medium text-foreground">How a chase works</div>
              <p className="mt-1">
                Some of my plays are <strong className="text-foreground">chase plays</strong>. Instead of a
                one-and-done bet, we ride the play through the games of the series until it hits — or until the
                series runs out. Every chase is built to win <strong className="text-foreground">5 units net</strong>.
                If it wins in game 1, we're done. If it loses, we size the next bet to recover what we lost{' '}
                <em>and</em> still net our 5 units, then run it back in the next game of that series. Chases run on
                a <strong className="text-foreground">three-game series</strong>, so it's at most three bets
                (games 1, 2, and 3) — if it still hasn't hit after game 3, the chase is over and we take the loss.
              </p>
            </div>

            <div>
              <div className="font-medium text-foreground">Example — “Under 8.5” chase</div>
              <ol className="ml-5 mt-1 list-decimal space-y-1 marker:text-muted-foreground">
                <li>Game 1: bet 5u to win 5u on the Under 8.5. If it cashes → <strong className="text-foreground">+5u</strong>, chase over.</li>
                <li>Game 2 (only if game 1 lost): bet 10u to win 10u — that recovers the 5u we lost and still nets 5u.</li>
                <li>Game 3 (only if still losing): bet 20u to win 20u — recovers the 15u lost plus our 5u target.</li>
              </ol>
              <p className="mt-2">
                If it never hits by the end of game 3, the chase is over and we take the loss — we don't carry a
                chase into a different series. (Exact bet sizes shift a bit with the odds; the idea is each step
                wins back the prior losses plus 5 units.)
              </p>
              <p className="mt-2">
                One note on the number itself. A chase is named for a number, like Under 8.5 for the Mariners, but
                you always bet the line that's actually posted for that game. If the total for a later game in the
                series is higher than 8.5, say it sits at 9 or 9.5, take that posted line. A higher number on an
                Under only works in your favor, and that's the line that counts as the system play.
              </p>
            </div>

            <div>
              <div className="font-medium text-foreground">The ML / +1.5 System</div>
              <p className="mt-1">
                One specific chase keys off a <strong className="text-foreground">team name</strong> instead of a
                fixed bet type. When the play just reads a team — say <span className="font-mono text-xs">Yankees</span>{' '}
                for their series vs. the Orioles — the bet each game depends on whether the Yankees are favored:
              </p>
              <Bullets items={[
                'Favored that game → play their moneyline (ML).',
                'Underdog that game → play their +1.5 run-line spread.',
              ]} />
              <p className="mt-2">
                It's still one continuous chase to net 5 units; only the bet type flips game-to-game with their role.
              </p>
              <div className="mt-2 font-medium text-foreground">Walkthrough</div>
              <ol className="ml-5 mt-1 list-decimal space-y-1 marker:text-muted-foreground">
                <li>Game 1: Yankees are underdogs → play <span className="font-mono text-xs">+1.5</span> to win 5u. They lose by 3, so the +1.5 doesn't cover — chase continues.</li>
                <li>Game 2: Yankees are now favorites → play their ML to win back the 5u we lost + 5u more (10u). They lose again.</li>
                <li>Game 3: Yankees are favorites again → play their ML to win back everything lost + 5u more.</li>
              </ol>
            </div>

            <div className="rounded-lg border border-warning/30 bg-warning/5 p-4">
              <div className="mb-2 flex items-center gap-2 font-medium text-warning">
                <AlertTriangle className="h-4 w-4" /> This is a system — not emotional chasing.
              </div>
              <p>
                Don't confuse this with the loss-chasing I warn about in Section 3. A chase here is a{' '}
                <strong className="text-foreground">pre-defined, bounded plan</strong>: the number of games is
                capped by the series, the bets are set in advance, and the whole sequence targets a fixed 5 units.
                Because the stake grows each game, a full chase can risk a real chunk of bankroll — e.g.{' '}
                <span className="font-mono text-xs">5 + 10 + 20 = 35u</span> across a 3-game series to net 5u.
                That's exactly why the unit and bankroll guidance above matters: size your unit so a full failed
                chase is something you can absorb without flinching.
              </p>
            </div>
          </Section>

          <Section title="6. Long-Term Mindset">
            <p>At the end of the day: it's your money, your bankroll, your responsibility.</p>
            <p>
              You're always free to reach out with questions — I genuinely want your betting experience to go
              well, and I'm happy to give advice. But I can't manage your account and I can't monitor your
              actions. The discipline is on you.
            </p>
          </Section>

          <Section title="7. Final Notes">
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
