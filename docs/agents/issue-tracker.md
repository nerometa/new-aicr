# Issue Tracker

**Type:** Local markdown  
**Location:** `.scratch/<feature>/` at repo root

## Workflow

When skills create or update issues, they write markdown files to `.scratch/<feature>/` rather than calling a CLI.

## File Format

```markdown
# <Feature Name>

## Problem
[What needs to be fixed or built]

## Acceptance Criteria
- [ ] Criterion 1
- [ ] Criterion 2

## Notes
[Additional context]
```

## Skills Using This

- `to-issues` — converts plans/specs into grabbable issues
- `triage` — moves issues through a state machine
- `to-prd` — creates PRD from conversation