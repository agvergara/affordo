# v1 affordability is cash/save-up only; financing deferred

Affordo's v1 affordability engine treats every purchase as a cash goal: a
purchase is affordable if current savings cover the price, otherwise the app
projects a Save-Up Date from the user's monthly Surplus. We deliberately exclude
financing (mortgages, auto loans, "can you sustain the monthly payment?") from
v1 even though a home is the flagship example. Financing brings interest rates,
loan terms, and debt-to-income rules — a whole subsystem — and would balloon v1.
It is planned as a distinct affordability mode in a later iteration, not a
retrofit of the cash engine. Do not add mortgage/interest math to v1; its
absence is a scope decision, not an oversight.
