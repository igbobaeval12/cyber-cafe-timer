import React, { FormEvent, useState } from 'react';
import { Link } from 'wouter';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { LoginForm } from '@/components/LoginForm';
import { trpc } from '@/lib/trpc';
import { AlertCircle, ArrowRight, BarChart3, BriefcaseBusiness, ChartColumn, CheckCircle2, CircleDollarSign, Clock, DollarSign, Lock, Monitor, Printer, Send, ShieldCheck, ShoppingCart, TimerReset, Users, Zap } from 'lucide-react';

type LeadFormMode = 'trial' | 'sales';

type LeadFormValues = {
  fullName: string;
  businessName: string;
  email: string;
  phone: string;
  pcs: string;
  message: string;
};

const emptyLeadForm: LeadFormValues = {
  fullName: '',
  businessName: '',
  email: '',
  phone: '',
  pcs: '',
  message: '',
};

function LeadFormDialog({ mode, open, onOpenChange }: { mode: LeadFormMode; open: boolean; onOpenChange: (open: boolean) => void }) {
  const [values, setValues] = useState<LeadFormValues>(emptyLeadForm);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const isSales = mode === 'sales';
  const trialMutation = trpc.leads.registerTrial.useMutation();
  const salesMutation = trpc.leads.submitSalesInquiry.useMutation();
  const isSubmitting = trialMutation.isPending || salesMutation.isPending;

  const updateValue = (field: keyof LeadFormValues, value: string) => {
    setValues((current) => ({ ...current, [field]: value }));
    setError('');
    setSuccess(false);
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const requiredFields = [values.fullName, values.businessName, values.email, values.phone, values.pcs];
    if (isSales) requiredFields.push(values.message);

    if (requiredFields.some((value) => !value.trim())) {
      setError('Please complete all required fields before submitting.');
      return;
    }

    if (!/^\S+@\S+\.\S+$/.test(values.email)) {
      setError('Please enter a valid email address.');
      return;
    }

    if (!Number.isInteger(Number(values.pcs)) || Number(values.pcs) < 1) {
      setError('Number of PCs must be a whole number of at least 1.');
      return;
    }

    try {
      if (isSales) {
        await salesMutation.mutateAsync({ ...values, numberOfPcs: Number(values.pcs), message: values.message });
      } else {
        await trialMutation.mutateAsync({ fullName: values.fullName, businessName: values.businessName, email: values.email, phone: values.phone, numberOfPcs: Number(values.pcs) });
      }
      setSuccess(true);
      setError('');
    } catch (submissionError) {
      setSuccess(false);
      setError(submissionError instanceof Error ? submissionError.message : 'The request could not be submitted. Please try again.');
    }
  };

  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen) {
      setValues(emptyLeadForm);
      setError('');
      setSuccess(false);
    }
    onOpenChange(nextOpen);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto border-slate-800 bg-slate-900 text-slate-100 sm:max-w-xl">
        <DialogHeader className="pr-8 text-left">
          <DialogTitle className="text-2xl text-white">{isSales ? 'Contact Sales' : 'Start Your Free Trial'}</DialogTitle>
          <DialogDescription className="text-slate-300">
            {isSales ? 'Tell us about your café and our team will help you find the right setup.' : 'Set up the details we need to prepare your café for Cyber Café Timer.'}
          </DialogDescription>
        </DialogHeader>

        {success ? (
          <div className="space-y-5 py-4 text-center">
            <CheckCircle2 className="mx-auto h-12 w-12 text-emerald-400" />
            <div className="space-y-2">
              <h3 className="text-xl font-semibold text-white">{isSales ? 'Message sent' : 'Trial request received'}</h3>
              <p className="text-slate-300">{isSales ? 'Our sales team will review your details and follow up with you.' : 'Your trial request is recorded and ready for setup.'}</p>
            </div>
            <Button type="button" onClick={() => handleOpenChange(false)} className="bg-cyan-500 text-white hover:bg-cyan-600">Close</Button>
          </div>
        ) : (
        <form className="space-y-4" onSubmit={handleSubmit} noValidate>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <label htmlFor={`${mode}-full-name`} className="text-sm font-medium text-slate-200">Full Name <span className="text-cyan-400">*</span></label>
              <Input id={`${mode}-full-name`} value={values.fullName} onChange={(event) => updateValue('fullName', event.target.value)} required className="border-slate-700 text-white" />
            </div>
            <div className="space-y-2">
              <label htmlFor={`${mode}-business-name`} className="text-sm font-medium text-slate-200">Café/Business Name <span className="text-cyan-400">*</span></label>
              <Input id={`${mode}-business-name`} value={values.businessName} onChange={(event) => updateValue('businessName', event.target.value)} required className="border-slate-700 text-white" />
            </div>
            <div className="space-y-2">
              <label htmlFor={`${mode}-email`} className="text-sm font-medium text-slate-200">Email <span className="text-cyan-400">*</span></label>
              <Input id={`${mode}-email`} type="email" value={values.email} onChange={(event) => updateValue('email', event.target.value)} required className="border-slate-700 text-white" />
            </div>
            <div className="space-y-2">
              <label htmlFor={`${mode}-phone`} className="text-sm font-medium text-slate-200">Phone Number <span className="text-cyan-400">*</span></label>
              <Input id={`${mode}-phone`} type="tel" value={values.phone} onChange={(event) => updateValue('phone', event.target.value)} required className="border-slate-700 text-white" />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <label htmlFor={`${mode}-pcs`} className="text-sm font-medium text-slate-200">Number of PCs <span className="text-cyan-400">*</span></label>
              <Input id={`${mode}-pcs`} type="number" min="1" step="1" value={values.pcs} onChange={(event) => updateValue('pcs', event.target.value)} required className="border-slate-700 text-white" />
            </div>
          </div>

          {isSales && (
            <div className="space-y-2">
              <label htmlFor="sales-message" className="text-sm font-medium text-slate-200">Message <span className="text-cyan-400">*</span></label>
              <Textarea id="sales-message" value={values.message} onChange={(event) => updateValue('message', event.target.value)} required className="min-h-24 border-slate-700 text-white" />
            </div>
          )}

          {error && (
            <div role="alert" className="flex items-start gap-2 rounded-md border border-amber-400/30 bg-amber-400/10 p-3 text-sm text-amber-200">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <DialogFooter className="gap-2 sm:gap-2">
            <Button type="button" variant="outline" onClick={() => handleOpenChange(false)} className="border-slate-600 text-white hover:bg-slate-800">Cancel</Button>
            <Button type="submit" disabled={isSubmitting} className="bg-cyan-500 text-white hover:bg-cyan-600">
              {isSales ? <Send className="mr-2 h-4 w-4" /> : <CheckCircle2 className="mr-2 h-4 w-4" />}
              {isSubmitting ? 'Submitting...' : isSales ? 'Send Message' : 'Start Free Trial'}
            </Button>
          </DialogFooter>
        </form>
        )}
      </DialogContent>
    </Dialog>
  );
}

