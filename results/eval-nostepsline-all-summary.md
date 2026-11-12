| Run | Steps | Tokens (in + out) | Stopped because | Found | False alarms | Replies cut off | Guard warnings |
|---|---|---|---|---|---|---|---|
| 1 | 20 | 126,868 | token_budget | 4 of 4 | 0 | 0 | 0 |
| 2 | 14 | 72,891 | done | 3 of 4 | 0 | 0 | 0 |
| 3 | 16 | 99,171 | done | 3 of 4 | 0 | 0 | 0 |
| 4 | 18 | 128,972 | done | 4 of 4 | 0 | 0 | 0 |
| 5 | 18 | 127,504 | token_budget | 4 of 4 | 0 | 0 | 0 |
| 6 | 18 | 109,667 | done | 4 of 4 | 0 | 0 | 0 |

- `senior-discount`: reported in 6 of 6 runs
- `group-threshold`: reported in 6 of 6 runs
- `limit-off-by-one`: reported in 6 of 6 runs
- `decimal-age-accepted`: reported in 4 of 6 runs
- False alarms: 0 in 6 runs
- Tokens per run: mean 110,846, min 72,891, max 128,972
- Steps per run: mean 17.3

Reported issues (the keyword match is in brackets):
- Run 1: Visitor aged 65 charged €15.00 instead of €10.00 [senior-discount]
- Run 1: Group discount of 10% not applied at 8 tickets [group-threshold]
- Run 1: Order accepts an 11th ticket; limit of 10 not enforced [limit-off-by-one]
- Run 1: Group discount starts at 9 tickets instead of 8 [group-threshold]
- Run 1: Decimal age 17.5 accepted as a ticket [decimal-age-accepted]
- Run 2: Visitor aged 65 is charged €15.00 instead of €10.00 [senior-discount]
- Run 2: Group discount of 10% not applied to order of 8 tickets [group-threshold]
- Run 2: 11th ticket accepted; 10-ticket limit not enforced [limit-off-by-one]
- Run 3: Visitor aged 65 gets €15.00 instead of €10.00 [senior-discount]
- Run 3: Group discount of 10% not applied to 8 adults [group-threshold]
- Run 3: Order accepts 11 tickets; limit of 10 not enforced and no message shown [limit-off-by-one]
- Run 3: Group discount applied inconsistently: first 8 adults at €20.00 in one run, €18.00 in another [group-threshold]
- Run 4: Senior (age 65) ticket priced at €15.00 instead of €10.00 [senior-discount]
- Run 4: 10% group discount not applied at 8 tickets [group-threshold]
- Run 4: Group discount starts at 9 tickets instead of 8 (off-by-one) [group-threshold]
- Run 4: 11th ticket accepted; 10-ticket limit not enforced [limit-off-by-one]
- Run 4: Decimal age 12.5 accepted and priced [decimal-age-accepted]
- Run 5: Visitor aged 65 is charged €15.00 instead of €10.00 [senior-discount]
- Run 5: Group discount of 10% not applied at 8 tickets [group-threshold]
- Run 5: 11th ticket is accepted; limit of 10 tickets per order not enforced [limit-off-by-one]
- Run 5: Decimal age 2.5 is accepted as a ticket [decimal-age-accepted]
- Run 6: Senior (age 65) ticket priced at €15.00 instead of €10.00 [senior-discount]
- Run 6: Decimal age 5.5 accepted and adds a ticket [decimal-age-accepted]
- Run 6: Group discount of 10% not applied at 8 tickets [group-threshold]
- Run 6: 11th ticket accepted; 10-ticket limit not enforced [limit-off-by-one]
- Run 6: Group discount starts at 9 tickets instead of 8; earlier tickets repriced retroactively [group-threshold]

Pages that show what the agent did in each run: run 1, run 2, run 3, run 4, run 5, run 6
