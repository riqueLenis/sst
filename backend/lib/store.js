import { randomUUID } from "node:crypto";
import { createDatabaseClient, runInTransaction } from "../db/client.js";
import { createInitialState } from "../data/seed.js";
import { MySqlJsonRepository } from "../repositories/json-repository.js";
import { UserRepository } from "../repositories/user-repository.js";
import { HttpError } from "./http-error.js";

const resourceLabels = {
  companies: "Empresa",
  sectors: "Setor",
  roles: "Cargo",
  employees: "Colaborador",
  ppes: "EPI",
  ppeDeliveries: "Entrega de EPI",
  transactions: "Transação",
  documents: "Documento SST",
  asos: "ASO",
  absences: "Afastamento",
  referrals: "Encaminhamento",
};

const deleteConstraints = {
  companies: [
    {
      collection: "employees",
      field: "companyId",
      message:
        "A empresa possui colaboradores vinculados e não pode ser removida.",
    },
    {
      collection: "transactions",
      field: "companyId",
      message:
        "A empresa possui transações vinculadas e não pode ser removida.",
    },
    {
      collection: "documents",
      field: "companyId",
      message:
        "A empresa possui documentos vinculados e não pode ser removida.",
    },
  ],
  sectors: [
    {
      collection: "roles",
      field: "sectorId",
      message: "O setor possui cargos vinculados e não pode ser removido.",
    },
  ],
  roles: [
    {
      collection: "employees",
      field: "roleId",
      message:
        "O cargo possui colaboradores vinculados e não pode ser removido.",
    },
  ],
  employees: [
    {
      collection: "ppeDeliveries",
      field: "employeeId",
      message:
        "O colaborador possui entregas de EPI vinculadas e não pode ser removido.",
    },
    {
      collection: "asos",
      field: "employeeId",
      message: "O colaborador possui ASOs vinculados e não pode ser removido.",
    },
    {
      collection: "absences",
      field: "employeeId",
      message:
        "O colaborador possui afastamentos vinculados e não pode ser removido.",
    },
    {
      collection: "referrals",
      field: "employeeId",
      message:
        "O colaborador possui encaminhamentos vinculados e não pode ser removido.",
    },
  ],
  ppes: [
    {
      collection: "ppeDeliveries",
      field: "ppeId",
      message: "O EPI possui entregas vinculadas e não pode ser removido.",
    },
  ],
};

const clone = (value) => structuredClone(value);

const resourceCollections = [
  "companies",
  "sectors",
  "roles",
  "employees",
  "ppes",
  "ppeDeliveries",
  "transactions",
  "documents",
  "asos",
  "absences",
  "referrals",
];

const resourceTables = {
  companies: "companies",
  sectors: "sectors",
  roles: "roles",
  employees: "employees",
  ppes: "ppes",
  ppeDeliveries: "ppe_deliveries",
  transactions: "transactions",
  documents: "documents",
  asos: "asos",
  absences: "absences",
  referrals: "referrals",
};

const getDeliveryContribution = (delivery) =>
  delivery.status === "returned" ? 0 : delivery.quantity;

const ensureDateOrder = (start, end, message) => {
  if (new Date(end).getTime() < new Date(start).getTime()) {
    throw new HttpError(400, message);
  }
};

export class MySqlStore {
  static async create() {
    const db = await createDatabaseClient();
    const store = new MySqlStore(db);
    await store.initialize();
    return store;
  }

  constructor(db) {
    this.persistenceMode = "mysql";
    this.db = db;
    this.repositories = Object.fromEntries(
      resourceCollections.map((collection) => [
        collection,
        new MySqlJsonRepository(this.db, resourceTables[collection]),
      ]),
    );
    this.userRepository = new UserRepository(this.db);
  }

  async initialize() {
    await this.userRepository.initialize();
    await Promise.all(
      resourceCollections.map((collection) =>
        this.repositories[collection].initialize(),
      ),
    );
    await this.bootstrap();
  }

  async bootstrap() {
    const seedState = createInitialState();

    for (const collection of resourceCollections) {
      await this.repositories[collection].seed(seedState[collection]);
    }
  }

  async list(resource, filters = {}) {
    return clone(await this.getRepository(resource).list(filters));
  }

  async get(resource, id) {
    return clone(await this.findOrFail(resource, id));
  }

  async create(resource, payload) {
    if (resource === "ppeDeliveries") {
      return clone(await this.createDelivery(payload));
    }

    return clone(await this.createEntity(resource, payload));
  }

