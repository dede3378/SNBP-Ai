import { randomUUID } from "crypto";
import * as fs from "fs";
import * as path from "path";

export interface AppUser {
  id: string;
  username: string;
  password: string;
  role: "admin" | "user";
  nama: string;
}

const USERS_FILE = path.join(process.cwd(), "data", "users.json");

const DEFAULT_ADMIN: AppUser = {
  id: "admin-1",
  username: "attin",
  password: "snbp2026",
  role: "admin",
  nama: "Admin Attin",
};

function readUsers(): AppUser[] {
  try {
    if (!fs.existsSync(USERS_FILE)) {
      fs.mkdirSync(path.dirname(USERS_FILE), { recursive: true });
      fs.writeFileSync(USERS_FILE, JSON.stringify([DEFAULT_ADMIN], null, 2));
      return [DEFAULT_ADMIN];
    }
    const raw = fs.readFileSync(USERS_FILE, "utf-8");
    const arr = JSON.parse(raw) as AppUser[];
    if (arr.length === 0) {
      arr.push(DEFAULT_ADMIN);
      writeUsers(arr);
    }
    return arr;
  } catch {
    return [DEFAULT_ADMIN];
  }
}

function writeUsers(users: AppUser[]) {
  try {
    fs.mkdirSync(path.dirname(USERS_FILE), { recursive: true });
    fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2));
  } catch (e) {
    console.error("Failed to write users:", e);
  }
}

export const storage = {
  getAllUsers(): AppUser[] {
    return readUsers();
  },

  getUserByUsername(username: string): AppUser | undefined {
    return readUsers().find(u => u.username.toLowerCase() === username.toLowerCase());
  },

  createUser(data: Omit<AppUser, "id">): AppUser {
    const users = readUsers();
    const newUser: AppUser = { ...data, id: randomUUID() };
    users.push(newUser);
    writeUsers(users);
    return newUser;
  },

  updateUser(id: string, updates: Partial<Omit<AppUser, "id">>): AppUser | null {
    const users = readUsers();
    const idx = users.findIndex(u => u.id === id);
    if (idx === -1) return null;
    users[idx] = { ...users[idx], ...updates };
    writeUsers(users);
    return users[idx];
  },

  deleteUser(id: string): boolean {
    const users = readUsers();
    const filtered = users.filter(u => u.id !== id);
    if (filtered.length === users.length) return false;
    writeUsers(filtered);
    return true;
  },
};

export type { AppUser as User };
