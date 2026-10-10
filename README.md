# Hearts of Poolville

Website for Hearts of Poolville, a community charity in Poolville, Texas.

- **Home page** with the year-round programs
- **/request** form for families asking for help (Thanksgiving, Christmas, Angel Tree, Easter, back-to-school)
- **/angel-tree** form for people who took a tag from the tree
- **/admin** private page for volunteers: see submissions, mark them done, download CSV

Built with Next.js 15 and Supabase. Nothing a visitor submits is readable from the browser. All
reads and writes happen on the server.

## Set up

1. **Create a Supabase project** at supabase.com.
2. Open **SQL Editor**, paste in `supabase/schema.sql`, and run it. It creates two tables and
   turns on row level security with no public policies, so only the server can touch them.
3. **Lock down sign-ups.** In Supabase go to Authentication > Sign In / Providers and turn off
   "Allow new users to sign up". Then go to Authentication > Users > Add user and create an account
   (email and password, auto-confirm on) for each volunteer who should use /admin.
4. Copy `.env.example` to `.env.local` and fill it in from Project Settings > API:
   - `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY` (keep this secret)
   - `ADMIN_EMAILS` (comma-separated; only these emails can open /admin)
5. Run it:

   ```
   npm install
   npm run dev
   ```

   Open http://localhost:3000.

## Put it online

Push the project to GitHub and import it into Vercel. Add the same environment variables in the
Vercel project settings (the four Supabase and admin ones, plus `CRON_SECRET`), then deploy. Do
not commit `.env.local`.

### Keep Supabase awake

Free Supabase projects pause after about a week with little activity. `vercel.json` schedules a
weekly call to `/api/keepalive`, which does one cheap read. To turn it on:

1. Make up a long random string (`openssl rand -hex 32` works) and add it in Vercel as
   `CRON_SECRET`. Vercel sends it with each cron call automatically.
2. Redeploy.
3. In Vercel, open the project's Settings > Cron Jobs and confirm `/api/keepalive` is listed. You
   can run it from there to test. A `200` means it worked.

If you would rather use a GitHub Actions schedule, point it at the same route with the header
`Authorization: Bearer <CRON_SECRET>`.

## Things you will edit

- **`lib/programs.ts`** has the program list. Set `requestsOpen` to `true` or `false` to open and
  close each program. Closed programs show as unavailable on the request form and lose the
  "Requests open" tag on the home page. The defaults assume Thanksgiving, Angel Tree, and
  Christmas are open and Easter and back-to-school are closed. Change them to match reality.
- **`lib/site.ts`** has your email and Facebook link. Fill them in and a Contact section appears.
- **`components/RequestForm.tsx` and `components/TagForm.tsx`** hold the form fields. If your
  Google Forms ask something this does not, add a column in `supabase/schema.sql` (and run an
  `alter table` in Supabase), then add the field to the form and to `app/actions.ts`.

## About the data

The request form collects names, phone numbers, addresses, and details about families. Treat it
carefully.

- Only emails in `ADMIN_EMAILS` can see submissions. Remove someone from that list and delete
  their Supabase user when they stop volunteering.
- Consider deleting old submissions after each season (Supabase > Table Editor).
- The form says "What you send here goes only to Hearts of Poolville." Make sure that stays true
  before you keep that sentence.
- Spam protection is a hidden honeypot field plus length limits. If the forms start getting junk,
  add a CAPTCHA such as Cloudflare Turnstile.
