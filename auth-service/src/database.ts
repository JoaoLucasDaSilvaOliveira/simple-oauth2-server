import fs from "node:fs";
import path from "node:path";
import Database from "better-sqlite3";
import bcrypt from "bcrypt";
import { v4 as uuidv4 } from "uuid";

const dataDirectoryPath = path.resolve(process.cwd(), "data");
const databasePath = path.join(dataDirectoryPath, "auth.db");
const databaseJournalPath = `${databasePath}-journal`;
const MOCK_PASSWORD = "123456";
const mockUsers = [
  {
    nome: "Kaua Fraga",
    email: "kaua@email.com"
  },
  {
    nome: "Maria Silva",
    email: "maria@email.com"
  }
];

// Cria a pasta onde o SQLite sera salvo.
fs.mkdirSync(dataDirectoryPath, { recursive: true });

if (fs.existsSync(databaseJournalPath)) {
  // Limpa um journal antigo para evitar problema local com o SQLite.
  fs.writeFileSync(databaseJournalPath, "");
}

const database = new Database(databasePath);

// Mantem o journal em memoria para o projeto ficar mais estavel localmente.
database.pragma("journal_mode = MEMORY");

// Cria a tabela de usuarios automaticamente quando o servico inicia.
database.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    nome TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    senha_hash TEXT NOT NULL,
    ativo INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL
  );
`);

function seedMockUsers() {
  // Cria usuarios de demonstracao para o projeto ja iniciar com dados prontos.
  for (const mockUser of mockUsers) {
    const existingUser = database
      .prepare("SELECT id FROM users WHERE email = ?")
      .get(mockUser.email);

    // Se o email ja existir, nao cria de novo ao reiniciar o servico.
    if (existingUser) {
      continue;
    }

    const senha_hash = bcrypt.hashSync(MOCK_PASSWORD, 10);

    database
      .prepare(`
        INSERT INTO users (id, nome, email, senha_hash, ativo, created_at)
        VALUES (?, ?, ?, ?, ?, ?)
      `)
      .run(
        uuidv4(),
        mockUser.nome,
        mockUser.email,
        senha_hash,
        1,
        new Date().toISOString()
      );
  }
}

// Roda o seed no boot para facilitar testes locais e apresentacao.
seedMockUsers();

export { database };
