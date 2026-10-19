# Risk register — owner action and escalation

**RAG truth:** Red = critical uncertainty with no validating prototype. It does not mean an observed project failure. All risks below are unvalidated as of 19 October 2026.

| Risk | Status | Trigger to escalate | Mandatory mitigation | Owner role |
|---|---|---|---|---|
| Four-player physical control not fun | RED / untested | <75% first stroke or players cannot explain motion | Redesign workspace or boat force model; re-run human test before expanding | Design + Physics |
| Shared boat latency destroys control | RED / untested | Hard correction/unfair failure in ordinary RTT | Four-client benchmark and A/B smoothing/prediction | Netcode |
| Full joints/contact explode | RED / untested | Large impulse/energy growth | Constraint/cast contact, impulse budgets, fixture regressions | Physics |
| Cohesive 14-region route too costly | RED / unestimated | No throughput estimate by slice | Ship a coherent shortened journey, not disconnected arenas | Producer |
| Browser graphics cannot hit target | AMBER / unbenchmarked | p95 frame over target on reference device | Cut render effects; preserve flow cues and physics | Rendering |
| Checkpoints lose progress | AMBER / unbuilt | Lost revision/duplicate stale write | CAS transactions, durable backup and reset fixtures | Backend |
| Long streaming leaks memory | AMBER / unbuilt | Increasing heap/GPU over repeated loads | Explicit lifecycle and 90-min soak | Graphics |
| Title has IP conflict | AMBER / unverified | Materially similar live mark | Legal clearance and backup name | Publishing |
| CrazyGames listing/invite mismatch | AMBER / unverified | Portal QA requirements unmet | SDK adapter prototype, own-site fallback | Platform |
| 4-human join funnel too difficult | RED / unknown | High 1–3 seat drop-off | Practice while waiting and better invite links | Product |

Risk owner must update `probability/impact`, mitigation result, due condition, new regression and decision date whenever evidence changes. Avoid declaring a risk fixed solely because the first happy-path demo worked.
