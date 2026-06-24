import fs from "node:fs";
import path from "node:path";
import { v4 as uuidv4 } from "uuid";

export type UserRecord = {
  id: string;
  nome: string;
  email: string;
  senha_hash: string;
  ativo: boolean;
  created_at: string;
};

type DatabaseFile = {
  users: UserRecord[];
};

const dataDirectoryPath = path.resolve(process.cwd(), "data");
const databasePath = path.join(dataDirectoryPath, "auth.json");
const MOCK_USERS = [
  {
    nome: "Kaua Fraga",
    email: "kaua@email.com"
  },
  {
    nome: "Maria Silva",
    email: "maria@email.com"
  }
];

function ensureDataDirectory() {
  fs.mkdirSync(dataDirectoryPath, { recursive: true });
}

function readDatabase(): DatabaseFile {
  ensureDataDirectory();

  if (!fs.existsSync(databasePath)) {
    return { users: [] };
  }

  try {
    const rawContent = fs.readFileSync(databasePath, "utf8");
    const parsedContent = JSON.parse(rawContent) as Partial<DatabaseFile>;

    if (!Array.isArray(parsedContent.users)) {
      return { users: [] };
    }

    return {
      users: parsedContent.users.filter((user): user is UserRecord => {
        return Boolean(
          user &&
            typeof user.id === "string" &&
            typeof user.nome === "string" &&
            typeof user.email === "string" &&
            typeof user.senha_hash === "string" &&
            typeof user.ativo === "boolean" &&
            typeof user.created_at === "string"
        );
      })
    };
  } catch {
    return { users: [] };
  }
}

function writeDatabase(database: DatabaseFile) {
  ensureDataDirectory();

  fs.writeFileSync(databasePath, `${JSON.stringify(database, null, 2)}\n`, "utf8");
}

export function listUsers(): UserRecord[] {
  return readDatabase().users;
}

export function findUserByEmail(email: string): UserRecord | null {
  return listUsers().find((user) => user.email === email) ?? null;
}

export function findUserById(id: string): UserRecord | null {
  return listUsers().find((user) => user.id === id) ?? null;
}

export function insertUser(user: UserRecord): UserRecord {
  const users = listUsers();
  const nextUsers = [...users, user];

  writeDatabase({ users: nextUsers });

  return user;
}

export function seedMockUsers(hashPassword: (value: string) => Promise<string> | string) {
  const users = listUsers();
  const knownEmails = new Set(users.map((user) => user.email));

  const missingUsers = MOCK_USERS.filter((user) => !knownEmails.has(user.email));

  if (missingUsers.length === 0) {
    return;
  }

  const seededUsers: UserRecord[] = [];

  for (const mockUser of missingUsers) {
    const senha_hash = hashPassword("123456");
    if (senha_hash instanceof Promise) {
      throw new Error("seedMockUsers expects a synchronous hash function");
    }

    seededUsers.push({
      id: uuidv4(),
      nome: mockUser.nome,
      email: mockUser.email,
      senha_hash,
      ativo: true,
      created_at: new Date().toISOString()
    });
  }

  writeDatabase({ users: [...users, ...seededUsers] });
}

