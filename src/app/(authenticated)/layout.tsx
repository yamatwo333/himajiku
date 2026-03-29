import BottomNav from "@/components/BottomNav";

export default function AuthenticatedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="pb-16">
      {children}
      <BottomNav />
    </div>
  );
}
