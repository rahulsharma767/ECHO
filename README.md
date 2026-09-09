# ECHO — Real-Time Dialogue Continuity Agent

> **Catch dialogue drift while you're still on set — not weeks later in the edit.**

ECHO is a real-time dialogue continuity agent designed for film production.

During a shoot, actors perform multiple takes of the same scene. Small changes in dialogue are natural — but even a single added word can make takes difficult or impossible to intercut during editing.

ECHO listens to incoming takes, compares the dialogue against the canonical screenplay and previous takes, detects meaningful variations, explains the difference, and routes uncertain cases to a human production supervisor.

---

## 🎬 The Problem

Film scenes are rarely captured perfectly in one take.

Actors may:

- improvise a word
- change a sentence
- shorten a line
- emphasize a phrase
- accidentally contradict an earlier take

These differences are often invisible during production.

The problem appears later when an editor tries to combine multiple takes.

A tiny dialogue difference can suddenly become a continuity problem.

### Traditional workflow

```text
Shoot
  ↓
Shoot more takes
  ↓
Move into post-production
  ↓
Editor discovers dialogue mismatch
  ↓
Search through takes
  ↓
Reshoot / workaround
