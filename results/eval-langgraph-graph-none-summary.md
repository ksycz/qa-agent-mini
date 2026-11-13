Model: claude-haiku-5-5. Loop: LangGraph (src/graph-agent.ts).

| Run | Steps | Tokens (in + out) | Stopped because | Found | False alarms | Replies cut off | Guard warnings |
|---|---|---|---|---|---|---|---|
| 1 | 16 | 91,821 | done | n/a | 0 | 0 | 0 |
| 2 | 19 | 121,826 | token_budget | n/a | 0 | 0 | 0 |
| 3 | 19 | 122,409 | token_budget | n/a | 0 | 1 | 0 |

- Reports: 0 in 3 runs (mean 0.0), of them 0 repeat a bug the same run had already reported
- False alarms: 0 in 3 runs
- Model call latency: p50 2.3 s, p95 4.4 s (54 calls)
- Run time: mean 43.1 s, max 47.8 s
- Price (list prices in src/cost.ts): per run mean $0.0136, min $0.0111, max $0.0149; all 3 runs $0.0408
- Evidence in the trace (src/evidence.ts), 0 reports: 0 supported, 0 with a reconstructed quote, 0 WITHOUT evidence, 0 not checkable
- Tokens per run: mean 112,019, min 91,821, max 122,409
- Steps per run: mean 18.0

Reported issues (the keyword match is in brackets):
- Run 1: nothing reported
- Run 2: nothing reported
- Run 3: nothing reported

Pages that show what the agent did in each run: run 1, run 2, run 3
