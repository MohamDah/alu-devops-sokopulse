# SokoPulse

> Real-Time Agricultural Commodity Price Tracker, USSD Gateway & MoMo Trade Simulator for East African Smallholder Farmers

## African Context

Many smallholder farmers in Rwanda and across East Africa sell at the farm gate without knowing what their crop fetches in town. Buyers and traders who travel between markets know the going rates, the farmer usually does not, and that gap in information (price asymmetry) makes it hard to tell a fair offer from a low one. Prices also differ from market to market, so the same bag of beans can be worth more in Kigali than in Rubavu.

Middlemen provide real services such as transport, aggregation and storage. But when only one side knows the market price, a farmer with perishable produce and bills to pay has little room to negotiate and can end up underpaid. Simple, trusted price information is a first step towards fairer bargaining, especially when a farmer can compare several markets and see which one pays the most.

Most rural farmers use basic feature phones, not smartphones, and mobile data can be expensive or patchy. USSD menus (dial a short code such as `*182#`) work on any handset with no internet connection, which is why a price service has to be reachable that way. Once a price is agreed, mobile money (MoMo) lets the buyer pay the farmer instantly instead of carrying cash, and the farmer sees exactly what arrives after fees.

SokoPulse is a learning project that simulates this chain: compare prices, check them over USSD, and settle a trade by MoMo. It uses illustrative data only. It is not connected to any real market feed, telecom operator or payment provider.

## Team Members

| Name | Role | Student ID |
| --- | --- | --- |
| Mohamed Dahab | DevOps & Governance | m.dahab@alustudent.com |
| Promesse Irakoze | Price Service | p.irakoze2@alustudent.com |
| Christian Ishimwe Ntwali | USSD & MoMo Services | c.ishimwent@alustudent.com |
| Samuella Ineza | Dashboard & Docs | s.ineza@alustudent.com |

## Project Overview

SokoPulse is a small Node.js web application with three independent services: a commodity price tracker, a USSD menu simulator and a mobile money payment simulator. A single-page dashboard lets you try all three in a browser. Everything runs from seeded in-memory data, so there is no database to install and no account to create.

The application is deliberately simple. The focus of the course project is the DevOps practice around it: protected branches, code review, automated tests and, in later formatives, CI, containers and infrastructure as code. Each service lives in its own folder under `src/services/` with its own routes, logic and data, so it can later be split into a separate container (LO7 microservices readiness).

This formative covers the project foundation and secure collaboration: a secured repository, a working three-service app with tests, a dashboard and documentation.

### Target Users

- **Smallholder farmers and cooperatives:** compare prices across markets and see where to sell.
- **Produce buyers:** check an agreed price and preview the fee and the farmer's net payout.
- **Students and instructors:** a small, readable codebase for practising Git workflow, testing and DevOps tooling.

### Core Features

1. **Commodity price tracker:** `GET /api/prices` returns 5 commodities (Maize, Red Beans, Irish Potatoes, Cassava, Rice) across 4 markets (Kimironko-Kigali, Musanze, Rubavu, Huye) in RWF/kg, with wholesale and retail prices, trend and filters.
2. **Arbitrage engine:** `GET /api/prices/arbitrage?commodity=Maize` returns the best market to sell, the lowest-priced market, the spread and trend percentages.
3. **USSD menu simulator:** `POST /api/ussd` serves a 3-level `*182#` menu (main menu, crop, market, live price) using `CON` and `END` screens.
4. **MoMo payment simulator:** `POST /api/momo/pay` validates Rwandan phone numbers, calculates subtotal, tiered fee and net farmer payout, and returns a simulated reference with deterministic success or failure.

## Technology Stack

| Layer | Technology |
| --- | --- |
| Backend | Node.js 20+, Express 5, JavaScript (CommonJS), Helmet, dotenv |
| Frontend | Plain HTML, CSS and JavaScript (no framework, no build step) |
| Database / data layer | Seeded JavaScript data and in-memory arrays. No external database; state resets on restart |
| Testing & DevOps | Jest, Supertest, npm scripts, Git and GitHub (branch protection, CODEOWNERS, PR template) |

## Getting Started

### Prerequisites

- Node.js 20 or later and npm
- Git
- `curl` (optional, for the API examples)

### Installation

```bash
git clone https://github.com/MohamDah/alu-devops-sokopulse.git
cd alu-devops-sokopulse
npm install
cp .env.example .env
npm test
npm start
```

Open http://localhost:3000 for the dashboard. The `.env` file only sets `PORT` (default `3000`); the app also runs without it. Use `npm run test:coverage` for a coverage report.

### Usage

Prices (optionally filtered), and the arbitrage comparison:

```bash
curl "http://localhost:3000/api/prices"
curl "http://localhost:3000/api/prices?commodity=Maize&market=Musanze"
curl "http://localhost:3000/api/prices/arbitrage?commodity=Maize"
```

USSD: send the choices so far, joined by `*`. Start with an empty `text`.

```bash
curl -X POST http://localhost:3000/api/ussd -H "Content-Type: application/json" -d '{"text":""}'
curl -X POST http://localhost:3000/api/ussd -H "Content-Type: application/json" -d '{"text":"1*1*1"}'
```

The second call (prices, Maize, Kimironko-Kigali) returns an `END` screen with the live price. Responses starting `CON` expect another choice; `END` closes the session. Choice `0` exits.

