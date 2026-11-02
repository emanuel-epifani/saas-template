"use client";

import { UserButton } from "@daveyplate/better-auth-ui";
import { Radar } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

import type { NavTone } from "@/app/models";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuBadge,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
  useSidebar,
} from "@/components/ui/sidebar";
import { texts } from "@/texts";

import { navGroups } from "./nav-items";

const toneIconClasses = {
  primary: undefined,
  companies: "text-companies",
  jobs: "text-jobs",
} satisfies Record<NavTone, string | undefined>;

export function AppSidebar() {
  const pathname = usePathname();
  const { state } = useSidebar();

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" asChild>
              <Link href="/dashboard">
                <span className="bg-primary text-primary-foreground grid size-8 shrink-0 place-items-center rounded-lg">
                  <Radar className="size-4" />
                </span>
                <span className="font-heading truncate font-semibold group-data-[collapsible=icon]:hidden">
                  {texts.appName}
                </span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        {navGroups.map((group) => (
          <SidebarGroup key={group.label}>
            <SidebarGroupLabel>{group.label}</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {group.items.map((item) => (
                  <SidebarMenuItem key={item.href}>
                    <SidebarMenuButton
                      asChild
                      isActive={pathname.startsWith(item.href)}
                      tooltip={item.label}
                    >
                      <Link href={item.href}>
                        <item.icon
                          className={
                            toneIconClasses[item.tone ?? "primary"] ?? undefined
                          }
                        />
                        <span>{item.label}</span>
                      </Link>
                    </SidebarMenuButton>
                    {item.soon ? (
                      <SidebarMenuBadge>{texts.soonBadge}</SidebarMenuBadge>
                    ) : null}
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}
      </SidebarContent>
      <SidebarFooter>
        <UserButton
          size={state === "collapsed" ? "icon" : "default"}
          variant="ghost"
          align="start"
          classNames={{
            trigger: {
              base:
                state === "collapsed"
                  ? "mx-auto size-8 cursor-pointer p-0"
                  : "w-full cursor-pointer justify-start hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
            },
          }}
        />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}
