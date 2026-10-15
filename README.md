# Hearts of Poolville

Website for Hearts of Poolville, a community charity in Poolville, Texas.

- **Home page** with the year-round programs
- **/request** lists the forms families can fill out right now, and the ones opening soon
- **/thanksgiving**, **/christmas**, **/angel-tree/apply**, **/help**, **/angel-tree** (tags), and
  any form added on the admin page at **/forms/<name>**
- Every form has an English/Español switch. Add `?lang=es` to a link (for example
  `/thanksgiving?lang=es`) to open it in Spanish.
- **/admin** private page for volunteers, with a side menu:
  - **Results**: each form's responses, with search, statuses, and a spreadsheet download
  - **Edit forms**: change any form's dates, on/off switch, wording (English and Spanish), and
    questions; add new forms; and bring back an earlier version if something goes wrong

Forms are saved in Supabase, so editing them on the admin page needs no code changes.

## Set up

1. **Create a Supabase project** at supabase.com.
2. Open **SQL Editor**, paste in `supabase/schema.sql`, and run it. It creates the tables and
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

- **Forms**: on the admin page, under Edit forms. Each year, update the open and close dates and
  any pickup dates in the introductions. Have a native Spanish speaker check new Spanish text.
- **`lib/site.ts`** has your email and Facebook link. Fill them in and a Contact section appears.
- **`lib/programs.ts`** has the programs listed on the home page and which form each one uses.
- **`lib/i18n.ts`** has the words around the forms (buttons, error messages) in both languages.
- **`lib/forms/defaults.ts`** has the forms the site started with. They are only used the first
  time, before a form is saved in Supabase.
- To preview every form before it opens, run `OPEN_ALL_FORMS=1 npm run dev`. This only works on
  your own computer.

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
