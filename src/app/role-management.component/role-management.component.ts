import { Component, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Validators } from '@angular/forms';
import { MatTableModule } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatCardModule } from '@angular/material/card';
import { MatDialogModule, MatDialog } from '@angular/material/dialog';
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { MatTooltipModule } from '@angular/material/tooltip';
import { RoleService, Role } from '../services/role.service';
import {
  GlobalDynamicDialogComponent,
  DynamicDialogConfig,
} from '../shared/global-dialog/global-dialog';
import { UserService } from '../services/userservice';
import { ChartConfiguration, ChartData, ChartType } from 'chart.js';
import { BaseChartDirective } from 'ng2-charts';

@Component({
  selector: 'app-role-management',
  standalone: true,
  imports: [
    CommonModule,
    MatTableModule,
    MatButtonModule,
    MatIconModule,
    MatCardModule,
    MatDialogModule,
    MatSnackBarModule,
    MatTooltipModule,
    BaseChartDirective,
  ],
  templateUrl: './role-management.component.html',
  styleUrl: './role-management.component.css',
})
export class RoleManagementComponent {
  roleService = inject(RoleService);
  private dialog = inject(MatDialog);
  private userService = inject(UserService);

  // دریافت لیست نقش‌ها و کاربران
  public Roles = this.roleService.roles;
  public users = this.userService.users;

  // محاسبه آمار کلی نقش‌ها
  public totalRoles = computed(() => this.Roles().length);
  public systemRolesCount = computed(() => this.Roles().filter((r) => r.isDefault).length);
  public customRolesCount = computed(() => this.Roles().filter((r) => !r.isDefault).length);

  // ۱. کانفیگ نمودار دایره‌ای توزیع کاربران در نقش‌ها
  public roleChartType: ChartType = 'doughnut';

  public roleChartData = computed<ChartData<'doughnut'>>(() => {
    const roleList = this.Roles();
    const userList = this.users();

    const labels = roleList.map((r) => r.nameFa || r.nameEn);
    const counts = roleList.map((r) => userList.filter((u) => u.role === r.id).length);

    const colors = [
      '#6366f1',
      '#3b82f6',
      '#10b981',
      '#f59e0b',
      '#ec4899',
      '#8b5cf6',
      '#06b6d4',
      '#64748b',
    ];

    return {
      labels: labels,
      datasets: [
        {
          data: counts,
          backgroundColor: colors.slice(0, roleList.length),
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
          font: { family: 'Vazirmatn, Tahoma, sans-serif', size: 12 },
        },
      },
    },
  };

  roles = this.roleService.roles;
  displayedColumns: string[] = ['actions', 'code', 'nameFa', 'nameEn', 'type'];

  openRoleDialog(role?: Role) {
    // نقش اصلی: دکمه فعال است ولی فقط پیغام هشدار نمایش داده می‌شود
    if (role?.isDefault) {
      this.roleService.notify(`نقش «${role.nameFa}» نقش اصلی سیستم است و قابل ویرایش نیست.`);
      return;
    }

    const dialogConfig: DynamicDialogConfig = {
      title: role ? 'ویرایش نقش' : 'افزودن نقش جدید',
      type: 'form',
      submitButtonText: 'ذخیره',
      cancelButtonText: 'انصراف',
      fields: [
        {
          key: 'code',
          label: 'کد نقش',
          type: 'text',
          value: role ? role.code : '',
          validators: [Validators.required, Validators.pattern('^[0-9]+$')],
          gridSpan: 2,
        },
        {
          key: 'nameFa',
          label: 'عنوان فارسی',
          type: 'text',
          value: role ? role.nameFa : '',
          validators: [Validators.required, Validators.pattern('^[\\u0600-\\u06FF\\s]+$')],
          gridSpan: 1,
        },
        {
          key: 'nameEn',
          label: 'عنوان انگلیسی',
          type: 'text',
          value: role ? role.nameEn : '',
          validators: [Validators.required, Validators.pattern('^[a-zA-Z\\s]+$')],
          gridSpan: 1,
        },
      ],
    };

    const ref = this.dialog.open(GlobalDynamicDialogComponent, {
      width: '480px',
      direction: 'rtl',
      data: dialogConfig,
    });

    ref.afterClosed().subscribe((result) => {
      if (!result) return;

      if (role) {
        // Dirty Check برای جلوگیری از نمایش پیام بدون تغییر
        const isChanged =
          role.code !== result.code ||
          role.nameFa !== result.nameFa ||
          role.nameEn !== result.nameEn;

        if (!isChanged) return;

        this.roleService.updateRole(role.id, { ...role, ...result });
      } else {
        this.roleService.addRole(result);
      }
    });
  }

  deleteRole(role: Role) {
    if (role.isDefault) {
      this.roleService.notify(`نقش «${role.nameFa}» نقش اصلی سیستم است و قابل حذف نیست.`);
      return;
    }

    const dialogConfig: DynamicDialogConfig = {
      title: 'تأیید حذف نقش',
      type: 'confirm',
      message: `آیا از حذف نقش «${role.nameFa}» اطمینان دارید؟`,
      submitButtonText: 'حذف',
      cancelButtonText: 'انصراف',
      confirmColor: 'warn',
    };

    const ref = this.dialog.open(GlobalDynamicDialogComponent, {
      width: '420px',
      direction: 'rtl',
      data: dialogConfig,
    });

    ref.afterClosed().subscribe((confirmed) => {
      if (!confirmed) return;
      this.roleService.deleteRole(role.id);
    });
  }
}
