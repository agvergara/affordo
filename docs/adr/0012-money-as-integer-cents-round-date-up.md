# Money is integer minor units; Save-Up Date rounds up

**Money is represented and computed as integer minor units (cents).** `€19.99`
is `1999`; all engine arithmetic (summing expenses, month-by-month projection) is
integer math, formatted to decimals only at the display edge. Floats are
forbidden for money — `0.1 + 0.2 !== 0.3`, and errors accumulate across sums and
projections. No decimal library is needed for the arithmetic Affordo does.

**Rounding rules (explicit so tests can assert them):**
- Money: 2 decimals at display; nothing to round mid-calc (integer cents).
- Time Cost: a derived display ratio (never money) — round per unit (e.g. hours
  to 1 decimal, work days to whole/half). A float is acceptable here.
- Save-Up Date: round the number of contribution periods **up**. Never report a
  date earlier than the user can actually afford the purchase — conservative by
  design.

These are correctness invariants. A contributor using floats for money or
rounding the date down would produce subtly wrong financial advice.
