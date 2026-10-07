// import { Component, computed, inject, signal } from '@angular/core';
// import { JobService } from '../services/jobservice';
// import { MatDialogRef } from '@angular/material/dialog';
// import { MatIconModule } from '@angular/material/icon';

// @Component({
//   selector: 'app-select-job-dialog',
//   imports: [MatIconModule],
//   templateUrl: './select-job-dialog.html',
//   styleUrl: './select-job-dialog.css',
// })
// export class SelectJobDialog {
//   private dialogRef = inject(MatDialogRef<SelectJobDialog>);
//   private jobService = inject(JobService);
//   searchTerm = signal('');

//   jobs = this.jobService.jobs;
//   filteredJobs = computed(() => {
//     let list = this.jobs();

//     const term = this.searchTerm().trim().toLowerCase();

//     if (term) {
//       list = list.filter((u) => u.toLowerCase().includes(term));
//     }

//     return list; 
//   });
//   performSearch(value: string) {
//     this.searchTerm.set(value);
//   }

//   clearSearch(inputEl: HTMLInputElement) {
//     inputEl.value = '';
//     this.searchTerm.set('');
//   }

//   selectedJob: string | null = null;

//   select(job: string) {
//     this.selectedJob = job;
//   }

//   save() {
//     if (!this.selectedJob) return;
//     this.dialogRef.close(this.selectedJob);
//   }

//   cancel() {
//     this.dialogRef.close(null);
//   }
// }
