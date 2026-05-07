# Domain Documentation

**Layout:** Single-context

## Location

- `CONTEXT.md` — root-level domain language (project context, terminology)
- `docs/adr/` — architectural decision records

## Consumer Rules

### CONTEXT.md

Read at startup to understand:
- Project purpose and scope
- Key domain terminology
- Tech stack decisions already made

### docs/adr/

Search for existing ADRs when:
- Proposing a new architectural change
- Investigating why a pattern exists
- Making decisions that affect system design

**ADR naming:** `NNNN-<short-title>.md` (e.g., `0001-database-choice.md`)

## Skills Using This

- `improve-codebase-architecture` — reads CONTEXT.md for domain language
- `diagnose` — searches ADRs for past decisions
- `tdd` — references CONTEXT.md when writing tests