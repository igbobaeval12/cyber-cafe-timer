import { Link } from 'wouter';
import { Zap } from 'lucide-react';

type FooterColumn = {
  title: string;
  links: Array<{ label: string; href: string }>;
};

const footerColumns: FooterColumn[] = [
  {
    title: 'Product',
    links: [
      { label: 'Features', href: '/features' },
      { label: 'Pricing', href: '/pricing' },
      { label: 'Security', href: '/security' },
    ],
  },
  {
    title: 'Company',
    links: [
      { label: 'About', href: '/about' },
      { label: 'Blog', href: '/blog' },
      { label: 'Contact', href: '/contact' },
    ],
  },
  {
    title: 'Resources',
    links: [
      { label: 'Documentation', href: '/documentation' },
      { label: 'API', href: '/api' },
      { label: 'Support', href: '/support' },
    ],
  },
  {
    title: 'Legal',
    links: [
      { label: 'Privacy', href: '/privacy' },
      { label: 'Terms', href: '/terms' },
      { label: 'License', href: '/license' },
    ],
  },
];

export default function PublicFooter() {
  return (
    <footer className="mt-20 border-t border-slate-700/80 bg-slate-950/60">
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-5">
          <div className="lg:col-span-1">
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-lg border border-cyan-400/40 bg-cyan-400/10 text-cyan-300">
                <Zap className="h-5 w-5" />
              </span>
              <div>
                <div className="text-base font-semibold tracking-wide text-white">Cyber Café Timer</div>
                <div className="text-xs font-medium uppercase tracking-[0.2em] text-slate-500">Operations</div>
              </div>
            </div>
            <p className="mt-4 max-w-xs text-sm leading-6 text-slate-400">
              Manage sessions, billing, staff, inventory, and PC operations from one system.
            </p>
          </div>

          {footerColumns.map((column) => (
            <div key={column.title} className="lg:pl-4">
              <h3 className="mb-4 text-xs font-semibold uppercase tracking-[0.2em] text-cyan-300">
                {column.title}
              </h3>
              <ul className="space-y-2.5">
                {column.links.map((link) => (
                  <li key={link.label}>
                    <Link
                      href={link.href}
                      className="text-sm font-medium leading-6 text-slate-400 transition-colors duration-200 hover:text-cyan-300 focus:text-cyan-300 focus:outline-none focus:ring-2 focus:ring-cyan-400 focus:ring-offset-2 focus:ring-offset-slate-950"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-10 flex flex-wrap items-center justify-between gap-4 border-t border-slate-700/80 pt-8">
          <div className="flex items-center gap-2 text-slate-400">
            <Zap className="h-4 w-4 text-cyan-400" />
            <span className="text-sm font-semibold text-slate-300">Cyber Café Timer</span>
          </div>
          <p className="text-xs font-medium text-slate-500">
            © {new Date().getFullYear()} All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}
