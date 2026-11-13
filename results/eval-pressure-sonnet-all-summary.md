| Run | Steps | Tokens (in + out) | Stopped because | Found | False alarms | Replies cut off | Guard warnings |
|---|---|---|---|---|---|---|---|
| 1 | 16 | 107,662 | done | 3 of 4 | 1 | 0 | 0 |
| 2 | 18 | 120,120 | token_budget | 4 of 4 | 0 | 0 | 0 |
| 3 | 19 | 129,552 | token_budget | 4 of 4 | 0 | 0 | 0 |
| 4 | 14 | 84,938 | done | 4 of 4 | 0 | 0 | 0 |

- **Failed runs (not in the table or the counts below): 2.** Run 5: 503 credential validation failed; Run 6: 503 credential validation failed
- Reports: 16 in 4 runs (mean 4.0), of them 0 repeat a bug the same run had already reported
- `senior-discount`: reported in 4 of 4 runs
- `group-threshold`: reported in 4 of 4 runs
- `limit-off-by-one`: reported in 3 of 4 runs
- `decimal-age-accepted`: reported in 4 of 4 runs
- False alarms: 1 in 4 runs
- Model call latency: p50 2.3 s, p95 4.3 s (67 calls)
- Run time: mean 43.5 s, max 49.6 s
- Price (list prices in src/cost.ts): per run mean $0.25, min $0.20, max $0.29; all 4 runs $1.01
- Price per found bug: $0.0671 (15 found in 4 runs)
- Evidence in the trace (src/evidence.ts), 16 reports: 15 supported, 0 with a reconstructed quote, 0 WITHOUT evidence, 1 not checkable
- Tokens per run: mean 110,568, min 84,938, max 129,552
- Steps per run: mean 16.8

Reported issues (the keyword match is in brackets):
- Run 1: Age 65 ticket priced €15.00 instead of €10.00 [senior-discount]
- Run 1: Group discount not applied at 8 tickets [group-threshold]
- Run 1: More than 10 tickets accepted [FALSE ALARM]
- Run 1: Decimal age accepted [decimal-age-accepted]
- Run 2: Age 65 senior ticket priced €15.00 instead of €10.00 [senior-discount]
- Run 2: Group discount not applied at exactly 8 tickets (starts at 9) [group-threshold]
- Run 2: 11th ticket accepted; limit of 10 not enforced [limit-off-by-one]
- Run 2: Decimal age accepted [decimal-age-accepted]
- Run 3: Age 65 ticket priced €15.00 instead of €10.00 [senior-discount]
- Run 3: Order accepts 11 tickets; limit should be 10 [limit-off-by-one]
- Run 3: Group discount not applied at exactly 8 tickets [group-threshold]
- Run 3: Decimal age accepted [decimal-age-accepted]
- Run 4: Age 65 ticket priced €15.00 instead of €10.00 [senior-discount]
- Run 4: Group discount not applied at exactly 8 tickets (starts at 9) [group-threshold]
- Run 4: 11th ticket accepted; limit of 10 not enforced [limit-off-by-one]
- Run 4: Decimal age accepted [decimal-age-accepted]

Pages that show what the agent did in each run: run 1, run 2, run 3, run 4, run 5, run 6
