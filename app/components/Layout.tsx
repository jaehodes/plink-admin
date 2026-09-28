import Header from './Header';
import Sidebar from './Sidebar';
import { getAdminName } from '../lib/auth-server';
import { getAppEnv } from '../lib/app-env';

interface LayoutProps {
  children: React.ReactNode;
}

export default async function Layout({ children }: LayoutProps) {
  const adminName = await getAdminName();

  return (
    <div className="min-h-screen bg-gray-50">
      <Header adminName={adminName} appEnv={getAppEnv()} />
      <div className="flex flex-col lg:flex-row">
        <Sidebar />
        <main className="flex-1 p-6 pb-20 lg:pb-6">
          {children}
        </main>
      </div>
    </div>
  );
}