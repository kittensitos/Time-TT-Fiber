# GFiber — Time Off Tracker

A static single-page app for managing team time-off requests, rebuilt from the
[kittensitos/Timetracker](https://github.com/kittensitos/Timetracker) Flask app as a
client-only **React + TypeScript + Vite** site using **Firebase Authentication** and
**Cloud Firestore** directly from the browser, deployable to **Firebase Hosting**.

## Features

- Google sign-in only (Firebase Auth), restricted to allowed email domains
  (`VITE_ALLOWED_DOMAINS`), with a hashed team-lead allowlist (`VITE_TEAM_LEAD_HASHES`)
- Create or join a team; the team creator becomes the admin
- Time-off requests (Power Hour with hours, or Other) with pending/approved/denied
  workflow, overlap validation, and admin approve/deny/edit/delete
- Tasks with assignee, priority, due date and status; assignees update their own status
- Calendar with month/week/day views showing time off and due tasks
- Team member management (admin adds/removes members by email)
- Yearly summary with stats and a per-person business-day breakdown
- Admin notification bell with member submission times and a pending-request badge

## Local development

```bash
npm install
npm run dev
```

The dev server is configured for port 80 (`vite.config.ts`); if that port is taken or
requires privileges, Vite falls back to the next free port and prints the URL.

## Connecting Firebase

1. Create a Firebase project, enable **Authentication** (Google provider)
   and **Cloud Firestore**.
2. Add a Web App in Project settings and copy its config.
3. `cp .env.example .env` and fill in the `VITE_FIREBASE_*` values — they are
   required, and `npm run build` fails without them. Optionally set
   `VITE_FIRESTORE_DATABASE_ID` if you use a named database (this deployment
   uses `fiber-tracker`).
4. Restart `npm run dev` — the app now uses real auth and Firestore.

## Deploying to Firebase Hosting

```bash
npm install -g firebase-tools
firebase login
# set your project id in .firebaserc (or run: firebase use --add)
npm run deploy        # builds and runs `firebase deploy`
```

This deploys the static site from `dist/` and the Firestore security rules in
`firestore.rules`. The rules mirror the reference app's access model (team-scoped
reads, admin-only approvals/task management, assignee-only status updates) — review
them before production use.

## Data model (Firestore collections)

| Collection | Fields |
|------------|--------|
| `teams`    | `name`, `adminEmail` |
| `people`   | `name`, `email`, `teamId` |
| `requests` | `personId`, `type` (`powerhour`\|`other`), `startDate`, `endDate`, `note`, `status` (`pending`\|`approved`\|`denied`), `hours` |
| `tasks`    | `title`, `description`, `assigneeId`, `priority` (`low`\|`medium`\|`high`), `status` (`assigned`\|`in_progress`\|`completed`), `dueDate` |
