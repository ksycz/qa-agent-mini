| Run | Steps | Tokens (in + out) | Stopped because | Found | False alarms | Replies cut off | Guard warnings |
|---|---|---|---|---|---|---|---|
| 1 | 13 | 78,933 | done | 2 of 3 | 0 | 1 | 0 |
| 2 | 11 | 59,214 | done | 2 of 3 | 0 | 1 | 1 |
| 3 | 9 | 36,319 | done | 1 of 3 | 0 | 1 | 0 |

- `senior-discount`: reported in 3 of 3 runs
- `group-threshold`: reported in 2 of 3 runs
- `limit-off-by-one`: reported in 0 of 3 runs
- False alarms: 0 in 3 runs
- Tokens per run: mean 58,155, min 36,319, max 78,933
- Steps per run: mean 11.0

Reported issues (the keyword match is in brackets):
- Run 1: Visitor aged 65 charged €15.00 instead of €10.00 [senior-discount]
- Run 1: Group discount of 10% not applied at 8 tickets [group-threshold]
- Run 2: Visitor aged 65 charged €15.00 instead of €10.00 (senior discount wrong) [senior-discount]
- Run 2: Group discount of 10% not applied at 8 tickets [group-threshold]
- Run 3: Visitor aged 65 is charged €15.00 instead of €10.00 [senior-discount]
