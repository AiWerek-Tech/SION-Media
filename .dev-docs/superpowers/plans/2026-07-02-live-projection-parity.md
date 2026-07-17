# Live Projection Parity Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Guarantee that the operator Program monitor and physical projection window render identical empty-state branding and transition behavior.

**Architecture:** Introduce one canonical `LiveProjectionCanvas` wrapper that owns live-only PresentationCanvas behavior. Both live surfaces use this wrapper, while the non-live Preview monitor keeps its independent guidance overlay.

**Tech Stack:** React 19, TypeScript, Framer Motion, Vitest, Testing Library.

---

### Task 1: Reproduce parity failures

- [x] Add failing tests for shared renderer usage, fallback identity, configured logo, and private transition overrides.
- [x] Confirm failures against the divergent operator/projector implementations.

### Task 2: Canonical live renderer

- [x] Add `LiveProjectionCanvas` with one transition mode, full configured duration, and idle branding behavior.
- [x] Route operator Program and projector output through the shared renderer.
- [x] Preserve the exact LOGO/CLEAR/BLACK/LIVE/FREEZE state in the operator monitor.
- [x] Remove the operator-only logo overlay and transition speed multiplier.

### Task 3: Verification

- [x] Pass focused parity and PresentationCanvas tests.
- [x] Run formatting, lint, full tests, typechecks, production build, and diff validation.
