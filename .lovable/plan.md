

## Add Email Field to Sign-Up, Keep Username+Password for Sign-In

### Changes to `src/pages/Auth.tsx`

1. **Add email state for sign-up**: An `email` state already exists (used for sign-in). We'll add a new `signupEmail` state to keep things clean and separate from the sign-in "username/email" field.

2. **Update `signUpSchema`**: Add an `email` field with `z.string().email()` validation so users must provide a valid email during registration.

3. **Switch sign-up call**: Change from `signUpWithUsername(nickname, password)` back to `signUp(signupEmail, password, nickname)` which uses the real email address.

4. **Add email input to sign-up form**: Insert an email field (with Mail icon) between the username field and the password field in the sign-up UI. The field order will be:
   - Username (nickname)
   - Email
   - Password

5. **Sign-in stays the same**: Username/email + password, no changes needed.

### Technical Details

- New state: `const [signupEmail, setSignupEmail] = useState("")`
- Schema update: `signUpSchema` adds `email: z.string().email(t("auth.invalidEmail"))`
- API call change: line 106 switches from `signUpWithUsername(nickname, password)` to `signUp(signupEmail, password, nickname)`
- Analytics: change tracking back from `'username'` to `'email'` for sign-up events since we now collect real emails
- The sign-in form remains unchanged (username or email + password)

