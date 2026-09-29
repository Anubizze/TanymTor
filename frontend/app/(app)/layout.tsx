import { AuthGuard } from "@/components/auth/AuthGuard";
import { DataProvider } from "@/components/data/DataProvider";
import { Sidebar } from "@/components/layout/Sidebar";
import { LocalDataNotice } from "@/components/data/LocalDataNotice";

export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AuthGuard>
      <DataProvider>
        <div className="app-backdrop min-h-screen">
          <Sidebar />
          <main className="ml-72 min-h-screen px-8 pb-14 pt-4">
            <div className="mx-auto max-w-[1400px]"><LocalDataNotice />{children}</div>
          </main>
        </div>
      </DataProvider>
    </AuthGuard>
  );
}
