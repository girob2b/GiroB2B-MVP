import GuestShell from "@/components/layout/guest-shell";

export default function PostarPublicLayout({ children }: { children: React.ReactNode }) {
  return <GuestShell>{children}</GuestShell>;
}
