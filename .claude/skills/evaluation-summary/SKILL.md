---
name: evaluation-summary
description: Aggregate and summarize evaluation events
metadata:
  type: skill
---

# Evaluation Summary Report

Aggregate evaluation (평가) events and create a summary report.

## Usage

```
/evaluation-summary [--member NAME] [--from WEEK] [--to WEEK] [--year YYYY]
```

Examples:
```
/evaluation-summary
/evaluation-summary --year 2026
/evaluation-summary --member 김철수
/evaluation-summary --from 2026-W01 --to 2026-W26
```

## Input

- **--member** (optional): Filter by member name substring (case-insensitive)
- **--year** (optional): Filter by year (e.g., 2026)
- **--from** (optional): Start date in YYYY-WXX or YYYY-MM-DD
- **--to** (optional): End date in YYYY-WXX or YYYY-MM-DD
- **JSON export file**: Must exist in working directory as `weekly-staff-export-*.json`

## Process

1. Read JSON export file
2. Filter events where `type === '평가'`
3. Apply member/year/date filters if provided
4. For each member: count evaluations, compute avg score (1-5), list latest note
5. Sort by avg score (descending)

## Output

Markdown table to stdout:

```markdown
## Evaluation Summary Report
**Period**: 2026-01-01 to 2026-06-30  
**Total members evaluated**: 12  
**Evaluation count**: 24

| Member | Department | Grade | Evals | Avg Score | Latest Note |
|--------|------------|-------|-------|-----------|-------------|
| 김철수 | 개발1팀 | 과장 | 2 | 5.0 | 상반기 성과평가 - 우수한 리더십 |
| 이영희 | 개발1팀 | 대리 | 2 | 5.0 | 상반기 성과평가 - 기술력 탁월 |
| ...    | ...  | ... | ... | ... | ... |
```

## Domain Notes

See CONTEXT.md for:
- **Event type**: 평가 (evaluation)
- **Score**: 1-5 integer, null means no score provided
- **weekKey** format: 'YYYY-WXX' (ISO 8601)
