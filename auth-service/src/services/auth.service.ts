import bcrypt from "bcrypt";
import jwt, { JwtPayload } from "jsonwebtoken";
import { v4 as uuidv4 } from "uuid";
import {
  createUser,
  findUserByEmail,
  findUserById
} from "../repositories/user.repository";
import { CreateUserInput, LoginInput, PublicUser, User } from "../models/user.model";

const SALT_ROUNDS = 10;
const TOKEN_EXPIRATION_SECONDS = 3600;

class AppError extends Error {
  statusCode: number;

  constructor(message: string, statusCode: number) {
    super(message);
    this.name = "AppError";
    this.statusCode = statusCode;
  }
}

function getJwtSecret(): string {
  const jwtSecret = process.env.JWT_SECRET;

  if (!jwtSecret) {
    throw new AppError("Erro interno no servidor", 500);
  }

  return jwtSecret;
}

function toPublicUser(user: User): PublicUser {
  // Nunca devolvemos senha ou hash para o cliente.
  return {
    id: user.id,
    nome: user.nome,
    email: user.email,
    ativo: user.ativo
  };
}

function getUserIdFromAuthorizationHeader(authorizationHeader?: string): string {
  // A rota /me espera um header no formato: Bearer TOKEN
  if (!authorizationHeader || !authorizationHeader.startsWith("Bearer ")) {
    throw new AppError("Token invalido ou ausente", 401);
  }

  const token = authorizationHeader.slice("Bearer ".length).trim();

  try {
    const decodedToken = jwt.verify(token, getJwtSecret());

    if (typeof decodedToken === "string" || typeof (decodedToken as JwtPayload).sub !== "string") {
      throw new AppError("Token invalido ou ausente", 401);
    }

    return (decodedToken as JwtPayload).sub as string;
  } catch {
    throw new AppError("Token invalido ou ausente", 401);
  }
}

export async function register(input: Partial<CreateUserInput>) {
  // Verifica se os campos principais foram enviados.
  if (!input.nome || !input.email || !input.senha) {
    throw new AppError("Dados invalidos", 400);
  }

  const nome = input.nome.trim();
  const email = input.email.trim().toLowerCase();
  const senha = input.senha;

  if (!nome || !email || !senha) {
    throw new AppError("Dados invalidos", 400);
  }

  // Impede cadastro com email repetido.
  const existingUser = findUserByEmail(email);

  if (existingUser) {
    throw new AppError("E-mail ja cadastrado", 409);
  }

  //  Gera o hash da senha antes de salvar no banco.
  const senha_hash = await bcrypt.hash(senha, SALT_ROUNDS);

  //  Salva o usuario no SQLite.
  const user = createUser({
    id: uuidv4(),
    nome,
    email,
    senha_hash,
    ativo: true,
    created_at: new Date().toISOString()
  });

  //  Retorna apenas os dados publicos do usuario.
  return {
    message: "Usuario cadastrado com sucesso",
    user: toPublicUser(user)
  };
}

export async function login(input: Partial<LoginInput>) {
  // 1. Verifica se email e senha foram enviados.
  if (!input.email || !input.senha) {
    throw new AppError("Dados invalidos", 400);
  }

  const email = input.email.trim().toLowerCase();
  const senha = input.senha;

  if (!email || !senha) {
    throw new AppError("Dados invalidos", 400);
  }

  //  Busca o usuario no banco pelo email.
  const user = findUserByEmail(email);

  if (!user) {
    throw new AppError("Credenciais invalidas", 401);
  }

  //  Compara a senha enviada com o hash salvo no banco.
  const passwordMatches = await bcrypt.compare(senha, user.senha_hash);

  if (!passwordMatches) {
    throw new AppError("Credenciais invalidas", 401);
  }

  //  Gera o JWT que sera devolvido para quem chamou o login.
  const accessToken = jwt.sign(
    {
      email: user.email
    },
    getJwtSecret(),
    {
      subject: user.id,
      expiresIn: "1h"
    }
  );

  return {
    accessToken,
    tokenType: "Bearer",
    expiresIn: TOKEN_EXPIRATION_SECONDS
  };
}

export async function getAuthenticatedUser(authorizationHeader?: string) {
  //  Le o token e extrai o id do usuario salvo no campo sub.
  const userId = getUserIdFromAuthorizationHeader(authorizationHeader);

  //  Busca o usuario no banco.
  const user = findUserById(userId);

  if (!user) {
    throw new AppError("Token invalido ou ausente", 401);
  }

  //  Retorna apenas os dados publicos.
  return toPublicUser(user);
}

export function isAppError(error: unknown): error is AppError {
  return error instanceof AppError;
}
