import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatButtonModule } from '@angular/material/button';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { UserService } from '../services/userservice';
import { MatIconModule } from '@angular/material/icon';
import { MatSelectModule } from '@angular/material/select';
import { JobService } from '../services/jobservice';
import { USER_ROLE_ID } from '../services/userservice';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatInputModule,
    MatFormFieldModule,
    MatButtonModule,
    MatSnackBarModule,
    RouterModule,
    MatIconModule,
    MatSelectModule
],
  templateUrl: './register.html',
  styleUrl: './register.css',
})
export class Register {
  private userService = inject(UserService);
  private router = inject(Router);
  private snackBar = inject(MatSnackBar);
  private jobservice = inject(JobService)
  jobOptions = this.jobservice.getJobOptions();

  usernameTakenError = false;
  emailTakenError = false;

  hidePassword = true;

  togglePasswordVisibility() {
    this.hidePassword = !this.hidePassword;
  }

  registerForm = new FormGroup({
    name: new FormControl('', Validators.required),
    email: new FormControl('', [Validators.required, Validators.email]),
    job: new FormControl('', Validators.required),
    age: new FormControl<number | null>(null, Validators.required),
    username: new FormControl('', Validators.required),
    password: new FormControl('', Validators.required),
  });

  onRegister() {
    if (this.registerForm.invalid) {
      this.registerForm.markAllAsTouched();
      return;
    }

    const { username } = this.registerForm.value;
    const { email } = this.registerForm.value;

    if (this.userService.isEmailTaken(email ?? '')) {
      this.emailTakenError = true;
      this.snackBar.open('ایمیل تکراری است ، لطفا ایمیل معتبری را وارد کنید', 'بستن', {
        duration: 5000,
      });
      return;
    }

    if (this.userService.isUsernameTaken(username ?? '')) {
      this.usernameTakenError = true;
      this.snackBar.open('نام کاربری قبلا انتخاب شده،لطفا نام کاربری دیگری را وارد کنید ', 'بستن', {
        duration: 5000,
      });
      return;
    }

    this.emailTakenError = false;
    this.usernameTakenError = false;
    this.userService.addUser(this.registerForm.value as any, USER_ROLE_ID);

    this.snackBar.open('ثبت‌نام با موفقیت انجام شد، حالا وارد شوید', 'بستن', {
      duration: 3000,
    });

    this.router.navigate(['/login']);
  }
}
