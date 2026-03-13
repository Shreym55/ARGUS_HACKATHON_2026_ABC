import { Navigate } from "react-router-dom";
import { useAuth } from "../auth";

export default function EmailVerificationPage() {
  const { token } = useAuth();

  if (!token) {
    return <Navigate to="/login" replace />;
  }

  return <Navigate to="/portal" replace />;
}
