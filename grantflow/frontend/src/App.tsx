import { Navigate, Route, Routes } from "react-router-dom";
import { AuthProvider, useAuth } from "./auth";
import Layout from "./components/Layout";
import AuthPage from "./pages/AuthPage";
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
          <Route path="dashboard" element={<ProtectedRoute />} />
          <Route path="*" element={<NotFound />} />
        </Route>
      </Routes>
    </AuthProvider>
  );
}

export default App;
