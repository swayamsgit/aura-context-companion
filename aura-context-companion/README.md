# Aura: contextual memory companion

A non-clinical software prototype: manually saved people and context, confirmed daily events, evidence-linked recall and a human-reviewed caregiver check-in. Built for the Meta Global AI Developer Hackathon, Indie Developer / Build for Your World.

## Run

Requires Node.js 20 or newer. No dependencies are needed.

```sh
npm test
npm start
```

Open http://127.0.0.1:3000 . Local context cards, journal and check-in drafts work immediately with fictional example data.

## Meta Model API

The optional Node backend calls `https://api.meta.ai/v1/chat/completions` using `muse-spark-1.3`, per Meta's docs checked November 4, 2026:

- https://dev.meta.ai/docs/quickstart
- https://dev.meta.ai/docs/cookbook/quickstart-chat-completions

Read `.env.example`. Export the environment variables in your terminal or use a deployment provider's secret store. The server does not load `.env` files automatically.

```sh
# Set MODEL_API_KEY through your secret manager, not source code or browser storage.
export META_LIVE_ENABLED=true
export META_MAX_CALLS=1
npm start
```

A valid Meta account, billing/access and key are required. `META_MAX_CALLS` is a process-local request-count guard, **not a dollar or token budget**. Failed calls count too; restarting the server resets it. Never enable it without an approved budget and appropriate provider billing controls. Calls are off by default. No live Meta inference has been verified in this version; automated provider tests use stubs. Never claim stubbed or local output is live AI.

The frontend sends only selected event IDs, times and text, and only after the cloud-consent checkbox is selected. The server rejects medical/medication keywords, limits input and output sizes, validates source IDs, and rejects changes to exact confirmed event text. These are prototype safeguards, not proof of medical safety or full prompt-injection resistance. The model is used to organise evidence, not generate new facts or clinical advice.

## Implemented

- Add/remove people and manually choose a known person.
- Source-linked contextual prompt, with an explicit unknown state.
- Optional browser speech synthesis, dependent on device support.
- Add/select/remove daily events, stored on the same browser.
- Local evidence draft with event IDs.
- Review-before-copy, invalidated when notes or draft change.
- Meta API adapter, server-side key, consent and call-count guard.
- Unit tests and browser-interaction checks.

## Not implemented or validated

No Ray-Ban integration, Bluetooth sensor interception, continuous recording, facial recognition, confusion or emotion detection, local Llama/ExecuTorch inference, encrypted database, WhatsApp Business sending, medication advice, clinical validation or emergency monitoring.

The original wearable/edge-AI concept is a future design direction. The actual prototype is cloud-assisted only when the optional Meta backend is enabled. It is not fully offline AI.

## Privacy and safety

**Use fictional information only.** Browser-local notes are unencrypted, not synchronized and can be lost when storage is cleared. The server binds to localhost. It is not production hardened or intended for public hosting with an API key; add real authentication, quotas, TLS and storage controls before deployment. Do not put patient records or other sensitive data in this prototype. No message is sent to a caregiver by this app. It is not a medical device, does not diagnose or treat dementia and must not be used to decide medication, clinical care or whether someone is safe alone.

## Original contributions

All application code in `src/`, `public/` and `test/` was newly written for this prototype during the hackathon. The code uses Node.js standard APIs and browser APIs. Development used AI assistance. Fictional characters and events are demonstration data, not user or patient records. No hardware or clinical testing is represented.

## Submission state

Prepare a three-minute demo of the actual functions. Supply the public repository and video URLs only after checking their accessibility. Review all description claims, personal feedback ratings, contributors and organizer terms yourself before submitting.
