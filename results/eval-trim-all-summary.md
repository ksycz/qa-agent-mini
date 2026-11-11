| Run | Steps | Tokens (in + out) | Stopped because | Found | False alarms | Replies cut off | Guard warnings |
|---|---|---|---|---|---|---|---|
| 1 | 13 | 72,686 | done | 2 of 3 | 0 | 0 | 1 |
| 2 | 9 | 36,077 | done | 2 of 3 | 0 | 1 | 0 |
| 3 | 15 | 80,910 | done | 2 of 3 | 0 | 1 | 1 |

- `senior-discount`: reported in 3 of 3 runs
- `group-threshold`: reported in 3 of 3 runs
- `limit-off-by-one`: reported in 0 of 3 runs
- False alarms: 0 in 3 runs
- Tokens per run: mean 63,224, min 36,077, max 80,910
- Steps per run: mean 12.3

Reported issues (the keyword match is in brackets):
- Run 1: Visitor aged 65 is charged €15.00 instead of €10.00 (senior discount is 25% instead of 50%) [senior-discount]
- Run 1: Group discount of 10% not applied at 8 tickets [group-threshold]
- Run 2: Visitor aged 65 gets €15.00 instead of €10.00 [senior-discount]
- Run 2: Group discount of 10% not applied at 8 tickets [group-threshold]
- Run 3: Visitor aged 65 is charged €15.00 instead of €10.00 [senior-discount]
- Run 3: Group discount of 10% not applied to 8 adults [group-threshold]
