import Navbar from "@/components/Navbar";

export default function MarketsLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Navbar />
      {children}
    </>
  );
}
