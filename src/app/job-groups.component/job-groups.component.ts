import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Validators } from '@angular/forms';
import { MatTableModule } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatCardModule } from '@angular/material/card';
import { MatDialogModule, MatDialog } from '@angular/material/dialog';
import { MatSnackBarModule, MatSnackBar } from '@angular/material/snack-bar';
import { MatTooltipModule } from '@angular/material/tooltip';
import { JobGroup, JobService } from '../services/jobservice';
import {
  GlobalDynamicDialogComponent,
  DynamicDialogConfig,
} from '../shared/global-dialog/global-dialog';

@Component({
  selector: 'app-job-group-management',
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
  ],
  templateUrl: './job-groups.component.html',
  styleUrl: './job-groups.component.css',
})
export class JobGroupManagementComponent {
  jobService = inject(JobService);
  private dialog = inject(MatDialog);
  private snackBar = inject(MatSnackBar);

  jobGroups = this.jobService.jobGroups;
  displayedColumns: string[] = ['actions', 'code', 'nameFa', 'nameEn', 'jobCount'];

  getJobCountForGroup(groupId: number): number {
    return this.jobService.jobs().filter((j) => {
      const effGroup = j.groupId ?? this.jobService.DEFAULT_GROUP_ID;
      return effGroup === groupId;
    }).length;
  }

  viewGroupJobs(group: JobGroup) {
    const jobsInGroup = this.jobService.jobs().filter((j) => {
      const effGroup = j.groupId ?? this.jobService.DEFAULT_GROUP_ID;
      return effGroup === group.id;
    });

    if (jobsInGroup.length === 0) {
      const dialogConfig: DynamicDialogConfig = {
        title: `شغل‌های گروه «${group.nameFa}»`,
        type: 'confirm',
        message: 'هیچ شغلی در این گروه شغلی ثبت نشده است.',
        submitButtonText: 'بستن',
      };

      this.dialog.open(GlobalDynamicDialogComponent, {
        width: '400px',
        direction: 'rtl',
        data: dialogConfig,
      });
      return;
    }

    // حذف کاراکترهای گرافیکی متنی بهم‌ریزنده‌ی BiDi (مانند └─ یا —)
    // ساخت یک متن بسیار مرتب و تمیز بدون بهم‌ریختگی فونت و اتصالات
    const formattedList = jobsInGroup
      .map((j, index) => {
        const statusText = j.isActive ? 'فعال' : 'غیرفعال';
        const englishTitle = j.titleEn ? ` (${j.titleEn})` : '';
        return `${index + 1}. ${j.titleFa}${englishTitle}\n   • کد شغل: ${j.code} | وضعیت: ${statusText}`;
      })
      .join('\n\n');

    const dialogConfig: DynamicDialogConfig = {
      title: `فهرست شغل‌های «${group.nameFa}» (${jobsInGroup.length} شغل)`,
      type: 'confirm',
      message: formattedList,
      submitButtonText: 'بستن',
    };

    this.dialog.open(GlobalDynamicDialogComponent, {
      width: '480px',
      direction: 'rtl',
      data: dialogConfig,
    });
  }

  openGroupDialog(group?: JobGroup) {
    if (group?.isDefault) {
      this.snackBar.open('گروه اصلی سیستم قابل ویرایش نیست.', 'بستن', { duration: 3000 });
      return;
    }

    const dialogConfig: DynamicDialogConfig = {
      title: group ? 'ویرایش گروه شغلی' : 'افزودن گروه شغلی جدید',
      type: 'form',
      submitButtonText: 'ذخیره',
      cancelButtonText: 'انصراف',
      fields: [
        {
          key: 'code',
          label: 'کد گروه',
          type: 'text',
          value: group ? group.code : '',
          validators: [Validators.required, Validators.pattern('^[0-9]+$')],
          gridSpan: 2,
        },
        {
          key: 'nameFa',
          label: 'عنوان فارسی',
          type: 'text',
          value: group ? group.nameFa : '',
          validators: [Validators.required, Validators.pattern('^[\\u0600-\\u06FF\\s]+$')],
          gridSpan: 1,
        },
        {
          key: 'nameEn',
          label: 'عنوان انگلیسی',
          type: 'text',
          value: group ? group.nameEn : '',
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

      if (group) {
        this.jobService.updateGroup(group.id, { ...group, ...result });
      } else {
        this.jobService.addGroup(result);
      }
    });
  }

  deleteJobGroup(group: JobGroup) {
    // عدم اجازه حذف گروه اصلی سیستم
    if (group.isDefault || group.id === this.jobService.DEFAULT_GROUP_ID) {
      this.jobService.notify('گروه اصلی سیستم (بدون گروه شغلی) قابل حذف نیست.');
      return;
    }

    // ۱. محاسبه تعداد شغل‌های داخل این گروه (دقیقاً مشابه منطق getJobCountForGroup)
    const groupJobs = this.jobService.jobs().filter((j) => {
      const effGroup = j.groupId ?? this.jobService.DEFAULT_GROUP_ID;
      return effGroup === group.id;
    });
    const hasJobs = groupJobs.length > 0;

    // ۲. پیدا کردن گروه هدف برای انتقال شغل‌ها (گروه بدون گروه شغلی / DEFAULT_GROUP_ID)
    const defaultGroup = this.jobGroups().find((g) => g.id === this.jobService.DEFAULT_GROUP_ID);
    const targetGroupName = defaultGroup ? defaultGroup.nameFa : 'بدون گروه شغلی';

    // ۳. تنظیم متن پیام تأیید بر اساس خالی بودن یا نبودن گروه
    const dialogMessage = hasJobs
      ? `آیا مطمئن هستید؟ شغل‌های این گروه به گروه «${targetGroupName}» منتقل می‌شوند.`
      : `آیا از حذف گروه «${group.nameFa}» مطمئن هستید؟`;

    const dialogConfig: DynamicDialogConfig = {
      title: 'تأیید حذف گروه شغلی',
      type: 'confirm',
      message: dialogMessage,
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

      if (hasJobs) {
        // اگر شغل داشت: انتقال به گروه پیش‌فرض و سپس حذف گروه
        this.jobService.transferJobsAndDeleteGroup(group.id, this.jobService.DEFAULT_GROUP_ID);
        this.jobService.notify(`شغل‌های این گروه به گروه «${targetGroupName}» منتقل شدند.`);
      } else {
        // اگر خالی بود: فقط حذف گروه
        this.jobService.deleteGroup(group.id);
        this.jobService.notify('گروه شغلی با موفقیت حذف شد');
      }
    });
  }
}
