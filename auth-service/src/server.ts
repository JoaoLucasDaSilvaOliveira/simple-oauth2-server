import dotenv from "dotenv";
import Fastify from "fastify";
import { login, me, register } from "./controllers/auth.controller";
import bcrypt from "bcryptjs";
import { seedMockUsers } from "./database";

// Carrega as variaveis do arquivo .env.
dotenv.config();

seedMockUsers((value) => bcrypt.hashSync(value, 10));

const app = Fastify();

// Registra as tres rotas principais do auth-service.
app.post("/api/auth/register", register);
app.post("/api/auth/login", login);
app.get("/api/auth/me", me);

const port = Number(process.env.PORT || 4000);

async function startServer() {
  try {
    // Sobe o servidor na porta configurada.
    await app.listen({ port, host: "0.0.0.0" });
    console.log(`auth-service running on port ${port}`);
  } catch (error) {
    app.log.error(error);
    process.exit(1);
  }
}

void startServer();
