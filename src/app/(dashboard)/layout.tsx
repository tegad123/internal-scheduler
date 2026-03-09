import Providers from "@/components/providers";
import { Sidebar } from "@/components/layout/sidebar";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <Providers>
      <div className="flex min-h-screen">
        <Sidebar />
        <main className="ml-64 flex-1 overflow-y-auto p-6">{children}</main>
      </div>
    </Providers>
  );
}
