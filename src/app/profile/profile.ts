import { Component, computed, inject, signal } from '@angular/core';
import { AuthService } from '../services/auth';
import { UserService } from '../services/userservice';
import { MatDialog } from '@angular/material/dialog';
import { MatIcon } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatSelect, MatOption } from '@angular/material/select';
import { JobService } from '../services/jobservice';
import { RouterLink } from '@angular/router';
import {
  DynamicDialogConfig,
  GlobalDynamicDialogComponent,
  SelectOption,
} from '../shared/global-dialog/global-dialog';

@Component({
  selector: 'app-profile',
  imports: [MatIcon, MatButtonModule, CommonModule, FormsModule, MatSelect, MatOption, RouterLink],
  standalone: true,
  templateUrl: './profile.html',
  styleUrl: './profile.css',
})
export class Profile {
  private userService = inject(UserService);
  private authService = inject(AuthService);
  private dialog = inject(MatDialog);
  private jobservice = inject(JobService);

  users = this.userService.users;
  jobOptions = computed(() => this.jobservice.getJobOptions(this.currentUser()?.job));
  editingField = signal<string | null>(null);
  tempValue: any = '';

  currentUser = computed(() =>
    this.users().find((u) => u.id === this.authService.getCurrentUserId()),
  );

  getJobTitle = computed(() => {
    const user = this.currentUser();
    if (!user || !user.job) return '---';
    return this.jobservice.getJobDisplay(user.job);
  });

  openEdit() {
    const user = this.currentUser();
    if (!user) return;

    const dialogConfig: DynamicDialogConfig = {
      title: 'ویرایش اطلاعات پروفایل',
      type: 'profile',
      userRole: this.jobservice.getJobDisplay(user.job)
        ? `شغل: ${this.jobservice.getJobDisplay(user.job)}`
        : 'کاربر سیستم',
      submitButtonText: 'ذخیره تغییرات',
      cancelButtonText: 'انصراف',
      fields: [
        { key: 'name', label: 'نام و نام خانوادگی', type: 'text', value: user.name, gridSpan: 1 },
        { key: 'email', label: 'پست الکترونیک', type: 'email', value: user.email, gridSpan: 1 },
        {
          key: 'job',
          label: 'شغل',
          type: 'select',
          value: user.job,
          options: this.jobservice.getJobOptions(user.job),
          gridSpan: 1,
        },
        { key: 'age', label: 'سن', type: 'number', value: user.age, gridSpan: 1 },
        {
          key: 'phoneNumber',
          label: 'شماره تماس',
          type: 'text',
          value: user.phoneNumber,
          gridSpan: 1,
        },
        { key: 'birthday', label: 'تاریخ تولد', type: 'date', value: user.birthday, gridSpan: 1 },
        { key: 'major', label: 'رشته تحصیلی', type: 'text', value: user.major, gridSpan: 1 },
        { key: 'address', label: 'آدرس', type: 'text', value: user.address, gridSpan: 1 },
      ],
    };

    const ref = this.dialog.open(GlobalDynamicDialogComponent, {
      width: '520px',
      direction: 'rtl',
      data: dialogConfig,
    });

    ref.afterClosed().subscribe((result) => {
      if (!result) return;

      let birthdayStr = result.birthday;
      if (result.birthday && result.birthday instanceof Date) {
        birthdayStr = result.birthday.toLocaleDateString('en-US', {
          month: 'short',
          day: '2-digit',
          year: 'numeric',
        });
      }

      const parsedAge =
        result.age !== null && result.age !== '' && result.age !== undefined
          ? Number(result.age)
          : undefined;

      // بررسی تغییرات در تمام فیلدهای پروفایل
      const isChanged =
        user.name !== result.name ||
        user.email !== result.email ||
        user.job !== result.job ||
        user.age !== parsedAge ||
        user.phoneNumber !== result.phoneNumber ||
        user.birthday !== birthdayStr ||
        user.major !== result.major ||
        user.address !== result.address;

      if (!isChanged) return; // لغو نمایش پیام در صورت عدم تغییر

      this.userService.updateProfileFields(user.id, {
        name: result.name,
        email: result.email,
        job: result.job,
        age: parsedAge,
        phoneNumber: result.phoneNumber,
        birthday: birthdayStr,
        major: result.major,
        address: result.address,
      });

      this.userService.showMessage('اطلاعات کاربر با موفقیت ذخیره شد');
    });
  }

  startEdit(field: string, currentValue: any) {
    this.editingField.set(field);
    this.tempValue = currentValue;
  }

  cancelEdit() {
    this.editingField.set(null);
  }

  saveField(field: string) {
    const user = this.currentUser();
    if (!user) return;

    let value = this.tempValue;

    // اگر تغییری نکرده باشد، حالت ویرایش لغو شده و پیامی نمایش داده نمی‌شود
    if ((user as any)[field] === value) {
      this.editingField.set(null);
      return;
    }

    if (field === 'age') {
      value = Number(value);
      if (!value) {
        this.userService.showMessage('لطفا عدد وارد کنید');
        return;
      }
    }

    this.userService.updateProfileFields(user.id, { [field]: value });
    this.editingField.set(null);
    this.userService.showMessage('فیلد با موفقیت به‌روزرسانی شد');
  }
}
