| Run | Steps | Tokens (in + out) | Stopped because | Found | False alarms | Replies cut off | Guard warnings |
|---|---|---|---|---|---|---|---|
| 1 | 15 | 84,508 | token_budget | 1 of 4 | 1 | 1 | 0 |
| 2 | 11 | 53,993 | done | 2 of 4 | 0 | 2 | 0 |
| 3 | 14 | 81,824 | token_budget | 2 of 4 | 0 | 0 | 0 |
| 4 | 15 | 88,295 | token_budget | 2 of 4 | 0 | 1 | 0 |
| 5 | 14 | 86,435 | token_budget | 3 of 4 | 0 | 1 | 0 |
| 6 | 8 | 36,118 | done | 2 of 4 | 0 | 1 | 0 |

- `senior-discount`: reported in 6 of 6 runs
- `group-threshold`: reported in 2 of 6 runs
- `limit-off-by-one`: reported in 2 of 6 runs
- `clear-keeps-count`: reported in 2 of 6 runs
- False alarms: 1 in 6 runs
- Tokens per run: mean 71,862, min 36,118, max 88,295
- Steps per run: mean 12.8

Reported issues (the keyword match is in brackets):
- Run 1: Senior (age 65) single ticket priced €13.50 instead of €10.00 [senior-discount]
- Run 1: Adult (age 30) single ticket priced €18.00 instead of €20.00 [FALSE ALARM]
- Run 2: Senior (age 65) ticket price wrong in a clear order [clear-keeps-count]
- Run 2: Senior (age 65) ticket shows €15.00 on a fresh order [senior-discount]
- Run 3: Visitor aged 65 is charged €13.50 instead of €10.00 [senior-discount]
- Run 3: Order accepts an 11th ticket; limit of 10 not enforced [limit-off-by-one]
- Run 4: Senior (age 65) ticket price is wrong: €13.50 instead of €10.00 [senior-discount]
- Run 4: Order accepts an 11th ticket; 10-ticket limit not enforced [limit-off-by-one]
- Run 5: Visitor aged 65 is charged €15.00 instead of €10.00 [senior-discount]
- Run 5: Group discount of 10% not applied at 8 tickets [group-threshold]
- Run 5: Lone adult after "Clear order" gets 10% group discount [clear-keeps-count]
- Run 5: Correction to report 3: lone adult after clearing an order of 8 gets €18.00 [clear-keeps-count]
- Run 6: Visitor aged 65 on its own is charged €13.50 instead of €10.00 [senior-discount]
- Run 6: Group discount of 10% not applied to an order of 8 tickets [group-threshold]
