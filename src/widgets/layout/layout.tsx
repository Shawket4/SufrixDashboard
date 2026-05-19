import { useState } from "react";
import { Outlet } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Sidebar } from "@/widgets/sidebar/sidebar";
import { Header } from "@/widgets/header/header";
import { CommandPalette } from "@/widgets/command-palette/command-palette";

export function Layout() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const { t } = useTranslation();

  return (
    <div className="flex h-screen bg-background overflow-hidden safe-top safe-bottom">
      <Sidebar mobileOpen={mobileOpen} onMobileClose={() => setMobileOpen(false)} />
      <div className="flex-1 flex flex-col overflow-hidden min-w-0">
        <Header
          onMenuClick={() => setMobileOpen(true)}
          onSearchClick={() =>
            document.dispatchEvent(new KeyboardEvent("keydown", { key: "k", metaKey: true, bubbles: true }))
          }
        />
        <main className="flex-1 overflow-y-auto overflow-x-hidden flex flex-col justify-between">
          <div className="flex-1">
            <Outlet />
          </div>
          <footer className="py-4 px-6 text-center text-xs text-muted-foreground border-t bg-muted/5 select-none shrink-0">
            {t("common.copyright", { year: new Date().getFullYear() })}
          </footer>
        </main>
      </div>
      <CommandPalette />
    </div>
  );
}
