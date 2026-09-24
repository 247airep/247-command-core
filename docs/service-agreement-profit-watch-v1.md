# Service Agreement Profit Watch — V1 Backend Contract

## Purpose
Convert an existing commercial HVAC/mechanical service-agreement export into a management-priority review. The system does not promise a target margin and does not represent market benchmarks as 24/7 AI Rep outcomes.

## Required operating principle
`DATA → SIGNAL → PRIORITY → EVIDENCE → INVESTIGATION → DECISION → ACTION → OUTCOME`

## Canonical input fields
Core: agreementId, revenue, estimatedCost, actualCost, renewalDate.
Preferred: accountName, estimatedLaborHours, actualLaborHours, visitsIncluded, visitsUsed, materialCost, scope, status.

Missing fields are recorded as unknowns. They are never inferred as financial facts.

## V1 signal library
- DATA_GAP — core data required for a reliable review is missing.
- LABOR_OVERRUN — actual labor hours exceed estimated hours by at least 10%.
- COST_OVERRUN — actual direct cost exceeds estimated cost by at least 8%.
- MARGIN_PRESSURE — observed margin from submitted revenue and direct cost is below 20%.
- RENEWAL_WINDOW — renewal falls within 90 days of the analysis date.
- VISIT_OVERRUN — completed visits exceed included visits.

## Priority model
Each rule assigns a deterministic 0–100 score based only on submitted fields and explicit thresholds.
- PRIORITY: 75–100
- REVIEW: 50–74
- WATCH: 0–49

Every signal must contain: type, title, priority, score, confidence, evidence, unknowns, recommended investigation, and optional potential exposure.

## Evidence discipline
- `potential exposure` means a submitted-data variance that deserves review.
- Never call potential exposure “savings.”
- Market benchmarks may appear as context elsewhere, but the engine does not use them as promised customer outcomes.
- Outcome attribution is recorded separately as OBSERVED_ONLY, CONTRIBUTED, STRONGLY_ATTRIBUTABLE, NOT_ATTRIBUTABLE, or UNKNOWN.

## V1 management output
The Priority Review sorts signals as PRIORITY → REVIEW → WATCH and summarizes counts, evidence, unknowns, and recommended investigations.

## Launch-gate acceptance
LG1 passes when this contract is stable enough to build against.
LG2 passes when CSV imports map common headers and expose missing fields safely.
LG3 passes when deterministic rules generate explainable signals under automated tests.
LG4 passes when a structured management review is generated and ordered correctly.
LG5 begins when baseline and outcome records can preserve attribution discipline.
