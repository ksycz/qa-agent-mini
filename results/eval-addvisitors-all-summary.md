| Run | Steps | Tokens (in + out) | Stopped because | Found | False alarms | Replies cut off | Guard warnings |
|---|---|---|---|---|---|---|---|
| 1 | 15 | 84,593 | token_budget | 3 of 3 | 0 | 1 | 0 |
| 2 | 16 | 85,101 | done | 3 of 3 | 0 | 0 | 0 |
| 3 | 8 | 31,926 | done | 2 of 3 | 0 | 0 | 0 |

- `senior-discount`: reported in 3 of 3 runs
- `group-threshold`: reported in 2 of 3 runs
- `limit-off-by-one`: reported in 3 of 3 runs
- False alarms: 0 in 3 runs
- Tokens per run: mean 67,207, min 31,926, max 85,101
- Steps per run: mean 13.0

Reported issues (the keyword match is in brackets):
- Run 1: Senior (65+) ticket priced at 75% of adult price instead of 50% off [senior-discount]
- Run 1: 10% group discount not applied at 8 or more tickets [group-threshold]
- Run 1: Order accepts more than 10 tickets; limit message appears only after 11th ticket [limit-off-by-one]
- Run 2: Age 65 senior ticket priced at €15.00 instead of €10.00 [senior-discount]
- Run 2: Group 10% discount starts at 9 tickets, not 8 [group-threshold]
- Run 2: Order accepts an 11th ticket; the 10-ticket limit is not enforced [limit-off-by-one]
- Run 3: Senior aged 65 gets 25% off instead of 50% off [senior-discount]
- Run 3: Order accepts an 11th ticket; limit of 10 not enforced [limit-off-by-one]
