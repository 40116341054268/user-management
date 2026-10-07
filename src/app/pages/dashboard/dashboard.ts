import { Component, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { MatTableModule } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import {
  User,
  UserService,
  ADMIN_ROLE_ID,
  USER_ROLE_ID,
  HighlightPipe,
} from '../../services/userservice';
import { AuthService } from '../../services/auth';
import { MatSidenavModule } from '@angular/material/sidenav';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { Validators } from '@angular/forms';
import { GlobalDynamicDialogComponent } from '../../shared/global-dialog/global-dialog';
import { JobService } from '../../services/jobservice';
import { RoleService } from '../../services/role.service';
import { PageEvent, MatPaginator } from '@angular/material/paginator';
import { MatMenuModule } from '@angular/material/menu';
import { ChartConfiguration, ChartData, ChartType } from 'chart.js';
import { BaseChartDirective } from 'ng2-charts';

type StatKey = 'total' | 'admin' | 'user' | null;

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [
    CommonModule,
    MatDialogModule,
    MatSnackBarModule,
    MatTableModule,
    MatButtonModule,
    MatIconModule,
    MatSidenavModule,
    MatInputModule,
    MatSelectModule,
    MatPaginator,
    HighlightPipe,
    MatMenuModule,
    BaseChartDirective,
  ],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.css',
})
export class Dashboard {
  private dialog = inject(MatDialog);
  private userService = inject(UserService);
  private authService = inject(AuthService);
  private router = inject(Router);
  private jobservice = inject(JobService);
  private roleservice = inject(RoleService);

