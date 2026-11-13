Model: claude-haiku-5-5. Loop: hand-written (src/agent.ts).

| Run | Steps | Tokens (in + out) | Stopped because | Found | False alarms | Replies cut off | Guard warnings |
|---|---|---|---|---|---|---|---|
| 1 | 19 | 128,316 | done | 4 of 4 | 0 | 0 | 0 |
| 2 | 19 | 130,412 | token_budget | 4 of 4 | 0 | 0 | 0 |
| 3 | 16 | 98,511 | done | 3 of 4 | 0 | 0 | 0 |
| 4 | 18 | 132,245 | token_budget | 4 of 4 | 0 | 0 | 0 |
| 5 | 17 | 99,104 | done | 3 of 4 | 0 | 0 | 0 |
| 6 | 13 | 69,332 | done | 3 of 4 | 0 | 0 | 0 |

- Reports: 25 in 6 runs (mean 4.2), of them 4 repeat a bug the same run had already reported
- `senior-discount`: reported in 6 of 6 runs
- `group-threshold`: reported in 6 of 6 runs
- `limit-off-by-one`: reported in 6 of 6 runs
- `decimal-age-accepted`: reported in 3 of 6 runs
- False alarms: 0 in 6 runs
- Model call latency: p50 2.0 s, p95 4.1 s (102 calls)
- Run time: mean 39.4 s, max 52.8 s
- Price (list prices in src/cost.ts): per run mean $0.0135, min $0.0084, max $0.0166; all 6 runs $0.0811
- Price per found bug: $0.0039 (21 found in 6 runs)
- Evidence in the trace (src/evidence.ts), 25 reports: 25 supported, 0 with a reconstructed quote, 0 WITHOUT evidence, 0 not checkable
- Tokens per run: mean 109,653, min 69,332, max 132,245
- Steps per run: mean 17.0

Reported issues (the keyword match is in brackets):
- Run 1: Visitor aged 65 is charged €15.00 instead of €10.00 [senior-discount]
- Run 1: Group discount of 10% not applied at 8 tickets [group-threshold]
- Run 1: 11th ticket is accepted; limit of 10 tickets per order not enforced [limit-off-by-one]
- Run 1: Decimal age 1.5 is accepted as a ticket [decimal-age-accepted]
- Run 2: Senior (age 65) ticket priced at €15.00 instead of €10.00 [senior-discount]
- Run 2: 10% group discount not applied to an order of 8 adults [group-threshold]
- Run 2: Order accepts an 11th ticket; limit of 10 not enforced [limit-off-by-one]
- Run 2: Group discount starts at 9 tickets instead of 8 [group-threshold]
- Run 2: Decimal age 1.5 accepted as a free ticket [decimal-age-accepted]
- Run 3: Visitor aged 65 gets €15.00 instead of €10.00 [senior-discount]
- Run 3: Group discount of 10% not applied at 8 tickets [group-threshold]
- Run 3: Order accepts 11 tickets; 10-ticket limit not enforced [limit-off-by-one]
- Run 4: Visitor aged 65 is charged €15.00 instead of €10.00 [senior-discount]
- Run 4: Group discount of 10% not applied at 8 adult tickets [group-threshold]
- Run 4: Eleventh ticket accepted; 10-ticket limit not enforced [limit-off-by-one]
- Run 4: Group discount starts at 9 tickets instead of 8 (off-by-one) [group-threshold]
- Run 4: Senior ticket in a group of 9 gets 25% off instead of 50%, then 10% off (€13.50 instead of €9.00) [group-threshold]
- Run 4: Decimal age 1.5 is accepted and adds a ticket [decimal-age-accepted]
- Run 5: Visitor aged 65 charged €15.00 instead of €10.00 [senior-discount]
- Run 5: Group discount of 10% not applied at 8 tickets [group-threshold]
- Run 5: Group discount starts at 9 tickets instead of 8 [group-threshold]
- Run 5: Order accepts an 11th ticket; limit is 10 [limit-off-by-one]
- Run 6: Senior (65+) ticket priced €15.00 instead of €10.00 [senior-discount]
- Run 6: Group discount of 10% not applied at 8 tickets [group-threshold]
- Run 6: Order accepts 11 tickets; limit of 10 not enforced [limit-off-by-one]

Pages that show what the agent did in each run: run 1, run 2, run 3, run 4, run 5, run 6
