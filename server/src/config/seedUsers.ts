export interface SeedUserConfig {
  name: string;
  email: string;
  password: string;
  role: 'admin' | 'mern-dev' | 'php-dev' | 'common';
  avatar: string;
}

export const SEED_USERS: SeedUserConfig[] = [
  {
    name: 'Admin Lead',
    email: process.env.DEV_ADMIN_EMAIL || 'admin@team.com',
    password: process.env.DEV_ADMIN_PASSWORD || 'admin123',
    role: 'admin',
    avatar: 'https://api.dicebear.com/7.x/bottts/svg?seed=Admin',
  },
  {
    name: 'MERN Developer Alex',
    email: process.env.DEV_MERN_EMAIL || 'test_mern@team.com',
    password: process.env.DEV_MERN_PASSWORD || 'user1234',
    role: 'mern-dev',
    avatar: 'https://api.dicebear.com/7.x/bottts/svg?seed=MERN',
  },
  {
    name: 'PHP Developer Peter',
    email: process.env.DEV_PHP_EMAIL || 'peter_php@team.com',
    password: process.env.DEV_PHP_PASSWORD || 'password123',
    role: 'php-dev',
    avatar: 'https://api.dicebear.com/7.x/bottts/svg?seed=PHP',
  },
  {
    name: 'Common Member Sam',
    email: process.env.DEV_COMMON_EMAIL || 'alex_common@team.com',
    password: process.env.DEV_COMMON_PASSWORD || 'user1234',
    role: 'common',
    avatar: 'https://api.dicebear.com/7.x/bottts/svg?seed=Common',
  },
];
