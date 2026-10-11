# XEND-AGENT-REACH-001 — Xender Agent-Reach prospect research

Agent-Reach: https://github.com/Panniantong/Agent-Reach
Upstream install guide: https://github.com/Panniantong/Agent-Reach/blob/main/docs/install.md
Pinned revision for first-stage local bootstrap: 94f06c1969dfc1834001269d79d3ad0972d9dee6 (2026-10-07). Review before changing the pin.

## Why / architecture

- Agent-Reach is an agent-side capability selector, dependency installer, and health checker. It is **not** a hosted API, CRM, autoposter or bulk DM engine.
- Run on a user-controlled Windows ThinkPad with Python 3.10+ (and Chrome for desktop social channels); **never install it in the Cloudflare Worker or public site**.
- Use it to identify/research public overseas B2B businesses, unmet website needs, competitor products and relevant communities. Xender's existing Maps finder is separate.
- Capture a single Facebook or Instagram search result locally via \`scripts/prospecting/agent-reach-research.mjs\`; then **human-check** any potential lead. The capture output is not an import-ready prospect list.
- Import only verified, legitimate business prospect records into the existing private Xender MIS workflow (see \`scripts/prospecting/find-no-website.mjs\` and \`docs/REVENUE_SPRINT.md\`).
- Keep raw tool output and prospect records inside \`prospects-out/\` (already gitignored). Never include session cookies, credentials, private personal profiles, exported browser data, or active leads in a PR.

## Windows bootstrap (safe, two-stage)

From the Xender repo in PowerShell:

\`\`\`powershell
# Optional: install Agent-Reach Python package into a user-only virtual environment.
# This is NOT a system-wide install and will NOT auto-install upstream CLIs.
.\scripts\prospecting\setup-agent-reach.ps1 -Setup

# Later: just check the existing installation and channel diagnostics
.\scripts\prospecting\setup-agent-reach.ps1
\`\`\`

The first command requires Python >=3.10 and internet access. It pins the upstream package to a verified revision but transitive packages are fetched by pip; audit/update them per normal dependency policy. It does not pass \`--system\` and does not acquire login cookies. The upstream \`agent-reach install --env=auto\` is a read-only dependency check; \`doctor\` reports which channels still need manual setup.

To activate Facebook/Instagram, separately review the upstream OpenCLI dependency and its [Chrome extension](https://chromewebstore.google.com/detail/opencli/ildkmabpimmkaediidaifkhjpohdnifk), then approve the upstream optional install. The user's existing, explicitly controlled Chrome session is required for those platforms. Only after reviewing and approving local changes, use this from the Agent-Reach venv:

\`\`\`powershell
& "$env:USERPROFILE\.agent-reach-venv\Scripts\agent-reach.exe" install --env=auto --system --channels=facebook,instagram
opencli doctor
\`\`\`

If \`opencli doctor\` is not connected or login/session is missing, stop and ask the user to configure Chrome manually. Do not bypass login prompts, CAPTCHA, rate limits, or account restrictions. Keep credentials in their own stores and **never paste cookies, exported sessions or passwords into chat, code, issues, CI, or GitHub**. Prefer a dedicated company account.

LinkedIn is separate: public pages may be readable via Jina Reader, whereas fuller access uses \`mcp-server-linkedin\` and a user-controlled desktop sign-in; do not assume LinkedIn prospecting works from basic install.

## Capture a read-only search, one query at a time

\`\`\`powershell
node scripts/prospecting/agent-reach-research.mjs --platform facebook --query "auto repair London"
node scripts/prospecting/agent-reach-research.mjs --platform instagram --query "Toronto dental clinic"
\`\`\`

This script runs \`opencli <platform> search <query> -f yaml\` without a shell, posting, following, sending messages, or automation loops. It saves text + a metadata record under gitignored \`prospects-out/agent-reach/\`. It does **not** claim an Instagram-wide keyword search (upstream Instagram search is user/profile search), and it does **not** verify that a business lacks a website.

Human verification checklist: confirm company identity and public business URL; inspect their actual site and one specific issue; check buyer fit (US/UK/CA/AU, service vertical); dedupe; respect public contact preferences/opt-outs; create an accurately labelled Xender demo if appropriate. Do not mass message or scrape private individuals. Use official APIs where required by the platform; outbound emails/messages must follow applicable anti-spam/privacy requirements (including CAN-SPAM, CASL, PECR and GDPR as applicable).

For a qualified prospect, capture in **private MIS** the company name, market, category, public listing/site, evidence URL, verified issue, source platform, relevance, status, last contact and next action. Only after a one-to-one compliant first touch can status become "messaged". Use the existing Xender industry landing page or preview link; do not misrepresent a draft as the prospect's live website.

## First test / acceptance

1. Windows bootstrap completes; \`agent-reach doctor\` outputs a real report. Track unready channels as unready.
2. After approved OpenCLI + Chrome extension setup, one read-only Facebook or Instagram query runs and local output is saved in \`prospects-out/\`.
3. An agent or user validates one public business record and finds evidence before importing to private MIS.
4. No cookies/secrets/active prospect lists committed; no auto-DMs or platform restrictions bypassed.
5. Failure of any LLM/CLI is checkpointed in Xender's task board instead of causing duplicate outreach.

Current status: **PR prepared only**. No installation on Sahil's Windows laptop, social login, live capture, MIS import, or outbound outreach has been executed by this PR.
