import Link from 'next/link';
import AutoRefresh from '@/components/AutoRefresh';
import AngelBoard from '@/components/admin/angels/AngelBoard';
import { requireAdmin } from '@/lib/auth';
import { getAngelBoard } from '@/lib/angels/store';

export default async function AngelsPage() {
  await requireAdmin();
  let board;
  try {
    board = await getAngelBoard();
  } catch (e) {
    console.error('angels load failed', e);
    return (
      <p className="error">
        Could not load the angels. If this is the first time, run the latest supabase/schema.sql in Supabase.
      </p>
    );
  }
  const taken = board.angels.filter((a) => a.tag).length;
  const toMatch = board.tagForms.filter((t) => t.codes.length === 0).length;

  return (
    <>
      <div className="admin-title">
        <div>
          <h1>Angels &amp; tags</h1>
          <p className="fine">
            Every child on the Angel Tree has an ID. Put the ID on their tag. When someone fills out the{' '}
            <Link className="textlink" href="/admin/results/tags">
              tag form
            </Link>{' '}
            with that ID, it is matched here on its own.
          </p>
        </div>
        <AutoRefresh />
      </div>

      <div className="stats">
        <div className="stat-box">
          <p className="stat-number">{board.angels.length}</p>
          <p className="stat-label">Angels</p>
        </div>
        <div className="stat-box">
          <p className="stat-number">
            {taken}
            <span className="stat-of"> / {board.angels.length}</span>
          </p>
          <p className="stat-label">Tags taken</p>
        </div>
        <div className="stat-box">
          <p className="stat-number">{toMatch}</p>
          <p className="stat-label">Tag forms to match</p>
        </div>
      </div>

      <AngelBoard angels={board.angels} tagForms={board.tagForms} />
    </>
  );
}
