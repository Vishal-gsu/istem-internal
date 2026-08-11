import AuthProvider from "@/components/AuthProvider";
import { Header } from "@/components/landing/Header";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AuthProvider>
      <div className="min-h-screen w-full overflow-x-hidden bg-background">
        <Header />
        <main className="pt-24 min-h-screen">
          {children}
        </main>
      </div>
    </AuthProvider>
  );
}
