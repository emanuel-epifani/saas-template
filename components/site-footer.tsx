import { texts } from "@/texts";

export function SiteFooter() {
  return (
    <footer className="text-muted-foreground border-t py-6 text-sm">
      <div className="mx-auto max-w-5xl px-4 text-center">
        {texts.footerNote}
      </div>
    </footer>
  );
}
