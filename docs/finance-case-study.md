---
title: Case study — contextual Finance navigation in HiNivaas
description: How an existing HiNivaas integration uses RCIP to expose bounded current-view facts and authorized Finance destinations without DOM scraping.
---
# Contextual Finance assistance in HiNivaas

HiNivaas integrates RCIP 2.0.0 into a Finance support assistant. This case study
summarizes the source integration reviewed in September 2026. It is not a production
performance benchmark or a claim that every Finance workflow is automated.

## Two useful capabilities

**Read the current view.** The application supplies the current page, loading/error/
ready state, and bounded visible facts, notices, controls, and selected-record facts.
The assistant can explain those returned facts without inspecting the DOM.

**Open an authorized destination.** The caller supplies a stable destination ID.
The host checks it against permitted destinations and resolves its route within
the current society. Raw URLs and caller-selected society identifiers are not
accepted by this capability.

## What the application owns

The host publishes current context, waits for permission data to load, controls
availability, checks the selected destination again during execution, and runs
its existing navigation action. Its policy allows only the two declared operations.
RCIP validates contracts and returns structured outcomes around that behavior.

A navigation result means navigation was **requested**; it does not claim the
new page has finished loading. The consumer must observe page readiness separately.

## Limits and lessons

This integration demonstrates reading and navigation. It does not demonstrate
creating invoices, purchase returns, or other financial transactions. No private
records or production screenshots are needed to explain the pattern.

The example also highlights an integration responsibility: publish an availability
revision whenever relevant permission state changes. Successful invocation checks
current availability independently, but stale discovery can still confuse a consumer.

RCIP's first npm release was in July 2025. This application is a later use case,
not a retrospective explanation of why the library was created.

<a href="/rcip/demo/" target="_self">Try the independent Todo/Profile demo</a> · [Read the architecture article](./semantic-capabilities)
