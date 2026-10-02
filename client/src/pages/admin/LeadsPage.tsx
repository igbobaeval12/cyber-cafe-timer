import { useMemo, useState } from "react";
import { Mail, Phone, Search } from "lucide-react";
import { AdminShell } from "@/components/admin/AdminShell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";

const trialStatuses = ["pending_setup", "converted", "rejected"] as const;
const salesStatuses = ["new", "contacted", "closed"] as const;

type Lead = { id: number; fullName: string; businessName: string; email: string; phone: string; numberOfPcs: number; status: string; createdAt: Date | string; message?: string | null };

function statusLabel(status: string) {
  return status.replace(/_/g, " ").replace(/\b\w/g, (character) => character.toUpperCase());
}

function LeadTable({ leads, type, onStatusChange }: { leads: Lead[]; type: "trial" | "sales"; onStatusChange: (id: number, status: string) => void }) {
  const statuses = type === "trial" ? trialStatuses : salesStatuses;
  if (!leads.length) return <p className="py-10 text-center text-sm text-slate-400">No leads match the current filters.</p>;
  return (
    <div className="overflow-x-auto">
      <table className="min-w-[760px] w-full text-left text-sm">
        <thead className="border-b border-slate-800 text-slate-400"><tr><th className="px-3 py-3 font-medium">Contact</th><th className="px-3 py-3 font-medium">Business</th><th className="px-3 py-3 font-medium">Details</th><th className="px-3 py-3 font-medium">Submitted</th><th className="px-3 py-3 font-medium">Status</th></tr></thead>
        <tbody>
          {leads.map((lead) => (
            <tr key={lead.id} className="border-b border-slate-800/80 align-top text-slate-300 last:border-0">
              <td className="px-3 py-3"><div className="font-medium text-white">{lead.fullName}</div><a className="flex items-center gap-1 text-cyan-300 hover:text-cyan-200" href={`mailto:${lead.email}`}><Mail className="h-3 w-3" />{lead.email}</a><a className="flex items-center gap-1 text-slate-400 hover:text-slate-200" href={`tel:${lead.phone}`}><Phone className="h-3 w-3" />{lead.phone}</a></td>
              <td className="px-3 py-3"><div>{lead.businessName}</div><div className="text-xs text-slate-500">{lead.numberOfPcs} PCs</div></td>
              <td className="max-w-xs px-3 py-3 text-slate-400">{lead.message ?? "Free trial registration"}</td>
              <td className="whitespace-nowrap px-3 py-3 text-slate-400">{new Date(lead.createdAt).toLocaleString()}</td>
              <td className="px-3 py-3"><select aria-label={`Status for ${lead.fullName}`} value={lead.status} onChange={(event) => onStatusChange(lead.id, event.target.value)} className="rounded-lg border border-slate-700 bg-slate-950 px-2 py-1.5 text-xs text-slate-200">{statuses.map((status) => <option key={status} value={status}>{statusLabel(status)}</option>)}</select></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function LeadsPage() {
  const [search, setSearch] = useState("");
  const [trialFilter, setTrialFilter] = useState("all");
  const [salesFilter, setSalesFilter] = useState("all");
  const trialsQuery = trpc.leads.listTrialRegistrations.useQuery();
  const salesQuery = trpc.leads.listSalesInquiries.useQuery();
  const utils = trpc.useUtils();
  const updateTrial = trpc.leads.updateTrialRegistrationStatus.useMutation({ onSuccess: () => { toast.success("Trial status updated"); void utils.leads.listTrialRegistrations.invalidate(); }, onError: (error) => toast.error(error.message) });
  const updateSales = trpc.leads.updateSalesInquiryStatus.useMutation({ onSuccess: () => { toast.success("Inquiry status updated"); void utils.leads.listSalesInquiries.invalidate(); }, onError: (error) => toast.error(error.message) });

  const filterLeads = (leads: Lead[], status: string) => leads.filter((lead) => {
    const haystack = `${lead.fullName} ${lead.businessName} ${lead.email} ${lead.phone}`.toLowerCase();
    return (!search || haystack.includes(search.toLowerCase())) && (status === "all" || lead.status === status);
  });
  const trials = useMemo(() => filterLeads((trialsQuery.data ?? []) as Lead[], trialFilter), [trialsQuery.data, search, trialFilter]);
  const sales = useMemo(() => filterLeads((salesQuery.data ?? []) as Lead[], salesFilter), [salesQuery.data, search, salesFilter]);

  return (
    <AdminShell title="Leads" description="Review and follow up on free trial registrations and sales inquiries">
      <div className="space-y-6">
        <div className="grid gap-4 md:grid-cols-2"><Card className="border-cyan-500/20 bg-slate-900/80 text-slate-100"><CardContent className="p-5"><p className="text-sm text-slate-400">Free trials</p><p className="mt-1 text-3xl font-semibold">{trialsQuery.data?.length ?? 0}</p></CardContent></Card><Card className="border-amber-500/20 bg-slate-900/80 text-slate-100"><CardContent className="p-5"><p className="text-sm text-slate-400">Sales inquiries</p><p className="mt-1 text-3xl font-semibold">{salesQuery.data?.length ?? 0}</p></CardContent></Card></div>
        <Card className="border-slate-800 bg-slate-900/80 text-slate-100"><CardHeader><CardTitle className="flex flex-col gap-3 text-base sm:flex-row sm:items-center sm:justify-between"><span>Lead inbox</span><div className="relative w-full sm:w-80"><Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-500" /><Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search name, business, email" className="border-slate-700 bg-slate-950 pl-9" /></div></CardTitle></CardHeader><CardContent>
          <Tabs defaultValue="trials"><TabsList className="mb-4 bg-slate-950"><TabsTrigger value="trials">Free Trials</TabsTrigger><TabsTrigger value="sales">Sales Inquiries</TabsTrigger></TabsList>
            <TabsContent value="trials"><div className="mb-4 flex justify-end"><select aria-label="Filter trial status" value={trialFilter} onChange={(event) => setTrialFilter(event.target.value)} className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-200"><option value="all">All statuses</option>{trialStatuses.map((status) => <option key={status} value={status}>{statusLabel(status)}</option>)}</select></div><LeadTable leads={trials} type="trial" onStatusChange={(id, status) => updateTrial.mutate({ id, status: status as typeof trialStatuses[number] })} /></TabsContent>
            <TabsContent value="sales"><div className="mb-4 flex justify-end"><select aria-label="Filter inquiry status" value={salesFilter} onChange={(event) => setSalesFilter(event.target.value)} className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-200"><option value="all">All statuses</option>{salesStatuses.map((status) => <option key={status} value={status}>{statusLabel(status)}</option>)}</select></div><LeadTable leads={sales} type="sales" onStatusChange={(id, status) => updateSales.mutate({ id, status: status as typeof salesStatuses[number] })} /></TabsContent>
          </Tabs>
        </CardContent></Card>
      </div>
    </AdminShell>
  );
}
