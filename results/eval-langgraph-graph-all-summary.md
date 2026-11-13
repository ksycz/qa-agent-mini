Model: claude-haiku-5-5. Loop: LangGraph (src/graph-agent.ts).

| Run | Steps | Tokens (in + out) | Stopped because | Found | False alarms | Replies cut off | Guard warnings |
|---|---|---|---|---|---|---|---|
| 1 | 18 | 120,594 | token_budget | 4 of 4 | 0 | 0 | 0 |
| 2 | 15 | 84,692 | done | 3 of 4 | 0 | 0 | 0 |
| 3 | 13 | 71,142 | done | 4 of 4 | 0 | 0 | 0 |
| 4 | 18 | 118,261 | done | 4 of 4 | 0 | 0 | 0 |
| 5 | 15 | 87,758 | done | 3 of 4 | 0 | 0 | 0 |
| 6 | 15 | 85,720 | done | 3 of 4 | 0 | 0 | 0 |

- Reports: 24 in 6 runs (mean 4.0), of them 3 repeat a bug the same run had already reported
- `senior-discount`: reported in 6 of 6 runs
- `group-threshold`: reported in 6 of 6 runs
- `limit-off-by-one`: reported in 6 of 6 runs
- `decimal-age-accepted`: reported in 3 of 6 runs
- False alarms: 0 in 6 runs
- Model call latency: p50 1.9 s, p95 3.8 s (94 calls)
- Run time: mean 33.6 s, max 41.7 s
- Price (list prices in src/cost.ts): per run mean $0.0116, min $0.0094, max $0.0146; all 6 runs $0.0698
- Price per found bug: $0.0033 (21 found in 6 runs)
- Evidence in the trace (src/evidence.ts), 24 reports: 23 supported, 1 with a reconstructed quote, 0 WITHOUT evidence, 0 not checkable
- Tokens per run: mean 94,695, min 71,142, max 120,594
- Steps per run: mean 15.7

Reported issues (the keyword match is in brackets):
- Run 1: Senior (65+) ticket priced at €15.00 instead of €10.00 [senior-discount]
- Run 1: Decimal age 1.5 accepted as a ticket [decimal-age-accepted]
- Run 1: Eleventh ticket accepted; 10-ticket limit not enforced [limit-off-by-one]
- Run 1: Group discount not applied when free tickets count towards 8 [group-threshold]
- Run 1: Group discount not applied to senior and child tickets in a group of 8 [group-threshold]
- Run 2: Visitor aged 65 is priced €15.00 instead of €10.00 [senior-discount]
- Run 2: Order accepts an 11th ticket; no "Maximum 10 tickets per order." message [limit-off-by-one]
- Run 2: Group 10% discount is not applied at 8 tickets (applies only from 9) [group-threshold]
- Run 3: Visitor aged 65 is charged €15.00 instead of €10.00 [senior-discount]
- Run 3: Decimal age 1.5 is accepted and adds a ticket [decimal-age-accepted]
- Run 3: 11th ticket is added; the limit of 10 tickets is not enforced before adding [limit-off-by-one]
- Run 3: Group discount of 10% not applied at 8 tickets [group-threshold]
- Run 4: Senior (65+) ticket priced at €15.00 instead of €10.00 [senior-discount]
- Run 4: Group discount of 10% not applied at 8 tickets [group-threshold]
- Run 4: Decimal age 2.5 accepted as a ticket [decimal-age-accepted]
- Run 4: 11th ticket accepted; 10-ticket limit not enforced [limit-off-by-one]
- Run 4: Group discount starts at 9 tickets instead of 8 (and applies retroactively to all tickets) [group-threshold]
- Run 5: Senior (age 65) ticket priced at €15.00 instead of €10.00 [senior-discount]
- Run 5: Group discount (10%) not applied at 8 tickets [group-threshold]
- Run 5: Group discount starts at 9 tickets, not 8, and applies retroactively to earlier tickets [group-threshold]
- Run 5: 11th ticket accepted; "Maximum 10 tickets per order." not shown [limit-off-by-one]
- Run 6: Senior (age 65) ticket priced €15.00 instead of €10.00 [senior-discount]
- Run 6: Group discount of 10% not applied at 8 tickets [group-threshold]
- Run 6: 11th ticket accepted; "Maximum 10 tickets per order." not shown [limit-off-by-one]

Pages that show what the agent did in each run: run 1, run 2, run 3, run 4, run 5, run 6
