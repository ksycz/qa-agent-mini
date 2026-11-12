| Run | Steps | Tokens (in + out) | Stopped because | Found | False alarms | Replies cut off | Guard warnings |
|---|---|---|---|---|---|---|---|
| 1 | 12 | 69,174 | done | 3 of 3 | 0 | 0 | 0 |
| 2 | 15 | 88,512 | done | 3 of 3 | 0 | 0 | 0 |
| 3 | 15 | 83,833 | token_budget | 2 of 3 | 0 | 0 | 0 |

- `senior-discount`: reported in 3 of 3 runs
- `group-threshold`: reported in 2 of 3 runs
- `limit-off-by-one`: reported in 3 of 3 runs
- False alarms: 0 in 3 runs
- Tokens per run: mean 80,506, min 69,174, max 88,512
- Steps per run: mean 14.0

Reported issues (the keyword match is in brackets):
- Run 1: Senior (65+) ticket priced at €15.00 instead of €10.00 [senior-discount]
- Run 1: Order accepts an 11th ticket; no "Maximum 10 tickets per order." message [limit-off-by-one]
- Run 1: Free ticket (age 0) not counted toward the 8-ticket group discount [group-threshold]
- Run 2: Senior (65+) ticket priced at €15.00 instead of €10.00 [senior-discount]
- Run 2: Group discount of 10% not applied at 8 tickets [group-threshold]
- Run 2: 11th ticket accepted; 10-ticket limit not enforced [limit-off-by-one]
- Run 3: Senior (age 65+) ticket priced €15.00 instead of €10.00 [senior-discount]
- Run 3: Order accepts an 11th ticket; limit of 10 not enforced [limit-off-by-one]
