// Shared outer shell for every standalone status/auth screen (login, apply,
// reset-password, and the various "not found" pages): a narrow card centered
// in the viewport. The card's own contents differ per page, so only this
// wrapper - identical everywhere it was used - is factored out.
export function CenteredCard({ children }: { children: React.ReactNode }) {
  return (
    <div className="rq-center-card">
      <div className="rq-container-narrow">{children}</div>
    </div>
  );
}
