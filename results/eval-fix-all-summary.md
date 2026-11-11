| Run | Steps | Tokens (in + out) | Stopped because | Found | False alarms | Replies cut off | Guard warnings |
|---|---|---|---|---|---|---|---|
| 1 | 14 | 80,373 | token_budget | 2 of 3 | 0 | 1 | 1 |
| 2 | 14 | 73,151 | done | 2 of 3 | 0 | 1 | 1 |
| 3 | 15 | 86,436 | token_budget | 1 of 3 | 0 | 1 | 1 |

- `senior-discount`: reported in 3 of 3 runs
- `group-threshold`: reported in 2 of 3 runs
- `limit-off-by-one`: reported in 0 of 3 runs
- False alarms: 0 in 3 runs
- Tokens per run: mean 79,987, min 73,151, max 86,436
- Steps per run: mean 14.3

Reported issues (the keyword match is in brackets):
- Run 1: Visitor aged 65 gets €15.00 instead of €10.00 [senior-discount]
- Run 1: Group discount of 10% not applied at 8 tickets [group-threshold]
- Run 2: Senior (age 65) ticket priced at €15.00 instead of €10.00 [senior-discount]
- Run 2: Group discount of 10% not applied at 8 tickets [group-threshold]
- Run 3: Senior (65+) ticket shows 25% off instead of 50% off [senior-discount]
