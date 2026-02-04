
# Password Reset via Security Question

## Overview
Since your app uses **username-only authentication** (without real emails), traditional email-based password reset won't work. I'll implement a **security question** system that allows users to reset their password by answering a question they set during signup.

## How It Works

```text
┌─────────────────────────────────────────────────────────────────────┐
│                        SIGNUP FLOW                                  │
├─────────────────────────────────────────────────────────────────────┤
│  1. User creates account with username + password                   │
│  2. User selects a security question from a list                    │
│  3. User provides their own secret answer                           │
│  4. Answer is hashed and stored securely in the database            │
└─────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────┐
│                      PASSWORD RESET FLOW                            │
├─────────────────────────────────────────────────────────────────────┤
│  1. User clicks "Forgot Password" on login screen                   │
│  2. User enters their username                                      │
│  3. System shows their security question                            │
│  4. User types the answer                                           │
│  5. If correct: User can set a new password                         │
│  6. If wrong: "Incorrect answer" error (3 attempts max)             │
└─────────────────────────────────────────────────────────────────────┘
```

## Security Questions (Predefined List)

Users will choose from these Georgian questions:
1. შენი პირველი შინაური ცხოველის სახელი? (Your first pet's name?)
2. რომელ ქალაქში დაიბადე? (Which city were you born in?)
3. შენი საყვარელი მასწავლებლის სახელი? (Your favorite teacher's name?)
4. შენი საყვარელი ფილმი? (Your favorite movie?)
5. შენი საყვარელი სპორტული გუნდი? (Your favorite sports team?)

---

## Technical Implementation

### 1. Database Changes

**Add to `profiles` table:**
```sql
ALTER TABLE profiles ADD COLUMN security_question_id INTEGER;
ALTER TABLE profiles ADD COLUMN security_answer_hash TEXT;
```

### 2. New Page: `/forgot-password`

A new page with 3 steps:
- **Step 1**: Enter username
- **Step 2**: Show security question, enter answer
- **Step 3**: Set new password (if answer correct)

### 3. Edge Function: `reset-password-with-security`

A secure backend function that:
- Validates the security answer
- Uses admin API to reset the user's password
- Limits attempts (3 max per hour)

### 4. Update Signup Flow

During account creation, ask users to:
- Select a security question
- Provide an answer (min 2 characters)

### 5. Add "Forgot Password?" Link

Add link on login screen: "პაროლი დამავიწყდა?" (Forgot password?)

---

## Files to Create/Modify

| File | Action |
|------|--------|
| `src/pages/ForgotPassword.tsx` | **Create** - New password reset page |
| `supabase/functions/reset-password-with-security/index.ts` | **Create** - Backend logic |
| `src/pages/Index.tsx` | **Modify** - Add security question to signup |
| `src/pages/Auth.tsx` | **Modify** - Add "Forgot Password" link |
| `src/locales/ka.ts` + other locales | **Modify** - Add translations |
| `src/contexts/AuthContext.tsx` | **Modify** - Add reset function |
| `src/App.tsx` | **Modify** - Add route |
| Database migration | **Create** - Add columns to profiles |

---

## User Experience

### On Signup (New Step)
After username/password, user sees:
> "აირჩიე უსაფრთხოების შეკითხვა" (Choose a security question)
> [Dropdown with 5 questions]
> "პასუხი" (Answer): [Input field]

### On Login Screen
New link appears:
> "პაროლი დამავიწყდა?" (Forgot password?) → Goes to `/forgot-password`

### On Forgot Password Page
1. Enter username → "გაგრძელება" (Continue)
2. See question, enter answer → "შემოწმება" (Verify)
3. If correct: Enter new password twice → "პაროლის შეცვლა" (Change Password)
4. Success: Redirect to login with success message

---

## Security Measures

1. **Hashed answers**: Security answers are hashed before storage (like passwords)
2. **Rate limiting**: Max 3 attempts per hour per username
3. **Admin API**: Password change uses Supabase admin API (not client)
4. **Case-insensitive**: Answers compared in lowercase
5. **Minimum length**: Answer must be at least 2 characters
