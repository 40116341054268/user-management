import { Injectable, signal, inject } from '@angular/core';
import { MatSnackBar } from '@angular/material/snack-bar';
import { ADMIN_ROLE_ID, USER_ROLE_ID, UserService } from './userservice';

export interface Role {
  id: number;
  code: string;
  nameFa: string;
  nameEn: string;
  isDefault?: boolean; // نقش اصلی سیستم: قابل ویرایش و حذف نیست
}

const ROLES_KEY = 'roles_v1';

const DEFAULT_ROLES: Role[] = [
  { id: ADMIN_ROLE_ID, code: '101', nameFa: 'مدیر سیستم', nameEn: 'Admin', isDefault: true },
  { id: USER_ROLE_ID, code: '102', nameFa: 'کاربر عادی', nameEn: 'User', isDefault: true },
];

@Injectable({
  providedIn: 'root',
})
export class RoleService {
  private snackBar = inject(MatSnackBar);
  private userService = inject(UserService);

  roles = signal<Role[]>([]);

  constructor() {
    this.loadRoles();
  }

  notify(message: string) {
    this.snackBar.open(message, 'بستن', { duration: 3000, direction: 'rtl' });
  }

  // ---------- ذخیره / بازیابی ----------

  private loadRoles() {
    let saved: Role[] | null = null;
    try {
      const raw = localStorage.getItem(ROLES_KEY);
      const data = raw ? JSON.parse(raw) : null;
      if (Array.isArray(data) && data.length) saved = data;
    } catch {
      saved = null;
    }

    let list: Role[] = saved ?? DEFAULT_ROLES.map((r) => ({ ...r }));

    // نقش اصلی (مدیر سیستم) همیشه باید وجود داشته باشد و محافظت‌شده بماند
    list = list.map((r) =>
      r.id === ADMIN_ROLE_ID || r.id === USER_ROLE_ID ? { ...r, isDefault: true } : r,
    );
    if (!list.some((r) => r.id === ADMIN_ROLE_ID)) {
      list = [{ ...DEFAULT_ROLES[0] }, ...list];
    }

    this.roles.set(list);
    this.saveRoles();
  }

  private saveRoles() {
    localStorage.setItem(ROLES_KEY, JSON.stringify(this.roles()));
  }

  // ---------- اعتبارسنجی ----------

  private isCodeTaken(code: string, excludeId?: number): boolean {
    return this.roles().some((r) => r.code === code && r.id !== excludeId);
  }

  // ---------- عملیات ----------

  addRole(roleData: Omit<Role, 'id' | 'isDefault'>): boolean {
    if (this.isCodeTaken(roleData.code)) {
      this.notify('این کد نقش قبلا استفاده شده است');
      return false;
    }
    const newId = Math.max(0, ...this.roles().map((r) => r.id)) + 1;
    const newRole: Role = { ...roleData, id: newId };
    this.roles.update((roles) => [...roles, newRole]);
    this.saveRoles();
    this.notify('نقش جدید با موفقیت ثبت شد');
    return true;
  }

  updateRole(id: number, updatedData: Partial<Omit<Role, 'id' | 'isDefault'>>): boolean {
    const target = this.roles().find((r) => r.id === id);
    if (!target) return false;

    if (target.isDefault) {
      this.notify(`نقش «${target.nameFa}» نقش اصلی سیستم است و قابل ویرایش نیست.`);
      return false;
    }
    if (updatedData.code !== undefined && this.isCodeTaken(updatedData.code, id)) {
      this.notify('این کد نقش قبلا استفاده شده است');
      return false;
    }

    this.roles.update((roles) => roles.map((r) => (r.id === id ? { ...r, ...updatedData } : r)));
    this.saveRoles();
    this.notify('اطلاعات نقش با موفقیت به‌روزرسانی شد');
    return true;
  }

  deleteRole(id: number): boolean {
    const target = this.roles().find((r) => r.id === id);
    if (!target) return false;

    if (target.isDefault) {
      this.notify(`نقش «${target.nameFa}» نقش اصلی سیستم است و قابل حذف نیست.`);
      return false;
    }

    const usedBy = this.userService.countUsersWithRole(id);
    if (usedBy > 0) {
      this.notify(`این نقش به ${usedBy} کاربر اختصاص داده شده است و قابل حذف نیست.`);
      return false;
    }

    this.roles.update((roles) => roles.filter((r) => r.id !== id));
    this.saveRoles();
    this.notify('نقش با موفقیت حذف شد');
    return true;
  }

  // ---------- نمایش ----------

  getRole(id: number | null | undefined): Role | undefined {
    return this.roles().find((r) => r.id === id);
  }

  getRoleName(id: number | null | undefined): string {
    const role = this.getRole(id);
    return role ? role.nameFa || role.nameEn : 'نامشخص';
  }

  /** گزینه‌های دراپ‌داون: value = id نقش */
  getRoleOptions() {
    return this.roles().map((r) => ({
      label: `${r.nameFa} (${r.nameEn})`,
      value: r.id,
    }));
  }
}
