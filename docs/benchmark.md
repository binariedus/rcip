---
title: Browser Use and RCIP — measured dispatch workflow
description: "Five verified runs per approach: speed, model-bound contact markers, methodology, and limitations of a synthetic local dispatch benchmark."
---
# Same work. Different interface.

We asked an agent to assign two repairs and move a third visit in a synthetic
maintenance desk. It had to preserve the existing technician and note, avoid
near-duplicate and closed records, and send no resident messages.

Browser Use navigated the working UI: search, open records, fill forms, and save.
The RCIP consumer discovered app-defined capabilities and invoked those operations.
The app supplied bounded operational outputs and checked proposed writes for
readiness. Both approaches used the same server-side business validation.

## Results

Five fresh runs for each approach, with an independent check of the saved records:

| Measure | Browser Use | RCIP with readiness checks |
| --- | ---: | ---: |
| Successful final states | 5/5 | 5/5 |
| Median elapsed time | 72.855s | 9.389s |
| Observed elapsed range | 69.388–111.171s | 7.464–16.702s |
| Median model requests | 16 | 5 |
| Median normalized UI actions / capability invocations | 32 | 8 |
| Median selected resident-name markers in model text | 10 | 0 |
| Median selected email markers in model text | 10 | 0 |
| Median selected phone markers in model text | 3 | 0 |

**7.76× faster by the ratio of medians**, or about 7.8×. RCIP also made a median
two readiness calls, counted separately from its eight invocations. This shows
what avoiding repeated UI interpretation bought in this workflow, not a universal
speed multiplier.

The contact-marker counts measure selected synthetic values in text sent to the
model. Screenshot-only exposure is not counted. RCIP still transmitted useful
operational fields such as units, issue descriptions and technician names.
It did not automatically redact contacts; our capability outputs omitted them.

## How we measured

- Browser Use 0.13.11; a custom RCIP consumer using the SDK client bridge.
- Same `gpt-5.4-mini-2026-03-17` snapshot, low reasoning, structured decisions, and common decision/time limits. Different prompts and orchestration remain a limitation.
- Fresh browser and seeded 24-record session per run; IDs changed by repetition. Run order rotated. A pilot was excluded before the five final matched repetitions.
- Timing began with the app ready and ended at the final agent response. Browser startup and before/after screenshot capture were excluded.
- An independent verifier checked all 24 records, exact assignments, preserved fields, note histories, returned IDs, and exactly three saved writes. A confident completion message was not success.

The measured SDK was the **2.1.0-rc.1 candidate** whose implementation was later
released as 2.0.4. These are retained candidate timings, not a fresh benchmark
of the npm 2.0.5 documentation release.

## Keep the experiment intact

The original experiment included a third arm without the optional readiness call.
Its median was 9.434s, and it included a **46.241s** run waiting on a model response.
That historical arm remains in the report; it is not a separate RCIP product.
All 15 historical final runs passed, including the ten in the main comparison.

[All runs CSV](/benchmarks/dispatch/runs.csv) · [Paired results CSV](/benchmarks/dispatch/pairs.csv) · [Full numerical analysis](/benchmarks/dispatch/analysis.json) · [Frozen protocol](/benchmarks/dispatch/protocol.txt)

One synthetic app and five runs per approach cannot establish production error
rates, payment safety, universal privacy, or superiority on arbitrary websites.
We did the capability integration work. Browser automation remains useful when
you do not control the application or no suitable capability interface exists.

The useful engineering lesson is simpler: when you own the app, you can give the
agent the operation it needs instead of making it reconstruct that operation
from the screen.
