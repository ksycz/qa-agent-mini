| Run | Steps | Tokens (in + out) | Stopped because | Found | False alarms | Replies cut off | Guard warnings |
|---|---|---|---|---|---|---|---|
| 1 | 14 | 81,330 | done | 3 of 3 | 0 | 0 | 0 |
| 2 | 14 | 86,360 | token_budget | 3 of 3 | 0 | 0 | 0 |
| 3 | 15 | 86,861 | token_budget | 3 of 3 | 0 | 0 | 0 |
| 4 | 14 | 80,215 | done | 3 of 3 | 0 | 0 | 0 |
| 5 | 15 | 82,650 | token_budget | 3 of 3 | 0 | 0 | 0 |
| 6 | 15 | 84,878 | done | 3 of 3 | 0 | 0 | 0 |

- `senior-discount`: reported in 6 of 6 runs
- `group-threshold`: reported in 6 of 6 runs
- `limit-off-by-one`: reported in 6 of 6 runs
- False alarms: 0 in 6 runs
- Tokens per run: mean 83,716, min 80,215, max 86,861
- Steps per run: mean 14.5

Reported issues (the keyword match is in brackets):
- Run 1: Visitor aged 65 is charged €15.00 instead of €10.00 [senior-discount]
- Run 1: Group 10% discount not applied to an order of 8 tickets [group-threshold]
- Run 1: Eleventh ticket is accepted; 10-ticket limit not enforced [limit-off-by-one]
- Run 2: Visitor aged 65 is charged €15.00 instead of €10.00 [senior-discount]
- Run 2: Eleventh ticket is accepted; the 10-ticket limit is not enforced [limit-off-by-one]
- Run 2: Free ticket does not count towards the group discount of 8 [group-threshold]
- Run 3: Visitor aged 65 is charged €15.00 instead of €10.00 [senior-discount]
- Run 3: Group discount of 10% not applied to order of 8 tickets [group-threshold]
- Run 3: Eleventh ticket accepted; maximum of 10 tickets per order not enforced [limit-off-by-one]
- Run 3: Group discount starts at 9 tickets instead of 8 [group-threshold]
- Run 4: Visitor aged 65 charged €15.00 instead of €10.00 [senior-discount]
- Run 4: Eleventh ticket accepted; no "Maximum 10 tickets per order." message [limit-off-by-one]
- Run 4: Group discount not applied to 8 tickets including a free child and a senior [group-threshold]
- Run 5: Visitor aged 65 is charged €15.00 instead of €10.00 [senior-discount]
- Run 5: Order accepts an 11th ticket; limit of 10 not enforced [limit-off-by-one]
- Run 5: Group discount not applied when 8 tickets include free ones [group-threshold]
- Run 5: Senior ticket in a group of 8+ shows €13.50 instead of €9.00 [group-threshold]
- Run 5: Correction to previous report: total with senior in group of 8 [group-threshold]
- Run 6: Visitor aged 65 is charged €15.00 instead of €10.00 [senior-discount]
- Run 6: Group discount of 10% not applied at 8 tickets [group-threshold]
- Run 6: 11th ticket is accepted; the 10-ticket limit is not enforced [limit-off-by-one]
