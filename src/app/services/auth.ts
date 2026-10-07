import { Injectable, computed, inject, signal } from '@angular/core';
import { User, UserService, ADMIN_ROLE_ID } from './userservice';

const AUTH_STORAGE_KEY = 'auth_state';

interface AuthState {
  userId: number | null;
  isGuest: boolean;
}

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private userService = inject(UserService);

  private userIdSignal = signal<number | null>(null);
  private isGuestSignal = signal(false);

  /** همیشه از لیست زنده‌ی کاربران خوانده می‌شود تا بعد از ویرایش، قدیمی نماند */
  currentUser = computed<User | null>(() => {
    const id = this.userIdSignal();
    if (id === null) return null;
    return this.userService.users().find((u) => u.id === id) ?? null;
  });
  isGuest = this.isGuestSignal.asReadonly();

  private isAdminComputed = computed(() => this.currentUser()?.role === ADMIN_ROLE_ID);

  constructor() {
    this.restoreFromStorage();
  }

  private restoreFromStorage() {
    try {
      const saved = localStorage.getItem(AUTH_STORAGE_KEY);
      if (!saved) return;

      const state: AuthState = JSON.parse(saved);
      if (state.isGuest) {
        this.isGuestSignal.set(true);
        return;
      }
      if (state.userId !== null && this.userService.users().some((u) => u.id === state.userId)) {
        this.userIdSignal.set(state.userId);
      }
    } catch {
      localStorage.removeItem(AUTH_STORAGE_KEY);
    }
  }

  private saveToStorage() {
    const state: AuthState = {
      userId: this.userIdSignal(),
      isGuest: this.isGuestSignal(),
    };
    localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(state));
  }

  login(username: string, password: string): boolean {
    const user = this.userService.getUserByCredentials(username, password);
    if (user) {
      this.userIdSignal.set(user.id);
      this.isGuestSignal.set(false);
      this.saveToStorage();
      return true;
    }
    return false;
  }

  loginAsGuest(): void {
    this.userIdSignal.set(null);
    this.isGuestSignal.set(true);
    this.saveToStorage();
  }

  logout(): void {
    this.userIdSignal.set(null);
    this.isGuestSignal.set(false);
    localStorage.removeItem(AUTH_STORAGE_KEY);
  }

  isAuthenticated(): boolean {
    return this.currentUser() !== null || this.isGuestSignal();
  }

  isAdmin(): boolean {
    return this.isAdminComputed();
  }

  getCurrentUserId(): number | null {
    return this.userIdSignal();
  }
}
