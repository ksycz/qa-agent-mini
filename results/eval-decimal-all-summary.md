| Run | Steps | Tokens (in + out) | Stopped because | Found | False alarms | Replies cut off | Guard warnings |
|---|---|---|---|---|---|---|---|
| 1 | 15 | 82,667 | token_budget | 4 of 4 | 0 | 0 | 0 |
| 2 | 15 | 77,884 | done | 3 of 4 | 0 | 0 | 0 |
| 3 | 15 | 85,528 | token_budget | 3 of 4 | 0 | 1 | 0 |
| 4 | 15 | 86,821 | done | 3 of 4 | 0 | 0 | 0 |
| 5 | 14 | 82,284 | token_budget | 3 of 4 | 0 | 0 | 0 |
| 6 | 15 | 86,488 | token_budget | 4 of 4 | 0 | 0 | 0 |

- `senior-discount`: reported in 6 of 6 runs
- `group-threshold`: reported in 5 of 6 runs
- `limit-off-by-one`: reported in 6 of 6 runs
- `decimal-age-accepted`: reported in 3 of 6 runs
- False alarms: 0 in 6 runs
- Tokens per run: mean 83,612, min 77,884, max 86,821
- Steps per run: mean 14.8

Reported issues (the keyword match is in brackets):
- Run 1: Visitor aged 65 is charged €15.00 instead of €10.00 [senior-discount]
- Run 1: Decimal age 1.5 is accepted and adds a ticket [decimal-age-accepted]
- Run 1: 10% group discount not applied at 8 tickets [group-threshold]
- Run 1: 11th ticket is added; the limit of 10 per order is not enforced [limit-off-by-one]
- Run 2: Visitor aged 65 is charged €15.00 instead of €10.00 [senior-discount]
- Run 2: Decimal age 12.5 is accepted instead of rejected [decimal-age-accepted]
- Run 2: 11th ticket is accepted; the 10-ticket limit is not enforced [limit-off-by-one]
- Run 3: Senior (age 65) ticket priced at €15.00 instead of €10.00 [senior-discount]
- Run 3: Group discount of 10% not applied at 8 tickets [group-threshold]
- Run 3: 11th ticket accepted; 10-ticket limit not enforced [limit-off-by-one]
- Run 3: Group discount appears to start at 9 tickets, not 8 (extra detail on group discount bug) [group-threshold]
- Run 4: Senior (age 65) ticket priced at €15.00 instead of €10.00 [senior-discount]
- Run 4: 11th ticket accepted; 10-ticket limit not enforced [limit-off-by-one]
- Run 4: Group discount not applied when the 8th ticket is free (free tickets not counted toward 8) [group-threshold]
- Run 4: Group discount (10%) not applied to 8 adult tickets [group-threshold]
- Run 5: Visitor aged 65 gets 25% off instead of 50% off [senior-discount]
- Run 5: Eleventh ticket is accepted; limit of 10 per order not enforced [limit-off-by-one]
- Run 5: Group discount starts at 9 tickets instead of 8 [group-threshold]
- Run 5: Free ticket does not count towards the group of 8; discount not applied to 8 tickets including a free one [group-threshold]
- Run 6: Visitor aged 65 gets €15.00 instead of €10.00 [senior-discount]
- Run 6: Decimal age 1.5 is accepted and adds a ticket [decimal-age-accepted]
- Run 6: Group discount of 10% not applied at 8 tickets [group-threshold]
- Run 6: 11th ticket is accepted; no "Maximum 10 tickets per order." message [limit-off-by-one]