  public doughnutChartType: ChartType = 'doughnut';
  // ۱. ساخت نمودار پویا بر اساس تمام نقش‌های موجود در سیستم
  public roleChartData = computed<ChartData<'doughnut'>>(() => {
    const roles = this.roleservice.roles(); // دریافت تمام نقش‌ها از RoleService
    const allUsers = this.users();

    // استخراج نام فارسی/انگلیسی نقش‌ها برای لیبل نمودار
    const labels = roles.map((r) => r.nameFa || r.nameEn);

    // محاسبه تعداد کاربران متعلق به هر نقش
    const counts = roles.map((r) => allUsers.filter((u) => u.role === r.id).length);

    // پلت رنگی پویا و مدرن برای نقش‌های مختلف
    const backgroundColors = [
      '#6366f1', // بنفش / مدیر اصلی
      '#3b82f6', // آبی / کاربر عادی
      '#10b981', // سبز / نقش‌های سفارشی ۱
      '#f59e0b', // نارنجی / نقش‌های سفارشی ۲
      '#ec4899', // صورتی
      '#8b5cf6', // بنفش روشن
      '#06b6d4', // فیروزه‌ای
    ];

    return {
      labels: labels,
      datasets: [
        {
          data: counts,
          backgroundColor: backgroundColors.slice(0, roles.length),
          borderWidth: 2,
          borderColor: '#ffffff',
        },
      ],
    };
  });
  public chartOptions: ChartConfiguration['options'] = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'bottom',
        labels: {
          font: {
            family: 'Vazirmatn, Tahoma, sans-serif', // استفاده از فونت فارسی پروژه
            size: 12,
          },
        },
      },
    },
  };

  users = this.userService.users;
  isGuest = this.authService.isGuest;

  jobs = this.jobservice.jobs;
  showJobsPanel = signal(false);

  roleList = this.roleservice.roles;
  roleFilter = signal<number | 'all'>('all');
  jobFilter = signal<string | 'all'>('all');

  pageSize = signal(10);
  pageIndex = signal(0);

  searchTerm = signal('');
  sortby = signal('none');

  filteredUsers = computed(() => {
    let list = this.users();
    const term = this.searchTerm().trim().toLocaleLowerCase();

    if (term) {
      list = list.filter(
        (u) =>
          u.username.toLocaleLowerCase().includes(term) ||
          this.formatDate(u.joinDate).toLocaleLowerCase().includes(term),
      );
    }
    const role = this.roleFilter();
    if (role !== 'all') {
      list = list.filter((u) => u.role === role);
    }
    const jobCode = this.jobFilter();
    if (jobCode !== 'all') {
      list = list.filter((u) => String(u.job).trim() === jobCode);
    }
    if (this.sortby() === 'age') {
      list = [...list].sort((a, b) => a.age - b.age);
    }
    if (this.sortby() === 'name') {
      list = [...list].sort((a, b) => a.username.localeCompare(b.username));
    }
    if (this.sortby() === 'joinDate') {
      list = [...list].sort(
        (a, b) => new Date(a.joinDate).getTime() - new Date(b.joinDate).getTime(),
      );
    }

    return list;
  });
  // ۱. تعریف وضعیت اولیه (پنهان/بسته بودن)
  showFilterPanel = signal(false);

  // ۲. این متد هنگام کلیک روی دکمه اجرا می‌شود
  toggleFilterPanel() {
    // مقدار را معکوس می‌کند: اگر false بود true می‌شود و برعکس
    this.showFilterPanel.update((isOpen) => !isOpen);
  }
  resetFilters() {
    this.searchTerm.set('');
    this.roleFilter.set('all');
    this.jobFilter.set('all');
    this.sortby.set('none');
    this.pageIndex.set(0);
  }

  totalFiltered = computed(() => this.filteredUsers().length);

  // اگر بعد از فیلتر، صفحه‌ی فعلی از تعداد صفحات بیشتر شد، به آخرین صفحه برمی‌گردد
  currentPage = computed(() => {
    const lastPage = Math.max(0, Math.ceil(this.totalFiltered() / this.pageSize()) - 1);
    return Math.min(this.pageIndex(), lastPage);
  });

  pagedUsers = computed(() => {
    const start = this.currentPage() * this.pageSize();
    return this.filteredUsers().slice(start, start + this.pageSize());
  });

  onPageChange(e: PageEvent) {
    this.pageIndex.set(e.pageIndex);
    this.pageSize.set(e.pageSize);
  }

  setRoleFilter(value: number | 'all') {
    this.roleFilter.set(value);
    this.pageIndex.set(0);
  }

  setJobFilter(value: string | 'all') {
    this.jobFilter.set(value);
    this.pageIndex.set(0);
  }

  setSort(value: string) {
    this.sortby.set(value);
    this.pageIndex.set(0);
  }

  performSearch(value: string) {
    this.searchTerm.set(value);
    this.pageIndex.set(0);
  }

  clearSearch(inputEl: HTMLInputElement) {
    inputEl.value = '';
    this.searchTerm.set('');
    this.pageIndex.set(0);
  }

  isAdmin(): boolean {
    return this.authService.isAdmin();
  }

  currentUserId(): number | null {
    return this.authService.getCurrentUserId();
  }

  displayedColumns(): string[] {
    if (this.isGuest()) {
      return ['name', 'email', 'job', 'age', 'joinDate', 'extra'];
    }
    if (this.isAdmin()) {
      return ['actions', 'name', 'email', 'job', 'age', 'username', 'role', 'extra', 'joinDate'];
    }
    return ['actions', 'name', 'email', 'job', 'age', 'joinDate', 'extra'];
  }

  formatDate(isoDate: string): string {
    return new Date(isoDate).toLocaleDateString('fa-IR');
  }

  canEdit(user: User): boolean {
    if (this.isAdmin()) {
      return true;
    }
    return user.id === this.currentUserId();
  }

  canDelete(user: User): boolean {
    if (user.isMainAdmin) {
      return false;
    }
    if (this.isAdmin()) {
      return true;
    }
    return user.id === this.currentUserId();
  }

  canDeleteField(user: User): boolean {
    if (this.isAdmin()) {
      return true;
    }
    return user.id === this.currentUserId();
  }

  roleLabel(roleId: number): string {
    return this.roleservice.getRoleName(roleId);
  }

  openAddUser() {
    const dialogRef = this.dialog.open(GlobalDynamicDialogComponent, {
      width: '600px',
      data: {
        title: 'افزودن کاربر جدید',
        type: 'form',
        submitButtonText: 'افزودن کاربر',
        fields: [
          { key: 'name', label: 'نام', type: 'text', validators: [Validators.required] },
          {
            key: 'email',
            label: 'ایمیل',
            type: 'email',
            validators: [Validators.required, Validators.email],
          },
          {
            key: 'job',
            label: 'شغل',
            type: 'select',
            options: this.jobservice.getJobOptions(),
            validators: [Validators.required],
          },
          { key: 'age', label: 'سن', type: 'number', validators: [Validators.required] },
          { key: 'username', label: 'نام کاربری', type: 'text', validators: [Validators.required] },
          {
            key: 'password',
            label: 'رمز عبور',
            type: 'password',
            validators: [Validators.required],
          },
          ...(this.isAdmin()
            ? [
                {
                  key: 'role',
                  label: 'نقش',
                  type: 'select',
                  value: USER_ROLE_ID,
                  options: this.roleservice.getRoleOptions(),
                  validators: [Validators.required],
                },
              ]
            : []),
          { key: 'address', label: 'آدرس (اطلاعات اضافی)', type: 'text', gridSpan: 2 },
          { key: 'children', label: 'تعداد فرزند (اطلاعات اضافی)', type: 'number' },
        ],
        customValidator: (formValue: any) => {
          const isTakenUsername = this.userService.isUsernameTaken(formValue.username);
          if (isTakenUsername) {
            return { valid: false, errors: { username: 'این نام کاربری قبلاً استفاده شده است' } };
          }
          const isTakenEmail = this.userService.isEmailTaken(formValue.email);
          if (isTakenEmail) {
            return { valid: false, errors: { email: 'این ایمیل قبلاً ثبت شده است' } };
          }
          return { valid: true };
        },
      },
    });

    dialogRef.afterClosed().subscribe((result) => {
      if (!result) return;
      const { role, address, children, ...base } = result;
      this.userService.addUser(
        {
          ...base,
          address: address || '',
          extraFields: { children: children ?? null },
        },
        role ?? USER_ROLE_ID,
      );
      this.userService.showMessage('کاربر با موفقیت اضافه شد');
    });
  }

  openEditDialog(user: User) {
    if (!this.canEdit(user)) return;

    const dialogRef = this.dialog.open(GlobalDynamicDialogComponent, {
      width: '600px',
      data: {
        title: 'ویرایش کاربر',
        type: 'form',
        submitButtonText: 'ذخیره تغییرات',
        fields: [
          {
            key: 'name',
            label: 'نام',
            type: 'text',
            value: user.name,
            validators: [Validators.required],
          },
          {
            key: 'email',
            label: 'ایمیل',
            type: 'email',
            value: user.email,
            validators: [Validators.required, Validators.email],
          },
          {
            key: 'job',
            label: 'شغل',
            type: 'select',
            value: user.job,
            options: this.jobservice.getJobOptions(user.job),
            validators: [Validators.required],
          },
          {
            key: 'age',
            label: 'سن',
            type: 'number',
            value: user.age,
            validators: [Validators.required],
          },
          {
            key: 'username',
            label: 'نام کاربری',
            type: 'text',
            value: user.username,
            validators: [Validators.required],
          },
          {
            key: 'password',
            label: 'رمز عبور',
            type: 'password',
            value: user.password,
            validators: [Validators.required],
          },
          ...(this.isAdmin()
            ? [
                {
                  key: 'role',
                  label: 'نقش',
                  type: 'select',
                  value: user.role,
                  disabled: !!user.isMainAdmin, // نقش مدیر اصلی قابل تغییر نیست
                  options: this.roleservice.getRoleOptions(),
                  validators: [Validators.required],
                },
              ]
            : []),
          {
            key: 'address',
            label: 'آدرس',
            type: 'text',
            value: user.address ?? user.extraFields?.address ?? '',
            gridSpan: 2,
          },
          {
            key: 'children',
            label: 'تعداد فرزند',
            type: 'number',
            value: user.extraFields?.children,
          },
        ],
        customValidator: (formValue: any) => {
          const isTakenUsername = this.userService.isUsernameTaken(formValue.username, user.id);
          if (isTakenUsername) {
            return { valid: false, errors: { username: 'این نام کاربری قبلاً استفاده شده است' } };
          }
          const isTakenEmail = this.userService.isEmailTaken(formValue.email, user.id);
          if (isTakenEmail) {
            return { valid: false, errors: { email: 'این ایمیل قبلاً ثبت شده است' } };
          }
          return { valid: true };
        },
      },
    });

    dialogRef.afterClosed().subscribe((result) => {
      if (!result) return;

      const newAddress = result.address || '';
      const newChildren = result.children ?? null;

      // بررسی تغییر مقادیر کاربر
      const isChanged =
        user.name !== result.name ||
        user.email !== result.email ||
        user.job !== result.job ||
        user.age !== result.age ||
        user.username !== result.username ||
        user.password !== result.password ||
        (this.isAdmin() && user.role !== result.role) ||
        (user.address ?? user.extraFields?.address ?? '') !== newAddress ||
        (user.extraFields?.children ?? null) !== newChildren;

      if (!isChanged) return; // اگر تغییری نکرده باشد، پیامی چاپ نمی‌شود

      this.userService.updateUser(user.id, {
        name: result.name,
        email: result.email,
        job: result.job,
        age: result.age,
        username: result.username,
        password: result.password,
        // فقط مدیر می‌تواند نقش را عوض کند
        ...(this.isAdmin() ? { role: result.role } : {}),
        address: newAddress,
        extraFields: { children: newChildren },
      });
      this.userService.showMessage('کاربر با موفقیت ویرایش شد');
    });
  }

  deleteUser(user: User) {
    if (!this.canDelete(user)) {
      if (user.isMainAdmin) {
        this.userService.showMessage('حذف مدیر اصلی امکان‌پذیر نیست');
      }
      return;
    }

    const dialogRef = this.dialog.open(GlobalDynamicDialogComponent, {
      width: '400px',
      data: {
        title: 'تایید حذف',
        type: 'confirm',
        message: `آیا از حذف کاربر «${user.name}» اطمینان دارید؟`,
        confirmColor: 'warn',
        submitButtonText: 'حذف شود',
      },
    });

    dialogRef.afterClosed().subscribe((confirmed) => {
      if (confirmed) {
        const deletedSelf = user.id === this.currentUserId();
        this.userService.deleteUser(user.id);
        this.userService.showMessage('کاربر با موفقیت حذف شد');
        if (deletedSelf) {
          this.authService.logout();
          this.router.navigate(['/login']);
        }
      }
    });
  }

  openJobDialog(user: User) {
    const dialogRef = this.dialog.open(GlobalDynamicDialogComponent, {
      width: '420px',
      data: {
        title: 'انتخاب شغل',
        type: 'selection-list',
        items: this.jobservice.getJobOptions(user.job),
        selectedItem: user.job,
        searchPlaceholder: 'جستجو بر اساس نام شغل...',
      },
    });

    dialogRef.afterClosed().subscribe((selectedJob) => {
      if (selectedJob && selectedJob !== user.job) {
        this.userService.updateUserJob(user.id, selectedJob);
        this.userService.showMessage('شغل کاربر تغییر کرد');
      }
    });
  }

  getJobInfoText(jobCode: string | number | null | undefined): string {
    if (jobCode === null || jobCode === undefined || jobCode === '') return 'بدون شغل';

    const code = String(jobCode).trim();
    const jobs = this.jobservice.jobs();

    // اول با کد شغل، اگر نبود با id
    const job =
      jobs.find((j) => String(j.code).trim() === code) ?? jobs.find((j) => String(j.id) === code);

    if (!job) return code; // شغل حذف شده یا مقدار قدیمی

    const groupId = job.groupId ?? this.jobservice.DEFAULT_GROUP_ID;
    const group = this.jobservice.jobGroups().find((g) => g.id === groupId);
    const groupName = group ? group.nameFa : 'بدون گروه شغلی';

    return `${job.titleFa || job.titleEn} (${groupName})`;
  }

  totalCount = computed(() => this.users().length);
  adminCount = computed(() => this.users().filter((u) => u.role === ADMIN_ROLE_ID).length);
  userCount = computed(() => this.users().filter((u) => u.role !== ADMIN_ROLE_ID).length);

  adminPercent = computed(() => {
    const total = this.totalCount();
    return total === 0 ? 0 : Math.round((this.adminCount() / total) * 100);
  });

  userPercent = computed(() => {
    const total = this.totalCount();
    return total === 0 ? 0 : Math.round((this.userCount() / total) * 100);
  });

  openStat = signal<StatKey>(null);
  displayedColumns2 = ['name', 'email', 'job', 'age'];

  visibleList = computed(() => {
    const key = this.openStat();
    if (key === 'total') {
      return this.users();
    }
    if (key === 'admin') {
      return this.users().filter((u) => u.role === ADMIN_ROLE_ID);
    }
    if (key === 'user') {
      return this.users().filter((u) => u.role !== ADMIN_ROLE_ID);
    }
    return [];
  });

  toggleStat(key: StatKey) {
    this.openStat.update((current) => (current === key ? null : key));
  }
}
