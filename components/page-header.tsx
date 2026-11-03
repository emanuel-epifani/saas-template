export function PageHeader({
  title,
  description,
}: {
  title: string;
  description?: string;
}) {
  return (
    <div className="border-border flex flex-col gap-1 border-b pb-4">
      <h1 className="text-2xl font-semibold">{title}</h1>
      {description ? (
        <p className="text-muted-foreground text-sm">{description}</p>
      ) : null}
    </div>
  );
}
