import type { ReactNode } from 'react';
import { Link } from 'wouter';
import { ArrowRight, BookOpen, BriefcaseBusiness, CheckCircle2, FileText, GraduationCap, Landmark, LifeBuoy, Lock, ShieldCheck, Zap } from 'lucide-react';

type PageKey =
  | 'features'
  | 'pricing'
  | 'security'
  | 'about'
  | 'blog'
  | 'contact'
  | 'documentation'
  | 'api'
  | 'support'
  | 'privacy'
  | 'terms'
  | 'license';

type PageContent = {
  hero: string;
  title: string;
  kicker: string;
  summary: string;
  body: Array<{ heading: string; body: string; icon?: ReactNode }>;
  actions?: Array<{ label: string; href: string }>;
};

const pageContent: Record<PageKey, PageContent> = {
  features: {
    hero: 'Features',
    title: 'Operational control for every shift.',
    kicker: 'Product',
    summary: 'Cyber Café Timer keeps your staff, sessions, billing, inventory, and PC floor in sync without a heavy onboarding process.',
    body: [
      { heading: 'Real-time session visibility', body: 'See active customers, remaining time, workstation usage, and staff activity as your day changes.', icon: <MonitorIcon /> },
      { heading: 'Automated billing', body: 'Track session time, apply hourly rules, and keep every charge aligned with your POS and printer workflows.', icon: <FileText /> },
      { heading: 'Staff and permissions', body: 'Give each operator the right level of access while separating admin, cashier, and customer-facing workflows.', icon: <ShieldCheck /> },
    ],
    actions: [
      { label: 'Talk to sales', href: '/contact' },
      { label: 'Explore pricing', href: '/pricing' },
    ],
  },
  pricing: {
    hero: 'Pricing',
    title: 'Pricing that fits your café floor.',
    kicker: 'Pricing',
    summary: 'Start with the operational features your team needs today and grow into a full PC rental, billing, and inventory workflow as your business expands.',
    body: [
      { heading: 'One platform', body: 'A single operational system covers your customer sessions, staff permissions, reports, inventory, and billing.', icon: <BriefcaseBusiness /> },
      { heading: 'Flexible deployment', body: 'Choose the setup that matches your store: a single café, a growing multi-PC shop, or an expanding rental business.', icon: <Landmark /> },
      { heading: 'Transparent onboarding', body: 'The product is designed to reduce manual admin work while improving visibility for operators and owners.', icon: <CheckCircle2 /> },
    ],
    actions: [
      { label: 'Book a demo', href: '/contact' },
      { label: 'Read security notes', href: '/security' },
    ],
  },
  security: {
    hero: 'Security',
    title: 'Access control without slowing the team down.',
    kicker: 'Security',
    summary: 'Protect your business tasks with role-aware access, session boundaries, and transparent administrative controls.',
    body: [
      { heading: 'Role-based access', body: 'Limit what managers, staff, and cashiers can change, see, or export from the system.', icon: <Lock /> },
      { heading: 'Session safety', body: 'Prevent unauthorized access from drifting into sensitive billing, customer, or operational workflows.', icon: <ShieldCheck /> },
      { heading: 'Operational visibility', body: 'Create a clean record of activity while giving your administrators the tools they need to work confidently.', icon: <CheckCircle2 /> },
    ],
    actions: [
      { label: 'Contact support', href: '/support' },
      { label: 'Review privacy', href: '/privacy' },
    ],
  },
  about: {
    hero: 'About',
    title: 'Built for modern cyber cafés and rental teams.',
    kicker: 'Company',
    summary: 'Cyber Café Timer brings together everyday operations for cyber cafés, gaming lounges, rentals, and PC access businesses.',
    body: [
      { heading: 'A complete control layer', body: 'From arrivals and sessions to inventory, reports, security, and billing, the system centralizes daily management.', icon: <BriefcaseBusiness /> },
      { heading: 'Designed for operators', body: 'Operators need fast visibility, clean reporting, and a clear proof trail for customer activity and payments.', icon: <Zap /> },
      { heading: 'Made for growth', body: 'The same workflow can support a small local café as well as a larger multi-PC business with expanding reporting needs.', icon: <Landmark /> },
    ],
    actions: [
      { label: 'See features', href: '/features' },
      { label: 'Get in touch', href: '/contact' },
    ],
  },
  blog: {
    hero: 'Blog',
    title: 'Field notes from the café floor.',
    kicker: 'Company',
    summary: 'Ideas, operations guidance, and practical productivity updates for teams running cyber cafés and PC rental businesses.',
    body: [
      { heading: 'Running smarter sessions', body: 'Create a clear operational rhythm around check-in, billing, session changes, and customer support.', icon: <BookOpen /> },
      { heading: 'Security by design', body: 'Modern control starts with role boundaries, clear permissions, and operational visibility.', icon: <ShieldCheck /> },
      { heading: 'The metrics that matter', body: 'Operators depend on the right mix of revenue, utilization, inventory, and service flow data.', icon: <FileText /> },
    ],
    actions: [
      { label: 'Read documentation', href: '/documentation' },
      { label: 'Contact support', href: '/support' },
    ],
  },
  contact: {
    hero: 'Contact',
    title: 'Talk to the Cyber Café Timer team.',
    kicker: 'Company',
    summary: 'Tell us about your café, your current workflows, and the operational details your team wants to improve.',
    body: [
      { heading: 'Sales and onboarding', body: 'Speak with the team about setup scope, pricing, hardware requirements, staff workflows, and implementation support.', icon: <BriefcaseBusiness /> },
      { heading: 'Customer support', body: 'Ask questions about training, privacy, reporting, security, billing workflows, and support coverage.', icon: <LifeBuoy /> },
      { heading: 'Implementation planning', body: 'Share your business goals so the right public route, feature schedule, and support path can be suggested.', icon: <ArrowRight /> },
    ],
    actions: [
      { label: 'Email the team', href: 'mailto:team@cybercafetimer.app' },
      { label: 'See documentation', href: '/documentation' },
    ],
  },
  documentation: {
    hero: 'Documentation',
    title: 'Documentation for the full operating workflow.',
    kicker: 'Resources',
    summary: 'Get practical guidance for setup, staff use, sessions, billing, reporting, inventory, and security tasks in one place.',
    body: [
      { heading: 'Get started', body: 'Install your station settings, create your team, and configure your business rules before opening the floor.', icon: <BookOpen /> },
      { heading: 'Daily workflow', body: 'Use sessions, monitoring, billing, customer records, and check-out flows with a consistent operating rhythm.', icon: <FileText /> },
      { heading: 'Reporting', body: 'Understand your sales, utilization, inventory movement, and operational trends from the dashboard and reports.', icon: <ChartIcon /> },
    ],
    actions: [
      { label: 'Explore API', href: '/api' },
      { label: 'Open support', href: '/support' },
    ],
  },
  api: {
    hero: 'API',
    title: 'Integrate and extend your café operations.',
    kicker: 'Resources',
    summary: 'Use the Cyber Café Timer API for automation, reporting, customer workflows, billing logic, and operational integrations.',
    body: [
      { heading: 'Public endpoints', body: 'Connect accounting, customer boarding, reporting, payments, and inventory workflows to your existing systems.', icon: <BookOpen /> },
      { heading: 'Authentication', body: 'Use role-aware access patterns and secure application credentials for trusted integrations.', icon: <Lock /> },
      { heading: 'Developer support', body: 'Keep integrations simple while preserving the operational consistency that your staff depends on.', icon: <LifeBuoy /> },
    ],
    actions: [
      { label: 'Read docs', href: '/documentation' },
      { label: 'Contact support', href: '/support' },
    ],
  },
  support: {
    hero: 'Support',
    title: 'Help when your operations need it most.',
    kicker: 'Resources',
    summary: 'Reach the team for implementation questions, admin guidance, billing questions, training needs, and day-to-day operational support.',
    body: [
      { heading: 'Implementation help', body: 'Plan the launch of your café workflows, customer billing, permissions, and reporting model.', icon: <BookOpen /> },
      { heading: 'Operational guidance', body: 'Confirm the right workflows for reservations, charging, printers, POS, and staff handoffs.', icon: <LifeBuoy /> },
      { heading: 'Product assistance', body: 'Ask for help with reports, sessions, PC monitoring, customer records, and system configuration.', icon: <BriefcaseBusiness /> },
    ],
    actions: [
      { label: 'Contact sales', href: '/contact' },
      { label: 'Open documentation', href: '/documentation' },
    ],
  },
  privacy: {
    hero: 'Privacy',
    title: 'Privacy expectations for your café operations.',
    kicker: 'Legal',
    summary: 'Cyber Café Timer is designed to respect staff, customer, and business data while keeping your operational records clear and secure.',
    body: [
      { heading: 'Data responsibility', body: 'Use role-aware access and secure records to limit sensitive details to the people who need them.', icon: <ShieldCheck /> },
      { heading: 'Customer records', body: 'Keep customer billing, session, and usage records controlled and protected according to the workflow you set up.', icon: <FileText /> },
      { heading: 'Operations accountability', body: 'Maintain an audit-friendly structure for daily operator activity and business operations.', icon: <CheckCircle2 /> },
    ],
    actions: [
      { label: 'Review terms', href: '/terms' },
      { label: 'See security', href: '/security' },
    ],
  },
  terms: {
    hero: 'Terms',
    title: 'Terms of service.',
    kicker: 'Legal',
    summary: 'Our service terms support predictable use of the Cyber Café Timer platform for daily operating workflows.',
    body: [
      { heading: 'Service alignment', body: 'Use the platform as a tool for managing cyber café PCs, staff, sessions, billing, inventory, and reporting.', icon: <FileText /> },
      { heading: 'Security and ownership', body: 'Business customers remain responsible for the confidentiality, access rules, and use of operational data.', icon: <Lock /> },
      { heading: 'Support expectations', body: 'The service is supported by product documentation, customer support, and implementation guidance.', icon: <LifeBuoy /> },
    ],
    actions: [
      { label: 'Read privacy', href: '/privacy' },
      { label: 'License', href: '/license' },
    ],
  },
  license: {
    hero: 'License',
    title: 'License and product use.',
    kicker: 'Legal',
    summary: 'Cyber Café Timer is designed for managed business operations, with clear deployment expectations for service teams and operators.',
    body: [
      { heading: 'Deployment', body: 'Use the product according to your commercial agreement, operational workflow, and business requirements.', icon: <Landmark /> },
      { heading: 'Protected product assets', body: 'Software, content, materials, and service guidance should be used in line with commercial and operational expectations.', icon: <ShieldCheck /> },
      { heading: 'Support', body: 'Questions about implementation, deployment, product updates, and workflows can be reviewed with support.', icon: <LifeBuoy /> },
    ],
    actions: [
      { label: 'Read terms', href: '/terms' },
      { label: 'Contact support', href: '/support' },
    ],
  },
};

