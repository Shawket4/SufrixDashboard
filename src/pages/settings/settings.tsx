import { useTranslation } from "react-i18next";
import { useTheme } from "next-themes";
import { Languages, Moon, Sun, Monitor } from "lucide-react";
import { PageShell } from "@/shared/ui/page-shell";
import { Card, CardContent } from "@/shared/ui/card";
import { Button } from "@/shared/ui/button";
import { Avatar, AvatarFallback } from "@/shared/ui/avatar";
import { Badge } from "@/shared/ui/badge";
import { useCurrentContext } from "@/shared/hooks/use-current-context";
import { useAppStore } from "@/shared/auth/app-store";
import { initials } from "@/shared/lib/format";

export default function Settings() {
  const { t, i18n } = useTranslation();
  const { theme, setTheme } = useTheme();
  const { user, role } = useCurrentContext();
  const setLang = useAppStore((s) => s.setLanguage);

  return (
    <PageShell title={t("nav.settings")}>
      <div className="space-y-4">
        {user && (
          <Card>
            <CardContent className="p-5 flex items-center gap-4">
              <Avatar className="h-12 w-12">
                <AvatarFallback className="text-base">
                  {initials(user.name)}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <p className="font-bold">{user.name}</p>
                <p className="text-xs text-muted-foreground truncate">
                  {user.email}
                </p>
              </div>
              {role && <Badge variant="info">{t(`roles.${role}`)}</Badge>}
            </CardContent>
          </Card>
        )}

        <Card>
          <CardContent className="p-5 space-y-3">
            <div>
              <p className="text-sm font-bold">{t("nav.appearance")}</p>
              <p className="text-xs text-muted-foreground">Theme</p>
            </div>
            <div className="grid grid-cols-3 gap-2">
              <Button
                variant={theme === "light" ? "default" : "outline"}
                onClick={() => setTheme("light")}
              >
                <Sun /> {t("theme.light")}
              </Button>
              <Button
                variant={theme === "dark" ? "default" : "outline"}
                onClick={() => setTheme("dark")}
              >
                <Moon /> {t("theme.dark")}
              </Button>
              <Button
                variant={theme === "system" ? "default" : "outline"}
                onClick={() => setTheme("system")}
              >
                <Monitor /> {t("theme.system")}
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-5 space-y-3">
            <div>
              <p className="text-sm font-bold">{t("nav.language")}</p>
              <p className="text-xs text-muted-foreground">
                Current:{" "}
                {i18n.resolvedLanguage === "ar" ? "العربية" : "English"}
              </p>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <Button
                variant={i18n.resolvedLanguage === "en" ? "default" : "outline"}
                onClick={() => setLang("en")}
              >
                <Languages /> English
              </Button>
              <Button
                variant={i18n.resolvedLanguage === "ar" ? "default" : "outline"}
                onClick={() => setLang("ar")}
              >
                <Languages /> العربية
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-5 flex items-center gap-3">
            <div className="w-10 h-10 brand-gradient rounded-lg flex items-center justify-center">
              <img src="Icon.svg" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-bold">{t("app.name")}</p>
              <p className="text-xs text-muted-foreground">© 2026 Sufrix</p>
            </div>
            <Badge variant="outline">v1.0.0</Badge>
          </CardContent>
        </Card>
      </div>
    </PageShell>
  );
}
