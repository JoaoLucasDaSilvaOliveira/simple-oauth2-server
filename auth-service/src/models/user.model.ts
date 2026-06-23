export interface User {
  id: string;
  nome: string;
  email: string;
  senha_hash: string;
  ativo: boolean;
  created_at: string;
}

export interface PublicUser {
  id: string;
  nome: string;
  email: string;
  ativo: boolean;
}

export interface CreateUserInput {
  nome: string;
  email: string;
  senha: string;
}

export interface LoginInput {
  email: string;
  senha: string;
}
