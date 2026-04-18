import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslation } from "react-i18next";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { Coffee, Eye, EyeOff, Globe, LogIn, Shield, Zap } from "lucide-react";
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
  const { t } = useTranslation();
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

  const features = [
    { icon: Zap, key: "auth.features.realtime", descKey: "auth.features.realtimeDesc" },
    { icon: Shield, key: "auth.features.rbac", descKey: "auth.features.rbacDesc" },
    { icon: Globe, key: "auth.features.multi", descKey: "auth.features.multiDesc" },
  ];

  return (
    <div className="min-h-screen flex bg-background">
      {/* Left brand panel — flat gradient, no decorative blobs */}
      <div className="hidden lg:flex lg:w-5/12 xl:w-1/2 flex-col relative brand-gradient">
        <div className="relative z-10 flex flex-col justify-between h-full px-12 py-16">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white/15 rounded-lg flex items-center justify-center">
              <Coffee size={20} className="text-white" />
            </div>
            <span className="text-white text-xl font-bold tracking-tight">{t("app.name")}</span>
          </div>
          <div>
            <h2 className="text-white text-4xl font-bold leading-tight mb-4">{t("app.tagline")}</h2>
            <p className="text-white/80 text-base mb-10 max-w-sm">{t("auth.signInSubtitle")}</p>
            <div className="space-y-3">
              {features.map(({ icon: Icon, key, descKey }) => (
                <div key={key} className="flex items-center gap-4 bg-white/10 rounded-xl p-4">
                  <div className="w-9 h-9 bg-white/15 rounded-lg flex items-center justify-center flex-shrink-0">
                    <Icon size={16} className="text-white" />
                  </div>
                  <div>
                    <p className="text-white font-semibold text-sm">{t(key)}</p>
                    <p className="text-white/70 text-xs mt-0.5">{t(descKey)}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
          <p className="text-white/60 text-xs">© 2026 The Rue Coffee</p>
        </div>
      </div>

      {/* Right form */}
      <div className="flex-1 flex flex-col items-center justify-center px-4 py-8 sm:px-6 relative">
        <div className="absolute top-4 end-4 flex items-center gap-1">
          <ThemeToggle />
          <LanguageToggle />
        </div>

        <div className="flex lg:hidden items-center gap-3 mb-10">
          <div className="w-10 h-10 brand-gradient rounded-lg flex items-center justify-center shadow-lg">
            <Coffee size={18} className="text-white" />
          </div>
          <span className="text-xl font-bold">{t("app.name")}</span>
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
                      <Input type="email" autoComplete="email" placeholder="you@theruecoffee.com" {...field} />
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
                        <Input type={showPw ? "text" : "password"} autoComplete="current-password" placeholder="••••••••" {...field} />
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
          <p className="text-center text-xs text-muted-foreground mt-8">© 2026 Rue POS</p>
        </div>
      </div>
    </div>
  );
}
