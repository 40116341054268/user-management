import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatButtonModule } from '@angular/material/button';
import { AuthService } from '../../services/auth';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar } from '@angular/material/snack-bar';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatInputModule,
    MatFormFieldModule,
    MatButtonModule,
    RouterLink,
    MatIconModule,
  ],
  templateUrl: './login.html',
  styleUrl: './login.css',
})
export class Login {
  private authService = inject(AuthService);
  private router = inject(Router);
  private snackBar = inject(MatSnackBar);

  private showMessage(message: string) {
    this.snackBar.open(message, 'بستن', { duration: 3000, panelClass: ['custom-snackbar'] });
  }

  error = false;

  hidePassword = true;

  togglePasswordVisibility() {
    this.hidePassword = !this.hidePassword;
  }

  loginForm = new FormGroup({
    username: new FormControl(''),
    password: new FormControl(''),
  });

  onLogin() {
    const { username, password } = this.loginForm.value;
    const success = this.authService.login(username ?? '', password ?? '');

    if (success) {
      this.router.navigate(['/home'], { replaceUrl: true });
      this.showMessage('شما با موفقیت وارد شدید');
    } else {
      this.error = true;
    }
  }

  onGuestLogin() {
    this.authService.loginAsGuest();
    this.showMessage('شما با موفقیت به عنون مهمان وارد شدید');
    this.router.navigate(['/home'], { replaceUrl: true });
  }
}