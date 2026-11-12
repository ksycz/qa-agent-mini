| Run | Steps | Tokens (in + out) | Stopped because | Found | False alarms | Replies cut off | Guard warnings |
|---|---|---|---|---|---|---|---|
| 1 | 14 | 90,740 | done | 3 of 4 | 0 | 0 | 0 |

- `senior-discount`: reported in 1 of 1 runs
- `group-threshold`: reported in 1 of 1 runs
- `limit-off-by-one`: reported in 1 of 1 runs
- `decimal-age-accepted`: reported in 0 of 1 runs
- False alarms: 0 in 1 runs
- Model call latency: p50 2.4 s, p95 3.9 s (14 calls)
- Run time: mean 37.0 s, max 37.0 s
- Price (list prices in src/cost.ts): per run mean $0.0112, min $0.0112, max $0.0112; all 1 runs $0.0112
- Price per found bug: $0.0037 (3 found in 1 runs)
- Tokens per run: mean 90,740, min 90,740, max 90,740
- Steps per run: mean 14.0

Reported issues (the keyword match is in brackets):
- Run 1: Visitor aged 65 is charged €15.00 instead of €10.00 [senior-discount]
- Run 1: Group discount of 10% not applied at 8 tickets [group-threshold]
- Run 1: Group discount starts at 9 tickets instead of 8 [group-threshold]
- Run 1: Eleventh ticket is accepted; 10-ticket limit not enforced [limit-off-by-one]

Pages that show what the agent did in each run: run 1