About `*182#`:

- **It is a label, not parsed.** The dial string is never sent to the API. A real USSD gateway starts the session when the user dials the code, then sends only the choices made so far as `text` (for example `"1*1*1"`). This simulator takes that `text` directly.
- **MoMo-style shortcuts work the same way.** A shortcut such as `*182*1*1*1#` reaches a gateway as `text = "1*1*1"`. The service keeps no session, so sending `"1*1*1"` as the first request already works. We don't simulate the gateway stripping `*182*` and `#`.
- **`*182#` is a real code.** It is MTN Rwanda's MoMo code, used here only as a demo label. A real deployment would need its own operator-assigned shortcode.
- **USSD is not connected to MoMo.** The menu shows prices and the best market to sell. Payments are only available at `/api/momo/pay` and in the dashboard.

MoMo payment simulation (25 kg x 1,200 RWF = 30,000 RWF, fee 300, net payout 29,700):

```bash
curl -X POST http://localhost:3000/api/momo/pay -H "Content-Type: application/json" \
  -d '{"buyerPhone":"0781234567","farmerPhone":"0791234567","commodity":"Red Beans","quantityKg":25,"pricePerKg":1200}'
curl "http://localhost:3000/api/momo/transactions"
```

Set `"scenario"` to `insufficient_funds` or `pin_timeout` for a deterministic failed payment (still returned as HTTP 201 with `"status":"FAILED"`). Invalid input returns HTTP 400. Fee tiers (simulated, deducted from the farmer): up to 5,000 RWF = 50; up to 50,000 = 300; up to 500,000 = 1,500; above = 5,000.

## Project Structure

```text
alu-devops-sokopulse/
├── .github/
│   ├── CODEOWNERS
│   └── pull_request_template.md
├── public/                     # dashboard (HTML, CSS, JS)
├── src/
│   ├── config/index.js         # reads PORT
│   ├── data/seedMarkets.js     # seeded price data
│   ├── services/
│   │   ├── price-service/      # price.service.js + price.routes.js
│   │   ├── ussd-service/       # ussd.service.js + ussd.routes.js
│   │   └── momo-service/       # momo.service.js + momo.routes.js
│   ├── app.js                  # builds the Express app and wires the services
│   └── server.js               # starts the server
├── tests/                      # Jest unit tests per service + API integration tests
├── .env.example
├── .gitignore
├── LICENSE
├── package.json
├── package-lock.json
└── README.md
```

How the pieces fit together:

```text
Browser dashboard / curl
          |
          v
     src/app.js  (Express)
      |       |        |
/api/prices  /api/ussd  /api/momo
      |       |        |
 price-service  ussd-service  momo-service
 (own logic     (own logic;   (own logic and
  and data)      reads prices  own transaction
                 via injected  list)
                 provider)
```

Each service folder holds its own routes and its own logic, and keeps its own data. No service imports another service's files. The only connection is in `src/app.js`, which hands the USSD service a small price-reading interface. This is what prepares the app for LO7 microservices containerization: in a later formative each folder can get its own entry point and Dockerfile, and the injected price interface can become an HTTP call to the price container behind an API gateway, without rewriting the service logic.


## Security & Branch Protection Governance (Shift-Left DevOps)

`main` is protected. Nothing reaches it except through a reviewed pull request. The rules below are enabled on the repository (Settings > Branches).

| Rule | Setting on `main` | Why it matters |
| --- | --- | --- |
| Require pull request | On | Every change is proposed, discussed and recorded; nobody pushes straight to `main`. |
| 1 approval | At least 1 approving review | A second person sees every change, which shares knowledge and catches mistakes. |
| Dismiss stale approvals | On | If new commits are pushed, the earlier approval no longer counts; reviewers approve what actually merges. |
| Status checks | On (strict). No checks are required yet | Automated checks become merge gates once CI exists. Until then the rule is a placeholder. |
| Up-to-date branches | On | A branch must include the latest `main` before merging, so it is tested against current code. |
| Conversation resolution | On | Review comments must be resolved, not ignored. |
| Include administrators | On | The owner follows the same rules as everyone else. Force pushes and branch deletion are also blocked. |

Supporting files: [`.github/CODEOWNERS`](.github/CODEOWNERS) lists reviewers for core directories, [`.github/pull_request_template.md`](.github/pull_request_template.md) is the PR checklist, and [`.gitignore`](.gitignore) keeps secrets (`.env`), dependencies and Terraform state out of git.

Workflow: branch from `main`, make small [Conventional Commits](https://www.conventionalcommits.org/), open a PR that links its issue, get a review, then merge.

Limits of this demo: it runs over plain local HTTP with no authentication, no rate limiting and no persistent storage, so do not expose it publicly or enter real phone numbers. The dependency audit currently reports advisories only in Jest's development dependencies; there are none in production dependencies (`npm audit --omit=dev`).

### AI usage disclosure

The initial codebase and documentation were produced with substantial help from an AI coding assistant (an AI assistant using Copilot SDK in VS Code). Generated code can contain mistakes, so every contributor is expected to read, test and be able to explain what they submit, and to follow the course's AI-use policy. AI assistance is not a substitute for teammate code review.

## Links

- [Project Board](https://github.com/users/MohamDah/projects/5/views/1)
- [Documentation](./README.md)

## License

MIT License. See [LICENSE](./LICENSE).
