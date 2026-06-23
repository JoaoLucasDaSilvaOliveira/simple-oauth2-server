import { database } from "../database";
import { User } from "../models/user.model";

type UserRow = {
  id: string;
  nome: string;
  email: string;
  senha_hash: string;
  ativo: number;
  created_at: string;
};

function mapUserRow(row: UserRow | undefined): User | null {
  if (!row) {
    return null;
  }

  // No SQLite, o campo ativo vem como 0 ou 1; aqui ele vira boolean.
  return {
    id: row.id,
    nome: row.nome,
    email: row.email,
    senha_hash: row.senha_hash,
    ativo: row.ativo === 1,
    created_at: row.created_at
  };
}

export function createUser(user: User): User {
  // O repository cuida apenas de SQL e mapeamento de dados.
  const statement = database.prepare(`
    INSERT INTO users (id, nome, email, senha_hash, ativo, created_at)
    VALUES (@id, @nome, @email, @senha_hash, @ativo, @created_at)
  `);

  statement.run({
    ...user,
    ativo: user.ativo ? 1 : 0
  });

  return user;
}

export function findUserByEmail(email: string): User | null {
  const statement = database.prepare(`
    SELECT id, nome, email, senha_hash, ativo, created_at
    FROM users
    WHERE email = ?
  `);

  const row = statement.get(email) as UserRow | undefined;
  return mapUserRow(row);
}

export function findUserById(id: string): User | null {
  const statement = database.prepare(`
    SELECT id, nome, email, senha_hash, ativo, created_at
    FROM users
    WHERE id = ?
  `);

  const row = statement.get(id) as UserRow | undefined;
  return mapUserRow(row);
}
