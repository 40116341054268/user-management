import { inject, Injectable, signal } from '@angular/core';
import { MatSnackBar } from '@angular/material/snack-bar';
import { UserService } from './userservice';

export interface JobGroup {
  id: number;
  code: string;
  nameFa: string;
  nameEn: string;
  isDefault?: boolean;
}

export interface Job {
  id: number;
  code: string;
  titleFa: string;
  titleEn: string;
  groupId: number | null;
  isActive: boolean;
}

export interface SelectOption {
  label: string;
  value: any;
}

function readJson<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

const JOBS_KEY = 'jobs_v2';
const GROUPS_KEY = 'job_groups_v2';

const DEFAULT_GROUPS: JobGroup[] = [
  { id: 1, code: '100', nameFa: 'بدون گروه شغلی', nameEn: 'Unassigned', isDefault: true },
  { id: 2, code: '101', nameFa: 'فناوری اطلاعات', nameEn: 'Information Technology' },
  { id: 3, code: '102', nameFa: 'منابع انسانی', nameEn: 'Human Resources' },
  { id: 4, code: '103', nameFa: 'مالی و حسابداری', nameEn: 'Finance & Accounting' },
];

const DEFAULT_JOBS: Job[] = [
  {
    id: 1,
    code: '1001',
    titleFa: 'توسعه‌دهنده فرانت‌اند',
    titleEn: 'Frontend Developer',
    groupId: 2,
    isActive: true,
  },
  {
    id: 2,
    code: '1002',
    titleFa: 'مدیر منابع انسانی',
    titleEn: 'HR Manager',
    groupId: 3,
    isActive: true,
  },
  {
    id: 3,
    code: '1003',
    titleFa: 'حسابدار ارشد',
    titleEn: 'Senior Accountant',
    groupId: 4,
    isActive: false,
  },
  {
    id: 4,
    code: '1004',
    titleFa: 'کارشناس پشتیبانی',
    titleEn: 'Support Specialist',
    groupId: null,
    isActive: true,
  },
];

@Injectable({
  providedIn: 'root',
})
export class JobService {
  readonly DEFAULT_GROUP_ID = 1;

  private snackBar = inject(MatSnackBar);
  private userService = inject(UserService);

  jobGroups = signal<JobGroup[]>([]);
  jobs = signal<Job[]>([]);

  constructor() {
    this.loadGroups();
    this.loadJobs();
  }

  public notify(message: string) {
    this.snackBar.open(message, 'بستن', { duration: 3000 });
  }

  private loadGroups() {
    const saved = readJson<JobGroup[]>(GROUPS_KEY);
    const valid = Array.isArray(saved) && saved.length > 0;
    this.jobGroups.set(valid ? saved : DEFAULT_GROUPS.map((g) => ({ ...g })));
    if (!valid) this.saveGroups();
  }

  private loadJobs() {
    const saved = readJson<Job[]>(JOBS_KEY);
    const valid = Array.isArray(saved);
    this.jobs.set(valid ? saved : DEFAULT_JOBS.map((j) => ({ ...j })));
    if (!valid) this.saveJobs();
  }

  private saveGroups() {
    localStorage.setItem(GROUPS_KEY, JSON.stringify(this.jobGroups()));
  }

  private saveJobs() {
    localStorage.setItem(JOBS_KEY, JSON.stringify(this.jobs()));
  }

  private nextId(list: { id: number }[]): number {
    return list.length ? Math.max(...list.map((x) => x.id)) + 1 : 1;
  }

  // ---------- نمایش ----------

  getJobDisplay(code: string | number): string {
    const c = String(code ?? '').trim();
    const job =
      this.jobs().find((j) => String(j.code).trim() === c) ??
      this.jobs().find((j) => String(j.id) === c);
    if (!job) return c;
    return job.titleFa || job.titleEn || String(job.code);
  }

  getGroupDisplay(groupId: number | null): string {
    const group = this.jobGroups().find((g) => g.id === groupId);
    if (!group) return '---';
    return group.nameFa || group.nameEn;
  }

  /** شغل‌های فعال؛ اگر شغل فعلیِ کاربر غیرفعال/قدیمی باشد هم به لیست اضافه می‌شود تا انتخاب خالی نشود */
  getJobOptions(includeCode?: string | null): SelectOption[] {
    const options = this.jobs()
      .filter((j) => j.isActive)
      .map((j) => ({ label: j.titleFa || j.titleEn, value: j.code }));
    if (includeCode && !options.some((o) => o.value === includeCode)) {
      options.push({ label: this.getJobDisplay(includeCode), value: includeCode });
    }
    return options;
  }

  getGroupOptions(): SelectOption[] {
    return this.jobGroups().map((g) => ({ label: g.nameFa || g.nameEn, value: g.id }));
  }

