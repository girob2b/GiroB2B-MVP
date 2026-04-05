export default function OnboardingLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-dvh bg-[radial-gradient(circle_at_top,_rgba(18,199,104,0.10),_transparent_45%),linear-gradient(180deg,_#ffffff_0%,_var(--brand-green-50)_100%)] flex items-center justify-center px-5 py-12">
      {children}
    </div>
  );
}
