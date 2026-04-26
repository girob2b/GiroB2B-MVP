import GuestShell from "@/components/layout/guest-shell";

export default function ExplorarLayout({ children }: { children: React.ReactNode }) {
  return <GuestShell>{children}</GuestShell>;
}
