# Module 01 — Authentication

## Page: Login `/login`
Sections: Email/password form; validation messages; forgot-password link.
Actions: submit credentials, show loading, handle incorrect credentials, redirect to permitted workspace.
Acceptance: secure session, no user enumeration, rate limiting, accessible errors.

## Page: Invitations `/invite/:token`
Sections: invitation details; account creation/sign-in; acceptance confirmation.
Actions: validate unexpired invite; join intended project with approved role.
Acceptance: expired/revoked invites rejected; no cross-project access.

## Page: Account `/account`
Sections: profile; session management.
Acceptance: users can update allowed fields; sessions are securely handled.
