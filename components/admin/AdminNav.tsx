'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState, type ReactNode } from 'react';

export type NavItem = { href: string; label: string; badge?: number; note?: string };

/** The admin side menu. On a phone it folds up behind a Menu button. */
export default function AdminNav({
  results,
  edit,
  footer,
}: {
  results: NavItem[];
  edit: NavItem[];
  footer: ReactNode;
}) {
  const path = usePathname();
  const [open, setOpen] = useState(false);
  // Close the phone menu after choosing a page.
  useEffect(() => setOpen(false), [path]);

  const item = (it: NavItem) => {
    const current = path === it.href || path.startsWith(`${it.href}/`);
    return (
      <li key={it.href}>
        <Link href={it.href} aria-current={current ? 'page' : undefined}>
          <span>{it.label}</span>
          {it.badge ? <span className="badge">{it.badge} new</span> : null}
          {it.note ? <span className="navnote">{it.note}</span> : null}
        </Link>
      </li>
    );
  };

  return (
    <nav className="admin-nav" aria-label="Admin">
      <button className="btn ghost small menu-toggle" type="button" aria-expanded={open} onClick={() => setOpen(!open)}>
        {open ? 'Close menu' : 'Menu'}
      </button>
      <div className={open ? 'admin-nav-body is-open' : 'admin-nav-body'}>
        <ul>
          <li>
            <Link href="/admin" aria-current={path === '/admin' ? 'page' : undefined}>
              <span>Overview</span>
            </Link>
          </li>
        </ul>
        <p className="navhead">Results</p>
        <ul>{results.map(item)}</ul>
        <p className="navhead">Edit forms</p>
        <ul>
          {edit.map(item)}
          <li>
            <Link href="/admin/forms/new" aria-current={path === '/admin/forms/new' ? 'page' : undefined}>
              <span>+ New form</span>
            </Link>
          </li>
        </ul>
        <div className="navfoot">{footer}</div>
      </div>
    </nav>
  );
}