function MonitorIcon() {
  return <Zap className="h-5 w-5" />;
}

function ChartIcon() {
  return <FileText className="h-5 w-5" />;
}

export default function PublicInfoPage({ page }: { page: PageKey }) {
  const content = pageContent[page];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-slate-100">
      <nav className="border-b border-slate-700 bg-slate-900/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
          <Link href="/" className="flex items-center gap-3 text-white">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg border border-cyan-400/40 bg-cyan-400/10 text-cyan-400">
              <Zap className="h-5 w-5" />
            </span>
            <span className="text-xl font-bold tracking-tight">Cyber Café Timer</span>
          </Link>
          <div className="hidden items-center gap-8 md:flex">
            <Link href="/features" className="text-sm font-medium text-slate-300 transition hover:text-cyan-300">Features</Link>
            <Link href="/pricing" className="text-sm font-medium text-slate-300 transition hover:text-cyan-300">Pricing</Link>
            <Link href="/security" className="text-sm font-medium text-slate-300 transition hover:text-cyan-300">Security</Link>
            <Link href="/documentation" className="text-sm font-medium text-slate-300 transition hover:text-cyan-300">Documentation</Link>
            <Link href="/contact" className="text-sm font-medium text-slate-300 transition hover:text-cyan-300">Contact</Link>
          </div>
        </div>
      </nav>

      <main className="mx-auto max-w-6xl px-4 py-16 sm:px-6 lg:px-8">
        <section className="rounded-3xl border border-slate-700/80 bg-slate-900/40 p-8 shadow-2xl shadow-slate-950/40 sm:p-12">
          <div className="mb-8 flex items-center gap-3">
            <span className="inline-flex items-center gap-2 rounded-full border border-cyan-400/30 bg-cyan-400/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-cyan-300">
              <Zap className="h-4 w-4" /> {content.kicker}
            </span>
          </div>
          <div className="grid items-center gap-10 lg:grid-cols-[minmax(0,1.2fr)_280px]">
            <div>
              <h1 className="max-w-4xl text-4xl font-bold leading-tight text-white sm:text-5xl">
                {content.title}
              </h1>
              <p className="mt-6 max-w-3xl text-lg leading-8 text-slate-300">
                {content.summary}
              </p>
              {content.actions && (
                <div className="mt-8 flex flex-wrap gap-3">
                  {content.actions.map((action) => (
                    <Link key={action.label} href={action.href} className="inline-flex items-center gap-2 rounded-lg border border-cyan-400/50 bg-cyan-500 px-5 py-3 text-sm font-semibold text-slate-950 transition hover:bg-cyan-400 focus:bg-cyan-400 focus:outline-none focus:ring-2 focus:ring-cyan-300">
                      {action.label}
                      <ArrowRight className="h-4 w-4" />
                    </Link>
                  ))}
                </div>
              )}
            </div>
            <div className="rounded-2xl border border-cyan-400/30 bg-slate-800/50 p-8">
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold uppercase tracking-[0.16em] text-cyan-300">{content.hero}</span>
                <Zap className="h-8 w-8 text-cyan-400" />
              </div>
              <div className="mt-8 space-y-5">
                {content.body.slice(0,3).map((item, index) => (
                  <div key={index} className="flex items-start gap-3">
                    <span className="mt-1 flex h-8 w-8 items-center justify-center rounded-full border border-cyan-400/30 bg-cyan-500/10 text-cyan-300">
                      {item.icon || <CheckCircle2 className="h-4 w-4" />}
                    </span>
                    <div>
                      <div className="text-sm font-semibold text-white">{item.heading}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="mt-8 grid gap-4 md:grid-cols-3">
          {content.body.map((item, index) => (
            <article key={index} className="rounded-2xl border border-slate-700/80 bg-slate-900/30 p-6">
              <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-lg border border-slate-600/80 bg-slate-800 text-cyan-300">
                {item.icon || <CheckCircle2 className="h-5 w-5" />}
              </div>
              <h2 className="text-lg font-semibold text-white">{item.heading}</h2>
              <p className="mt-3 text-sm leading-6 text-slate-400">{item.body}</p>
            </article>
          ))}
        </section>
      </main>

      <footer className="border-t border-slate-700 bg-slate-950/40">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-8 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3 text-slate-400">
            <Zap className="h-4 w-4 text-cyan-400" />
            <span className="text-sm font-semibold text-slate-300">Cyber Café Timer</span>
          </div>
          <span className="text-xs font-medium text-slate-500">© {new Date().getFullYear()} All rights reserved.</span>
        </div>
      </footer>
    </div>
  );
}
