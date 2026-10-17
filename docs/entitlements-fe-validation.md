# Subscription entitlements FE validation

Validated on 18 October 2026 (Asia/Ho_Chi_Minh).

Branch: `feature/subscription-entitlements-ui`.
Base: `dev` fast-forwarded from `origin/dev` to `2f027bd` before creating the feature branch.

## Contract and implementation

Sources: `NutriMom_FE_Entitlements_Guide.md`, backend `docs/ENTITLEMENTS_API.md`, `PlanCatalog`, `EntitlementGuard`, subscription/payment services and the four guarded write paths in the current backend checkout.

| Requirement | Implementation / validation |
| --- | --- |
| Public catalog | `GET /subscription-plans`, explicitly unauthenticated; API test and anonymous browser flow verify no Authorization header. |
| Catalog invariants | Server order FREE, PLAN_399K, PLAN_99K; all ten feature rows, including excluded rows; DTO fixtures pass through the real mapper in pricing tests. |
| Server-owned presentation data | Names, descriptions, prices, featured state, duration and benefits come from the API. Scan detail is derived from the quota period. No production fallback price list. |
| Current subscription | `GET /subscriptions/me` drives pricing, selection, review, account, overview and feature access. Failed reads show unknown/error state, never an assumed FREE tier. |
| Real duration | Both paid plans currently show 30 days. Removed 9-month wording and the trial message that claimed features were unlocked. |
| Correct current plan | Grid, card and selector identify the actual tier; FREE no longer receives an unconditional current badge. |
| Account navigation | Upgrade and benefits links use `/app/pricing#pricing`. |
| Family creation/invitations | FREE and 99K see an upgrade prompt for new groups/invitations; 399K can create and invite. Existing group data remains accessible. |
| Reminder creation | FREE is prompted to upgrade for standalone reminders, medical-record shortcuts and the next suggested reminder. Paid users can create. |
| Existing data | Existing FREE reminders can be opened, edited, marked complete and deleted. No plan gate added to these actions. |
| Invitation acceptance | No purchase gate added to token or ID acceptance. Browser test confirms a FREE account can accept a token invitation. Existing invitation-v2 tests retain ID acceptance coverage. |
| Backend rejection | All four guarded write paths catch `PLAN_UPGRADE_REQUIRED`; exact backend message and `required_plan` are used. Invalid/missing required plan goes to the catalog. Metadata is not rendered as form-field validation. |
| Other failures | `FORBIDDEN`, validation errors and `QUOTA_EXCEEDED` do not open an upgrade prompt. Family quota exhaustion retains its server message rather than claiming the caller clicked too quickly. |
| Checkout | Existing PayOS/mock verification and payment API contracts retained. No checkout on page load or plan selection; stable idempotency keys and synchronous submit gates prevent rapid duplicate purchases. |
| Purchase policy | Renew current paid tier or upgrade 99K to 399K. Buying 99K while 399K is active is unavailable in the UI and checked again against a fresh subscription before checkout. This is an FE purchase policy, not a new BE security restriction. |
| Activation/expiry | Confirmed payment invalidates pending pre-payment entitlement reads and refreshes rights. Open pages refresh when the subscription reaches its end date. |
| Request control | Shared in-flight reads; public catalog TTL 5 minutes, account-scoped entitlement TTL 15 seconds; visibility/focus refresh uses the same cache. No background retry loop. |
| HTTP 429 | Read cooldown respects Retry-After. Write cooldown is shared per account/operation across navigation; buttons show a countdown. No automatic replay of a POST or checkout. |
| Account isolation | Session change/clear discards account data and cooldowns; old pending reads cannot publish into a new account. |
| AI Scan | Catalog quota is displayed as a plan allowance, with “Sắp ra mắt”. No invented used/remaining counters; dashboard scan_quota remains nullable. |
| Other modules | No additional gating added to onboarding, conception calculation, nutrition, consultation or shared-calendar reading. |

## UI and design

Applied the repository's `design-taste-frontend` skill in preserve mode to the pricing surface. Kept the existing NutriMom rose/plum palette, serif pricing headings, product typography, routes and icons. Dials: variance 3, motion 3, density 4, appropriate for a clear purchase decision.

- Current-plan summary shows the actual plan, expiration and remaining days.
- Current, featured and selected states are visually distinct; excluded benefits use lock icons.
- Upgrade prompts explain the restriction without hiding existing user data.
- Existing form values survive an upgrade response when returning to the form.
- Upgrade content replaces the form in its existing dialog; next-reminder and delete confirmations no longer keep a second active modal underneath.
- Keyboard focus is trapped and restored to the opener. Reduced-motion behavior is supported.
- Desktop, tablet and mobile layouts were checked at 1440, 768 and 375 pixels in light/dark modes.
- Loading placeholders reserve the catalog layout; fixed a decorative checkout background that previously caused 5px horizontal overflow on mobile.
- Assistant conversation UI is loaded on opening the assistant, avoiding an unnecessary initial panel download on the pricing page.

## Verification

- `npm run lint`: passed, no warnings.
- `npm test`: 456 passed, 0 failed.
- `npm run build`: passed, including TypeScript checking. Existing large-chunk warning remains for the separately loaded LiveKit call runtime.
- `npm run test:entitlements:browser`: 24 scenarios passed, 0 uncaught browser errors. API responses are fixtures derived from the backend contract; no real payment or customer write was performed.
- Browser coverage includes all three plans, anonymous login destinations, current-plan error states, checkout activation, duplicate submissions, 429 across navigation, all guarded endpoint rejection paths, FREE invitation acceptance, existing reminder modification/deletion, expiry and keyboard focus restoration.

Artifacts are generated into ignored `qa-artifacts/entitlements/`: `browser-results.json`, `browser.log`, `tests.log`, `build.log`, screenshots, and Lighthouse HTML/JSON reports.

### Lighthouse production-build measurement

| Profile | Performance | Accessibility | Best practices | Simulated LCP | CLS |
| --- | --- | --- | --- | --- | --- |
| Desktop preset | 91 | 100 | 100 | 1.67s | 0.00014 |
| Mobile default throttling | 55 | 100 | 100 | 8.19s | 0 |

Mobile throttled performance remains below the desired performance target. Lighthouse identifies shared application CSS/JavaScript, dependency loading and the existing animated bot avatar as remaining bottlenecks. These results do not establish that the whole application meets mobile Core Web Vitals targets. Request deduplication, cooldowns, layout stability, responsive rendering and keyboard/reduced-motion behavior are independently covered by the checks above.

## Reproducing optional browser/performance checks

Requires installed Chrome, Node 22.19+ and Playwright available through `PLAYWRIGHT_MODULE` (or a locally installed Playwright package). Then run:

```powershell
npm run test:entitlements:browser
npm run build
npm install --prefix qa-artifacts/entitlements/tools --no-package-lock --no-audit --no-fund lighthouse@13.5.0
npm run test:entitlements:lighthouse
```

The Lighthouse helper serves the production build with synthetic, local API responses. Its desktop run uses Lighthouse's desktop preset; mobile uses the default mobile profile. The optional tools are installed under the ignored QA directory and are not application dependencies.

## Deliberate backend boundaries

No backend source, migrations, prices or payment activation logic were changed. The 399K duration discrepancy is resolved in FE wording by showing the 30 days actually granted. A future backend duration change will flow through the catalog mapper. Server-side downgrade restrictions, scan usage accounting and enforcement of other advertised features remain backend work outside this contract.
