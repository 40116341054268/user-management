import { inject, Injectable, signal } from '@angular/core';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Pipe, PipeTransform } from '@angular/core';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';

@Pipe({
  name: 'highlight',
  standalone: true,
})
export class HighlightPipe implements PipeTransform {
  constructor(private sanitizer: DomSanitizer) {}

  transform(text: string, search: string): SafeHtml {
    if (!search || !text) return text;

    const pattern = search.replace(/[\-\[\]\/\{\}\(\)\*\+\?\.\\\^\$\|]/g, '\\$&');
    const regex = new RegExp(pattern, 'gi');
    const highlighted = text.replace(
      regex,
      (match) => `<mark class="search-highlight">${match}</mark>`,
    );

    return this.sanitizer.bypassSecurityTrustHtml(highlighted);
  }
}
/** شناسه‌ی ثابت نقش‌های پیش‌فرض (نقش در کاربر با id ذخیره می‌شود، نه با نام) */
export const ADMIN_ROLE_ID = 1;
export const USER_ROLE_ID = 2;

export interface User {
  id: number;
  name: string;
  email: string;
  job: string; // کد شغل (Job.code)
  age: number;
  username: string;
  password: string;
  role: number; // شناسه‌ی نقش (Role.id)
  isMainAdmin?: boolean;
  joinDate: string;
  extraFields?: {
    children: number | null;
    address?: string; // فقط برای داده‌های قدیمی؛ آدرس اصلی در فیلد address است
  };
  birthday?: string;
  phoneNumber?: string;
  major?: string;
  address?: string;
}

const STORAGE_KEY = 'users';

function toNumberOrNull(value: unknown): number | null {
  if (value === null || value === undefined || value === '') return null;
  const n = Number(value);
  return Number.isNaN(n) ? null : n;
}

@Injectable({
  providedIn: 'root',
})
export class UserService {
  private usersSignal = signal<User[]>([]);
  users = this.usersSignal.asReadonly();

  private snackBar = inject(MatSnackBar);

  constructor() {
    this.loadFromStorage();
  }

  private normalizeRole(role: unknown, index: number): number {
    if (typeof role === 'number') return role;
    if (typeof role === 'string') {
      const r = role.trim().toLowerCase();
      if (r === 'admin') return ADMIN_ROLE_ID;
      if (r === 'user') return USER_ROLE_ID;
      if (r !== '' && !Number.isNaN(Number(r))) return Number(r);
    }
    return index === 0 ? ADMIN_ROLE_ID : USER_ROLE_ID;
  }

  private loadFromStorage() {
    let parsed: any[] | null = null;
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const data = JSON.parse(saved);
        if (Array.isArray(data)) parsed = data;
      }
    } catch {
      parsed = null;
    }

    if (parsed) {
      // مهاجرت داده‌های قدیمی: نقش رشته‌ای → id ، age/children رشته‌ای → عدد ، آدرس یکپارچه
      const migrated: User[] = parsed.map((u: any, index: number) => {
        const legacyAddress =
          typeof u.extraFields?.address === 'string' ? u.extraFields.address : undefined;
        return {
          ...u,
          role: this.normalizeRole(u.role, index),
          isMainAdmin: u.isMainAdmin ?? index === 0,
          joinDate: u.joinDate ?? new Date().toISOString(),
          age: toNumberOrNull(u.age) ?? u.age,
          address: typeof u.address === 'string' ? u.address : (legacyAddress ?? ''),
          extraFields: { children: toNumberOrNull(u.extraFields?.children) },
        } as User;
      });
      this.usersSignal.set(migrated);
    } else {
      this.usersSignal.set([
        {
          id: 1,
          name: 'Ali',
          email: 'ali@gmail.com',
          job: '1001',
          age: 22,
          username: 'admin',
          password: '1234',
          role: ADMIN_ROLE_ID,
          isMainAdmin: true,
          joinDate: new Date().toISOString(),
          address: '',
          extraFields: { children: null },
        },
      ]);
    }
    this.saveToStorage();
  }

  public showMessage(message: string) {
    this.snackBar.open(message, 'بستن', { duration: 2000, panelClass: ['custom-snackbar'] });
  }

  private saveToStorage() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(this.usersSignal()));
  }

  updateUserJob(id: number, job: string): void {
    this.usersSignal.update((current) => current.map((u) => (u.id === id ? { ...u, job } : u)));
    this.saveToStorage();
  }

  updateProfileFields(id: number, data: Partial<User>): void {
    this.usersSignal.update((current) => current.map((u) => (u.id === id ? { ...u, ...data } : u)));
    this.saveToStorage();
  }

  addUser(
    user: Omit<User, 'id' | 'role' | 'isMainAdmin' | 'joinDate'>,
    role: number = USER_ROLE_ID,
  ): void {
    const newUser: User = {
      ...user,
      id: Date.now(),
      role,
      isMainAdmin: false,
      joinDate: new Date().toISOString(),
    };
    this.usersSignal.update((current) => [...current, newUser]);
    this.saveToStorage();
  }

  updateUser(id: number, changes: Partial<Omit<User, 'id' | 'isMainAdmin'>>): void {
    this.usersSignal.update((current) =>
      current.map((u) => {
        if (u.id !== id) return u;
        const merged: User = { ...u, ...changes };
        // نقش مدیر اصلی هیچ‌وقت تغییر نمی‌کند
        if (u.isMainAdmin) merged.role = ADMIN_ROLE_ID;
        return merged;
      }),
    );
    this.saveToStorage();
  }

  deleteUser(id: number): void {
    // مدیر اصلی در سطح سرویس هم محافظت می‌شود
    this.usersSignal.update((current) => current.filter((u) => u.id !== id || u.isMainAdmin));
    this.saveToStorage();
  }

  countUsersWithRole(roleId: number): number {
    return this.usersSignal().filter((u) => u.role === roleId).length;
  }

  getUserByCredentials(username: string, password: string): User | null {
    return (
      this.usersSignal().find((u) => u.username === username && u.password === password) ?? null
    );
  }

  isUsernameTaken(username: string, excludeId?: number): boolean {
    return this.usersSignal().some((u) => u.username === username && u.id !== excludeId);
  }

  isEmailTaken(email: string, excludeId?: number): boolean {
    return this.usersSignal().some((u) => u.email === email && u.id !== excludeId);
  }
}
