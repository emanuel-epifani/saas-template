import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuItem,
  SidebarRail,
} from "@/components/ui/sidebar";
import { Skeleton } from "@/components/ui/skeleton";

// Prerendered Suspense fallback for the real sidebar: reserves the same
// width so SidebarInset doesn't jump when the client sidebar streams in.
// Deterministic markup only — SidebarMenuSkeleton uses Math.random(),
// which would itself hydration-mismatch.
const groupRows = [3, 2, 1] as const;

export function AppSidebarSkeleton() {
  return (
    <Sidebar collapsible="icon" aria-hidden="true">
      <SidebarHeader>
        <div className="flex items-center gap-2 p-2">
          <Skeleton className="size-8 rounded-lg" />
          <Skeleton className="h-4 w-28" />
        </div>
      </SidebarHeader>
      <SidebarContent>
        {groupRows.map((rows, group) => (
          <SidebarGroup key={group}>
            <SidebarGroupContent>
              <SidebarMenu>
                {Array.from({ length: rows }, (_, i) => (
                  <SidebarMenuItem key={i}>
                    <div className="flex h-8 items-center gap-2 rounded-md px-2">
                      <Skeleton className="size-4 rounded-md" />
                      <Skeleton className="h-4 flex-1" />
                    </div>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}
      </SidebarContent>
      <SidebarFooter>
        <Skeleton className="size-8 rounded-full" />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}
