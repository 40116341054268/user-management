import { Component, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, Validators } from '@angular/forms';
import { MatTableModule } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatCardModule } from '@angular/material/card';
import { MatDialogModule, MatDialog } from '@angular/material/dialog';
import { MatSnackBarModule, MatSnackBar } from '@angular/material/snack-bar';
import { Job, JobService } from '../../services/jobservice';
import {
  GlobalDynamicDialogComponent,
  DynamicDialogConfig,
  SelectOption,
} from '../../shared/global-dialog/global-dialog';

@Component({
  selector: 'app-job-management',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatTableModule,
    MatButtonModule,
    MatIconModule,
    MatInputModule,
    MatSelectModule,
    MatFormFieldModule,
    MatSlideToggleModule,
    MatTooltipModule,
    MatCardModule,
    MatDialogModule,
    MatSnackBarModule,
  ],
  templateUrl: './job-management.component.html',
  styleUrl: './job-management.component.css',
})
export class JobManagementComponent {
  jobService = inject(JobService);
  private dialog = inject(MatDialog);

  displayedColumns: string[] = ['actions', 'code', 'titleFa', 'titleEn', 'group', 'status'];

  searchTerm = signal('');
  groupSearchTerm = signal('');
  selectedGroupFilter = signal<number | 'all'>('all');

  filteredGroups = computed(() => {
    const term = this.groupSearchTerm().toLowerCase();
    return this.jobService.jobGroups().filter((g) => g.nameFa.toLowerCase().includes(term));
  });

  filteredJobs = computed(() => {
    const term = this.searchTerm().trim().toLowerCase();
    const groupFilter = this.selectedGroupFilter();

    return this.jobService.jobs().filter((job) => {
      const matchesSearch =
        job.titleFa.toLowerCase().includes(term) ||
        job.titleEn.toLowerCase().includes(term) ||
        job.code.includes(term);

      const effectiveGroupId = job.groupId ?? this.jobService.DEFAULT_GROUP_ID;
      const matchesGroup = groupFilter === 'all' || effectiveGroupId === groupFilter;

      return matchesSearch && matchesGroup;
    });
  });

  getGroupName(groupId: number | null): string {
    if (!groupId || groupId === this.jobService.DEFAULT_GROUP_ID) return 'بدون گروه شغلی';
    const group = this.jobService.jobGroups().find((g) => g.id === groupId);
    return group ? group.nameFa : 'بدون گروه شغلی';
  }

  canMoveToUnassigned(job: Job): boolean {
    return job.groupId !== null && job.groupId !== this.jobService.DEFAULT_GROUP_ID;
  }

  openJobDialog(job?: Job) {
    if (job && !job.isActive) return;

    const groupOptions: SelectOption[] = this.jobService.jobGroups().map((g) => ({
      label: g.nameFa,
      value: g.id,
    }));

    const dialogConfig: DynamicDialogConfig = {
      title: job ? 'ویرایش شغل' : 'افزودن شغل جدید',
      type: 'form',
      submitButtonText: 'ذخیره',
      cancelButtonText: 'انصراف',
      fields: [
        {
          key: 'code',
          label: 'کد شغل',
          type: 'text',
          value: job ? job.code : '',
          validators: [Validators.required, Validators.pattern('^[0-9]+$')],
          gridSpan: 1,
        },
        {
          key: 'groupId',
          label: 'گروه شغلی',
          type: 'select',
          value: job ? job.groupId : this.jobService.DEFAULT_GROUP_ID,
          options: groupOptions,
          validators: [Validators.required],
          gridSpan: 1,
        },
        {
          key: 'titleFa',
          label: 'عنوان فارسی',
          type: 'text',
          value: job ? job.titleFa : '',
          validators: [Validators.required, Validators.pattern('^[\\u0600-\\u06FF\\s]+$')],
          gridSpan: 1,
        },
        {
          key: 'titleEn',
          label: 'عنوان انگلیسی',
          type: 'text',
          value: job ? job.titleEn : '',
          validators: [Validators.required, Validators.pattern('^[a-zA-Z\\s]+$')],
          gridSpan: 1,
        },
      ],
    };

    const ref = this.dialog.open(GlobalDynamicDialogComponent, {
      width: '550px',
      direction: 'rtl',
      data: dialogConfig,
    });

    ref.afterClosed().subscribe((result) => {
      if (!result) return;

      if (job) {
        // بررسی تغییر مقادیر
        const isChanged =
          job.code !== result.code ||
          job.groupId !== result.groupId ||
          job.titleFa !== result.titleFa ||
          job.titleEn !== result.titleEn;

        if (!isChanged) return; // لغو در صورت عدم تغییر

        this.jobService.updateJob(job.id, { ...job, ...result });
      } else {
        this.jobService.addJob({ ...result, isActive: true });
      }
    });
  }

  moveToUnassigned(job: Job) {
    if (!job.isActive || !this.canMoveToUnassigned(job)) return;

    const dialogConfig: DynamicDialogConfig = {
      title: 'تایید انتقال شغل',
      type: 'confirm',
      message: `آیا از انتقال شغل «${job.titleFa}» به بخش «بدون گروه شغلی» اطمینان دارید؟`,
      confirmColor: 'warn',
      submitButtonText: 'انتقال',
      cancelButtonText: 'انصراف',
    };

    const ref = this.dialog.open(GlobalDynamicDialogComponent, {
      width: '420px',
      backdropClass: 'custom-backdrop',
      data: dialogConfig,
    });

    ref.afterClosed().subscribe((confirmed) => {
      if (confirmed) {
        this.jobService.moveToUnassigned(job.id);
      }
    });
  }

  deleteJob(job: Job) {
    if (!job.isActive) return;

    const dialogConfig: DynamicDialogConfig = {
      title: 'حذف شغل',
      type: 'confirm',
      message: `آیا از حذف شغل «${job.titleFa}» اطمینان دارید؟`,
      confirmColor: 'warn',
      submitButtonText: 'حذف',
      cancelButtonText: 'انصراف',
    };

    const ref = this.dialog.open(GlobalDynamicDialogComponent, {
      width: '400px',
      backdropClass: 'custom-backdrop',
      data: dialogConfig,
    });

    ref.afterClosed().subscribe((confirmed) => {
      if (confirmed) {
        this.jobService.deleteJob(job.id);
      }
    });
  }

  toggleStatus(job: Job) {
    this.jobService.toggleJobActive(job.id);
  }
}
