import { ValidatorFn } from '@angular/forms';

export type DialogFieldType = 'text' | 'number' | 'email' | 'password' | 'select' | 'date';

export interface SelectOption {
  label: string;
  value: any;
}

export interface DialogFieldConfig {
  key: string; // نام فیلد در فرم (مثل 'email' یا 'job')
  label: string; // برچسب فیلد
  type: DialogFieldType; // نوع فیلد
  value?: any; // مقدار اولیه
  validators?: ValidatorFn[]; // ولیدیتورهای انگیولار
  options?: SelectOption[] | string[]; // گزینه‌های دراپ‌داون  placeholder?: string; // متن راهنما
  gridSpan?: number; // تعداد ستون اشغالی (1 یا 2)
  allowAddNew?: boolean; // قابلیت افزودن آیتم جدید در دراپ‌داون (مثل گروه شغلی)
  addNewLabel?: string; // عنوان افزودن گروه جدید
  onAddNewAction?: (
    newValue: string,
  ) => Promise<SelectOption | string | boolean> | SelectOption | string | boolean;
}

export interface DynamicDialogConfig {
  title: string;
  type: 'form' | 'confirm' | 'selection-list' | 'profile';

  // مخصوص حالت فرم
  fields?: DialogFieldConfig[];
  submitButtonText?: string;
  cancelButtonText?: string;

  // مخصوص حالت Confirm
  message?: string;
  confirmColor?: 'primary' | 'accent' | 'warn';

  // مخصوص حالت Selection List (مثل انتخاب شغل)
  items?: string[] | SelectOption[];
  searchPlaceholder?: string;
  selectedItem?: any;

  // متد ولیدیشن custom پیش از بستن (مثل چک کردن تکراری بودن یوزرنیم/ایمیل)
  customValidator?: (formValue: any) => { valid: boolean; errors?: { [key: string]: string } };
}
