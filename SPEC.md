# Ticket price calculator: specification

This is the written requirement for the demo page. A tester (a human or the agent) compares what the page
does with this text. Anything the page does differently is a bug. Anything this text does not cover is a question
for the product owner, not a bug.

## Prices

| Visitor | Price |
|---|---|
| Adult, age 18 to 64 | €20.00 |
| Under 6 (age 0 to 5) | free |
| Age 6 to 17 | half of the adult price |
| Age 65 and over | 50% off the adult price |

## Group discount

- An order with 8 or more tickets gets a further 10% off every ticket.
- The 10% is applied after the age discount.
- Free tickets count towards the 8.

## Limits and validation

- At most 10 tickets per order. Adding more shows the message "Maximum 10 tickets per order."
- A valid age is a whole number from 0 to 120. Anything else (empty, decimal, below 0, above 120)
  shows the message "Enter an age from 0 to 120." and adds no ticket.

## Clear order

- The button "Clear order" removes all tickets and any message. The total goes back to "Total: €0.00".
- After clearing, a new order starts from zero: the limit of 10 and the group discount count from the beginning again.

## Display

- Ticket prices are shown in euro with two decimals, for example €14.00.
- The order total is shown as "Total: €x.xx".

## Boundaries worth testing

| Area | Values |
|---|---|
| Age | 0, 5, 6, 17, 18, 64, 65, 120, 121, -1 |
| Tickets in the order | 7, 8, 9, 10, 11 |
| Combination | 8 tickets including free ones, 8 tickets with a senior |

## Worked examples

- One adult: €20.00.
- One visitor aged 65: €10.00.
- Eight adults: 8 × €18.00 = €144.00.
- One visitor aged 65 in a group of 8 or more: €9.00.
- One visitor aged 12 in a group of 8 or more: €9.00.