  async update(resource, id, payload) {
    if (resource === "ppeDeliveries") {
      return clone(await this.updateDelivery(id, payload));
    }

    return clone(await this.updateEntity(resource, id, payload));
  }

  async remove(resource, id) {
    if (resource === "ppeDeliveries") {
      return clone(await this.removeDelivery(id));
    }

    return clone(await this.removeEntity(resource, id));
  }

  getRepository(resource) {
    const repository = this.repositories[resource];

    if (!repository) {
      throw new Error(`Unknown resource: ${resource}`);
    }

    return repository;
  }

  async findOrFail(resource, id, executor = this.db) {
    const entry = await this.getRepository(resource).get(id, executor);

    if (!entry) {
      throw new HttpError(
        404,
        `${resourceLabels[resource] ?? "Recurso"} não encontrado.`,
      );
    }

    return entry;
  }

  assertReference(resource, id, executor = this.db) {
    return this.findOrFail(resource, id, executor);
  }

  async validateEntityReferences(resource, entity, executor = this.db) {
    switch (resource) {
      case "roles":
        await this.assertReference("sectors", entity.sectorId, executor);
        break;
      case "employees":
        await this.assertReference("companies", entity.companyId, executor);
        await this.assertReference("roles", entity.roleId, executor);
        break;
      case "transactions":
      case "documents":
        await this.assertReference("companies", entity.companyId, executor);
        break;
      case "asos":
      case "absences":
      case "referrals":
        await this.assertReference("employees", entity.employeeId, executor);
        break;
      default:
        break;
    }
  }

  validateEntityBusinessRules(resource, entity) {
    switch (resource) {
      case "transactions":
        ensureDateOrder(
          entity.date,
          entity.dueDate,
          "A data de vencimento não pode ser anterior à data de emissão.",
        );
        break;
      case "documents":
        ensureDateOrder(
          entity.issueDate,
          entity.validUntil,
          "A validade do documento não pode ser anterior à emissão.",
        );
        break;
      case "asos":
        ensureDateOrder(
          entity.date,
          entity.validUntil,
          "A validade do ASO não pode ser anterior à data do exame.",
        );
        break;
      case "absences":
        ensureDateOrder(
          entity.startDate,
          entity.endDate,
          "A data final do afastamento não pode ser anterior à inicial.",
        );
        break;
      default:
        break;
    }
  }

  async assertCanDelete(resource, id, executor = this.db) {
    const constraints = deleteConstraints[resource] ?? [];

    for (const constraint of constraints) {
      const hasDependency =
        (await this.getRepository(constraint.collection).list(
          {
          [constraint.field]: id,
          },
          executor,
        )).length > 0;

      if (hasDependency) {
        throw new HttpError(409, constraint.message);
      }
    }
  }

  async createEntity(resource, payload) {
    return runInTransaction(this.db, async (connection) => {
      const entity = {
        id: randomUUID(),
        ...payload,
      };

      await this.validateEntityReferences(resource, entity, connection);
      this.validateEntityBusinessRules(resource, entity);
      await this.getRepository(resource).create(entity, connection);
      return entity;
    });
  }

  async updateEntity(resource, id, payload) {
    return runInTransaction(this.db, async (connection) => {
      const currentEntity = await this.findOrFail(resource, id, connection);
      const nextEntity = {
        ...currentEntity,
        ...payload,
        id,
      };

      await this.validateEntityReferences(resource, nextEntity, connection);
      this.validateEntityBusinessRules(resource, nextEntity);
      await this.getRepository(resource).replace(nextEntity, connection);
      return nextEntity;
    });
  }

  async removeEntity(resource, id) {
    return runInTransaction(this.db, async (connection) => {
      await this.assertCanDelete(resource, id, connection);
      const removed = await this.findOrFail(resource, id, connection);
      await this.getRepository(resource).remove(id, connection);
      return removed;
    });
  }

