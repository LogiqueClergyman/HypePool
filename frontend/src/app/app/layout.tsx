import AppNav from "@/components/app/AppNav";
import { WalletProvider } from "@/contexts/WalletContext";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <WalletProvider>
      <div className="min-h-screen" style={{ background: "#080808" }}>
        <AppNav />
        <main className="pt-14">{children}</main>
      </div>
    </WalletProvider>
  );
}
