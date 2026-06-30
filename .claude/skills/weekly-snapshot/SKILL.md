---
name: weekly-snapshot
description: Generate HTML report of current week's project roster
metadata:
  type: skill
---

# Weekly Snapshot Report Generator

Generate a static HTML report of a specific week's project assignments.

## Usage

```
/weekly-snapshot [weekKey]
```

Example:
```
/weekly-snapshot 2026-W26
```

## Input

- **weekKey** (optional): ISO 8601 week format `YYYY-WXX` (default: current week)
- **JSON export file**: Must exist in working directory as `weekly-staff-export-*.json`

## Process

1. Read the JSON export file from current directory
2. Parse assignments and filter by requested week
3. Join with member and project data
4. Group by project
5. Render self-contained HTML table with inline styles

## Output

Saves file: `weekly-report-{weekKey}.html`

HTML includes:
- Week header (start/end dates in ISO format)
- Project roster table
  - Columns: Project | Member | Role | Allocation % | Department
  - Color-coded by project
- Event log (all events in same calendar week)

Example filename: `weekly-report-2026-W26.html`

## Domain Notes

See CONTEXT.md for:
- **Member** definition
- **Project** definition
- **Assignment** definition (weekKey format: 'YYYY-WXX')
- **Event** types: 전배 (transfer), 이동 (move), 평가 (evaluation)