  async validateDeliveryRules(delivery, current = null, executor = this.db) {
    const employee = await this.assertReference(
      "employees",
      delivery.employeeId,
      executor,
    );
    await this.assertReference("ppes", delivery.ppeId, executor);

    if (
      (!current || current.employeeId !== delivery.employeeId) &&
      employee.status !== "active"
    ) {
      throw new HttpError(
        409,
        "Somente colaboradores ativos podem receber novas entregas de EPI.",
      );
    }

    if (delivery.status === "returned" && !delivery.returnDate) {
      throw new HttpError(
        400,
        "Entregas com status 'returned' precisam informar returnDate.",
      );
    }

    if (delivery.status !== "returned") {
      delivery.returnDate = undefined;
    }

    if (!current) {
      if (!delivery.employeeSignature?.trim()) {
        throw new HttpError(
          400,
          "A assinatura digital do colaborador é obrigatória para registrar a entrega.",
        );
      }

      if (!delivery.employeeFacePhoto?.trim()) {
        throw new HttpError(
          400,
          "A foto facial do colaborador é obrigatória para registrar a entrega.",
        );
      }
    }
  }

  async createDelivery(payload) {
    return runInTransaction(this.db, async (connection) => {
      const timestamp = new Date().toISOString();
      const delivery = {
        id: randomUUID(),
        ...payload,
        signedAt: payload.signedAt ?? timestamp,
        facePhotoCapturedAt: payload.facePhotoCapturedAt ?? timestamp,
      };

      await this.validateDeliveryRules(delivery, null, connection);
      await this.applyCreateDeliveryStock(delivery, connection);
      await this.getRepository("ppeDeliveries").create(delivery, connection);
      return delivery;
    });
  }

  async applyCreateDeliveryStock(delivery, executor = this.db) {
    const reservedQuantity = getDeliveryContribution(delivery);

    if (reservedQuantity === 0) {
      return;
    }

    const ppe = await this.findOrFail("ppes", delivery.ppeId, executor);

    if (ppe.stockQuantity < reservedQuantity) {
      throw new HttpError(
        409,
        "Estoque insuficiente para registrar a entrega de EPI.",
      );
    }

    ppe.stockQuantity -= reservedQuantity;
    await this.getRepository("ppes").replace(ppe, executor);
  }

  async updateDelivery(id, payload) {
    return runInTransaction(this.db, async (connection) => {
      const currentDelivery = await this.findOrFail(
        "ppeDeliveries",
        id,
        connection,
      );
      const nextDelivery = {
        ...currentDelivery,
        ...payload,
        id,
      };

      await this.validateDeliveryRules(nextDelivery, currentDelivery, connection);
      await this.applyUpdateDeliveryStock(
        currentDelivery,
        nextDelivery,
        connection,
      );
      await this.getRepository("ppeDeliveries").replace(nextDelivery, connection);
      return nextDelivery;
    });
  }

  async applyUpdateDeliveryStock(
    currentDelivery,
    nextDelivery,
    executor = this.db,
  ) {
    const previousContribution = getDeliveryContribution(currentDelivery);
    const nextContribution = getDeliveryContribution(nextDelivery);

    if (currentDelivery.ppeId === nextDelivery.ppeId) {
      const ppe = await this.findOrFail("ppes", currentDelivery.ppeId, executor);
      const projectedStock =
        ppe.stockQuantity + previousContribution - nextContribution;

      if (projectedStock < 0) {
        throw new HttpError(
          409,
          "Estoque insuficiente para atualizar a entrega de EPI.",
        );
      }

      ppe.stockQuantity = projectedStock;
      await this.getRepository("ppes").replace(ppe, executor);
      return;
    }

    const previousPpe = await this.findOrFail(
      "ppes",
      currentDelivery.ppeId,
      executor,
    );
    const nextPpe = await this.findOrFail("ppes", nextDelivery.ppeId, executor);

    previousPpe.stockQuantity += previousContribution;

    if (nextPpe.stockQuantity < nextContribution) {
      previousPpe.stockQuantity -= previousContribution;
      throw new HttpError(
        409,
        "Estoque insuficiente para transferir a entrega para o novo EPI.",
      );
    }

    nextPpe.stockQuantity -= nextContribution;
    await this.getRepository("ppes").replace(previousPpe, executor);
    await this.getRepository("ppes").replace(nextPpe, executor);
  }

  async removeDelivery(id) {
    return runInTransaction(this.db, async (connection) => {
      const delivery = await this.findOrFail("ppeDeliveries", id, connection);
      const reservedQuantity = getDeliveryContribution(delivery);

      if (reservedQuantity > 0) {
        const ppe = await this.findOrFail("ppes", delivery.ppeId, connection);
        ppe.stockQuantity += reservedQuantity;
        await this.getRepository("ppes").replace(ppe, connection);
      }

      await this.getRepository("ppeDeliveries").remove(id, connection);
      return delivery;
    });
  }
}
