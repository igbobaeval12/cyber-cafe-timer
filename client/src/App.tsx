import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { ThemeProvider } from "./contexts/ThemeContext";
import Home from "./pages/Home";
import PublicInfoPage from "./pages/PublicInfoPage";
import AdminDashboardPage from "./pages/admin/AdminDashboardPage";
import BillingPage from "./pages/admin/BillingPage";
import CustomerDetailsPage from "./pages/admin/CustomerDetailsPage";
import CustomerHistoryPage from "./pages/admin/CustomerHistoryPage";
import CustomerManagementPage from "./pages/admin/CustomerManagementPage";
import MembershipManagementPage from "./pages/admin/MembershipManagementPage";
import PcManagementPage from "./pages/admin/PcManagementPage";
import InventoryDashboardPage from "./pages/admin/InventoryDashboardPage";
import PosSalesPage from "./pages/admin/PosSalesPage";
import PrintingDashboardPage from "./pages/admin/PrintingDashboardPage";
import PrintHistoryPage from "./pages/admin/PrintHistoryPage";
import PrintJobDetailsPage from "./pages/admin/PrintJobDetailsPage";
import PrintQueuePage from "./pages/admin/PrintQueuePage";
import ReportsDashboardPage from "./pages/admin/ReportsDashboardPage";
import RevenueReportPage from "./pages/admin/RevenueReportPage";
import CustomerReportPage from "./pages/admin/CustomerReportPage";
import SessionReportPage from "./pages/admin/SessionReportPage";
import InventoryReportPage from "./pages/admin/InventoryReportPage";
import PrintingReportPage from "./pages/admin/PrintingReportPage";
import StaffReportPage from "./pages/admin/StaffReportPage";
import SessionsPage from "./pages/admin/SessionsPage";
import StaffManagementPage from "./pages/admin/staff/StaffManagementPage";
import RoleManagementPage from "./pages/admin/staff/RoleManagementPage";
import LoginHistoryPage from "./pages/admin/staff/LoginHistoryPage";
import ActivityLogPage from "./pages/admin/staff/ActivityLogPage";
import SettingsDashboardPage from "./pages/admin/settings/SettingsDashboardPage";
import GeneralSettingsPage from "./pages/admin/settings/GeneralSettingsPage";
import PricingSettingsPage from "./pages/admin/settings/PricingSettingsPage";
import NotificationSettingsPage from "./pages/admin/settings/NotificationSettingsPage";
import BackupSettingsPage from "./pages/admin/settings/BackupSettingsPage";
import SecuritySettingsPage from "./pages/admin/settings/SecuritySettingsPage";
import ReceiptSettingsPage from "./pages/admin/settings/ReceiptSettingsPage";
import LogsSettingsPage from "./pages/admin/settings/LogsSettingsPage";
import PcSettingsPage from "./pages/admin/settings/PcSettingsPage";
import ClientTimer from "./pages/ClientTimer";
import LeadsPage from "./pages/admin/LeadsPage";

