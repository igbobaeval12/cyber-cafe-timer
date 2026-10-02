import { AdminShell } from "@/components/admin/AdminShell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const tiers = [
  { name: "Walk-in", value: "walk_in", notes: "Standard casual access" },
  { name: "Regular", value: "regular", notes: "Recurring customer benefits" },
  { name: "VIP", value: "vip", notes: "Priority treatment and perks" },
  { name: "Student", value: "student", notes: "Discounted student usage" },
  { name: "Corporate", value: "corporate", notes: "Team and billing account support" },
];

export default function MembershipManagementPage() {
  return (
    <AdminShell title="Membership Management" description="Track customer membership policies and perks">
      <div className="space-y-6">
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {tiers.map((tier) => (
            <Card key={tier.value} className="border-slate-800 bg-slate-900/80 text-slate-100">
              <CardHeader>
                <CardTitle className="flex items-center justify-between gap-2">
                  <span>{tier.name}</span>
                  <Badge className="bg-slate-700 text-slate-200">{tier.value}</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm text-slate-300">
                <p>{tier.notes}</p>
                <Button size="sm" variant="outline">Manage Tier</Button>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </AdminShell>
  );
}
