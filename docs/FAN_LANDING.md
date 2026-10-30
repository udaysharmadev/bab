# Fan raft landing redesign

Objective: give the toy raft a deliberate, readable game menu with a large animated crew, a strong wordmark and a clear friends-first action. Keep the existing name, invite and Ready flow.

## Plan
| # | File | Change | Risk |
|---|------|--------|------|
| 1 | index.html, src/client/fan.css | Responsive brand / raft stage / action layout; retain action IDs | Small screens and short landscape need separate layout checks |
| 2 | src/client/fan-main.ts | Measure the title stage on resize | Hidden title must not overwrite its frame with zero bounds |
| 3 | src/client/fan-scene.ts | Title-only toy lagoon and framed, animated crew; retain gameplay camera; four cardinal dividers between diagonal stations | Clear camera offset when joining; keep fans attached to hands and movement lanes clear |
| 4 | tests/fan-landing.mjs | Native Chrome layout, animation, onboarding checks and screenshots | Use actual projected raft bounds and inspect captures |

Decision: reuse the existing renderer, raft and shaders. No new dependency, bitmap hero or second render loop. The course arch belongs to gameplay and will be hidden for the menu. Scope is presentation; authoritative physics and multiplayer rules are unchanged.

Failure recovery: fix a failed viewport fit before publishing captures. If gameplay camera checks fail, isolate title framing rather than changing course framing. Keep prior R1 evidence historical; record landing verification separately.

## Acceptance
- Brand, hero and actions have distinct space on desktop, phone and short landscape.
- All four funny fans are visible; title water and raft animate.
- Friends and practice still require name confirmation; lobby framing resets correctly.
- Build, native layout checks and affected multiplayer / camera regressions pass.

## Delivered
The menu has a responsive outlined SVG wordmark, a distinct friends-first action and a smaller practice action. A separate open-water toy lagoon replaces the gameplay arch behind the title. The existing four avatars carry giant fans outside the raft, wave in staggered cycles and bob on animated water. Arms follow the fan handles. The raft now has only four cardinal dividers, between its diagonal player stations; no divider sits in a player's bounded scoot path. The camera fits the actual raft silhouette into the DOM stage on resize, then clears its offset on joining. Reduced-motion freezes decorative title animation. No dependency or authority changes.

## Verification
- `npm run build`: strict TypeScript, both Vite entries and server bundle pass. Existing shared-engine chunk advisory remains. Log: `evidence/fan-landing-build.txt`.
- Native Chrome 155: **10 layouts**, from320×568 /568×320 to1920×1080; brand/actions stay inside the viewport, initial actual raft silhouette fits its stage without menu overlap, no page scrolling. Keyboard/name/practice/leave/remembered-name transitions and still reduced-motion pixels pass, errors[]. `evidence/fan-landing.json` and `evidence/fan-landing-native.txt`.
- Existing four-native-client fixture: **eight check groups PASS**, errors[], including names/You, explicit Ready/countdown, lobby water/bob, owned input, menu blocking, real touch/cancel and page-reload reconnect. Sampled gameplay counters110–114 calls,49,874–50,066 triangles. `evidence/fan-landing-multiplayer.txt`.
- Actual batched raft geometry contains exactly4 dividers.1,604 samples across all four bounded station paths clear those dividers by at least0.258 m, including a0.34 m horizontal avatar envelope. `evidence/fan-divider-clearance.json`.
- Existing route fixture: **18 authored views PASS**, errors[], plus a Low capture. Title framing clears before gameplay; original course framing remains valid. `evidence/fan-landing-camera.txt`.

The first landing fixture incorrectly waited for a practice lobby. Production practice intentionally starts directly in gameplay; the fixture now checks that transition. No production rule changed to satisfy it. Final captures are `evidence/fan-landing-{width}x{height}.png`. These are local layout/flow checks, not human art acceptance or device FPS certification. Prior `evidence/fan-r1.json` hashes describe the earlier R1 build; they do not certify this changed presentation. This menu batch did not change authority. The subsequent [coasting correction](FAN_COASTING.md) has separate physics and full-regression evidence.

VERDICT: PASS for scoped landing checks. Owner visual review remains open.
