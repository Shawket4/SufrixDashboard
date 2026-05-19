import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslation } from "react-i18next";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { Eye, EyeOff, LogIn } from "lucide-react";
import { Button } from "@/shared/ui/button";
import { Input } from "@/shared/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/shared/ui/form";
import { authApi } from "@/entities/auth/api";
import { loginSchema, type LoginValues } from "@/entities/auth/schemas";
import { useAuthStore } from "@/shared/auth/store";
import { getErrorMessage } from "@/shared/api/errors";
import { ThemeToggle } from "@/widgets/theme-toggle/theme-toggle";
import { LanguageToggle } from "@/widgets/language-toggle/language-toggle";

export default function Login() {
  const { t, i18n } = useTranslation();
  const isAr = i18n.language === "ar";
  const navigate = useNavigate();
  const signIn = useAuthStore((s) => s.signIn);
  const [showPw, setShowPw] = useState(false);

  const form = useForm<LoginValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "" },
  });

  const { mutate, isPending } = useMutation({
    mutationFn: authApi.login,
    onSuccess: (data) => {
      signIn(data.token, data.user);
      navigate("/", { replace: true });
    },
    onError: (e) => toast.error(getErrorMessage(e)),
  });

  return (
    <div className="min-h-screen flex bg-background" dir="ltr">
      {/* Brand panel — flat cream */}
      <aside className="hidden lg:flex lg:w-1/2 xl:w-[55%] bg-[#FAF7F2]">
        <div className="flex flex-col justify-between w-full px-14 xl:px-20 py-14">
          <img
            src={isAr ? "/sufrix_ar.svg" : "/sufrix.svg"}
            alt={t("app.name")}
            className="h-10 w-auto select-none self-start"
            draggable={false}
          />

          <div className="space-y-4 max-w-md">
            <h1 className="text-[#0A2540] text-4xl xl:text-5xl font-bold tracking-tight leading-tight">
              {t("app.tagline")}
            </h1>
            <p className="text-[#0A2540]/60 text-base leading-relaxed">
              {t("auth.signInSubtitle")}
            </p>
          </div>

          <div className="flex items-center gap-2 text-[#0A2540]/50 text-xs">
            <span className="w-1.5 h-1.5 rounded-full bg-[#C25B3F]" />
            <span>{t("common.copyright", { year: new Date().getFullYear() })}</span>
          </div>
        </div>
      </aside>

      {/* Form panel */}
      <main className="flex-1 flex flex-col items-center justify-center px-4 py-8 sm:px-6 relative" dir={isAr ? "rtl" : "ltr"}>
        <div className="absolute top-4 end-4 flex items-center gap-1">
          <ThemeToggle />
          <LanguageToggle />
        </div>

        {/* Mobile-only icon mark */}
        <div className="flex lg:hidden mb-10">
          <img
            src="/Icon.svg"
            alt={t("app.name")}
            className="h-14 w-auto select-none"
            draggable={false}
          />
        </div>

        <div className="w-full max-w-sm">
          <div className="mb-8">
            <h1 className="text-2xl font-bold tracking-tight">{t("auth.welcome")}</h1>
            <p className="text-muted-foreground text-sm mt-1">{t("auth.signInSubtitle")}</p>
          </div>

          <Form {...form}>
            <form onSubmit={form.handleSubmit((v) => mutate(v))} className="space-y-4">
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("auth.email")}</FormLabel>
                    <FormControl>
                      <Input type="email" autoComplete="email" placeholder="you@sufrix.com" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("auth.password")}</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Input
                          type={showPw ? "text" : "password"}
                          autoComplete="current-password"
                          placeholder="••••••••"
                          {...field}
                        />
                        <button
                          type="button"
                          onClick={() => setShowPw((s) => !s)}
                          className="absolute end-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                          aria-label={showPw ? t("auth.hidePassword") : t("auth.showPassword")}
                        >
                          {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                        </button>
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button type="submit" loading={isPending} className="w-full h-11 text-base">
                <LogIn size={16} /> {t("auth.signIn")}
              </Button>
            </form>
          </Form>

          <p className="text-center text-xs text-muted-foreground mt-8">{t("common.copyright", { year: new Date().getFullYear() })}</p>
        </div>
      </main>
    </div>
  );
}