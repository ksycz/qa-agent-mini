| Run | Steps | Tokens (in + out) | Stopped because | Found | False alarms | Replies cut off | Guard warnings |
|---|---|---|---|---|---|---|---|
| 1 | 18 | 124,547 | token_budget | 4 of 4 | 0 | 0 | 0 |
| 2 | 18 | 120,189 | done | 4 of 4 | 0 | 0 | 0 |
| 3 | 15 | 98,546 | done | 3 of 4 | 0 | 0 | 0 |
| 4 | 19 | 124,696 | token_budget | 4 of 4 | 0 | 0 | 0 |
| 5 | 15 | 91,780 | done | 4 of 4 | 0 | 0 | 0 |
| 6 | 17 | 104,122 | done | 4 of 4 | 0 | 0 | 0 |

- Reports: 28 in 6 runs (mean 4.7), of them 5 repeat a bug the same run had already reported
- `senior-discount`: reported in 6 of 6 runs
- `group-threshold`: reported in 6 of 6 runs
- `limit-off-by-one`: reported in 6 of 6 runs
- `decimal-age-accepted`: reported in 5 of 6 runs
- False alarms: 0 in 6 runs
- Model call latency: p50 1.9 s, p95 3.7 s (102 calls)
- Run time: mean 36.6 s, max 40.6 s
- Price (list prices in src/cost.ts): per run mean $0.0134, min $0.0110, max $0.0151; all 6 runs $0.0804
- Price per found bug: $0.0035 (23 found in 6 runs)
- Evidence in the trace (src/evidence.ts), 28 reports: 26 supported, 2 with a reconstructed quote, 0 WITHOUT evidence, 0 not checkable
- Tokens per run: mean 110,647, min 91,780, max 124,696
- Steps per run: mean 17.0

Reported issues (the keyword match is in brackets):
- Run 1: Visitor aged 65 gets €15.00 instead of €10.00 (senior 50% discount not applied correctly) [senior-discount]
- Run 1: Decimal age 1.5 is accepted and adds a ticket [decimal-age-accepted]
- Run 1: 11th ticket is added; limit of 10 tickets per order not enforced [limit-off-by-one]
- Run 1: Group 10% discount not applied at 8 tickets (applied only later) [group-threshold]
- Run 1: Group discount threshold is 9 tickets, not 8 (correction to previous report) [group-threshold]
- Run 2: Senior (age 65) ticket priced at €15.00 instead of €10.00 [senior-discount]
- Run 2: Decimal age 1.5 is accepted and adds a ticket [decimal-age-accepted]
- Run 2: 11th ticket is added; no "Maximum 10 tickets per order." message [limit-off-by-one]
- Run 2: Group discount not applied when free tickets make up the 8 [group-threshold]
- Run 2: Group discount not applied to child (12) or senior (65) in a group of 8 [group-threshold]
- Run 3: Senior (age 65) ticket priced at €15.00 instead of €10.00 [senior-discount]
- Run 3: Group discount of 10% not applied at 8 tickets [group-threshold]
- Run 3: Order limit of 10 tickets not enforced; 11th ticket accepted [limit-off-by-one]
- Run 3: Group discount starts at 9 tickets instead of 8 [group-threshold]
- Run 4: Visitor aged 65 charged €15.00 instead of €10.00 [senior-discount]
- Run 4: Group discount of 10% not applied at 8 tickets [group-threshold]
- Run 4: 11th ticket accepted; limit of 10 tickets per order not enforced [limit-off-by-one]
- Run 4: Group discount starts at 9th ticket instead of 8th [group-threshold]
- Run 4: Decimal age 5.5 accepted as a ticket [decimal-age-accepted]
- Run 5: Visitor aged 65 is charged €15.00 instead of €10.00 (senior discount is 25% instead of 50%) [senior-discount]
- Run 5: Decimal age 5.5 is accepted and adds a ticket [decimal-age-accepted]
- Run 5: Group discount of 10% not applied when order reaches 8 tickets [group-threshold]
- Run 5: Group discount starts at 9 tickets, not 8 [group-threshold]
- Run 5: 11th ticket is accepted; limit of 10 tickets per order is not enforced [limit-off-by-one]
- Run 6: Visitor aged 65 is charged €15.00 instead of €10.00 [senior-discount]
- Run 6: Group discount not applied when order reaches 8 tickets [group-threshold]
- Run 6: 11th ticket is accepted; limit of 10 tickets per order not enforced [limit-off-by-one]
- Run 6: Decimal age 5.5 is accepted instead of rejected [decimal-age-accepted]

Pages that show what the agent did in each run: run 1, run 2, run 3, run 4, run 5, run 6
