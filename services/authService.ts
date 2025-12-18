
import { User, UserRole, UserPermissions } from '../types';
import { ADMIN_CODE } from '../constants';

const USERS_STORAGE_KEY = 'kmrcl_users';
const CURRENT_USER_KEY = 'kmrcl_current_user';
const ADMIN_CODE_KEY = 'kmrcl_admin_code';

// Default permissions for new users (all false until approved/assigned)
const DEFAULT_USER_PERMISSIONS: UserPermissions = {
    driveBrowser: false,
    docAnalysis: false,
    intelligenceHub: {
        metroRag: false,
        general: false,
        email: false,
        letter: false
    }
};

// Admin always has full permissions
const FULL_ADMIN_PERMISSIONS: UserPermissions = {
    driveBrowser: true,
    docAnalysis: true,
    intelligenceHub: {
        metroRag: true,
        general: true,
        email: true,
        letter: true
    }
};

// Mock Initial Admin
const ADMIN_USER: User = {
  id: 'admin-001',
  name: 'Chief Engineer',
  email: 'admin@kmrcl.com',
  role: 'ADMIN',
  status: 'APPROVED',
  password: 'admin',
  permissions: FULL_ADMIN_PERMISSIONS
};

export const authService = {
  // Initialize storage with admin if empty
  init: () => {
    const users = localStorage.getItem(USERS_STORAGE_KEY);
    if (!users) {
      localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify([ADMIN_USER]));
    }
    // Initialize admin code if not present
    if (!localStorage.getItem(ADMIN_CODE_KEY)) {
        localStorage.setItem(ADMIN_CODE_KEY, ADMIN_CODE);
    }
  },

  loginAsAdmin: async (code: string): Promise<{ success: boolean; user?: User; error?: string }> => {
    const storedCode = localStorage.getItem(ADMIN_CODE_KEY) || ADMIN_CODE;
    
    if (code === storedCode) {
      const users = JSON.parse(localStorage.getItem(USERS_STORAGE_KEY) || '[]');
      const adminIndex = users.findIndex((u: User) => u.role === 'ADMIN');
      
      if (adminIndex !== -1) {
        // Ensure admin object has full permissions structure (backward compatibility)
        users[adminIndex].permissions = FULL_ADMIN_PERMISSIONS;
        
        // Update last login
        users[adminIndex].lastLogin = new Date().toISOString();
        localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(users));
        
        const admin = users[adminIndex];
        localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(admin));
        return { success: true, user: admin };
      }
    }
    return { success: false, error: 'Invalid Admin Access Code' };
  },

  loginAsUser: async (email: string): Promise<{ success: boolean; user?: User; error?: string }> => {
    const users = JSON.parse(localStorage.getItem(USERS_STORAGE_KEY) || '[]');
    const userIndex = users.findIndex((u: User) => u.email === email);
    const user = users[userIndex];

    if (!user) return { success: false, error: 'User not found.' };
    if (user.status === 'PENDING') return { success: false, error: 'Account pending Admin approval.' };
    if (user.status === 'REJECTED') return { success: false, error: 'Account rejected by Admin.' };

    // Ensure permissions exist for older user records
    if (!user.permissions) {
        user.permissions = DEFAULT_USER_PERMISSIONS;
        users[userIndex] = user;
    }

    // Update last login
    users[userIndex].lastLogin = new Date().toISOString();
    localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(users));

    localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(users[userIndex]));
    return { success: true, user: users[userIndex] };
  },

  signup: async (name: string, email: string, mobile: string): Promise<{ success: boolean; error?: string }> => {
    const users = JSON.parse(localStorage.getItem(USERS_STORAGE_KEY) || '[]');
    
    if (users.find((u: User) => u.email === email)) {
      return { success: false, error: 'Email already registered.' };
    }

    const newUser: User = {
      id: Date.now().toString(),
      name,
      email,
      mobile,
      role: 'USER',
      status: 'PENDING',
      permissions: DEFAULT_USER_PERMISSIONS
    };

    users.push(newUser);
    localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(users));
    return { success: true };
  },

  logout: () => {
    localStorage.removeItem(CURRENT_USER_KEY);
  },

  getCurrentUser: (): User | null => {
    const stored = localStorage.getItem(CURRENT_USER_KEY);
    return stored ? JSON.parse(stored) : null;
  },

  // --- Admin Functions ---

  getAllUsers: (): User[] => {
    const users = JSON.parse(localStorage.getItem(USERS_STORAGE_KEY) || '[]');
    // Backfill permissions if missing
    return users.map((u: User) => ({
        ...u,
        permissions: u.permissions || DEFAULT_USER_PERMISSIONS
    }));
  },

  getPendingUsers: (): User[] => {
    const users = JSON.parse(localStorage.getItem(USERS_STORAGE_KEY) || '[]');
    return users.filter((u: User) => u.status === 'PENDING');
  },

  updateUserStatus: (userId: string, status: 'APPROVED' | 'REJECTED') => {
    const users = JSON.parse(localStorage.getItem(USERS_STORAGE_KEY) || '[]');
    const updatedUsers = users.map((u: User) => 
      u.id === userId ? { ...u, status } : u
    );
    localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(updatedUsers));
  },
  
  updateUserPermissions: (userId: string, permissions: UserPermissions) => {
    const users = JSON.parse(localStorage.getItem(USERS_STORAGE_KEY) || '[]');
    const updatedUsers = users.map((u: User) => 
      u.id === userId ? { ...u, permissions } : u
    );
    localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(updatedUsers));
  },

  changeAdminCode: (newCode: string) => {
      localStorage.setItem(ADMIN_CODE_KEY, newCode);
  }
};

// Initialize on load
authService.init();
