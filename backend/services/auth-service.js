import { randomUUID } from "node:crypto";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { defaultUsers } from "../data/seed-users.js";
import { env } from "../config/env.js";
import { HttpError } from "../lib/http-error.js";

export const userRoles = ["admin", "manager", "technician", "viewer"];

const toPublicUser = (user) => ({
  id: user.id,
  username: user.username,
  name: user.name,
  role: user.role,
});

export class AuthService {
  constructor(userRepository) {
    this.userRepository = userRepository;
  }

  async bootstrapUsers() {
    const seedUsers = defaultUsers.map((user) => ({
      id: randomUUID(),
      username: user.username,
      name: user.name,
      role: user.role,
      passwordHash: bcrypt.hashSync(user.password, 10),
      isActive: true,
    }));

    await this.userRepository.seed(seedUsers);
  }

  async login({ username, password }) {
    const user = await this.userRepository.findByUsername(username);

    if (!user || !bcrypt.compareSync(password, user.passwordHash)) {
      throw new HttpError(401, "Usuário ou senha inválidos.");
    }

    if (!user.isActive) {
      throw new HttpError(403, "Usuário desativado.");
    }

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
      },
    );
  }

  async verifyAccessToken(token) {
    try {
      const payload = jwt.verify(token, env.jwtSecret, {
        issuer: "sst-backend",
        audience: "sst-frontend",
      });

      const user = await this.userRepository.findById(String(payload.sub));

      if (!user || !user.isActive) {
        throw new HttpError(401, "Sessão inválida ou expirada.");
      }

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

    return toPublicUser(user);
  }
}