export default function Home() {
  const [isLearnMoreOpen, setIsLearnMoreOpen] = useState(false);
  const [leadFormMode, setLeadFormMode] = useState<LeadFormMode | null>(null);

  const features = [
    {
      icon: Monitor,
      title: 'Real-time PC Monitoring',
      description: 'Track all connected computers with live status updates and session information',
    },
    {
      icon: Clock,
      title: 'Precise Time Management',
      description: 'Accurate countdown timers with automatic expiration and session control',
    },
    {
      icon: DollarSign,
      title: 'Flexible Pricing',
      description: 'Configurable hourly rates, discounts, and support for prepaid/postpaid modes',
    },
    {
      icon: Lock,
      title: 'Secure Access Control',
      description: 'Admin password protection and session security to prevent unauthorized access',
    },
    {
      icon: BarChart3,
      title: 'Comprehensive Reports',
      description: 'Detailed analytics, daily earnings, session history, and usage statistics',
    },
    {
      icon: Users,
      title: 'User Management',
      description: 'Customer accounts, membership tiers, and prepaid balance tracking',
    },
  ];

  const productFeatures = [
    {
      icon: Monitor,
      title: 'PC Management',
      bullets: [
        'Monitor all PCs in real time',
        'See available, active, and offline computers',
        'Start and manage customer sessions',
        'Track computer usage',
      ],
    },
    {
      icon: TimerReset,
      title: 'Session & Time Management',
      bullets: [
        'Start and end customer sessions',
        'Track remaining time',
        'Automatically calculate session duration',
        'Prevent session/accounting inconsistencies',
      ],
    },
    {
      icon: CircleDollarSign,
      title: 'Automated Billing',
      bullets: [
        'Calculate charges based on session usage',
        'Track payments',
        'Monitor pending and completed transactions',
        'View revenue information',
      ],
    },
    {
      icon: Users,
      title: 'Customer Management',
      bullets: [
        'Create and manage customer profiles',
        'View customer activity',
        'Track customer-related information',
      ],
    },
    {
      icon: BriefcaseBusiness,
      title: 'Staff & Permissions',
      bullets: [
        'Create staff accounts',
        'Assign staff roles',
        'Control exactly what each staff member can access',
        'Use database-driven permissions such as PCs, POS, Inventory, Sessions, Customers, Billing, Printing, and Reports',
      ],
    },
    {
      icon: ShoppingCart,
      title: 'Inventory & POS',
      bullets: [
        'Manage products and stock',
        'Track inventory',
        'Handle POS transactions',
        'Monitor stock levels',
      ],
    },
    {
      icon: Printer,
      title: 'Printing',
      bullets: [
        'Manage printing operations',
        'Track printing activity and charges',
      ],
    },
    {
      icon: ChartColumn,
      title: 'Reports',
      bullets: [
        'View business activity',
        'Monitor revenue and transactions',
        'Analyze café performance',
      ],
    },
    {
      icon: ShieldCheck,
      title: 'Security',
      bullets: [
        'Separate Admin, Customer, and Staff access',
        'Staff permissions are controlled by their assigned role',
        'Unauthorized users cannot access restricted functionality',
      ],
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      {/* Navigation */}
      <nav className="border-b border-slate-700 bg-slate-900/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Zap className="w-8 h-8 text-cyan-400" />
            <span className="text-xl font-bold text-white">Cyber Café Timer</span>
          </div>
        </div>
      </nav>

      {/* Hero Section with Login Form */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          <div className="space-y-6">
            <h1 className="text-5xl lg:text-6xl font-bold text-white leading-tight">
              Professional PC Rental Management
            </h1>
            <p className="text-xl text-slate-300">
              Complete solution for managing cyber cafés with real-time synchronization, automated billing, and comprehensive reporting.
            </p>
            <div className="flex gap-4 pt-4">
              <Button
                size="lg"
                className="bg-cyan-500 hover:bg-cyan-600 text-white gap-2"
                onClick={() => setIsLearnMoreOpen(true)}
              >
                Learn More →
                <ArrowRight className="w-5 h-5" />
              </Button>
            </div>
          </div>

          <Dialog open={isLearnMoreOpen} onOpenChange={setIsLearnMoreOpen}>
            <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto border-slate-800 bg-slate-900 p-0 text-slate-100 sm:p-0">
              <div className="p-6 sm:p-8">
                <DialogHeader className="mb-6 text-left">
                  <div className="flex items-center gap-3">
                    <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-cyan-500/15 ring-1 ring-cyan-400/30">
                      <Zap className="h-5 w-5 text-cyan-400" />
                    </div>
                    <DialogTitle className="text-2xl font-bold text-white sm:text-3xl">
                      About Cyber Café Timer
                    </DialogTitle>
                  </div>
                  <DialogDescription className="mt-4 max-w-3xl text-base leading-7 text-slate-300">
                    Cyber Café Timer is a complete management system designed for cyber cafés and PC rental businesses. Manage computers, customers, sessions, billing, staff, inventory, POS, printing, and reports from one centralized system.
                  </DialogDescription>
                </DialogHeader>

                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                  {productFeatures.map(({ icon: Icon, title, bullets }) => (
                    <Card key={title} className="border-slate-700 bg-slate-800/75 shadow-none">
                      <CardHeader className="pb-3">
                        <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-lg bg-cyan-500/15 text-cyan-400 ring-1 ring-cyan-400/25">
                          <Icon className="h-5 w-5" />
                        </div>
                        <CardTitle className="text-lg text-white">{title}</CardTitle>
                      </CardHeader>
                      <CardContent className="pt-0">
                        <ul className="space-y-2 text-sm leading-6 text-slate-300">
                          {bullets.map((bullet) => (
                            <li key={bullet} className="flex items-start gap-2">
                              <span className="mt-2 h-1.5 w-1.5 rounded-full bg-cyan-400" />
                              <span>{bullet}</span>
                            </li>
                          ))}
                        </ul>
                      </CardContent>
                    </Card>
                  ))}
                </div>

                <DialogFooter className="mt-8 flex justify-end">
                  <Button
                    type="button"
                    onClick={() => setIsLearnMoreOpen(false)}
                    className="bg-cyan-500 hover:bg-cyan-600 text-white"
                  >
                    Close
                  </Button>
                </DialogFooter>
              </div>
            </DialogContent>
          </Dialog>

          <div className="relative">
            <div className="absolute inset-0 bg-gradient-to-r from-cyan-500 to-blue-500 rounded-lg blur-2xl opacity-20"></div>
            <div className="relative">
              <LoginForm />
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 border-t border-slate-700">
        <div className="text-center mb-16">
          <h2 className="text-4xl font-bold text-white mb-4">Powerful Features</h2>
          <p className="text-slate-300 text-lg">Everything you need to run a successful cyber café</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {features.map((feature, index) => {
            const Icon = feature.icon;
            return (
              <Card key={index} className="bg-slate-800 border-slate-700 hover:border-cyan-500 transition-colors">
                <CardHeader>
                  <div className="w-12 h-12 bg-cyan-500/20 rounded-lg flex items-center justify-center mb-4">
                    <Icon className="w-6 h-6 text-cyan-400" />
                  </div>
                  <CardTitle className="text-white">{feature.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-slate-400">{feature.description}</p>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </section>

      {/* Stats Section */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 border-t border-slate-700">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {[
            { label: 'Cafés Using', value: '500+' },
            { label: 'PCs Managed', value: '5000+' },
            { label: 'Sessions/Day', value: '50K+' },
            { label: 'Uptime', value: '99.9%' },
          ].map((stat, index) => (
            <div key={index} className="text-center">
              <div className="text-4xl font-bold text-cyan-400 mb-2">{stat.value}</div>
              <div className="text-slate-400">{stat.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* CTA Section */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 border-t border-slate-700">
        <div className="bg-gradient-to-r from-cyan-500/20 to-blue-500/20 border border-cyan-500/50 rounded-lg p-12 text-center">
          <h2 className="text-3xl font-bold text-white mb-4">Ready to Get Started?</h2>
          <p className="text-slate-300 mb-8 max-w-2xl mx-auto">
            Join hundreds of cyber cafés managing their operations efficiently with our comprehensive management system.
          </p>
          <div className="flex gap-4 justify-center flex-wrap">
            <Button size="lg" className="bg-cyan-500 hover:bg-cyan-600 text-white" onClick={() => setLeadFormMode('trial')}>
              Start Your Free Trial
            </Button>
            <Button size="lg" variant="outline" className="border-slate-600 text-white hover:bg-slate-800" onClick={() => setLeadFormMode('sales')}>
              Contact Sales
            </Button>
          </div>
        </div>
      </section>

      <LeadFormDialog mode={leadFormMode ?? 'trial'} open={leadFormMode !== null} onOpenChange={(open) => !open && setLeadFormMode(null)} />

      {/* Footer */}
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

            <div className="lg:pl-4">
              <h3 className="mb-4 text-xs font-semibold uppercase tracking-[0.2em] text-cyan-300">Product</h3>
              <ul className="space-y-2.5">
                <li><Link href="/features" className="text-sm font-medium leading-6 text-slate-400 transition-colors duration-200 hover:text-cyan-300 focus:text-cyan-300 focus:outline-none focus:ring-2 focus:ring-cyan-400 focus:ring-offset-2 focus:ring-offset-slate-950">Features</Link></li>
                <li><Link href="/pricing" className="text-sm font-medium leading-6 text-slate-400 transition-colors duration-200 hover:text-cyan-300 focus:text-cyan-300 focus:outline-none focus:ring-2 focus:ring-cyan-400 focus:ring-offset-2 focus:ring-offset-slate-950">Pricing</Link></li>
                <li><Link href="/security" className="text-sm font-medium leading-6 text-slate-400 transition-colors duration-200 hover:text-cyan-300 focus:text-cyan-300 focus:outline-none focus:ring-2 focus:ring-cyan-400 focus:ring-offset-2 focus:ring-offset-slate-950">Security</Link></li>
              </ul>
            </div>

            <div className="lg:pl-4">
              <h3 className="mb-4 text-xs font-semibold uppercase tracking-[0.2em] text-cyan-300">Company</h3>
              <ul className="space-y-2.5">
                <li><Link href="/about" className="text-sm font-medium leading-6 text-slate-400 transition-colors duration-200 hover:text-cyan-300 focus:text-cyan-300 focus:outline-none focus:ring-2 focus:ring-cyan-400 focus:ring-offset-2 focus:ring-offset-slate-950">About</Link></li>
                <li><Link href="/blog" className="text-sm font-medium leading-6 text-slate-400 transition-colors duration-200 hover:text-cyan-300 focus:text-cyan-300 focus:outline-none focus:ring-2 focus:ring-cyan-400 focus:ring-offset-2 focus:ring-offset-slate-950">Blog</Link></li>
                <li><Link href="/contact" className="text-sm font-medium leading-6 text-slate-400 transition-colors duration-200 hover:text-cyan-300 focus:text-cyan-300 focus:outline-none focus:ring-2 focus:ring-cyan-400 focus:ring-offset-2 focus:ring-offset-slate-950">Contact</Link></li>
              </ul>
            </div>

            <div className="lg:pl-4">
              <h3 className="mb-4 text-xs font-semibold uppercase tracking-[0.2em] text-cyan-300">Resources</h3>
              <ul className="space-y-2.5">
                <li><Link href="/documentation" className="text-sm font-medium leading-6 text-slate-400 transition-colors duration-200 hover:text-cyan-300 focus:text-cyan-300 focus:outline-none focus:ring-2 focus:ring-cyan-400 focus:ring-offset-2 focus:ring-offset-slate-950">Documentation</Link></li>
                <li><Link href="/api" className="text-sm font-medium leading-6 text-slate-400 transition-colors duration-200 hover:text-cyan-300 focus:text-cyan-300 focus:outline-none focus:ring-2 focus:ring-cyan-400 focus:ring-offset-2 focus:ring-offset-slate-950">API</Link></li>
                <li><Link href="/support" className="text-sm font-medium leading-6 text-slate-400 transition-colors duration-200 hover:text-cyan-300 focus:text-cyan-300 focus:outline-none focus:ring-2 focus:ring-cyan-400 focus:ring-offset-2 focus:ring-offset-slate-950">Support</Link></li>
              </ul>
            </div>

            <div className="lg:pl-4">
              <h3 className="mb-4 text-xs font-semibold uppercase tracking-[0.2em] text-cyan-300">Legal</h3>
              <ul className="space-y-2.5">
                <li><Link href="/privacy" className="text-sm font-medium leading-6 text-slate-400 transition-colors duration-200 hover:text-cyan-300 focus:text-cyan-300 focus:outline-none focus:ring-2 focus:ring-cyan-400 focus:ring-offset-2 focus:ring-offset-slate-950">Privacy</Link></li>
                <li><Link href="/terms" className="text-sm font-medium leading-6 text-slate-400 transition-colors duration-200 hover:text-cyan-300 focus:text-cyan-300 focus:outline-none focus:ring-2 focus:ring-cyan-400 focus:ring-offset-2 focus:ring-offset-slate-950">Terms</Link></li>
                <li><Link href="/license" className="text-sm font-medium leading-6 text-slate-400 transition-colors duration-200 hover:text-cyan-300 focus:text-cyan-300 focus:outline-none focus:ring-2 focus:ring-cyan-400 focus:ring-offset-2 focus:ring-offset-slate-950">License</Link></li>
              </ul>
            </div>
          </div>

          <div className="mt-10 flex flex-wrap items-center justify-between gap-4 border-t border-slate-700/80 pt-8">
            <div className="flex items-center gap-2 text-slate-400">
              <Zap className="h-4 w-4 text-cyan-400" />
              <span className="text-sm font-semibold text-slate-300">Cyber Café Timer</span>
            </div>
            <p className="text-xs font-medium text-slate-500">© {new Date().getFullYear()} All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
