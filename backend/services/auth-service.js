import { randomUUID } from "node:crypto";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { defaultUsers } from "../data/seed-users.js";
import { env } from "../config/env.js";
import { HttpError } from "../lib/http-error.js";

export const userRoles = ["admin", "manager", "technician"];
const LOGIN_ATTEMPT_WINDOW_MS = 15 * 60 * 1000;
const MAX_LOGIN_ATTEMPTS_PER_USER = 5;

const assertSupportedRole = (user) => {
  if (!userRoles.includes(user.role)) {
    throw new HttpError(403, "Este perfil não está mais disponível no sistema.");
  }
};

const normalizeUsername = (value) => value.trim().toLowerCase();

const assertJwtPayload = (payload) => {
  if (!payload || typeof payload !== "object") {
    throw new HttpError(401, "Sessão inválida ou expirada.");
  }

  return payload;
};

const toPublicUser = (user) => ({
  id: user.id,
  username: user.username,
  name: user.name,
  role: user.role,
});

const toManagedUser = (user) => ({
  ...toPublicUser(user),
  isActive: user.isActive,
  createdAt: user.createdAt,
  updatedAt: user.updatedAt,
});

export class AuthService {
  constructor(userRepository) {
    this.userRepository = userRepository;
    this.failedLoginAttempts = new Map();
    this.revokedTokens = new Map();
  }

  async bootstrapUsers() {
    await this.userRepository.deleteByRoles(["viewer"]);

    // Só semeia quando a base de usuários está vazia. Isso evita recriar contas
    // já removidas e garante que uma instalação nova sempre tenha um admin válido
    // (sem isso, ninguém consegue logar nem criar o primeiro acesso).
    const existingUsers = await this.userRepository.count();

    if (existingUsers > 0) {
      return;
    }

    const seedUsers = defaultUsers.map((user) => ({
      id: randomUUID(),
      username: normalizeUsername(user.username),
      name: user.name,
      role: user.role,
      passwordHash: bcrypt.hashSync(user.password, 10),
      isActive: true,
    }));

    const hasAdminSeed = seedUsers.some((user) => user.role === "admin");

    if (!hasAdminSeed && env.bootstrapAdmin.enabled) {
      seedUsers.push({
        id: randomUUID(),
        username: env.bootstrapAdmin.username,
        name: env.bootstrapAdmin.name,
        role: "admin",
        passwordHash: bcrypt.hashSync(env.bootstrapAdmin.password, 10),
        isActive: true,
      });

      console.log(
        `[sst-api] usuário administrador inicial criado (login: "${env.bootstrapAdmin.username}"). Altere a senha após o primeiro acesso.`,
      );
    }

    if (seedUsers.length === 0) {
      return;
    }

    await this.userRepository.seed(seedUsers);
  }

  async listUsers() {
    const users = await this.userRepository.list();
    return users.map((user) => toManagedUser(user));
  }

  async createUser({ username, name, password, role }) {
    if (!userRoles.includes(role)) {
      throw new HttpError(400, "Perfil de acesso inválido.");
    }

    const normalizedUsername = normalizeUsername(username);
    const existingUser = await this.userRepository.findByUsername(
      normalizedUsername,
    );

    if (existingUser) {
      throw new HttpError(409, "Já existe um usuário com esse login.");
    }

    const createdUser = await this.userRepository.create({
      id: randomUUID(),
      username: normalizedUsername,
      name,
      role,
      passwordHash: bcrypt.hashSync(password, 10),
      isActive: true,
    });

    return toManagedUser(createdUser);
  }

  async login({ username, password }) {
    const normalizedUsername = normalizeUsername(username);

    this.pruneExpiredLoginAttempts();
    this.pruneRevokedTokens();
    this.assertLoginAttemptsAllowed(normalizedUsername);

    const user = await this.userRepository.findByUsername(normalizedUsername);

    if (!user || !bcrypt.compareSync(password, user.passwordHash)) {
      this.registerFailedLogin(normalizedUsername);
      throw new HttpError(401, "Usuário ou senha inválidos.");
    }

    if (!user.isActive) {
      this.registerFailedLogin(normalizedUsername);
      throw new HttpError(403, "Usuário desativado.");
    }

    assertSupportedRole(user);
    this.clearFailedLogins(normalizedUsername);

    return {
      token: this.issueToken(user),
      user: toPublicUser(user),
    };
  }

  issueToken(user) {
    return jwt.sign(
      {
        sub: user.id,
        role: user.role,
        username: user.username,
        name: user.name,
      },
      env.jwtSecret,
      {
        expiresIn: env.jwtExpiresIn,
        issuer: "sst-backend",
        audience: "sst-frontend",
        jwtid: randomUUID(),
      },
    );
  }

  registerFailedLogin(username) {
    const currentAttempt = this.failedLoginAttempts.get(username);
    const now = Date.now();

    if (!currentAttempt || currentAttempt.expiresAt <= now) {
      this.failedLoginAttempts.set(username, {
        count: 1,
        expiresAt: now + LOGIN_ATTEMPT_WINDOW_MS,
      });
      return;
    }

    currentAttempt.count += 1;
    this.failedLoginAttempts.set(username, currentAttempt);
  }

  clearFailedLogins(username) {
    this.failedLoginAttempts.delete(username);
  }

  pruneExpiredLoginAttempts() {
    const now = Date.now();

    for (const [username, state] of this.failedLoginAttempts.entries()) {
      if (state.expiresAt <= now) {
        this.failedLoginAttempts.delete(username);
      }
    }
  }

  assertLoginAttemptsAllowed(username) {
    const currentAttempt = this.failedLoginAttempts.get(username);

    if (!currentAttempt) {
      return;
    }

    if (currentAttempt.count >= MAX_LOGIN_ATTEMPTS_PER_USER) {
      throw new HttpError(
        429,
        "Muitas tentativas para este usuário. Aguarde alguns minutos antes de tentar novamente.",
      );
    }
  }

  pruneRevokedTokens() {
    const now = Date.now();

    for (const [tokenId, expiresAt] of this.revokedTokens.entries()) {
      if (expiresAt <= now) {
        this.revokedTokens.delete(tokenId);
      }
    }
  }

  async logout(token) {
    this.pruneRevokedTokens();

    const payload = assertJwtPayload(
      jwt.verify(token, env.jwtSecret, {
        issuer: "sst-backend",
        audience: "sst-frontend",
      }),
    );

    if (payload.jti && payload.exp) {
      this.revokedTokens.set(payload.jti, payload.exp * 1000);
    }
  }

  async verifyAccessToken(token) {
    try {
      this.pruneRevokedTokens();

      const payload = assertJwtPayload(
        jwt.verify(token, env.jwtSecret, {
          issuer: "sst-backend",
          audience: "sst-frontend",
        }),
      );

      if (payload.jti && this.revokedTokens.has(payload.jti)) {
        throw new HttpError(401, "Sessão inválida ou expirada.");
      }

      const user = await this.userRepository.findById(String(payload.sub));

      if (!user || !user.isActive) {
        throw new HttpError(401, "Sessão inválida ou expirada.");
      }

      assertSupportedRole(user);

      return toPublicUser(user);
    } catch (error) {
      if (error instanceof HttpError) {
        throw error;
      }

      throw new HttpError(401, "Sessão inválida ou expirada.");
    }
  }

  async getCurrentUser(userId) {
    const user = await this.userRepository.findById(userId);

    if (!user || !user.isActive) {
      throw new HttpError(401, "Sessão inválida ou expirada.");
    }

    assertSupportedRole(user);

    return toPublicUser(user);
  }
}