import Link from 'next/link';
import WaterTower from '@/components/WaterTower';
import { openState } from '@/lib/forms/logic';
import { getAllForms, getFilledForLimited } from '@/lib/forms/store';
import { PROGRAMS } from '@/lib/programs';
import { SITE } from '@/lib/site';

// Rebuild hourly so the "Requests open" tags follow the forms' dates. Saving a form on the admin
// page rebuilds it right away.
export const revalidate = 3600;

export default async function Home() {
  const hasContact = Boolean(SITE.email || SITE.facebookUrl);
  const forms = await getAllForms();
  const filled = await getFilledForLimited(forms);
  const isOpen = (slug: string) => {
    const f = forms.find((x) => x.slug === slug);
    return f ? openState(f.config, undefined, filled[slug]) === 'open' : false;
  };

  return (
    <main>
      <div className="hero">
        <div>
          <p className="eyebrow">{SITE.location}</p>
          <h1>Neighbors helping neighbors.</h1>
          <p className="lede">
            Hearts of Poolville is a community charity serving Poolville, Texas. We put on Thanksgiving and
            Christmas dinners, run an Angel Tree, and help neighbors through the year with Easter baskets and
            back-to-school supplies.
          </p>
          <div className="actions">
            <Link className="btn primary" href="/help">
              I want to help
            </Link>
            <Link className="btn ghost" href="/request">
              I need help
            </Link>
          </div>
        </div>
        <div className="tower">
          <WaterTower />
        </div>
      </div>

      <section className="block" id="what-we-do">
        <h2>What we do</h2>
        <p className="sub">Help for Poolville families, all year long.</p>
        <ol className="year">
          {PROGRAMS.map((p) => (
            <li key={p.id}>
              <span className="when">{p.season}</span>
              <div>
                <h3>
                  {p.name}
                  {isOpen(p.formSlug) && <span className="open">Requests open</span>}
                </h3>
                <p>{p.blurb}</p>
              </div>
            </li>
          ))}
        </ol>
        <p className="note">We also pitch in with storm relief when severe weather hits Poolville.</p>
      </section>

      <section className="block" id="get-involved">
        <h2>Get involved</h2>
        <p className="sub">Pick the one that fits.</p>
        <div className="involve">
          <div className="panel">
            <h3>I need help</h3>
            <p>
              Ask for a holiday dinner, the Angel Tree, an Easter basket, or back-to-school supplies. Choose the
              program and fill out the form.
            </p>
            <Link className="btn primary" href="/request">
              Request help
            </Link>
          </div>
          <div className="panel">
            <h3>I want to help</h3>
            <p>
              Donate to a holiday dinner, the Angel Tree, Easter baskets, or back-to-school supplies. Tell us
              what you&apos;d like to help with and a volunteer will reach out.
            </p>
            <Link className="btn primary" href="/help">
              Sign up to help
            </Link>
            {isOpen('tags') && (
              <p className="fine">
                Took a tag from the Angel Tree? <Link href="/angel-tree">Tell us which one.</Link>
              </p>
            )}
          </div>
        </div>
      </section>

      {hasContact && (
        <section className="block" id="contact">
          <h2>Contact</h2>
          <p className="sub">Reach Hearts of Poolville here.</p>
          <div className="contact">
            {SITE.email && (
              <div className="slot">
                <p className="k">Email</p>
                <p className="v">
                  <a href={`mailto:${SITE.email}`}>{SITE.email}</a>
                </p>
              </div>
            )}
            {SITE.facebookUrl && (
              <div className="slot">
                <p className="k">Facebook</p>
                <p className="v">
                  <a href={SITE.facebookUrl} target="_blank" rel="noopener noreferrer">
                    Hearts of Poolville on Facebook
                  </a>
                </p>
              </div>
            )}
          </div>
        </section>
      )}
    </main>
  );
}
