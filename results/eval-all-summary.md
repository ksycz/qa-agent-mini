| Run | Steps | Tokens (in + out) | Stopped because | Found | False alarms | Replies cut off | Guard warnings |
|---|---|---|---|---|---|---|---|
| 1 | 13 | 89,673 | token_budget | 2 of 3 | 0 | 1 | 1 |
| 2 | 12 | 76,347 | done | 2 of 3 | 0 | 1 | 1 |
| 3 | 13 | 84,084 | token_budget | 3 of 3 | 0 | 0 | 1 |

- `senior-discount`: reported in 3 of 3 runs
- `group-threshold`: reported in 3 of 3 runs
- `limit-off-by-one`: reported in 1 of 3 runs
- False alarms: 0 in 3 runs
- Tokens per run: mean 83,368, min 76,347, max 89,673
- Steps per run: mean 12.7

Reported issues (the keyword match is in brackets):
- Run 1: Senior (age 65) ticket priced at €15.00 instead of €10.00 [senior-discount]
- Run 1: Group discount (10%) not applied at 8 tickets [group-threshold]
- Run 2: Visitor aged 65 is charged €15.00 instead of €10.00 [senior-discount]
- Run 2: Group discount of 10% not applied at 8 tickets [group-threshold]
- Run 3: Visitor aged 65 charged €15.00 instead of €10.00 [senior-discount]
- Run 3: Group 10% discount not applied at 8 tickets [group-threshold]
- Run 3: 11th ticket accepted; no "Maximum 10 tickets per order." message [limit-off-by-one]