function Router() {
  // make sure to consider if you need authentication for certain routes
  return (
    <Switch>
      <Route path={"/"} component={Home} />
      <Route path={"/features"}>{() => <PublicInfoPage page="features" />}</Route>
      <Route path={"/pricing"}>{() => <PublicInfoPage page="pricing" />}</Route>
      <Route path={"/security"}>{() => <PublicInfoPage page="security" />}</Route>
      <Route path={"/about"}>{() => <PublicInfoPage page="about" />}</Route>
      <Route path={"/blog"}>{() => <PublicInfoPage page="blog" />}</Route>
      <Route path={"/contact"}>{() => <PublicInfoPage page="contact" />}</Route>
      <Route path={"/documentation"}>{() => <PublicInfoPage page="documentation" />}</Route>
      <Route path={"/api"}>{() => <PublicInfoPage page="api" />}</Route>
      <Route path={"/support"}>{() => <PublicInfoPage page="support" />}</Route>
      <Route path={"/privacy"}>{() => <PublicInfoPage page="privacy" />}</Route>
      <Route path={"/terms"}>{() => <PublicInfoPage page="terms" />}</Route>
      <Route path={"/license"}>{() => <PublicInfoPage page="license" />}</Route>
      <Route path={"/admin"}>{() => <ProtectedRoute requiredPermission="manage_pcs"><AdminDashboardPage /></ProtectedRoute>}</Route>
      <Route path={"/admin/leads"}>{() => <ProtectedRoute requiredRole="admin"><LeadsPage /></ProtectedRoute>}</Route>
      <Route path={"/admin/pcs"}>{() => <ProtectedRoute requiredPermission="manage_pcs"><PcManagementPage /></ProtectedRoute>}</Route>
      <Route path={"/admin/sessions"}>{() => <ProtectedRoute requiredPermission="manage_sessions"><SessionsPage /></ProtectedRoute>}</Route>
      <Route path={"/admin/billing"}>{() => <ProtectedRoute requiredPermission="manage_billing"><BillingPage /></ProtectedRoute>}</Route>
      <Route path={"/admin/printing"}>{() => <ProtectedRoute requiredPermission="manage_printing"><PrintingDashboardPage /></ProtectedRoute>}</Route>
      <Route path={"/admin/printing/queue"}>{() => <ProtectedRoute requiredPermission="manage_printing"><PrintQueuePage /></ProtectedRoute>}</Route>
      <Route path={"/admin/printing/history"}>{() => <ProtectedRoute requiredPermission="manage_printing"><PrintHistoryPage /></ProtectedRoute>}</Route>
      <Route path={"/admin/printing/:id"}>{() => <ProtectedRoute requiredPermission="manage_printing"><PrintJobDetailsPage /></ProtectedRoute>}</Route>
      <Route path={"/admin/reports"}>{() => <ProtectedRoute requiredPermission="view_reports"><ReportsDashboardPage /></ProtectedRoute>}</Route>
      <Route path={"/admin/reports/revenue"}>{() => <ProtectedRoute requiredPermission="view_reports"><RevenueReportPage /></ProtectedRoute>}</Route>
      <Route path={"/admin/reports/customers"}>{() => <ProtectedRoute requiredPermission="view_reports"><CustomerReportPage /></ProtectedRoute>}</Route>
      <Route path={"/admin/reports/sessions"}>{() => <ProtectedRoute requiredPermission="view_reports"><SessionReportPage /></ProtectedRoute>}</Route>
      <Route path={"/admin/reports/inventory"}>{() => <ProtectedRoute requiredPermission="view_reports"><InventoryReportPage /></ProtectedRoute>}</Route>
      <Route path={"/admin/reports/printing"}>{() => <ProtectedRoute requiredPermission="view_reports"><PrintingReportPage /></ProtectedRoute>}</Route>
      <Route path={"/admin/reports/staff"}>{() => <ProtectedRoute requiredPermission="view_reports"><StaffReportPage /></ProtectedRoute>}</Route>
      <Route path={"/admin/inventory"}>{() => <ProtectedRoute requiredPermission="manage_inventory"><InventoryDashboardPage /></ProtectedRoute>}</Route>
      <Route path={"/admin/pos"}>{() => <ProtectedRoute requiredPermission="manage_pos"><PosSalesPage /></ProtectedRoute>}</Route>
      <Route path={"/admin/customers"}>{() => <ProtectedRoute requiredPermission="manage_customers"><CustomerManagementPage /></ProtectedRoute>}</Route>
      <Route path={"/admin/customers/:id"}>{() => <ProtectedRoute requiredPermission="manage_customers"><CustomerDetailsPage /></ProtectedRoute>}</Route>
      <Route path={"/admin/customers/:id/history"}>{() => <ProtectedRoute requiredPermission="manage_customers"><CustomerHistoryPage /></ProtectedRoute>}</Route>
      <Route path={"/admin/customers/membership"}>{() => <ProtectedRoute requiredPermission="manage_customers"><MembershipManagementPage /></ProtectedRoute>}</Route>
      <Route path={"/admin/staff"}>{() => <ProtectedRoute requiredRole="admin"><StaffManagementPage /></ProtectedRoute>}</Route>
      <Route path={"/admin/staff/roles"}>{() => <ProtectedRoute requiredRole="admin"><RoleManagementPage /></ProtectedRoute>}</Route>
      <Route path={"/admin/staff/history"}>{() => <ProtectedRoute requiredRole="admin"><LoginHistoryPage /></ProtectedRoute>}</Route>
      <Route path={"/admin/staff/activity"}>{() => <ProtectedRoute requiredRole="admin"><ActivityLogPage /></ProtectedRoute>}</Route>
      <Route path={"/admin/settings"}>{() => <ProtectedRoute requiredRole="admin"><SettingsDashboardPage /></ProtectedRoute>}</Route>
      <Route path={"/admin/settings/general"}>{() => <ProtectedRoute requiredRole="admin"><GeneralSettingsPage /></ProtectedRoute>}</Route>
      <Route path={"/admin/settings/pricing"}>{() => <ProtectedRoute requiredRole="admin"><PricingSettingsPage /></ProtectedRoute>}</Route>
      <Route path={"/admin/settings/notifications"}>{() => <ProtectedRoute requiredRole="admin"><NotificationSettingsPage /></ProtectedRoute>}</Route>
      <Route path={"/admin/settings/backup"}>{() => <ProtectedRoute requiredRole="admin"><BackupSettingsPage /></ProtectedRoute>}</Route>
      <Route path={"/admin/settings/security"}>{() => <ProtectedRoute requiredRole="admin"><SecuritySettingsPage /></ProtectedRoute>}</Route>
      <Route path={"/admin/settings/receipt"}>{() => <ProtectedRoute requiredRole="admin"><ReceiptSettingsPage /></ProtectedRoute>}</Route>
      <Route path={"/admin/settings/logs"}>{() => <ProtectedRoute requiredRole="admin"><LogsSettingsPage /></ProtectedRoute>}</Route>
      <Route path={"/admin/settings/pc"}>{() => <ProtectedRoute requiredRole="admin"><PcSettingsPage /></ProtectedRoute>}</Route>
      <Route path={"/client"}>{() => <ProtectedRoute requiredRole="user"><ClientTimer /></ProtectedRoute>}</Route>
      <Route path={"/404"} component={NotFound} />
      {/* Final fallback route */}
      <Route component={NotFound} />
    </Switch>
  );
}

// NOTE: About Theme
// - First choose a default theme according to your design style (dark or light bg), than change color palette in index.css
//   to keep consistent foreground/background color across components
// - If you want to make theme switchable, pass `switchable` ThemeProvider and use `useTheme` hook

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider
        defaultTheme="light"
        // switchable
      >
        <TooltipProvider>
          <Toaster />
          <Router />
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
