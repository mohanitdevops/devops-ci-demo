# devops-ci-demo

A minimal React UI wired to a full CI/CD pipeline: lint → test → SAST/dependency
scan → build → containerize → image scan → sign → push → deploy → smoke test.

Verified locally before hand-off: `npm run lint`, `npm test` (3 tests passing,
100% coverage on app logic), and `npm run build` all pass.

## 1. Local run

```bash
npm install
npm run dev        # http://localhost:5173
```

## 2. Push to GitHub

```bash
git init
git add .
git commit -m "init: devops-ci-demo"
gh repo create devops-ci-demo --private --source=. --push
# or create the repo on github.com and:
# git remote add origin git@github.com:<you>/devops-ci-demo.git
# git push -u origin main
```

GHCR push requires `packages: write`, already granted via `GITHUB_TOKEN` in
the workflow — no extra secret needed as long as the repo's
**Settings → Actions → General → Workflow permissions** is set to
"Read and write permissions."

## 3. Register your WSL self-hosted runner

If you don't already have one registered on this repo:

1. Repo → **Settings → Actions → Runners → New self-hosted runner**, choose Linux.
2. In WSL:
   ```bash
   mkdir actions-runner && cd actions-runner
   curl -o actions-runner-linux-x64.tar.gz -L <url from GitHub UI>
   tar xzf actions-runner-linux-x64.tar.gz
   ./config.sh --url https://github.com/<you>/devops-ci-demo --token <token from GitHub UI>
   ./run.sh          # or install as a service: sudo ./svc.sh install && sudo ./svc.sh start
   ```
3. Make sure Docker is installed in WSL and your runner user is in the
   `docker` group (`sudo usermod -aG docker $USER`, then re-open the shell).

The workflow's `deploy` job targets `runs-on: self-hosted` and will pick up
this runner automatically.

## 4. Create the `production` environment (manual approval gate)

Repo → **Settings → Environments → New environment** → name it `production`.
Optionally add required reviewers, so `deploy` pauses for approval before it
touches your machine — this mirrors how larger orgs gate prod deploys.

## 5. Push and watch it run

```bash
git push origin main
```

Watch progress under the repo's **Actions** tab. Once `deploy` finishes,
`curl http://localhost:8080` from WSL should return the app's HTML.

---

## Pipeline stages, and how they map to large-org practice

| Stage | What it does here | How larger orgs typically do it |
|---|---|---|
| **Lint** | ESLint, zero warnings tolerated | Same, usually paired with Prettier/format-check as a separate fast-fail step, often via pre-commit hooks too |
| **Unit test + coverage** | Vitest + React Testing Library, coverage report as an artifact | Same, but with a coverage *gate* (e.g., "fail if <80%") enforced via a tool like Codecov, plus integration/E2E suites in later stages |
| **SAST** | CodeQL | Same tool commonly used (GitHub Advanced Security), or Semgrep/Snyk Code; often run on a schedule too, not just on push |
| **Dependency scan** | `npm audit` | Same idea, but usually Snyk/Dependabot/Renovate with auto-PRs for patch bumps, and a hard-fail policy rather than `continue-on-error` |
| **Build** | Vite build, Docker multi-stage build | Same pattern; larger orgs often add reproducible-build checks and build provenance attestation (SLSA) |
| **Image scan** | Trivy, fails on CRITICAL/HIGH | Same tool or Grype/Snyk Container, frequently gated at the registry level too (admission control blocks unscanned images from deploying) |
| **SBOM** | Syft generates SPDX SBOM, uploaded as artifact | Same, often pushed to an internal SBOM store for compliance (SOC2, exec orders on software supply chain) |
| **Image signing** | cosign, keyless via GitHub OIDC | Same tool is the current industry standard (Sigstore); enforced at deploy time via policy (Kyverno/OPA verifying signatures before admission) |
| **Push to registry** | GHCR, tagged by short SHA + `latest` | Same tagging pattern; larger orgs often add semantic-version tags via a release step and retention/cleanup policies |
| **Deploy** | `docker compose up` on a self-hosted runner, gated by a `production` environment (manual approval) | Same manual-gate concept, but delivery is usually via a GitOps controller (ArgoCD/Flux) reacting to an image-tag bump in a manifest repo, rather than the CI job deploying directly — keeps deploy credentials out of CI entirely |
| **Smoke test** | curl loop against `/` | Same idea, often extended to synthetic monitoring / canary analysis before shifting 100% of traffic |
| **Rollback** | Re-pull and redeploy `latest` on failure | Same concept, but typically automated via the GitOps controller reverting the manifest, or a progressive-delivery tool (Argo Rollouts) auto-aborting based on live metrics |

### The biggest structural difference from a large org

Everything above runs as **one linear pipeline in one repo**. At scale, orgs
usually split this into:
- a **CI workflow** (lint/test/scan/build/push) triggered by app-repo pushes, and
- a **CD flow** driven by GitOps (ArgoCD, which you've already used) watching
  a separate manifest/config repo, so deployment is declarative and
  auditable independent of CI.

Given your existing ArgoCD/Argo Rollouts background, a natural next step
here would be swapping the `deploy` job for "bump image tag in a
`webapp-chart` values file" and letting ArgoCD reconcile it onto GKE instead
of `docker compose` on WSL — happy to build that version next if useful.
