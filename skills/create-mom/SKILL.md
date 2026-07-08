---
name: create-mom
description: Generate structured Minutes of Meeting (MoM) from raw notes or transcript.
---

# create-mom

Generate structured Minutes of Meeting (MoM) from raw notes or transcript.

## When to use

Invoke when the user says "create MoM", "minutes of meeting", "/mom", or pastes meeting notes/transcript.

## Instructions

1. Extract from input: date, attendees, meeting objective, discussion points, decisions, and action items.
2. Produce the MoM:

```markdown
# Minutes of Meeting

**Date:** YYYY-MM-DD
**Time:** HH:MM – HH:MM (TZ)
**Location / Call Link:** 
**Attendees:** Name (Role), …
**Facilitator:** 
**Objective:** 

---

## Key Discussion Points
1. …

## Decisions Taken
- …

## Action Items

| ID | Task | Owner | Due Date | Status |
|----|------|-------|----------|--------|
| A1 | | | | Open |

## Risks / Blockers Raised
- …

## Next Steps
- Next meeting: YYYY-MM-DD
- …
```

3. Save to `docs/meetings/MOM-<YYYY-MM-DD>-<topic>.md`.

## Rules
- Action items must have an owner and due date.
- Do not attribute statements to individuals unless the transcript clearly attributes them.
- Mark unresolved items as "Open" — never assume resolution.
