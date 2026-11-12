| Run | Steps | Tokens (in + out) | Stopped because | Found | False alarms | Replies cut off | Guard warnings |
|---|---|---|---|---|---|---|---|
| 1 | 10 | 47,541 | done | 3 of 4 | 0 | 0 | 0 |
| 2 | 8 | 35,953 | done | 3 of 4 | 0 | 1 | 0 |
| 3 | 15 | 83,347 | done | 4 of 4 | 0 | 0 | 0 |
| 4 | 18 | 116,297 | done | 4 of 4 | 0 | 0 | 0 |
| 5 | 14 | 78,693 | done | 3 of 4 | 0 | 0 | 0 |
| 6 | 18 | 126,768 | token_budget | 3 of 4 | 0 | 0 | 0 |

- `senior-discount`: reported in 6 of 6 runs
- `group-threshold`: reported in 6 of 6 runs
- `limit-off-by-one`: reported in 6 of 6 runs
- `decimal-age-accepted`: reported in 2 of 6 runs
- False alarms: 0 in 6 runs
- Tokens per run: mean 81,433, min 35,953, max 126,768
- Steps per run: mean 13.8

Reported issues (the keyword match is in brackets):
- Run 1: Visitor aged 65 charged €15.00 instead of €10.00 [senior-discount]
- Run 1: Group discount of 10% not applied at 8 tickets [group-threshold]
- Run 1: Order accepts an 11th ticket; limit is 10 [limit-off-by-one]
- Run 2: Senior (65+) ticket priced €15.00 instead of €10.00 [senior-discount]
- Run 2: Group discount not applied at 8 tickets (applied only from 9) [group-threshold]
- Run 2: 11th ticket accepted; 10-ticket limit not enforced [limit-off-by-one]
- Run 3: Senior (65+) ticket priced at €15.00 instead of €10.00 [senior-discount]
- Run 3: Decimal age 12.5 accepted instead of rejected [decimal-age-accepted]
- Run 3: 11th ticket accepted; 10-ticket limit not enforced [limit-off-by-one]
- Run 3: Group discount of 10% not applied at 8 tickets [group-threshold]
- Run 4: Visitor aged 65 priced at €15.00 instead of €10.00 [senior-discount]
- Run 4: Group discount of 10% not applied at 8 tickets [group-threshold]
- Run 4: Eight adults get no 10% group discount (total €160.00 instead of €144.00) [group-threshold]
- Run 4: Eleventh ticket accepted; limit of 10 per order not enforced [limit-off-by-one]
- Run 4: Group discount applied inconsistently: 8th adult shows €20.00 but later tickets show €18.00 [group-threshold]
- Run 4: Decimal age 18.5 accepted as a ticket [decimal-age-accepted]
- Run 5: Senior (age 65) ticket charged €15.00 instead of €10.00 [senior-discount]
- Run 5: Group discount of 10% not applied at 8 tickets [group-threshold]
- Run 5: Group discount starts at 9 tickets instead of 8 [group-threshold]
- Run 5: 11th ticket accepted; 10-ticket limit not enforced [limit-off-by-one]
- Run 6: Visitor aged 65 charged €15.00 instead of €10.00 [senior-discount]
- Run 6: Group discount of 10% not applied at 8 tickets [group-threshold]
- Run 6: 11th ticket accepted; 10-ticket limit not enforced [limit-off-by-one]
- Run 6: Group discount starts at 9 tickets, not 8 (and applies retroactively to all tickets) [group-threshold]
