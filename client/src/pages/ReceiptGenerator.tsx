import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Printer, Download, X } from 'lucide-react';
import { formatCurrency } from '@/lib/currency';
import { useSettings } from '@/hooks/useSettings';

interface ReceiptData {
  receiptNumber: string;
  pcName: string;
  startTime: Date;
  endTime: Date;
  durationMinutes: number;
  hourlyRate: number;
  sessionCost: number;
  printCost: number;
  totalCost: number;
  paymentMethod: string;
  customerName?: string;
}

export default function ReceiptGenerator() {
  const [showPreview, setShowPreview] = useState(false);
  const [receipt] = useState<ReceiptData>({
    receiptNumber: 'RCP-20260404-001',
    pcName: 'PC-01',
    startTime: new Date('2026-04-04 10:00:00'),
    endTime: new Date('2026-04-04 11:30:00'),
    durationMinutes: 90,
    hourlyRate: 3.00,
    sessionCost: 4.50,
    printCost: 0.50,
    totalCost: 5.00,
    paymentMethod: 'cash',
    customerName: 'John Doe',
  });
  const settingsQuery = useSettings();

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadPDF = () => {
    const html = `<!doctype html><html><head><meta charset="utf-8"><title>Receipt ${receipt.receiptNumber}</title><style>body{font-family:Arial,sans-serif;margin:24px;color:#111} .row{display:flex;justify-content:space-between;margin:6px 0}</style></head><body><h1>Cyber Café Receipt</h1><div class="row"><span>Receipt #</span><strong>${receipt.receiptNumber}</strong></div><div class="row"><span>Date</span><span>${new Date(receipt.startTime).toLocaleString()}</span></div><div class="row"><span>PC</span><span>${receipt.pcName}</span></div><div class="row"><span>Duration</span><span>${receipt.durationMinutes} minutes</span></div><div class="row"><span>Session Cost</span><span>${formatCurrency(receipt.sessionCost)}</span></div><div class="row"><span>Print Cost</span><span>${formatCurrency(receipt.printCost)}</span></div><div class="row"><strong>Total</strong><strong>${formatCurrency(receipt.totalCost)}</strong></div></body></html>`;
    const blob = new Blob([html], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `receipt-${receipt.receiptNumber}.html`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleString();
  };

  const ReceiptContent = () => (
    <div className="bg-white p-8 max-w-md mx-auto font-mono text-sm">
      <div className="text-center mb-6 border-b-2 border-black pb-4">
        <h1 className="text-2xl font-bold">CYBER CAFÉ</h1>
        <p className="text-xs mt-1">Session Receipt</p>
      </div>

      <div className="mb-4 space-y-1">
        <div className="flex justify-between">
          <span>Receipt #:</span>
          <span className="font-bold">{receipt.receiptNumber}</span>
        </div>
        <div className="flex justify-between">
          <span>Date:</span>
          <span>{formatDate(receipt.startTime).split(',')[0]}</span>
        </div>
      </div>

      <div className="mb-4 border-t border-b border-dashed py-3 space-y-1">
        <div className="flex justify-between">
          <span>PC:</span>
          <span className="font-bold">{receipt.pcName}</span>
        </div>
        <div className="flex justify-between text-xs">
          <span>Start:</span>
          <span>{formatDate(receipt.startTime).split(',')[1]}</span>
        </div>
        <div className="flex justify-between text-xs">
          <span>End:</span>
          <span>{formatDate(receipt.endTime).split(',')[1]}</span>
        </div>
        <div className="flex justify-between">
          <span>Duration:</span>
          <span>{receipt.durationMinutes} minutes</span>
        </div>
      </div>

        <div className="mb-4 space-y-2">
        <div className="flex justify-between">
          <span>Hourly Rate:</span>
          <span>{formatCurrency(receipt.hourlyRate, settingsQuery?.data?.general?.currency)}/hr</span>
        </div>
        <div className="flex justify-between">
          <span>Session Cost:</span>
          <span>{formatCurrency(receipt.sessionCost, settingsQuery?.data?.general?.currency)}</span>
        </div>
        {receipt.printCost > 0 && (
          <div className="flex justify-between">
            <span>Print Cost:</span>
            <span>{formatCurrency(receipt.printCost, settingsQuery?.data?.general?.currency)}</span>
          </div>
        )}
      </div>

        <div className="mb-4 border-t-2 border-black pt-3">
        <div className="flex justify-between text-lg font-bold">
          <span>TOTAL:</span>
          <span>{formatCurrency(receipt.totalCost, settingsQuery?.data?.general?.currency)}</span>
        </div>
      </div>

      <div className="mb-4 text-center">
        <p className="text-xs">Payment: <span className="font-bold capitalize">{receipt.paymentMethod}</span></p>
      </div>

      <div className="text-center border-t-2 border-black pt-4 space-y-1">
        <p className="text-xs">Thank you for your business!</p>
        <p className="text-xs">Please visit us again</p>
        <p className="text-xs mt-2">Session ID: {receipt.receiptNumber}</p>
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-slate-900">Receipt Generator</h2>
        <p className="text-slate-600 mt-1">Generate and manage session receipts</p>
      </div>

      {!showPreview ? (
        <Card className="border-0 shadow-lg">
          <CardHeader>
            <CardTitle>Recent Sessions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-center justify-between p-4 border border-slate-200 rounded-lg hover:bg-slate-50">
                <div>
                  <p className="font-semibold text-slate-900">{receipt.receiptNumber}</p>
                  <p className="text-sm text-slate-600">{receipt.pcName} • {receipt.durationMinutes} min</p>
                </div>
                <div className="text-right mr-4">
                  <p className="font-bold text-slate-900">{formatCurrency(receipt.totalCost)}</p>
                  <p className="text-xs text-slate-600">{formatDate(receipt.startTime)}</p>
                </div>
                <Button
                  size="sm"
                  onClick={() => setShowPreview(true)}
                  className="gap-2"
                >
                  <Printer className="w-4 h-4" />
                  Print
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card className="border-0 shadow-lg">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Receipt Preview</CardTitle>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setShowPreview(false)}
            >
              <X className="w-4 h-4" />
            </Button>
          </CardHeader>
          <CardContent className="space-y-6">
            <ReceiptContent />

            <div className="flex gap-2 justify-center pt-4 border-t">
              <Button onClick={handlePrint} className="gap-2">
                <Printer className="w-4 h-4" />
                Print Receipt
              </Button>
              <Button onClick={handleDownloadPDF} variant="outline" className="gap-2">
                <Download className="w-4 h-4" />
                Save Receipt
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <style>{`
        @media print {
          body {
            margin: 0;
            padding: 0;
          }
          .no-print {
            display: none !important;
          }
        }
      `}</style>
    </div>
  );
}
