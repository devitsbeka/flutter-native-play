

## Admin Edit Access for Fake Account Trivias

### What this does
As an admin, when you visit any trivia lobby page, you'll see an "Edit" button instead of "Play". This lets you edit any user's trivia -- add/remove questions, change icons, edit question text and answers, etc. The existing `EditQuizModal` will be reused since it already supports full editing.

### Changes

**1. TriviaLobby.tsx -- Show Edit button for admins**
- Import and use the `useAdminRole` hook
- Show the "რედაქტირება" (Edit) button for admins in addition to owners
- For admins viewing others' trivias: show Edit as the primary action, and keep Play as secondary
- Update the `isOwner` check to `isOwner || isAdmin` for the edit button visibility

**2. Feed/Post cards -- Admin edit access**
- On the home feed where trivia posts appear (image 1 from screenshots), replace the "ითამაშე" (Play) button with "რედაქტირება" (Edit) for admins, or add an edit icon button next to it

### Technical Details

- The `useAdminRole` hook already exists and checks via `has_role` RPC
- The `EditQuizModal` component already handles full trivia editing (title, questions, answers, icons, cover image/gradient)
- No database changes needed -- admins can already update `user_quiz_posts` since RLS likely allows it through service role or admin policies
- The edit modal's save function uses `supabase.from('user_quiz_posts').update(...)` which will need to work for non-owners; we'll verify the RLS policy allows admin updates

