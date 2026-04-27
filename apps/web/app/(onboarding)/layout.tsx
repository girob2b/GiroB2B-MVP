export default function OnboardingLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-dvh bg-surface flex items-center justify-center px-5 py-12">
      {children}
    </div>
  );
}
