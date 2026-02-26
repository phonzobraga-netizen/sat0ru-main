## Description

SAT0RU is a cursed technique visualizer inspired by Jujutsu Kaisen. It combines MediaPipe hand tracking with Three.js particles, and now includes ML-based technique classification with deterministic fallback behavior.

## Features

### Techniques (12 + Neutral)

- Secret Technique: Hollow Purple (`purple`)
- Domain Expansion: Infinite Void (`void`)
- Reverse Cursed Technique: Red (`red`)
- Domain Expansion: Malevolent Shrine (`shrine`)
- Cursed Technique Lapse: Blue (`blue`)
- Black Flash (`blackflash`)
- Maximum: Meteor Swarm (`meteor`)
- Cleave Storm (`cleaveStorm`)
- Dismantle Spiral (`dismantleSpiral`)
- Ratio Strike (`ratioStrike`)
- Boogie Ripple (`boogieRipple`)
- Monkey Mockery (`doubleMiddleMonkey`)
- Neutral State (`neutral`)

### Tracking/Inference

- MediaPipe Hands remains the landmark source.
- ML model classifies from landmark sequences (no direct rule-threshold gesture mapping in normal mode).
- Temporal voting + hold-to-neutral state machine prevents abrupt loss behavior.
- Automatic fallback to legacy heuristic detection if model load/inference fails.

### Dev Capture Mode

Use `?dev=1` in the URL to expose capture tools:

- choose class label
- start/stop capture
- export captured samples JSON
- toggle ML on/off for validation

### Separate Dev Build

Use `SAT0RU-main/dev.html` for a dedicated debug build.

- includes all dev capture tools by default
- includes a technique override panel so you can manually force any technique

## Getting Started

### Prerequisites

- modern browser (Chrome/Edge recommended)
- webcam
- static file server (Live Server is fine)

### Run App

1. open `SAT0RU-main/index.html` via Live Server
2. allow camera access
3. press Start

## ML Training Package

A separate package exists at `SAT0RU-main/ml`.

### Install

```bash
cd SAT0RU-main/ml
npm install
```

### Prepare Seed Data

```bash
npm run prepare-seed
```

### Train Model

```bash
npm run train
```

Outputs model artifacts to:

- `SAT0RU-main/assets/models/gesture-v1/model.json`
- `SAT0RU-main/assets/models/gesture-v1/group1-shard1of1.bin`

### Evaluate Model

```bash
npm run evaluate
```

Outputs reports to:

- `SAT0RU-main/ml/reports/evaluation.json`
- `SAT0RU-main/ml/reports/evaluation.md`

## Gemini Backlog Autofix

SAT0RU now includes a Gemini-based backlog correction loop for server-driven tasks.

It will:

- load Gemini config from `SAT0RU-main/ml/.env`, `SAT0RU-main/.env`, or `../fairdev/apps/api/.env` (in that order)
- fetch all available Gemini `generateContent` models, rank them, and choose the best model first
- preload every ranked model handle at startup and automatically skip models that are unavailable/rate-limited
- evaluate each backlog item against acceptance criteria
- update target files iteratively until target score is reached or retries are exhausted
- optionally run a validation command (for example `npm test`) between attempts

The loop targets `targetScore: 100`, but it is intentionally bounded by `maxIterations` to avoid runaway self-edits.

To override shared env settings locally, copy `SAT0RU-main/ml/.env.example` to `SAT0RU-main/ml/.env` and set your own values.

### Run Once (CLI)

```bash
cd SAT0RU-main/ml
npm run backlog:models
npm run backlog:autofix -- --backlog ./backlog/sample-backlog.json --dry-run
```

Report output:

- `SAT0RU-main/ml/reports/backlog-autofix-report.json`

### Run As Server

```bash
cd SAT0RU-main/ml
npm run backlog:server
```

Endpoints:

- `GET /health`
- `POST /backlog` (body accepts either `{ items: [...] }` or an array of items)

Example payload:

```json
{
  "targetScore": 100,
  "maxIterations": 5,
  "writeChanges": true,
  "globalValidationCommand": "npm test",
  "items": [
    {
      "id": "task-1",
      "filePath": "src/vision/mlClassifier.js",
      "description": "Improve error handling",
      "acceptanceCriteria": ["No uncaught errors", "Tests pass"]
    }
  ]
}
```

## Runtime Tests

```bash
cd SAT0RU-main
npm test
```

## Notes

- Browser runtime uses TensorFlow.js.
- On model errors, app falls back to `src/vision/gestures.js` detection automatically.
