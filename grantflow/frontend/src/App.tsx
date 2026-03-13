import { Navigate, Outlet, Route, Routes } from "react-router-dom";
import { useAuth } from "./auth";
import Layout from "./components/Layout";
import AuthPage from "./pages/AuthPage";
import Dashboard from "./pages/Dashboard";
import EmailVerificationPage from "./pages/EmailVerificationPage";
import GrantCataloguePage from "./pages/GrantCataloguePage";
import GrantDetailPage from "./pages/GrantDetailPage";
import NotFound from "./pages/NotFound";
import ApplicantDashboardPage from "./pages/portal/ApplicantDashboardPage";
import ApplicationDetailPage from "./pages/portal/ApplicationDetailPage";
import ApplicationWizardPage from "./pages/portal/ApplicationWizardPage";
import ConversationalApplicationPage from "./pages/portal/ConversationalApplicationPage";
import DocumentVaultPage from "./pages/portal/DocumentVaultPage";
import OrgProfilePage from "./pages/portal/OrgProfilePage";

function ProtectedRoute() {
  const { isReady, token } = useAuth();
  if (!isReady) return null;
  return token ? <Outlet /> : <Navigate to="/login" replace />;
}

function App() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/grants" replace />} />
      <Route path="/login" element={<AuthPage />} />

      {/* Public routes — accessible with or without auth */}
      <Route path="/grants" element={<GrantCataloguePage />} />
      <Route path="/grants/:id" element={<GrantDetailPage />} />

      {/* Semi-protected: needs token but no Layout/Sidebar */}
      <Route element={<ProtectedRoute />}>
        <Route path="/verify-email" element={<EmailVerificationPage />} />
      </Route>

      {/* Protected routes with Sidebar layout */}
      <Route element={<ProtectedRoute />}>
        <Route element={<Layout />}>
          <Route path="dashboard" element={<Dashboard />} />

          {/* Applicant portal */}
          <Route path="portal" element={<ApplicantDashboardPage />} />
          <Route path="portal/profile" element={<OrgProfilePage />} />
          <Route path="portal/documents" element={<DocumentVaultPage />} />
          <Route path="portal/apply" element={<ApplicationWizardPage />} />
          <Route path="portal/apply/:id" element={<ApplicationWizardPage />} />
          <Route path="portal/apply/chat" element={<ConversationalApplicationPage />} />
          <Route path="portal/applications/:id" element={<ApplicationDetailPage />} />
        </Route>
      </Route>

      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}

export default App;
