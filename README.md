# Edgeable

A Firebase‑hosted **subscription portal** for a sports‑picks service. Subscribers log in to track their subscription status and performance; the owner and admins manage subscribers, payments, and daily results — all in one web app.

**Live:** https://edgeabled.web.app

> For entertainment/education only. 21+. Bet only what you can afford to lose — no result is guaranteed.

---

## What it does

### Subscribers
- **Flexible login** — sign in with email, Telegram username, **or** phone (all resolve to one account).
- **Open self‑service sign‑up** — accounts start *inactive* and unlock once the admin approves a payment.
- **Subscription card** — status (Active / Expiring Soon / Expired / Inactive), days remaining, plan, and start/end dates.
- **Interactive performance chart** — a Robinhood‑style, scrubbable line chart with a smoothed (monotone‑cubic) curve. Toggle **Yours** (your subscription window) vs **Edgeable** (all‑time track record), across **Week / Month / 3M / All** ranges; the headline value and date follow your cursor/finger.
- **Submit renewal requests** with a payment screenshot; suggested pricing and payment details (CashApp / Zelle) are shown in‑app.
- **Request profile changes** (display name, email, phone, Telegram) — applied after admin approval.
- **Self‑service password reset** (emailed link) and in‑app change‑password.
- **In‑app guide** explaining how to read the card, units, and bankroll strategy.

### Admin
- **Dashboard** — status buckets, "expiring soon," this month's revenue, recent activity, and a daily sign‑up overview.
- **Subscriber table** — sortable/filterable, with detail pages and full transaction history.
- **Transactions** — record / edit / delete payments. A replay engine recomputes each subscriber's end date from their transaction chain so the audit trail stays consistent.
- **Requests queue** — approve/reject subscription and profile‑change requests (proof images open in an in‑app lightbox).
- **Daily P&L** — log results per day or in bulk **summary** entries; performance flows through to subscribers, separated into their subscription window vs all‑time.
- **Account tools** — back‑date legacy clients (custom start/end), reset password or email, delete accounts, and flag dormant (6+ months inactive) accounts.

---

## Tech stack

- **Frontend:** React + Vite, React Router
- **Styling:** Tailwind CSS with a shadcn‑style component library (`src/components/ui`)
- **Backend:** Firebase — Authentication, Firestore, Storage, Hosting, and Cloud Functions (2nd gen)

## Architecture highlights

- **Identity model** — Firebase Auth uses email/password under the hood; subscribers may identify by email, Telegram handle, or phone. Lookup collections (`usernames/`, `phones/`) map an identifier → the account's auth email.
- **Subscription engine** — transactions store length in human units (years / months / weeks, not collapsed to days). `replaySubscriberChain()` re‑applies a subscriber's transactions in order to recompute `subscriptionEnd` after any edit or deletion.
- **Performance tracking** — daily P&L is recorded in **units**; a subscriber's personal number counts only days inside their active subscription window, while the all‑time record is shown as a separate track record.
- **Security** — Firestore and Storage rules enforce per‑user access and field/length limits. Operations that change a login identifier (email / Telegram) or delete an account run through **admin‑only Cloud Functions** (verified server‑side), since they require Admin‑SDK privileges.

## Project structure

```
src/
  pages/         # Route pages: Login, Signup, ForgotPassword, Dashboard, Guide, Admin, admin/*
  components/    # Feature components; components/ui = design-system primitives
  utils/         # auth, subscription, transactions, pnl, pricing, requests, ...
  firebase.js    # Firebase web config + SDK exports
functions/       # Cloud Functions: admin-only identity ops + account deletion
firestore.rules  # Firestore security rules
storage.rules    # Storage security rules
```

## Local development

Prerequisites: Node 18+, the Firebase CLI, and a Firebase project.

```bash
npm install
npm run dev        # Vite dev server
```

The Firebase **web** config is in `src/firebase.js` (safe to be public — it's protected by security rules). The admin scripts and Cloud Functions require a `service-account.json` in the project root — this is a **private key and is gitignored; never commit it.**

## Build & deploy

```bash
npm run build                     # build to dist/
firebase deploy                   # hosting + rules + functions
firebase deploy --only hosting    # frontend only
```

## Admin scripts

Run with Node; each needs `service-account.json` in the project root:

```bash
node scripts/reset-user-password.js <email|@username|phone> [new-password]
node scripts/reset-user-email.js    <email|@username|phone> <new-email>
```

## Security notes

- **No secrets committed.** `service-account.json`, `.env`, and key files are gitignored. The Firebase web API key in `src/firebase.js` is public by design (security is enforced by Firestore/Storage rules, not by hiding the key).
- **Input hardening.** User input is emoji‑stripped and length‑capped in the UI; Firestore rules enforce string‑length limits and per‑document access on the server.

---

© 2026 Edgeable. All rights reserved.
