# Lessons

## 2026-10-01 — Don't trust the SQL dump for value domains

- **Mistake:** I declared a `fuel_type` bug from the CHECK constraint in `__info__/current_schema/tables.sql` (`gasoline|diesel|electric|hybrid`). In fact the vehicle form writes French labels (`'Diesel'`, `'Électrique'`, `'Hybride rechargeable'`…), and most of the UI compares against those labels. The dump is probably stale on this point.
- **Rule:** before asserting what the DB contains (enum values, columns), check the code that **writes** the data: forms and API routes. Treat the dump as a hint, not a source of truth. If a doubt remains, say so and propose a verification query, e.g. `select distinct fuel_type from vehicles;`.
- **Consequence:** any finding based only on the dump must be marked "to verify on the real database". Examples: `fills.vehicle_id`, the `fills_energy_consistency` CHECK.
