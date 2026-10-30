import { texts } from "@/texts";

export function SiteFooter() {
  return (
    <footer className="text-muted-foreground border-t py-6 text-center text-sm">
      {texts.footerNote}
    </footer>
  );
}
