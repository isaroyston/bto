# AI/ML Roadmap

This project can grow from a housing calculator into an explainable housing
decision system. Keep each phase useful on its own, then use the later phases to
show data science and AI engineering depth.

## Phase 1: Explainable Recommendation Baseline

Status: started.

Add a deterministic recommender that ranks BTO projects against the current
plan assumptions.

Signals:

- loan estimate coverage
- monthly payment as a share of household income
- minimum cash at signing
- data confidence from available project fields
- expected TOP timing

Why it matters:

- Gives users a ranked shortlist instead of a raw project list.
- Creates a transparent baseline before any ML model is introduced.
- Makes the app more defensible in interviews because every score is explainable.

How to judge usefulness:

- Top matches should feel reasonable after changing income, flat type,
  financing, tenure, and interest rate.
- The reasons should explain the score without requiring the user to inspect the
  formula.
- Missing data should reduce confidence without hiding the project.

Resume framing:

> Built an explainable BTO recommendation baseline using housing affordability
> constraints, CPF grant logic, loan simulation, missing-data confidence, and
> policy-backed scoring.

## Phase 2: Scenario Comparison

Let users compare 2-3 plans side by side.

Examples:

- HDB loan vs bank loan
- 4-room vs 5-room
- normal vs staggered payments
- one town shortlist vs another

Output:

- monthly payment delta
- upfront cash delta
- loan shortfall delta
- timeline payment delta

Resume framing:

> Built a scenario comparison workflow for housing finance tradeoffs, enabling
> users to compare loan structures, flat types, and payment timelines.

## Phase 3: Data Profiling And Quality

Add a backend or notebook analysis of the BTO dataset.

Questions:

- Which towns have the most missing price data?
- How often do project type, TOP, units, and MRT fields exist?
- What are the price and unit distributions by launch year?
- Which fields come from RecordBTO, BTOHQ, or both?

Output:

- a small report or notebook
- data-quality metrics
- a generated summary JSON used by the frontend

Resume framing:

> Profiled scraped public housing data, quantified missingness by source and
> feature, and surfaced confidence signals in the product UI.

## Phase 4: ML Price Estimator Or Grounded AI Assistant

Choose one, not both at first.

Option A: ML price estimator

- Train a baseline regression model for missing price ranges.
- Start with simple features: town, year, flat type, units, project type, TOP.
- Show uncertainty and never present estimates as official data.

Option B: grounded AI assistant

- Answer questions from the current plan, policy constants, local source docs,
  and generated BTO data.
- Refuse unsupported claims.
- Cite the data source used for each answer.

Resume framing for estimator:

> Trained baseline models to estimate missing BTO price ranges and exposed
> uncertainty-aware predictions inside a housing affordability planner.

Resume framing for assistant:

> Built a grounded housing-plan assistant constrained to local policy sources,
> scenario state, and generated BTO data with source-aware responses.
