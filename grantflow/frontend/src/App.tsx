import { Navigate, Route, Routes } from "react-router-dom";
import { AuthProvider, useAuth } from "./auth";
import Layout from "./components/Layout";
import AuthPage from "./pages/AuthPage";
import ChatIntakePage from "./pages/ChatIntakePage";
import Dashboard from "./pages/Dashboard";
import NotFound from "./pages/NotFound";

function ProtectedRoute() {
  const { isReady, token } = useAuth();

  if (!isReady) {
    return null;
  }

  return token ? <Dashboard /> : <Navigate to="/" replace />;
}

function App() {
  return (
    <AuthProvider>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<AuthPage />} />
          <Route path="grants/chat" element={<ChatIntakePage />} />
          <Route path="dashboard" element={<ProtectedRoute />} />
          <Route path="*" element={<NotFound />} />
        </Route>
      </Routes>
    </AuthProvider>
  );
}

export default App;
