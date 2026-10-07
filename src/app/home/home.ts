import { Component, computed, inject } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatButtonModule } from '@angular/material/button';
import { Router } from '@angular/router';
import { AuthService } from '../services/auth';
import { UserService } from '../services/userservice';
import { RoleService } from '../services/role.service';
import { MatIconModule } from '@angular/material/icon';
import { Layout } from '../layout/layout';
import { GlobalDynamicDialogComponent } from '../shared/global-dialog/global-dialog';

@Component({
  selector: 'app-home',
  imports: [MatButtonModule, MatIconModule],
  templateUrl: './home.html',
  styleUrl: './home.css',
})
export class Home {
  private dialog = inject(MatDialog);
  private snackBar = inject(MatSnackBar);
  private router = inject(Router);
  private authService = inject(AuthService);
  private userService = inject(UserService);
  private layout = inject(Layout);
  private roleService = inject(RoleService);

  private showMessage(message: string) {
    this.snackBar.open(message, 'بستن', { duration: 3000 });
  }

  currentUser = this.authService.currentUser;
  isGuest = this.authService.isGuest;

  roleName = computed(() => this.roleService.getRoleName(this.currentUser()?.role));

  users = this.userService.users;
  totalCount = computed(() => this.users().length);

  goToDashboard() {
    this.router.navigate(['/dashboard']);
  }



  toggleSide() {
    this.layout.isSidenavOpen.update((value) => !value);
  }
  

}
