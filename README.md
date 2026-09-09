<div align="center">

# ◈ ECHO

### REAL-TIME DIALOGUE CONTINUITY AGENT

**Catch the line that breaks continuity — while you're still on set.**

<br/>

[![Live Demo](https://img.shields.io/badge/Live%20Demo-ECHO-8B5CF6?style=for-the-badge&logo=render&logoColor=white)](https://echo-frontend-jk2f.onrender.com)
[![GitHub](https://img.shields.io/badge/Source-GitHub-111827?style=for-the-badge&logo=github)](https://github.com/rahulsharma767/ECHO)
[![License](https://img.shields.io/badge/License-MIT-06B6D4?style=for-the-badge)](LICENSE)

<br/>

**AI · Streaming · Human-in-the-Loop · Film Production**

</div>

---

# 🎬 The Problem

A film scene is almost never shot once.

An actor performs the same line again and again.

And every take can be slightly different.

Maybe they change a word.

Maybe they shorten the sentence.

Maybe they improvise.

Maybe they add emphasis.

On set, that difference can feel completely harmless.

**In the editing room, it can become a nightmare.**

A tiny dialogue variation can make two otherwise identical takes impossible to intercut cleanly.

By the time an editor discovers it:

- the actors may have left
- the location may be gone
- lighting may have changed
- production may have moved on
- a reshoot can become expensive

### The problem isn't that actors improvise.

### The problem is discovering the consequence too late.

---

# ⚡ Meet ECHO

**ECHO is a real-time dialogue continuity agent for film production.**

It sits between the camera and the editing room.

For every take, ECHO asks:

> **"Does this dialogue still preserve continuity with the script and the takes we've already recorded?"**

It doesn't just compare strings.

It evaluates the current take against:

```text
                 ┌─────────────────────┐
                 │  CANONICAL SCRIPT   │
                 └──────────┬──────────┘
                            │
                            │
CURRENT TAKE ───────────────┼────────────── PREVIOUS TAKES
                            │
                            ▼
                   SEMANTIC ANALYSIS
                            │
                            ▼
                    CONTINUITY RESULT
