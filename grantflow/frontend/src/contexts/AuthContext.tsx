import { createContext, useContext, useState, ReactNode } from 'react';
import type { UserRole } from '../types/roles';

interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
}

interface AuthContextType {
  user: AuthUser | null;
  setUser: (user: AuthUser | null) => void;
  isRole: (...roles: UserRole[]) => boolean;
}

const AuthContext = createContext<AuthContextType | null>(null);

// Mock user — replace with your real auth logic / API call
const MOCK_USER: AuthUser = {
  id: '1',
  name: 'Priya Sharma',
  email: 'priya@grantflow.in',
  role: 'program_officer',
};

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(MOCK_USER);

  const isRole = (...roles: UserRole[]) =>
    user ? roles.includes(user.role) : false;

  return (
    <AuthContext.Provider value={{ user, setUser, isRole }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}