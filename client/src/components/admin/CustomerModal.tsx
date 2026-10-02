import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface CustomerModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  errorMessage?: string | null;
  initialValues?: {
    id?: number;
    name?: string;
    username?: string;
    password?: string;
    phoneNumber?: string;
    email?: string;
    membershipTier?: string;
    customerStatus?: string;
    notes?: string;
    loyaltyPoints?: number;
    prepaidBalance?: number;
  } | null;
  onSubmit: (payload: {
    name: string;
    username?: string;
    password?: string;
    phoneNumber: string;
    email: string;
    membershipTier: string;
    customerStatus: string;
    notes: string;
    loyaltyPoints: number;
    prepaidBalance: number;
  }) => void;
}

const membershipOptions = ["walk_in", "regular", "vip", "student", "corporate"];
const statusOptions = ["active", "inactive", "blacklisted"];

export function CustomerModal({ open, onOpenChange, errorMessage, initialValues, onSubmit }: CustomerModalProps) {
  const [name, setName] = useState(initialValues?.name ?? "");
  const [username, setUsername] = useState(initialValues?.username ?? "");
  const [password, setPassword] = useState(initialValues?.password ?? "");
  const [phoneNumber, setPhoneNumber] = useState(initialValues?.phoneNumber ?? "");
  const [email, setEmail] = useState(initialValues?.email ?? "");
  const [membershipTier, setMembershipTier] = useState(initialValues?.membershipTier ?? "walk_in");
  const [customerStatus, setCustomerStatus] = useState(initialValues?.customerStatus ?? "active");
  const [notes, setNotes] = useState(initialValues?.notes ?? "");
  const [loyaltyPoints, setLoyaltyPoints] = useState(initialValues?.loyaltyPoints ?? 0);
  const [prepaidBalance, setPrepaidBalance] = useState(initialValues?.prepaidBalance ?? 0);

  useEffect(() => {
    setName(initialValues?.name ?? "");
    setUsername(initialValues?.username ?? "");
    setPassword(initialValues?.password ?? "");
    setPhoneNumber(initialValues?.phoneNumber ?? "");
    setEmail(initialValues?.email ?? "");
    setMembershipTier(initialValues?.membershipTier ?? "walk_in");
    setCustomerStatus(initialValues?.customerStatus ?? "active");
    setNotes(initialValues?.notes ?? "");
    setLoyaltyPoints(initialValues?.loyaltyPoints ?? 0);
    setPrepaidBalance(initialValues?.prepaidBalance ?? 0);
  }, [initialValues, open]);

  const handleSubmit = () => {
    onSubmit({
      name,
      username: initialValues ? undefined : username,
      password: initialValues ? undefined : password,
      phoneNumber,
      email,
      membershipTier,
      customerStatus,
      notes,
      loyaltyPoints: Number(loyaltyPoints || 0),
      prepaidBalance: Number(prepaidBalance || 0),
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl border-slate-800 bg-slate-900 text-slate-100">
        <DialogHeader>
          <DialogTitle>{initialValues ? "Edit Customer" : "Add Customer"}</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label>Full Name</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} className="border-slate-700 bg-slate-950" />
          </div>
          {!initialValues && (
            <>
              <div className="space-y-2">
                <Label>Username</Label>
                <Input value={username} onChange={(e) => setUsername(e.target.value)} className="border-slate-700 bg-slate-950" />
              </div>
              <div className="space-y-2">
                <Label>Password</Label>
                <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="border-slate-700 bg-slate-950" />
              </div>
            </>
          )}
          <div className="space-y-2">
            <Label>Phone Number</Label>
            <Input value={phoneNumber} onChange={(e) => setPhoneNumber(e.target.value)} className="border-slate-700 bg-slate-950" />
          </div>
          <div className="space-y-2">
            <Label>Email</Label>
            <Input value={email} onChange={(e) => setEmail(e.target.value)} className="border-slate-700 bg-slate-950" />
          </div>
          <div className="space-y-2">
            <Label>Membership Type</Label>
            <select value={membershipTier} onChange={(e) => setMembershipTier(e.target.value)} className="w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100">
              {membershipOptions.map((option) => <option key={option} value={option}>{option}</option>)}
            </select>
          </div>
          <div className="space-y-2">
            <Label>Status</Label>
            <select value={customerStatus} onChange={(e) => setCustomerStatus(e.target.value)} className="w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100">
              {statusOptions.map((option) => <option key={option} value={option}>{option}</option>)}
            </select>
          </div>
          <div className="space-y-2">
            <Label>Loyalty Points</Label>
            <Input type="number" value={loyaltyPoints} onChange={(e) => setLoyaltyPoints(Number(e.target.value))} className="border-slate-700 bg-slate-950" />
          </div>
          <div className="space-y-2">
            <Label>Prepaid Balance</Label>
            <Input type="number" value={prepaidBalance} onChange={(e) => setPrepaidBalance(Number(e.target.value))} className="border-slate-700 bg-slate-950" />
          </div>
          <div className="space-y-2 md:col-span-2">
            <Label>Notes</Label>
            <Input value={notes} onChange={(e) => setNotes(e.target.value)} className="border-slate-700 bg-slate-950" />
          </div>
        </div>
        {errorMessage && <p className="text-sm text-red-400" role="alert">{errorMessage}</p>}
        <div className="mt-6 flex justify-end gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleSubmit} className="bg-cyan-500 text-slate-950 hover:bg-cyan-400">Save</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
