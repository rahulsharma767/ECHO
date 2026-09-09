# ECHO - Real-Time Dialogue Continuity Agent

ECHO detects dialogue continuity drift across film takes in real time.

## Architecture

Kafka -> Person A Streaming Classifier -> Person B Continuity API -> ECHO Command Hub

## Classification

MATCH - dialogue matches the canonical script.

ACCEPTABLE_ADLIB - wording changes while meaning and rhythm remain close enough to intercut.

DRIFT - wording changes may break continuity and requires human review.

## Demo

Scene SC14

Take 1: I never trusted him. -> MATCH (0.98)
Take 2: I didn't trust him. -> ACCEPTABLE_ADLIB (0.86)
Take 3: I never really trusted him. -> DRIFT (0.91)

The detected divergence is: really

## Components

- frontend: Next.js ECHO command hub
- person-a: Kafka streaming and dialogue classification
- person-b: FastAPI continuity API and persistence
- docker-compose.yml: local Apache Kafka

## Human Approval

ECHO never silently rejects a take. A human production decision determines whether a drift is accepted or flagged for reshoot.
