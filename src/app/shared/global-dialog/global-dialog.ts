import { Component, inject, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  Validators,
  ValidatorFn,
} from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSelectModule } from '@angular/material/select';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';

// ==========================================
// تعریف اینترفیس‌ها (بدون نیاز به فایل مجزا)
// ==========================================
export type DialogFieldType = 'text' | 'number' | 'email' | 'password' | 'select' | 'date';

export interface SelectOption {
  label: string;
  value: any;
}

export interface DialogFieldConfig {
  key: string; // نام فیلد در فرم (مثل 'email' یا 'job')
  label: string; // لیبل ورودی
  type: DialogFieldType; // نوع ورودی
  value?: any; // مقدار اولیه
  disabled?: boolean; // غیرقابل ویرایش (مقدارش در خروجی هست)
  validators?: ValidatorFn[]; // ولیدیتورها
  options?: SelectOption[] | string[]; // گزینه‌های دراپ‌داون
  placeholder?: string;
  gridSpan?: number; // تعداد ستون اشغالی (1 یا 2)
  allowAddNew?: boolean; // افزودن گزینه جدید
  addNewLabel?: string;
  onAddNewAction?: (
    newValue: string,
  ) => Promise<SelectOption | string | boolean> | SelectOption | string | boolean;
}

export interface DynamicDialogConfig {
  title: string;
  type: 'form' | 'confirm' | 'selection-list' | 'profile'; // اضافه شدن profile
  fields?: DialogFieldConfig[];
  submitButtonText?: string;
  cancelButtonText?: string;
  message?: string;
  confirmColor?: 'primary' | 'accent' | 'warn';
  items?: string[] | SelectOption[];
  searchPlaceholder?: string;
  selectedItem?: any;
  avatarUrl?: string; // آواتار برای بخش پروفایل
  userRole?: string; // عنوان یا نقش کاربر
  customValidator?: (formValue: any) => { valid: boolean; errors?: { [key: string]: string } };
}
// ==========================================
// کامپوننت استندالون دیالوگ جامع
// ==========================================
@Component({
  selector: 'app-global-dynamic-dialog',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    MatSelectModule,
    MatDatepickerModule,
    MatNativeDateModule,
  ],
  templateUrl: './global-dialog.html',
  styleUrl: './global-dialog.css',
})
export class GlobalDynamicDialogComponent implements OnInit {
  public dialogRef = inject(MatDialogRef<GlobalDynamicDialogComponent>);
  public data = inject<DynamicDialogConfig>(MAT_DIALOG_DATA);

  formGroup: FormGroup = new FormGroup({});
  hidePasswordMap: { [key: string]: boolean } = {};

  addingNewOptionFieldKey = signal<string | null>(null);
  newItemControl = new FormControl('');

  searchTerm = signal('');
  selectedListItem = signal<any>(this.data.selectedItem || null);

  filteredList = computed(() => {
    const list = this.data.items || [];
    const term = this.searchTerm().trim().toLowerCase();
    if (!term) return list;

    return list.filter((item) => {
      const label = typeof item === 'string' ? item : item.label;
      return label.toLowerCase().includes(term);
    });
  });

  ngOnInit() {
    // پشتیبانی از فرم و پروفایل
    if ((this.data.type === 'form' || this.data.type === 'profile') && this.data.fields) {
      this.buildForm(this.data.fields);
    }
  }

  private buildForm(fields: DialogFieldConfig[]) {
    fields.forEach((field) => {
      const validators = field.validators || [];

      // اگر نوع فیلد date بود و مقدار اولیه موجود بود، تبدیل به Date
      let initialVal = field.value ?? '';
      if (field.type === 'date' && initialVal) {
        initialVal = new Date(initialVal);
      }

      this.formGroup.addControl(
        field.key,
        new FormControl({ value: initialVal, disabled: !!field.disabled }, validators),
      );

      if (field.type === 'password') {
        this.hidePasswordMap[field.key] = true;
      }
    });
  }

  togglePassword(fieldKey: string) {
    this.hidePasswordMap[fieldKey] = !this.hidePasswordMap[fieldKey];
  }

  onSelectChange(field: DialogFieldConfig, value: any) {
    if (value === '__add_new__') {
      this.formGroup.get(field.key)?.setValue('');
      this.addingNewOptionFieldKey.set(field.key);
    }
  }

  async confirmAddNewOption(field: DialogFieldConfig) {
    const newVal = this.newItemControl.value?.trim();
    if (!newVal) return;

    if (field.onAddNewAction) {
      const res = await field.onAddNewAction(newVal);
      if (res) {
        if (typeof res === 'object' && 'value' in res) {
          (field.options as SelectOption[]).push(res);
          this.formGroup.get(field.key)?.setValue(res.value);
        } else {
          (field.options as string[]).push(newVal);
          this.formGroup.get(field.key)?.setValue(newVal);
        }
      }
    }
    this.cancelAddNewOption();
  }

  cancelAddNewOption() {
    this.newItemControl.reset('');
    this.addingNewOptionFieldKey.set(null);
  }

  onSubmit() {
    if (this.data.type === 'confirm') {
      this.dialogRef.close(true);
      return;
    }

    if (this.data.type === 'selection-list') {
      this.dialogRef.close(this.selectedListItem());
      return;
    }

    if (this.formGroup.invalid) {
      this.formGroup.markAllAsTouched();
      return;
    }

    const rawValue = this.formGroup.getRawValue();

    // فیلدهای عددی را به عدد تبدیل می‌کنیم (input با type داینامیک رشته برمی‌گرداند)
    this.data.fields?.forEach((f) => {
      if (f.type === 'number') {
        const v = rawValue[f.key];
        rawValue[f.key] = v === '' || v === null || v === undefined ? null : Number(v);
      }
    });

    // چک کردن ولیدیشن اختصاصی (تکراری بودن ایمیل یا یوزرنیم)
    if (this.data.customValidator) {
      const customRes = this.data.customValidator(rawValue);
      if (!customRes.valid && customRes.errors) {
        Object.keys(customRes.errors).forEach((fieldKey) => {
          const control = this.formGroup.get(fieldKey);
          if (control) {
            control.setErrors({ customError: customRes.errors![fieldKey] });
          }
        });
        return;
      }
    }

    this.dialogRef.close(rawValue);
  }

  onCancel() {
    this.dialogRef.close(false);
  }

  selectListItem(item: any) {
    this.selectedListItem.set(item);
  }

  // متد دریافت عنوان متنی برای نمایش در گزینه
  getOptionLabel(opt: any): string {
    if (opt === null || opt === undefined) return '';
    if (typeof opt === 'string' || typeof opt === 'number') return String(opt);
    // اگر گزینه به صورت { label: 'پزشک', value: 3 } یا { title: 'پزشک', id: 3 } است
    return opt.label || opt.title || opt.name || String(opt.value ?? opt.id ?? opt);
  }

  // متد دریافت مقدار واقعی (ID یا کلید) برای ذخیره در FormControl
  getOptionValue(opt: any): any {
    if (opt === null || opt === undefined) return '';
    if (typeof opt === 'string' || typeof opt === 'number') return opt;
    // اگر گزینه به صورت آبجکت است، اولویت با value یا id است
    return opt.value !== undefined ? opt.value : opt.id !== undefined ? opt.id : opt;
  }
}