  // ---------- شغل‌ها ----------

  private validateJob(job: Job, excludeId?: number): string | null {
    if (!job.code.trim()) return 'کد شغل را وارد کنید';
    if (!job.titleFa.trim() && !job.titleEn.trim())
      return 'حداقل یکی از عنوان فارسی یا انگلیسی را وارد کنید';

    const others = this.jobs().filter((j) => j.id !== excludeId);
    if (others.some((j) => j.code === job.code)) return 'این کد شغلی قبلا استفاده شده است';
    return null;
  }

  addJob(data: Omit<Job, 'id'>): boolean {
    const error = this.validateJob(data as Job);
    if (error) {
      this.notify(error);
      return false;
    }
    const newJob: Job = { ...data, id: this.nextId(this.jobs()) };
    this.jobs.update((list) => [...list, newJob]);
    this.saveJobs();
    this.notify('شغل جدید اضافه شد');
    return true;
  }

  updateJob(id: number, data: Omit<Job, 'id'>): boolean {
    const error = this.validateJob(data as Job, id);
    if (error) {
      this.notify(error);
      return false;
    }
    this.jobs.update((list) => list.map((j) => (j.id === id ? { ...data, id } : j)));
    this.saveJobs();
    this.notify('شغل ویرایش شد');
    return true;
  }

  deleteJob(id: number): boolean {
    const job = this.jobs().find((j) => j.id === id);
    if (!job) return false;

    const usedBy = this.userService
      .users()
      .filter((u) => String(u.job).trim() === String(job.code).trim()).length;

    if (usedBy > 0) {
      this.notify(`این شغل به ${usedBy} کاربر اختصاص داده شده است و قابل حذف نیست.`);
      return false;
    }

    this.jobs.update((list) => list.filter((j) => j.id !== id));
    this.saveJobs();
    this.notify('شغل حذف شد');
    return true;
  }

  toggleJobActive(id: number): void {
    this.jobs.update((list) =>
      list.map((j) => (j.id === id ? { ...j, isActive: !j.isActive } : j)),
    );
    this.saveJobs();
  }

  getGroupJobCount(groupId: number): number {
    return this.jobs().filter((j) => (j.groupId ?? this.DEFAULT_GROUP_ID) === groupId).length;
  }

  // ---------- گروه‌ها ----------

  private validateGroup(group: JobGroup, excludeId?: number): string | null {
    if (!group.code.trim()) return 'کد گروه را وارد کنید';
    if (!group.nameFa.trim() && !group.nameEn.trim())
      return 'حداقل یکی از نام فارسی یا انگلیسی گروه را وارد کنید';

    const others = this.jobGroups().filter((g) => g.id !== excludeId);
    if (others.some((g) => g.code === group.code)) return 'این کد گروه قبلا استفاده شده است';
    return null;
  }

  addGroup(data: Omit<JobGroup, 'id' | 'isDefault'>): boolean {
    const error = this.validateGroup(data as JobGroup);
    if (error) {
      this.notify(error);
      return false;
    }
    const newGroup: JobGroup = { ...data, id: this.nextId(this.jobGroups()) };
    this.jobGroups.update((list) => [...list, newGroup]);
    this.saveGroups();
    this.notify('گروه شغلی جدید اضافه شد');
    return true;
  }

  updateGroup(id: number, data: Omit<JobGroup, 'id' | 'isDefault'>): boolean {
    const error = this.validateGroup(data as JobGroup, id);
    if (error) {
      this.notify(error);
      return false;
    }
    this.jobGroups.update((list) => list.map((g) => (g.id === id ? { ...g, ...data } : g)));
    this.saveGroups();
    this.notify('گروه شغلی ویرایش شد');
    return true;
  }

  moveToUnassigned(jobId: number) {
    this.jobs.update((list) =>
      list.map((job) => (job.id === jobId ? { ...job, groupId: this.DEFAULT_GROUP_ID } : job)),
    );
    this.saveJobs();
  }
  // انتقال شغل‌های مربوط به گروه حذف‌شده به گروه جدید و سپس حذف گروه شغلی
  transferJobsAndDeleteGroup(sourceGroupId: number, targetGroupId: number) {
    // ۱. به‌روزرسانی گروه شغل‌های متصل به شناسه جدید
    this.jobs.update((jobs) =>
      jobs.map((j) => (j.groupId === sourceGroupId ? { ...j, groupId: targetGroupId } : j)),
    );
    this.saveJobs();

    // ۲. حذف خود گروه شغلی از لیست گروه‌ها
    this.deleteGroup(sourceGroupId);
  }

  deleteGroup(groupId: number) {
    this.jobGroups.update((groups: JobGroup[]) => groups.filter((g) => g.id !== groupId));
    this.saveGroups();
  }
}
