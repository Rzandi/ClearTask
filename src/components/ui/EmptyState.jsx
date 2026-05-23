export default function EmptyState({ icon, title, description, action }) {
  return (
    <div className="empty-state animate-fade-in">
      {icon && <div className="empty-state__icon text-text-muted">{icon}</div>}
      {title && <h3 className="empty-state__title">{title}</h3>}
      {description && <p className="empty-state__desc">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
