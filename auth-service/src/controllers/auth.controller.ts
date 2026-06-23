import { FastifyReply, FastifyRequest } from "fastify";
import {
  getAuthenticatedUser,
  isAppError,
  login as loginService,
  register as registerService
} from "../services/auth.service";
import { CreateUserInput, LoginInput } from "../models/user.model";

function sendErrorReply(reply: FastifyReply, error: unknown) {
  // Se o erro veio do service, usamos o status e a mensagem definidos por ele.
  if (isAppError(error)) {
    return reply.status(error.statusCode).send({ message: error.message });
  }

  // Qualquer outro erro cai como erro interno do servidor.
  return reply.status(500).send({ message: "Erro interno no servidor" });
}

export async function register(request: FastifyRequest, reply: FastifyReply) {
  try {
    // Recebe os dados do body e repassa para a regra de negocio.
    const body = (request.body ?? {}) as Partial<CreateUserInput>;
    const response = await registerService(body);
    return reply.status(201).send(response);
  } catch (error) {
    return sendErrorReply(reply, error);
  }
}

export async function login(request: FastifyRequest, reply: FastifyReply) {
  try {
    // Recebe email e senha e devolve o token gerado pelo service.
    const body = (request.body ?? {}) as Partial<LoginInput>;
    const response = await loginService(body);
    return reply.status(200).send(response);
  } catch (error) {
    return sendErrorReply(reply, error);
  }
}

export async function me(request: FastifyRequest, reply: FastifyReply) {
  try {
    // Le o token Bearer do header Authorization e pede o usuario autenticado.
    const response = await getAuthenticatedUser(request.headers.authorization);
    return reply.status(200).send(response);
  } catch (error) {
    return sendErrorReply(reply, error);
  }
}
