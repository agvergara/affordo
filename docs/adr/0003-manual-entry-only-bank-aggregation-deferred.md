# Manual entry only; bank aggregation deferred (regulatory constraint)

Users enter their financial data (take-home pay, hours, recurring expenses)
manually in v1. Despite the product pitch's "connect your income and expenses"
framing, we do not integrate bank aggregation. Beyond the scope cost
(transaction categorization, per-provider integration), there is a hard external
constraint: accessing bank data in Europe requires AISP (Account Information
Service Provider) authorization under PSD2, or contracting a licensed aggregator
— a certification and compliance burden that is out of reach for v1. A data
*source* is modeled as a pluggable concept so bank import can be added later
without reworking the affordability/time-cost engine, which is identical
regardless of how the numbers arrive. Absence of bank "connect" is a deliberate
regulatory/scope decision.
