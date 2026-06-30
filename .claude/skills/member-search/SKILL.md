---
name: member-search
description: Search member's assignment history and event timeline
metadata:
  type: skill
---

# Member Search & History

Find a member's assignment history across all projects and years, plus event timeline.

## Usage

```
/member-search [name or partial name]
```

Example:
```
/member-search 김철수
/member-search 영
```

## Input

- **Member name**: Full or partial (case-insensitive substring match)
- **JSON export file**: Must exist in working directory as `weekly-staff-export-*.json`

## Process

1. Read JSON export file
2. Find members matching name substring (case-insensitive)
3. If multiple matches, list them and prompt to clarify
4. For matched member:
   - Load all assignments across all years/projects, sorted by weekKey (desc)
   - Load all events, sorted by date (desc)
5. Render markdown tables

## Output

Markdown to stdout:

```markdown
## 김철수 (개발1팀, 과장)

### Assignment History

| Year-Week | Project | Role | Allocation |
|-----------|---------|------|------------|
| 2026-W10  | Project Alpha | BE Dev | 100% |
| 2026-W08  | Project Alpha | BE Dev | 100% |
| ...       | ...      | ...  | ... |

### Events

| Date | Type | From | To | Score | Note |
|------|------|------|----|----|------|
| 2026-06-20 | 평가 | - | - | 5 | 상반기 성과평가 |
| 2026-06-15 | 전배 | 개발1팀 | 개발2팀 | - | 본부 이동 |
```

## Domain Notes

See CONTEXT.md for:
- **weekKey** format: 'YYYY-WXX' (ISO 8601)
- **Event types**: 전배 (transfer), 이동 (move), 평가 (evaluation)
- **Assignment**: combination of member + project + week
