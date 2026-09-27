# Fix admin password reset

## What's wrong
"Forgot password?" never sends an email. It sends a 6-digit code by text message to the phone number saved on the account. Both admin accounts (support@tidywisecleaning.com and bdemandingo@gmail.com) have no phone number saved. When there's no number, the site sends nothing and still shows the "code sent" message on purpose, so nobody can use it to check which accounts exist.

## Fix
1. Save the admin phone number (+1 561-571-8725, the business line already used for admin alerts) on both admin accounts. Reset codes will then arrive by text.
2. Change the reset screen wording from email to text: "We'll text a reset code to the phone number on your account."
3. Test it: request a code for support@tidywisecleaning.com and confirm a text is sent.

Emails stay turned off, as the project rules require.

## Technical details
- Update `profiles.phone` for both admin user ids (the reset function checks auth phone first, then `profiles.phone`).
- Change only the text in `src/pages/Auth.tsx`.
- Check the `sms-password-reset` logs after the test.
