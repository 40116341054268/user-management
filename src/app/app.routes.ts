import { Routes } from '@angular/router';
import { Register } from './register/register';
import { Home } from './home/home';
import { Layout } from './layout/layout';
import { Login } from './pages/login/login';
import { Dashboard } from './pages/dashboard/dashboard';
import { authGuard, adminGuard } from './auth-guard';
import { Profile } from './profile/profile';
import { JobGroupManagementComponent } from './job-groups.component/job-groups.component';
import { JobManagementComponent } from './pages/jobs/job-management.component';
import { RoleManagementComponent } from './role-management.component/role-management.component';

export const routes: Routes = [
  { path: '', redirectTo: 'login', pathMatch: 'full' },
  { path: 'login', component: Login },
  { path: 'register', component: Register },
  {
    path: '',
    component: Layout,
    canActivate: [authGuard],
    children: [
      { path: 'home', component: Home },
      { path: 'dashboard', component: Dashboard },
      { path: 'Profile', component: Profile },
      { path: 'jobs', component: JobManagementComponent, canActivate: [adminGuard] },
      { path: 'job-groups', component: JobGroupManagementComponent, canActivate: [adminGuard] },
      { path: 'roles', component: RoleManagementComponent, canActivate: [adminGuard] },
    ],
  },
];
