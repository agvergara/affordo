# Time Cost uses Net Hourly Wage, not Real Hourly Wage

**Status:** Superseded by [ADR 0015](0015-reference-hourly-rate-for-time-cost.md).
The reference-hourly-rate formula was introduced additively; the legacy engine
this ADR governed was deleted in #119, so it is now **historical**. Note the
decision it records — net rather than *Your Money or Your Life*'s real hourly
wage — survives the deletion: ADR 0015's formula is also net-based.

Affordo's core "Time Cost" number (hours of work per purchase) is computed from
Net Hourly Wage — take-home pay divided by contracted hours. This deviates from
the *Your Money or Your Life* "real hourly wage" (which subtracts work-related
expenses and adds commute/prep/unwind time), even though the real figure is the
philosophically truer number. We chose net because the real wage demands extra
onboarding input (commute time, work-related spending) before the user sees any
value, whereas net needs only take-home pay and hours worked and delivers the
"whoa" moment immediately. Real Hourly Wage is modeled as a later refinement of
the same concept, not a replacement. If you expected the real-wage formula, its
absence in v1 is deliberate.
