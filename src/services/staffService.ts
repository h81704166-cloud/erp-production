import { User, UserRole } from '../types/erp';
import { ERPDatabase } from './db';
import { apiUrl } from '../config/api';

export interface CreateStaffPayload {
  name: string;
  email: string;
  phone?: string;
  role: UserRole;
  pin?: string;
  companyId?: string;
}

export interface UpdateStaffPayload {
  name?: string;
  email?: string;
  phone?: string;
  role?: UserRole;
  isActive?: boolean;
}

export const StaffService = {
  async fetchStaffList(companyId?: string): Promise<User[]> {
    try {
      const token = ERPDatabase.getJwtToken();
      const res = await fetch(apiUrl('/api/staff'), {
        headers: {
          'Authorization': `Bearer ${token}`,
          'X-Company-ID': companyId || ERPDatabase.getCompany().id,
        },
      });
      if (res.ok) {
        const data = await res.json();
        if (data.success && Array.isArray(data.staff)) {
          const serverUsers = data.staff.map((s: any) => ({
            id: s.id,
            name: s.name,
            email: s.email,
            phone: s.phone || '',
            role: s.role as UserRole,
            companyId: s.company_id || s.companyId,
            status: (s.is_active === false || s.status === 'inactive' || s.status === 'deleted') ? 'inactive' : 'active',
            createdAt: s.created_at || new Date().toISOString(),
          }));
          return serverUsers;
        }
      }
    } catch (e) {
      console.warn('[StaffService] Server fetch failed, using local DB:', e);
    }
    return ERPDatabase.getUsers().filter((u) => !companyId || u.companyId === companyId);
  },

  async createStaff(payload: CreateStaffPayload): Promise<{ success: boolean; message: string; staff?: User; error?: string }> {
    try {
      const token = ERPDatabase.getJwtToken();
      const res = await fetch(apiUrl('/api/staff'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        return { success: false, message: data.error || 'Failed to create staff member', error: data.error };
      }

      const createdStaff = ERPDatabase.addUser({
        companyId: payload.companyId || ERPDatabase.getCompany().id,
        name: payload.name,
        email: payload.email,
        phone: payload.phone || '',
        role: payload.role,
        status: 'active',
      });
      if (payload.pin) {
        ERPDatabase.updateUserPassword(payload.email, payload.pin);
      }

      return { success: true, message: data.message, staff: createdStaff };
    } catch (e: any) {
      console.warn('[StaffService] Server create failed, using local fallback:', e);
      const created = ERPDatabase.addUser({
        companyId: payload.companyId || ERPDatabase.getCompany().id,
        name: payload.name,
        email: payload.email,
        phone: payload.phone || '',
        role: payload.role,
        status: 'active',
      });
      if (payload.pin) {
        ERPDatabase.updateUserPassword(payload.email, payload.pin);
      }
      return { success: true, message: `Staff "${payload.name}" created (Offline mode)`, staff: created };
    }
  },

  async updateStaff(staffId: string, payload: UpdateStaffPayload): Promise<{ success: boolean; message: string; error?: string }> {
    try {
      const token = ERPDatabase.getJwtToken();
      const res = await fetch(apiUrl(`/api/staff/${staffId}`), {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        return { success: false, message: data.error || 'Failed to update staff member', error: data.error };
      }

      ERPDatabase.updateUser(staffId, {
        name: payload.name,
        email: payload.email,
        phone: payload.phone,
        role: payload.role,
        status: payload.isActive === false ? 'inactive' : 'active',
      });

      return { success: true, message: data.message };
    } catch (e: any) {
      console.warn('[StaffService] Server update failed, using local fallback:', e);
      ERPDatabase.updateUser(staffId, {
        name: payload.name,
        email: payload.email,
        phone: payload.phone,
        role: payload.role,
      });
      return { success: true, message: 'Staff updated locally' };
    }
  },

  async resetStaffPassword(staffId: string, newPin: string): Promise<{ success: boolean; message: string; error?: string }> {
    try {
      const token = ERPDatabase.getJwtToken();
      const res = await fetch(apiUrl(`/api/staff/${staffId}/reset-password`), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ newPin }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        return { success: false, message: data.error || 'Failed to reset PIN', error: data.error };
      }

      const users = ERPDatabase.getUsers();
      const targetUser = users.find((u) => u.id === staffId);
      if (targetUser) {
        ERPDatabase.updateUserPassword(targetUser.email, newPin);
      }

      return { success: true, message: data.message };
    } catch (e: any) {
      console.warn('[StaffService] Server reset-password failed, using local fallback:', e);
      const users = ERPDatabase.getUsers();
      const targetUser = users.find((u) => u.id === staffId);
      if (targetUser) {
        ERPDatabase.updateUserPassword(targetUser.email, newPin);
      }
      return { success: true, message: 'PIN reset locally' };
    }
  },

  async deleteStaff(staffId: string): Promise<{ success: boolean; message: string; error?: string }> {
    try {
      const token = ERPDatabase.getJwtToken();
      const res = await fetch(apiUrl(`/api/staff/${staffId}`), {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        return { success: false, message: data.error || 'Failed to delete staff member', error: data.error };
      }

      ERPDatabase.deleteUser(staffId);
      return { success: true, message: data.message };
    } catch (e: any) {
      console.warn('[StaffService] Server delete failed, using local fallback:', e);
      ERPDatabase.deleteUser(staffId);
      return { success: true, message: 'Staff removed locally' };
    }
  },
};
