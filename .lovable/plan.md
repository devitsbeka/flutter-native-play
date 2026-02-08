
## Set Georgian Flag as Default Country for New Users

### Problem
Currently, when a new user registers, their `country_code` in the database defaults to `'US'` (United States). This means new users see the US flag next to their name instead of the Georgian flag, which is incorrect since this is a Georgian-language app.

### Current State
- Database column `profiles.country_code` has a default value of `'US'`
- 34 users currently have `'US'` as their country code, 19 have `'GE'`
- Some of those 34 "US" users may actually be Georgian users who got the wrong default

### Solution
A single database migration to change the default value of the `country_code` column from `'US'` to `'GE'`:

```sql
ALTER TABLE public.profiles 
ALTER COLUMN country_code SET DEFAULT 'GE';
```

This ensures all future registrations will have the Georgian flag by default.

### What About Existing Users?
The 34 users currently showing the US flag will keep their current value. If you'd like, I can also update existing users who were incorrectly assigned 'US' to 'GE' -- but some (like "Teo K." and "Giorgi K." in the screenshot) may genuinely be in the US based on their timezone. Let me know if you want to bulk-update existing users as well.

### Technical Details

| Change | Details |
|--------|---------|
| Migration SQL | `ALTER TABLE public.profiles ALTER COLUMN country_code SET DEFAULT 'GE'` |
| Affected column | `profiles.country_code` |
| Old default | `'US'` |
| New default | `'GE'` |
| Impact | Only affects new registrations going forward |
