# Aura: contextual memory companion

A calm, free, offline-capable web app for keeping the people in your life and the small moments of your day in one place, with a caregiver check-in you review before sharing. Built for the Meta AI Developer Hackathon (Indie Developer, "build for your world"), then finished as a usable product.

**Live app:** https://aura-companion-5hf.pages.dev

## What it does

- **People:** save a name, relationship, one everyday detail and an optional photo. You choose who you are with; Aura never identifies anyone.
- **Today:** time-aware greeting, context card with its source, read-aloud, recent notes and today's routine.
- **Routine:** everyday activities in time order with done and not-done-yet states (ticks reset daily).
- **Daily notes:** type or dictate, search, and select which notes go into a check-in.
- **Caregiver check-in:** evidence-linked draft (every line carries its note ID), a review gate, then copy, open in WhatsApp or email with the text filled in, or print. Aura sends nothing itself.
- **Comfort:** normal, large and extra-large text, high contrast, mobile layout, keyboard and screen-reader labels.
- **Your data:** stored only in your browser. Download or restore a JSON backup, delete everything in one click. Installable as an app and works offline after first load.

## What it does not do

No smart glasses or wearables, face recognition, emotion or confusion detection, medication advice, diagnosis, emergency monitoring, accounts, cloud sync or encryption. It is not a medical device and has had no clinical testing. Notes mentioning medication or health terms are blocked by a simple keyword check, which is a safeguard and not clinical safety.

## Run

Needs Node.js 20+. No dependencies.

```sh
npm test
npm start      # http://127.0.0.1:3000
```

The `public/` folder is a static site and can be hosted anywhere (it is deployed on Cloudflare Pages).

## Optional Meta model API (off by default)

`src/server.mjs` can call Meta's chat completions API to reorder check-in lines. It is off unless you run the Node server with `META_LIVE_ENABLED=true`, `MODEL_API_KEY` and `META_MAX_CALLS`. See `.env.example`. `META_MAX_CALLS` is a request-count guard, not a spend limit. The model may only reorder exact confirmed note text; anything rewritten is rejected. This path has never been run against the live API (automated tests use stubs), and the hosted site does not use it. Never put a key in browser code.

## Privacy and safety

Use everyday, low-sensitivity information. Browser storage is unencrypted and tied to one device and browser. Real patient records do not belong here. Do not use Aura to decide medication, treatment or whether someone is safe alone.

## Tests

`npm test` runs unit tests for the core logic, backup validation, routine states, share links and the server's safety checks.
