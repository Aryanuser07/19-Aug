import { UserRole } from '../store/useAuthStore';
import { Shield, Zap, Users, Code, LucideIcon } from 'lucide-react';

export interface DevSeedUser {
  label: string;
  email: string;
  password: string;
  role: UserRole;
  icon: LucideIcon;
  color: string;
}

export const devSeedUsers: DevSeedUser[] = [
  {
    label: 'Admin Lead',
    email: 'admin@team.com',
    password: 'admin123',
    role: 'admin',
    icon: Shield,
    color: 'text-purple-400 border-purple-500/30 bg-purple-500/10',
  },
  {
    label: 'MERN Dev',
    email: 'test_mern@team.com',
    password: 'user1234',
    role: 'mern-dev',
    icon: Code,
    color: 'text-emerald-400 border-emerald-500/30 bg-emerald-500/10',
  },
  {
    label: 'PHP Dev',
    email: 'peter_php@team.com',
    password: 'password123',
    role: 'php-dev',
    icon: Zap,
    color: 'text-amber-400 border-amber-500/30 bg-amber-500/10',
  },
  {
    label: 'Common User',
    email: 'alex_common@team.com',
    password: 'user1234',
    role: 'common',
    icon: Users,
    color: 'text-blue-400 border-blue-500/30 bg-blue-500/10',
  },
];
