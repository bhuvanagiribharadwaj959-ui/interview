# Interview Platform

An AI interview workspace that combines a Next.js interview app, local TTS tooling, and language runtime helpers.

## Architecture

The repository is organized into a few clear layers:

- `my-app/` - the main Next.js application with the interview UI, API routes, and editor experience.
- `TTS.ipynb` - a local notebook for bringing up the text-to-speech service and testing it against the app.
- `my-compiler/` - language-specific execution helpers for code evaluation.
- `scripts/` - utility scripts for data extraction and maintenance.

High level flow:

1. Resume and interview data are handled in the Next.js app.
2. The coding interview uses the editor and API routes in `my-app/`.
3. TTS is bootstrapped locally from `TTS.ipynb` and can be exposed through ngrok during development.
4. Secrets stay local in `.env` files and are excluded from git.

## Local Setup

1. Install dependencies inside `my-app/`.
2. Copy the example env files and fill in your local values.
3. Start the app with `npm run dev` from `my-app/`.

The app expects local environment values for things like MongoDB, Firebase, and TTS endpoints. Use the example files as the template and never commit real credentials.

## TTS Notebook

`TTS.ipynb` is intended for local development only.

- It is easiest to run on a machine with GPU support.
- Install the notebook dependencies before launching the TTS cells.
- Provide `NGROK_AUTH_TOKEN` locally in your shell or notebook environment when exposing the TTS server.
- Do not paste ngrok, API, or model keys into committed notebook cells.

If you need to share notebook steps, keep placeholders in the notebook and store the real values only in your local environment.

## Reference Docs

- `my-app/README.md` - app-level setup notes.
- `my-app/VSCODE_INTEGRATION.md` - editor and Monaco integration details.
- `INTERVIEW_IMPROVEMENTS.md` - product and UX change notes.
