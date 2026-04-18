import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { type ColumnDef } from "@tanstack/react-table";
import { CheckCircle, Edit2, GitBranch, Plus, Shield, Trash2, Users as UsersIcon, XCircle } from "lucide-react";
import { toast } from "sonner";
import { PageShell } from "@/shared/ui/page-shell";
import { DataTable } from "@/shared/ui/data-table";
import { Button } from "@/shared/ui/button";
import { Badge } from "@/shared/ui/badge";
import { Input } from "@/shared/ui/input";
import { Switch } from "@/shared/ui/switch";
import { StatCard } from "@/shared/ui/stat-card";
import { Avatar, AvatarFallback } from "@/shared/ui/avatar";
import { ConfirmDialog } from "@/shared/ui/confirm-dialog";
import {
  Dialog, DialogBody, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/shared/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/shared/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/shared/ui/select";
import { userApi } from "@/entities/user/api";
import { useUsers, useUserBranches } from "@/entities/user/queries";
import { useBranches } from "@/entities/branch/queries";
import { useOrgs } from "@/entities/org/queries";
import {
  createUserSchema, updateUserSchema, type CreateUserValues, type UpdateUserValues,
} from "@/entities/user/schemas";
import { QUERY_KEYS, ROLES } from "@/shared/config/constants";
import { useCurrentContext } from "@/shared/hooks/use-current-context";
import { getErrorMessage } from "@/shared/api/errors";
import { exportToExcel } from "@/shared/lib/excel";
import { initials } from "@/shared/lib/format";
import type { Role } from "@/shared/config/constants";
import type { UserPublic } from "@/shared/types";

const ROLE_COLOR: Record<Role, "success" | "info" | "warning" | "secondary"> = {
  super_admin: "warning",
  org_admin: "info",
  branch_manager: "info",
  teller: "success",
};

function UserDialog({ open, onClose, edit }: { open: boolean; onClose: () => void; edit?: UserPublic | null }) {
  const { t } = useTranslation();
  const qc = useQueryClient();
  const { isSuperAdmin, user } = useCurrentContext();
  const { data: orgs = [] } = useOrgs();

  const isEdit = !!edit;
  const form = useForm<CreateUserValues | UpdateUserValues>({
    resolver: zodResolver(isEdit ? updateUserSchema : createUserSchema),
    defaultValues: isEdit
      ? {
          name: edit!.name,
          email: edit!.email ?? "",
          phone: edit!.phone ?? "",
          role: edit!.role,
          is_active: edit!.is_active,
        }
      : {
          name: "",
          email: "",
          phone: "",
          role: "teller",
          is_active: true,
          org_id: user?.org_id ?? "",
          pin: "",
          password: "",
        },
  });

  const { mutate, isPending } = useMutation({
    mutationFn: (v: CreateUserValues | UpdateUserValues) => {
      if (isEdit) {
        const payload = {
          name: v.name,
          email: v.email || null,
          phone: v.phone || null,
          role: v.role,
          is_active: v.is_active,
        };
        return userApi.update(edit!.id, payload);
      }
      const createValues = v as CreateUserValues;
      const payload: Parameters<typeof userApi.create>[0] = {
        name: createValues.name,
        role: createValues.role,
        org_id: createValues.org_id,
        email: createValues.email || null,
        phone: createValues.phone || null,
        is_active: createValues.is_active,
        ...(createValues.pin ? { pin: createValues.pin } : {}),
        ...(createValues.password ? { password: createValues.password } : {}),
      };
      return userApi.create(payload);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["users"] });
      toast.success(isEdit ? t("users.updatedToast") : t("users.createdToast"));
      onClose();
    },
    onError: (e) => toast.error(getErrorMessage(e)),
  });

  const availableRoles: Role[] = isSuperAdmin ? [...ROLES] : ROLES.filter((r) => r !== "super_admin");

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent size="lg">
        <DialogHeader>
          <DialogTitle>{isEdit ? t("users.editTitle") : t("users.newTitle")}</DialogTitle>
          <DialogDescription>{t("users.subtitle")}</DialogDescription>
        </DialogHeader>
        <Form {...form}>
          {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
          <form onSubmit={form.handleSubmit((v) => mutate(v as any))}>
            <DialogBody>
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("users.fullName")}</FormLabel>
                    <FormControl><Input {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="grid grid-cols-2 gap-3">
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("auth.email")}</FormLabel>
                      <FormControl><Input type="email" {...field} value={field.value ?? ""} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="phone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("users.phone")}</FormLabel>
                      <FormControl><Input {...field} value={field.value ?? ""} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {!isEdit && (
                <div className="grid grid-cols-2 gap-3">
                  <FormField
                    control={form.control}
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    name={"pin" as any}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t("users.pin")}</FormLabel>
                        <FormControl>
                          <Input
                            type="password"
                            inputMode="numeric"
                            maxLength={6}
                            {...field}
                            onChange={(e) => field.onChange(e.target.value.replace(/\D/g, ""))}
                            placeholder="••••"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    name={"password" as any}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t("auth.password")}</FormLabel>
                        <FormControl><Input type="password" {...field} placeholder={t("common.optional")} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <FormField
                  control={form.control}
                  name="role"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("users.role")}</FormLabel>
                      <Select value={field.value} onValueChange={field.onChange}>
                        <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                        <SelectContent>
                          {availableRoles.map((r) => (
                            <SelectItem key={r} value={r}>{t(`roles.${r}`)}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                {isSuperAdmin && !isEdit && (
                  <FormField
                    control={form.control}
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    name={"org_id" as any}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t("users.org")}</FormLabel>
                        <Select value={field.value ?? ""} onValueChange={field.onChange}>
                          <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                          <SelectContent>
                            {orgs.map((o) => <SelectItem key={o.id} value={o.id}>{o.name}</SelectItem>)}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}
              </div>

              {isEdit && (
                <FormField
                  control={form.control}
                  name="is_active"
                  render={({ field }) => (
                    <FormItem className="flex items-center justify-between rounded-lg bg-muted p-3 !space-y-0">
                      <div>
                        <FormLabel>{t("users.activeAccount")}</FormLabel>
                        <p className="text-xs text-muted-foreground">{t("users.activeHint")}</p>
                      </div>
                      <FormControl><Switch checked={field.value} onCheckedChange={field.onChange} /></FormControl>
                    </FormItem>
                  )}
                />
              )}
            </DialogBody>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={onClose}>{t("common.cancel")}</Button>
              <Button type="submit" loading={isPending}>{isEdit ? t("common.saveChanges") : t("common.create")}</Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

function BranchAssignDialog({ open, onClose, user }: { open: boolean; onClose: () => void; user: UserPublic | null }) {
  const { t } = useTranslation();
  const qc = useQueryClient();
  const orgId = user?.org_id ?? null;
  const { data: branches = [] } = useBranches(orgId);
  const { data: assigned = [] } = useUserBranches(user?.id ?? null);
  const assignedIds = new Set(assigned.map((a) => a.branch_id));

  const { mutate: toggle, isPending } = useMutation({
    mutationFn: ({ branchId, isAssigned }: { branchId: string; isAssigned: boolean }) =>
      isAssigned ? userApi.unassignBranch(user!.id, branchId) : userApi.assignBranch(user!.id, branchId),
    onSuccess: () => qc.invalidateQueries({ queryKey: QUERY_KEYS.userBranches(user?.id ?? "") }),
    onError: (e) => toast.error(getErrorMessage(e)),
  });

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("users.branchAccess")}</DialogTitle>
          <DialogDescription>{t("users.branchAccessHint", { name: user?.name ?? "" })}</DialogDescription>
        </DialogHeader>
        <DialogBody>
          {branches.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">{t("common.noResults")}</p>
          ) : (
            branches.map((b) => {
              const isAssigned = assignedIds.has(b.id);
              return (
                <div key={b.id} className="flex items-center justify-between rounded-lg p-3 border hover:bg-muted/50 transition-colors">
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">{b.name}</p>
                    {b.address && <p className="text-xs text-muted-foreground truncate">{b.address}</p>}
                  </div>
                  <Switch checked={isAssigned} disabled={isPending} onCheckedChange={() => toggle({ branchId: b.id, isAssigned })} />
                </div>
              );
            })
          )}
        </DialogBody>
        <DialogFooter>
          <Button onClick={onClose}>{t("common.done")}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default function Users() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { orgId } = useCurrentContext();
  const [userDlg, setUserDlg] = useState(false);
  const [branchDlg, setBranchDlg] = useState(false);
  const [editUser, setEditUser] = useState<UserPublic | null>(null);
  const [branchUser, setBranchUser] = useState<UserPublic | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<UserPublic | null>(null);

  const { data: users = [], isLoading } = useUsers(orgId);

  const { mutate: remove, isPending: removing } = useMutation({
    mutationFn: (id: string) => userApi.remove(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["users"] });
      toast.success(t("users.deletedToast"));
      setConfirmDelete(null);
    },
    onError: (e) => toast.error(getErrorMessage(e)),
  });

  const roleCount = (r: Role) => users.filter((u) => u.role === r).length;

  const columns: ColumnDef<UserPublic>[] = [
    {
      accessorKey: "name",
      header: t("common.name"),
      cell: ({ row }) => (
        <div className="flex items-center gap-3">
          <Avatar className="h-8 w-8 flex-shrink-0">
            <AvatarFallback className="text-xs">{initials(row.original.name)}</AvatarFallback>
          </Avatar>
          <div className="min-w-0">
            <p className="font-semibold text-sm truncate">{row.original.name}</p>
            <p className="text-xs text-muted-foreground truncate">{row.original.email ?? "—"}</p>
          </div>
        </div>
      ),
    },
    {
      accessorKey: "phone",
      header: t("users.phone"),
      cell: ({ getValue }) => <span className="text-sm font-mono">{(getValue() as string) ?? "—"}</span>,
    },
    {
      accessorKey: "role",
      header: t("users.role"),
      cell: ({ getValue }) => {
        const r = getValue() as Role;
        return <Badge variant={ROLE_COLOR[r]}>{t(`roles.${r}`)}</Badge>;
      },
    },
    {
      accessorKey: "is_active",
      header: t("common.status"),
      cell: ({ getValue }) =>
        getValue() ? (
          <Badge variant="success"><CheckCircle size={11} /> {t("common.active")}</Badge>
        ) : (
          <Badge variant="destructive"><XCircle size={11} /> {t("common.inactive")}</Badge>
        ),
    },
    {
      id: "actions",
      header: "",
      cell: ({ row }) => (
        <div className="flex items-center gap-1 justify-end" onClick={(e) => e.stopPropagation()}>
          <Button variant="ghost" size="iconSm" title={t("users.permissions")} onClick={() => navigate(`/permissions/${row.original.id}`)}>
            <Shield size={13} />
          </Button>
          {(row.original.role === "branch_manager" || row.original.role === "teller") && (
            <Button variant="ghost" size="iconSm" title={t("users.assignBranches")} onClick={() => { setBranchUser(row.original); setBranchDlg(true); }}>
              <GitBranch size={13} />
            </Button>
          )}
          <Button variant="ghost" size="iconSm" onClick={() => { setEditUser(row.original); setUserDlg(true); }}>
            <Edit2 size={13} />
          </Button>
          <Button variant="ghost" size="iconSm" className="text-destructive" onClick={() => setConfirmDelete(row.original)}>
            <Trash2 size={13} />
          </Button>
        </div>
      ),
    },
  ];

  const handleExport = () =>
    exportToExcel({
      filename: "Users",
      sheets: [
        {
          name: "Users",
          title: t("users.title"),
          columns: [
            { key: "name", header: t("common.name"), accessor: (u: UserPublic) => u.name, width: 28 },
            { key: "email", header: t("auth.email"), accessor: (u: UserPublic) => u.email ?? "—", width: 30 },
            { key: "phone", header: t("users.phone"), accessor: (u: UserPublic) => u.phone ?? "—", width: 18 },
            { key: "role", header: t("users.role"), accessor: (u: UserPublic) => t(`roles.${u.role}`), width: 18 },
            { key: "is_active", header: t("common.status"), accessor: (u: UserPublic) => u.is_active, type: "bool", width: 12 },
          ],
          rows: users,
        },
      ],
    });

  return (
    <PageShell
      title={t("users.title")}
      description={t("users.subtitle")}
      action={<Button onClick={() => { setEditUser(null); setUserDlg(true); }}><Plus /> {t("common.new")}</Button>}
    >
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatCard label={t("users.totalUsers")} value={users.length} loading={isLoading} />
        <StatCard label={t("users.orgAdmins")} value={roleCount("org_admin")} loading={isLoading} accent="info" />
        <StatCard label={t("users.branchManagers")} value={roleCount("branch_manager")} loading={isLoading} accent="violet" />
        <StatCard label={t("users.tellers")} value={roleCount("teller")} loading={isLoading} accent="success" />
      </div>

      <DataTable
        columns={columns}
        data={users}
        isLoading={isLoading}
        searchKey="name"
        onExport={handleExport}
        emptyState={
          <div className="flex flex-col items-center gap-2 py-4">
            <UsersIcon size={32} className="text-muted-foreground/40" />
            <p>{t("common.noResults")}</p>
          </div>
        }
      />

      <UserDialog open={userDlg} onClose={() => { setUserDlg(false); setEditUser(null); }} edit={editUser} key={editUser?.id ?? "new"} />
      <BranchAssignDialog open={branchDlg} onClose={() => setBranchDlg(false)} user={branchUser} />
      <ConfirmDialog
        open={!!confirmDelete}
        onOpenChange={(o) => !o && setConfirmDelete(null)}
        title={t("common.confirmDelete", { name: confirmDelete?.name ?? "" })}
        destructive
        loading={removing}
        onConfirm={() => confirmDelete && remove(confirmDelete.id)}
      />
    </PageShell>
  );
}
