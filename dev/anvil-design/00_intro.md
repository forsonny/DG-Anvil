# Anvil - Design Report

> A closed-loop orchestration plugin for Claude Code. Hands-off by default. Evidence-gated. Lesson-persistent. Built narrow on purpose.

---

## What this report is

A design specification for a new Claude Code plugin, drawn from a careful reading of six prior systems in the same class. The new plugin is **not a companion** to any of them and does not layer on top of them; it replaces them. The goal is not to cover more surface area - it is to cover the single correct loop with more rigor.

## How to read this

Read top to bottom. Each page is short and self-contained. The workflow diagram on page **03** is the one picture to keep in mind; the rest of the report is commentary on that picture.

## Table of contents

1. **01 - Executive Summary** - the plugin in one page.
2. **02 - Design Thesis** - the three commitments that narrow the scope.
3. **03 - The Core Loop (with diagram)** - the one-page workflow. Everything else serves this.
4. **04 - Anatomy** - five primitives, seven skills, five hooks, five commands, one CLI.
5. **05 - The Contract** - machine-evaluable success criteria and the four-level verification gate.
6. **06 - The Ledger** - append-only persistent lesson store; how lessons are captured and re-injected.
7. **07 - The Court** - adversarial judge with spec-then-quality ordering in isolated context.
8. **08 - Observability and Calibration** - trace format, metrics catalogue, theatre-drift detectors.
9. **09 - What It Replaces** - capabilities matrix versus the class of plugins being retired.
10. **10 - Anti-Patterns Defeated** - failure-mode table mapping each known pathology to the Anvil component that disarms it.
11. **11 - Implementation Plan** - file layout, bootstrap, initial skill list, authoring discipline.
12. **12 - Bottom Line** - verdict in a paragraph.

Diagram: `anvil_workflow.svg` (referenced from page 03).

---

## One-sentence summary

**Anvil is a closed-loop orchestrator that treats agent output as diagnostic, not product - it reshapes inputs until external evidence validates them, and captures every reset as a durable lesson the next run inherits.**
