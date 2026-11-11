| Run | Steps | Tokens (in + out) | Stopped because | Found | False alarms | Replies cut off | Guard warnings |
|---|---|---|---|---|---|---|---|
| 1 | 14 | 62,942 | done | 2 of 3 | 0 | 0 | 0 |
| 2 | 11 | 47,147 | done | 3 of 3 | 0 | 0 | 0 |
| 3 | 17 | 85,841 | token_budget | 2 of 3 | 0 | 0 | 0 |

- `senior-discount`: reported in 3 of 3 runs
- `group-threshold`: reported in 3 of 3 runs
- `limit-off-by-one`: reported in 1 of 3 runs
- False alarms: 0 in 3 runs
- Tokens per run: mean 65,310, min 47,147, max 85,841
- Steps per run: mean 14.0

Reported issues (the keyword match is in brackets):
- Run 1: Visitor aged 65 is charged €15.00 instead of €10.00 [senior-discount]
- Run 1: Group discount of 10% not applied to orders of 8 or more tickets [group-threshold]
- Run 2: Visitor aged 65 is charged €15.00 instead of €10.00 [senior-discount]
- Run 2: 11th ticket is accepted; the 10-ticket limit is not enforced [limit-off-by-one]
- Run 2: Group discount of 10% not applied at 8 tickets [group-threshold]
- Run 3: Visitor aged 65 is charged €15.00 instead of €10.00 (senior 50% discount not applied) [senior-discount]
- Run 3: 10% group discount not applied to an order of 8 tickets [group-threshold]
