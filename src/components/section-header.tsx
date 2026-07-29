export default function PageHeader({
  eyebrow,
  title,
  lead,
  children,
}: {
  eyebrow: string;
  title: string;
  lead: string;
  children?: React.ReactNode;
}) {
  return (
    <header className="aq-page-head">
      <div>
        <p className="aq-eyebrow">{eyebrow}</p>
        <h1 className="aq-title">{title}</h1>
        <p className="aq-lead">{lead}</p>
      </div>
      {children ? <div className="aq-head-actions">{children}</div> : null}
    </header>
  );
}
