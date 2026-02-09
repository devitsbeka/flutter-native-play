
## Show "Do you have an account?" prompt on failed login

When a user tries to sign in and gets an error (account not found / invalid credentials), instead of just showing a toast error, we will display a helpful modal/dialog asking: **"გაქვს ანგარიში?"** (Do you have an account?) with two clear action buttons: **"შექმნა"** (Create) and **"შესვლა"** (Sign In).

### What changes

**File: `src/pages/Auth.tsx`**

1. Add a state variable `showAccountPrompt` (boolean, default `false`).
2. On login failure (line 149-150), instead of only showing a toast, set `showAccountPrompt = true`.
3. Add an `AlertDialog` (from `@radix-ui/react-alert-dialog`) that renders when `showAccountPrompt` is `true`:
   - Title: **"გაქვს ანგარიში?"** (Do you have an account?)
   - Description: **"თუ ჯერ არ გაქვს ანგარიში, შექმენი ახალი"** (If you don't have an account yet, create a new one)
   - Two buttons:
     - **"შექმნა"** (Create) -- switches to signup mode (`setIsSignUp(true)`) and closes the dialog
     - **"შესვლა"** (Sign In) -- closes the dialog so the user can retry with correct credentials
4. Remove or keep the existing toast -- replace it with this dialog for a better UX.

### Technical details

- Uses the existing `AlertDialog` component from `src/components/ui/alert-dialog.tsx`
- The dialog will have the primary/accent colored button on "შექმნა" to guide users toward registration
- "შესვლა" will be a secondary/outline button to let them retry
- The dialog auto-closes when either button is pressed, resetting `showAccountPrompt` to `false`
