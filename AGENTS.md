# Architecture rules
- Anniversary visual changes are event-scoped and use a ticking event clock so the original appearance returns without reloading.
- Anniversary awards and capsules are managed by authenticated Supabase functions with server-side eligibility and opening dates; no browser writes can forge awards or reveal sealed messages.
- Wrapped uses only the requesting member's recorded Supabase content totals; do not invent activity or inspect Firebase conversations for this feature.