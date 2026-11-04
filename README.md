# SGGS Platform

Monorepo for **SGGS — Shorten, Generate, Group & Share**, a link studio for
short links, branded QR codes, link-in-bio pages and click analytics.

| App | Directory | Live URL | Stack |
| --- | --- | --- | --- |
| Frontend | [`frontend/`](frontend/) | https://sggs.saibende.in | React 18, Vite, Tailwind CSS, Clerk |
| Backend | [`backend/`](backend/) | https://go.saibende.in | Node.js, Express, MongoDB, Clerk |

The frontend serves the dashboard, QR studio, analytics workspace and public
profiles at `/u/<username>` and `<handle>.sggs.saibende.in`. The backend owns
authentication, link storage, redirects, analytics and Clerk Billing.

New share links use `https://go.saibende.in/:shortId`. Links created before
2026-11-02 still resolve through `https://sggs.saibende.in/:shortId`.

## Repository layout

```text
.
├── frontend/   # React + Vite app, Clerk auth, QR studio, LinkTree pages
├── backend/    # Express API, redirects, analytics, Clerk Billing
└── README.md
```

Each directory keeps its own `package.json`, lockfile, README and Vercel
configuration. The two projects are deployed independently.

## Local development

### Backend

```sh
cd backend
npm install
# Create backend/.env — see backend/README.md for the full variable list.
npm run dev
```

The API listens on `http://localhost:8000` by default. Public routes (redirects
and public profiles) work without Clerk keys; protected routes return `503`
until the Clerk keys are set.

### Frontend

```sh
cd frontend
npm install
# Create frontend/.env — see frontend/README.md for the full variable list.
npm run dev
```

The Vite dev server runs at `http://localhost:5173`.

## Tests and load tests

Run these from the backend directory:

```sh
cd backend
npm test                 # unit tests; no database required
npm run test:integration # HTTP tests; needs MONGODB_URL
npm run test:all         # both
npm run loadtest -- --url http://localhost:8000 --connections 10 --duration 10
npm run capacity -- --users 1000 --links-per-user 10 --visits 5000
```

See [`backend/README.md`](backend/README.md) for the capacity report, Atlas Free
limits and the redirect load-test results.

For the frontend:

```sh
cd frontend
npm run lint
npm run build
```

## Deployment

The repository is deployed as **two Vercel projects** connected to the same
GitHub repository:

| Vercel project | Root Directory | Domain |
| --- | --- | --- |
| Frontend | `frontend` | `sggs.saibende.in` |
| Backend | `backend` | `go.saibende.in` |

Set **Root Directory** in each project under **Settings → General**. Keep
environment variables on the project that owns them. The frontend's
`vercel.json` rewrites all routes to `index.html`; the backend's `vercel.json`
pins the Vercel Functions region to `bom1`.

Because both projects share one repository, a push can trigger both builds.
Use each project's **Ignored Build Step** if you want deployments limited to
changes in its own directory.

## History

This repository combines the former
[`SaiBende/SGGS`](https://github.com/SaiBende/SGGS) (frontend) and
[`SaiBende/URL_Shortner`](https://github.com/SaiBende/URL_Shortner) (backend)
repositories. Both commit histories are preserved under `frontend/` and
`backend/`; the original repositories are archived once the monorepo
deployment is verified.

## License

- `frontend/` — MIT
- `backend/` — ISC
