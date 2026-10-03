# Lessons

## 2026-10-01 — Don't trust the SQL dump for value domains (superseded 2026-10-03, see below)

- **Mistake:** I declared a `fuel_type` bug from the CHECK constraint in `__info__/current_schema/tables.sql` (`gasoline|diesel|electric|hybrid`). In fact the vehicle form writes French labels (`'Diesel'`, `'Électrique'`, `'Hybride rechargeable'`…), and most of the UI compares against those labels. The dump is probably stale on this point.
- **Rule:** before asserting what the DB contains (enum values, columns), check the code that **writes** the data: forms and API routes. Treat the dump as a hint, not a source of truth. If a doubt remains, say so and propose a verification query, e.g. `select distinct fuel_type from vehicles;`.
- **Consequence:** any finding based only on the dump must be marked "to verify on the real database". Examples: `fills.vehicle_id`, the `fills_energy_consistency` CHECK.

## 2026-10-03 — Neither the dump nor the writer code is the truth: query the live DB

- **Mistake:** the 2026-10-01 retraction was itself wrong. The live DB still has the English `fuel_type` CHECK, and every stored vehicle is `'gasoline'`. The form's French values are simply **rejected**: that was the real EV bug I had first spotted, and it explains why no charge exists in prod. I had reasoned from what the code *intends* to write, not from what the DB *accepts*.
- **Rule:** when the code and the dump disagree, neither wins. Run a read-only query on the live project (`upskwbjxrzykgtanqxsp`, Supabase MCP `execute_sql`): the constraint definition **and** the distinct stored values. A mismatch between the writer code and a live CHECK is a bug, not a stale dump.
- **Corollary:** "the code writes X" proves nothing until the data shows X exists. Zero rows of a value (0 charges, 0 non-gasoline vehicles) is itself a signal that writes are failing.

## 2026-10-03 — A migration that needs new code must not break the code that is live

- **Mistake:** the P1.6 migration (`family_members` insert limited to the family creator) only works once `family/join` inserts with the admin client. I flagged "deploy first" in the file header, but the migration ran before the push, and joining a family broke in production.
- **Rule:** make each migration backward-compatible with the code **currently deployed** (expand → deploy → contract). If that is impossible, ship the code change first, in its own commit, and only then hand over the SQL; never hand both over at the same time.
- **How to apply:** before giving SQL to run, check `git diff origin/main -- <files the SQL depends on>`. If the dependency isn't on `origin/main`, the SQL isn't ready to run.
