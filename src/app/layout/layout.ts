import { Component, computed, inject, signal } from '@angular/core';
import { RouterOutlet, RouterLink, RouterLinkActive, Router } from '@angular/router';
import { MatSidenavModule } from '@angular/material/sidenav';
import { MatListModule } from '@angular/material/list';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatExpansionModule } from '@angular/material/expansion'; // اضافه شد
import { UserService } from '../services/userservice';
import { AuthService } from '../services/auth';
import { MatDialog } from '@angular/material/dialog';
import { GlobalDynamicDialogComponent } from '../shared/global-dialog/global-dialog';

interface NavChild {
  label: string;
  icon: string;
  path: string;
  adminOnly?: boolean;
}

interface NavItem {
  label: string;
  icon: string;
  path?: string;
  iconColor?: string;
  children?: NavChild[];
}

@Component({
  selector: 'app-layout',
  standalone: true,
  imports: [
    RouterOutlet,
    RouterLink,
    RouterLinkActive,
    MatSidenavModule,
    MatListModule,
    MatIconModule,
    MatButtonModule,
    MatToolbarModule,
    MatExpansionModule, // اضافه شد
  ],
  templateUrl: './layout.html',
  styleUrl: './layout.css',
})
export class Layout {
  private router = inject(Router);
  private authService = inject(AuthService);
  private userService = inject(UserService);
  private dialog = inject(MatDialog);

  users = this.userService.users;

  isSidenavOpen = signal(true); // پیشنهاد: به‌صورت پیش‌فرض باز باشد
  currentUser = computed(() =>
    this.users().find((u) => u.id === this.authService.getCurrentUserId()),
  );

  navItems: NavItem[] = [
    { label: 'خانه', icon: 'home', path: '/home', iconColor: '#38bdf8' },
    {
      label: 'مدیریت کاربران',
      icon: 'dashboard',
      iconColor: '#4ade80',
      children: [
        { label: 'لیست کاربران', icon: 'people', path: '/dashboard' },
        { label: 'مدیریت نقش‌ها', icon: 'admin_panel_settings', path: '/roles', adminOnly: true },
      ],
    },
    { label: 'پروفایل', icon: 'manage_accounts', path: '/Profile', iconColor: '#facc15' },
    {
      label: 'مدیریت شغل‌ها',
      icon: 'business_center',
      iconColor: '#a855f7',
      children: [
        { label: 'فهرست شغل‌ها', icon: 'work_outline', path: '/jobs', adminOnly: true },
        { label: 'گروه‌های شغلی', icon: 'category', path: '/job-groups', adminOnly: true },
      ],
    },
  ];

  /** آیتم‌های مخصوص مدیر برای کاربران عادی و مهمان نمایش داده نمی‌شوند */
  visibleNavItems = computed(() => {
    const admin = this.authService.isAdmin();
    return this.navItems
      .map((item) =>
        item.children
          ? { ...item, children: item.children.filter((c) => !c.adminOnly || admin) }
          : item,
      )
      .filter((item) => !item.children || item.children.length > 0);
  });

  toggleSidenav() {
    this.isSidenavOpen.update((value) => !value);
  }

  goToProfile() {
    this.router.navigate(['/Profile']);
  }

  logout() {
    const dialogRef = this.dialog.open(GlobalDynamicDialogComponent, {
      width: '400px',
      data: {
        title: 'خروج',
        type: 'confirm',
        message: `آیا از خروج اطمینان دارید؟`,
        confirmColor: 'warn',
        submitButtonText: 'بله',
      },
    });

    dialogRef.afterClosed().subscribe((confirmed) => {
      if (confirmed) {
        this.authService.logout();
        this.router.navigate(['/login']);
        this.userService.showMessage('شما خارج شدید');
      }
    });
  }
}
