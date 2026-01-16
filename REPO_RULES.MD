Here’s a rule kit add‑on that ties TAGO Leap explicitly back to each bounty’s brief. You can paste this at the top of REPO_RULES.md under a new section like “Bounty Alignment Rules”.

Bounty alignment rules
All code, endpoints, and UX work must be traceable to at least one of the three bounties. For each new feature or PR, tag it with [PEAR], [LIFI], or [SALT] (or combinations) in the title and ensure it satisfies the corresponding checklist below.

1. [PEAR] Build on the Pear Execution API
Bounty brief anchors:

“Build mobile or desktop apps, bots, or other automation tools that let people trade ideas, not just single tokens.”

“Solutions that encourage users to place pair/basket trades.”

“Interfaces that make advanced trading simple and more akin to betting/gambling.”

“Automation or distribution layers (bots, mobile, social).”

“Does it execute real trades? Does it unlock easier or new trading behavior? Would people want to use it?”

TAGO Leap rules:

All logic that constructs and sends pair/basket trades must live in services/pear-service.

Every trade must be executed via the official execution API and logged in trades with:

whether it is pair or basket

the narrative that generated it (theme, sector, ecosystem)

The frontend “Trade” flow must:

Present themes/narratives, not raw token tickers, as the primary entry point.

Make opening a pair/basket trade feel like filling a bet slip (stake, direction, risk preset).

Support at least:

simple pair trades (long A / short B)

multi-asset baskets (long basket / short benchmark or vice versa)

Any automation or social/distribution feature (copy link, bot integration, etc.) must:

call pear-service endpoints

encode narrative/bet parameters, not low-level order IDs.

PEAR acceptance checklist:

 “Trade” UI starts from ideas/themes, not token pickers.

 At least one pair and one basket trade path wired live to the execution API.

 trades table records narrative metadata and mode for judging.

 UX resembles a simple betting slip (stake, direction, leverage/risk) rather than a pro trading terminal.

 Any automation (e.g. robo-manager, shareable bet link) ultimately routes to pear-service and places real trades.

2. [LIFI] One-Click Onboarding to Hyperliquid with LI.FI
Bounty brief anchors:

“Build a dApp or component that bridges users from any chain into HyperEVM (and optionally into a Hyperliquid trading account) using LI.FI routing.”

“User picks origin chain + token, destination token on HyperEVM.”

“Uses LI.FI to swap and bridge in one flow.”

“Shows route details and execution state (quote, ETA, steps, progress, final amount).”

“Extra credit: reusable ‘Deposit to Hyperliquid’ component; mobile‑first onboarding; developer tool that simplifies HyperEVM onboarding.”

“Judging: creative use of LI.FI, clean UX, reliable error handling, actually useful for Hyperliquid builders and users.”

TAGO Leap rules:

All routing and deposit orchestration must live in services/lifi-service:

No direct LI.FI HTTP calls from other services.

No direct Hyperliquid deposit API calls from frontend.

The frontend Onboard page must:

Provide a single, reusable “Deposit to Hyperliquid” component that other teams could copy.

Let users choose origin chain + token and HyperEVM destination token.

Use LI.FI to obtain a single-flow bridge+swap quote, then show:

full route summary

ETA, steps, and expected final amount

clear progress states (Idle → Quoted → In-Progress → Completed/Failed)

Error handling must:

Capture failures from LI.FI or deposits.

Surface actionable messages (“Bridge stuck, check tx hash X”) not generic errors.

LIFI acceptance checklist:

 lifi-service exposes GET /onboard/options, POST /onboard/quote, POST /onboard/track, POST /onboard/deposit.

 Frontend has a single composable deposit component that calls only lifi-service (no direct LI.FI/Hyperliquid calls).

 Users see quote, ETA, route steps, and final amount before confirming.

 Progress and error states are clearly shown and handled.

 The component works on mobile (viewport, touch targets, no overflow forms).

3. [SALT] Programmable Capital & Robo Managers on Salt
Bounty brief anchors:

“Utilize policy-controlled accounts to automate and manage capital on HyperEVM without ever taking custody.”

“Robo managers & autonomous agents… risk-aware portfolio rebalancers or strategy agents.”

“New ownership models like shared vaults, tokenized accounts.”

“AI + chat-driven management where an agent interprets intent under rules.”

“Judging: originality; depth of Salt integration; practical usefulness; execution & UX.”

TAGO Leap rules:

All policy / account / strategy logic must be isolated in services/salt-service:

Salt accounts are created and managed only here.

Policies are stored and enforced only here.

The robo loop that triggers trades lives here and calls pear-service, not the other way around.

Salt policies must:

Express concrete risk constraints (max leverage, max daily notional, allowed pairs, max drawdown).

Be checked before any trade trigger is sent to pear-service.

Strategies must:

Bind to narratives/pairs/baskets, not just raw token IDs.

Run in a periodic “agent” loop that logs all actions into strategy_runs.

UX must:

Let users create and inspect their policy-controlled account.

Offer a simple policy editor (form for caps and allowed pairs/themes).

Provide strategy toggles (on/off, params) and show recent robo actions.

SALT acceptance checklist:

 salt-service exposes endpoints to create accounts, set policies, attach strategies, and fetch state.

 Strategy loop runs periodically and can trigger at least one real trade via pear-service.

 Every robo-triggered trade respects policy limits and writes a strategy_runs log.

 Frontend “Robo” page shows account, current policy, strategies, and recent actions in a user-friendly way.

 No custody is taken: code assumes user funds sit in their policy-controlled account; the agent only instructs under rules.

4. Cross-bounty rules (TAGO Leap as a whole)
To maximize scoring across all three bounties:

Every end-to-end path should chain cleanly:

Onboard → Trade → Robo.

Example flow:

User bridges to HyperEVM and deposits into the trading account via the LI.FI flow.

User places a narrative pair/basket bet that executes via the execution API.

User later enables a policy/strategy so an agent can manage similar trades under strict rules.

For the pitch/demo:

Always map features back to the exact phrases in the briefs:

“Trade ideas, not just single tokens.”

“One-click onboarding from any chain to HyperEVM and into a trading account.”

“Policy-controlled robo managers that never take custody.”