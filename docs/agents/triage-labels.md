# Triage Labels

**Mapping:** Five canonical roles → label strings

| Role | Label String | Meaning |
|-----|-------------|---------|
| `needs-triage` | `needs-triage` | Maintainer needs to evaluate |
| `needs-info` | `needs-info` | Waiting on reporter |
| `ready-for-agent` | `ready-for-agent` | Fully specified, AFK-ready |
| `ready-for-human` | `ready-for-human` | Needs human implementation |
| `wontfix` | `wontfix` | Will not be actioned |

## State Machine

```
[needs-triage] → [needs-info] → [ready-for-agent]
      ↓                    ↓              ↓
   [wontfix]          [ready-for-human]  (loop)
```

## Skills Using This

- `triage` — applies labels based on state transitions
- `to-issues` — creates issues with initial `needs-triage` label