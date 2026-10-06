# Xender SiteCheck scoring

**This is a Xender SiteCheck heuristic score, not a Lighthouse score.** It is not produced by Google, Lighthouse or Core Web Vitals, and it does not measure loading speed.

The score is fully deterministic: the same page DOM always produces the same score. The implementation is `scoreIssues()` in `src/core/audit.js`, and `tests/scoring.test.mjs` pins the numbers below.

## 1. Every check produces pass or fail

Each of the 47 checks (see [CHECKS.md](CHECKS.md)) either passes, fails with a severity, or is skipped when it does not apply (for example, form checks on a page with no forms).

| Severity | Points deducted | Shown as |
|---|---|---|
| critical | 20 | Critical |
| warning | 8 | Warnings |
| notice | 3 | Recommendations ("tips") |

When a failing check affects **10 or more elements**, its deduction is multiplied by **1.5**. A check is counted once, not once per element, so one template problem repeated 200 times cannot wipe out a score on its own.

## 2. Category scores

There are five categories: SEO, Accessibility, Usability, Conversion and Technical. Security basics count under Technical.

`category score = max(0, round(100 − sum of deductions for checks in that category))`

## 3. Overall score

The overall score is a weighted average of the category scores:

| Category | Weight |
|---|---|
| SEO | 25 |
| Accessibility | 25 |
| Technical | 20 |
| Usability | 15 |
| Conversion | 15 |

`overall = round(Σ(category score × weight) / 100)`

## 4. Grade

| Overall | Grade |
|---|---|
| 90–100 | Good |
| 70–89 | Needs work |
| 50–69 | Poor |
| 0–49 | Critical |

## Worked example

A page is missing its title (critical, SEO, −20), is missing a meta description (warning, SEO, −8), and has 12 links with vague text (notice, Accessibility, 3 × 1.5 = −4.5).

- SEO = 100 − 28 = **72**; Accessibility = round(95.5) = **96**; the other categories = **100**
- Overall = round((72×25 + 96×25 + 100×20 + 100×15 + 100×15) / 100) = round(92) = **92 → Good**

## What the score does not mean

- It is not a WCAG conformance result. Automated checks find only a fraction of accessibility barriers.
- It does not measure performance, Core Web Vitals or search ranking.
- Conversion checks are **heuristics**. They are labelled "Heuristic" in the UI and are written as recommendations, not failures.
