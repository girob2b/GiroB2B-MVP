export default function OnboardingLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-dvh bg-[radial-gradient(circle_at_top,rgba(10,92,92,0.10),transparent_45%),linear-gradient(180deg,#ffffff_0%,var(--brand-surface)_100%)] flex items-center justify-center px-5 py-12">
      {children}
    </div>
  );
}
