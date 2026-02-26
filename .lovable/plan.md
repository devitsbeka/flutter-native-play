
# Fix OG Meta Text and Invite Share Text

## Changes

### 1. `index.html` -- Update OG/meta description to Georgian
Change `"Test your knowledge, become a trivia champion!"` to `"შეამოწმე შენი ცოდნა და გახდი Trivia-ს ჩემპიონი"` in both the `<meta name="description">` and `<meta property="og:description">` tags.

### 2. `public/manifest.json` -- Update PWA description to Georgian
Same text change for the manifest description field.

### 3. `src/locales/ka.ts` -- Fix invite share text
Change `inviteShareText` from:
`"შემოგვიერთდი MyTrivia LIVE-ზე და მიიღე 10 დღიანი PRO უფასოდ!"`
to:
`"შემომიერთდი My Trivia LIVE-ში ამ ლინკით და მიიღე 10 დღიანი PRO საჩუქრად 🎁"`

### Files to edit
- `index.html` (2 meta tags)
- `public/manifest.json` (1 description field)
- `src/locales/ka.ts` (1 translation key)
