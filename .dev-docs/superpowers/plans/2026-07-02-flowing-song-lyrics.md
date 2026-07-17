# Flowing Song Lyrics Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Render song lyrics in Preview and Live as flowing text separated by semicolons instead of forced source line breaks.

**Architecture:** Preserve source-line boundaries with an internal marker before the existing wrapping and slide-balancing algorithm runs. Convert only song slide chunks to flowing text at the engine boundary, leaving Bible and Info slide builders unchanged. Share the formatter between both existing slide-engine entry points.

**Tech Stack:** TypeScript, React, Vitest.

---

### Task 1: Regression contract

- [x] Add failing tests for flowing semicolon formatting, duplicate separators, slide boundaries, and section labels.
- [x] Confirm the tests fail against newline-based output.

### Task 2: Shared lyric formatter

- [x] Add a shared formatter that distinguishes source line breaks from automatic word wrapping.
- [x] Integrate it into renderer and core slide engines.
- [x] Keep terminal semicolons off each slide for clean typography.

### Task 3: Verification

- [x] Verify song, Info, Bible, section navigation, and slide splitting tests.
- [x] Run formatting, lint, full tests, typechecks, and production build.
