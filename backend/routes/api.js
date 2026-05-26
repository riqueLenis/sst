import { Router } from "express";
import { resourceSchemas } from "../lib/schemas.js";
import { authorize } from "../middlewares/authenticate.js";
import { validateBody } from "../middlewares/validate-body.js";

const handle = (handler) => (req, res, next) => {
  Promise.resolve(handler(req, res, next)).catch(next);
};

const managementRoles = ["admin", "manager"];
const operationalReadRoles = ["admin", "manager", "technician"];
const ppeCreateRoles = ["admin", "manager", "technician"];

export const apiResources = [
  {
    collection: "companies",
    label: "Empresas",
    singularLabel: "Empresa",
    path: "/companies",
    methods: ["GET", "POST", "PATCH", "DELETE"],
    readRoles: operationalReadRoles,
    createRoles: managementRoles,
    updateRoles: managementRoles,
    deleteRoles: managementRoles,
  },
  {
    collection: "sectors",
    label: "Setores",
    singularLabel: "Setor",
    path: "/sectors",
    methods: ["GET", "POST", "PATCH", "DELETE"],
    readRoles: managementRoles,
    createRoles: managementRoles,
    updateRoles: managementRoles,
    deleteRoles: managementRoles,
  },
  {
    collection: "roles",
    label: "Cargos",
    singularLabel: "Cargo",
    path: "/roles",
    methods: ["GET", "POST", "PATCH", "DELETE"],
    readRoles: operationalReadRoles,
    createRoles: managementRoles,
    updateRoles: managementRoles,
    deleteRoles: managementRoles,
  },
  {
    collection: "employees",
    label: "Colaboradores",
    singularLabel: "Colaborador",
    path: "/employees",
    methods: ["GET", "POST", "PATCH", "DELETE"],
    readRoles: operationalReadRoles,
    createRoles: managementRoles,
    updateRoles: managementRoles,
    deleteRoles: managementRoles,
  },
  {
    collection: "ppes",
    label: "Estoque de EPIs",
    singularLabel: "EPI",
    path: "/ppes",
    methods: ["GET", "POST", "PATCH", "DELETE"],
    readRoles: operationalReadRoles,
    createRoles: ppeCreateRoles,
    updateRoles: managementRoles,
    deleteRoles: managementRoles,
  },
  {
    collection: "ppeDeliveries",
    label: "Entregas de EPI",
    singularLabel: "Entrega de EPI",
    path: "/ppe-deliveries",
    methods: ["GET", "POST", "PATCH", "DELETE"],
    readRoles: operationalReadRoles,
    createRoles: managementRoles,
    updateRoles: managementRoles,
    deleteRoles: managementRoles,
  },
  {
    collection: "transactions",
    label: "Transações",
    singularLabel: "Transação",
    path: "/transactions",
    methods: ["GET", "POST", "PATCH", "DELETE"],
    readRoles: managementRoles,
    createRoles: managementRoles,
    updateRoles: managementRoles,
    deleteRoles: managementRoles,
  },
  {
    collection: "documents",
    label: "Documentos SST",
    singularLabel: "Documento SST",
    path: "/documents",
    methods: ["GET", "POST", "PATCH", "DELETE"],
    readRoles: managementRoles,
    createRoles: managementRoles,
    updateRoles: managementRoles,
    deleteRoles: managementRoles,
  },
  {
    collection: "asos",
    label: "ASOs",
    singularLabel: "ASO",
    path: "/asos",
    methods: ["GET", "POST", "PATCH", "DELETE"],
    readRoles: managementRoles,
    createRoles: managementRoles,
    updateRoles: managementRoles,
    deleteRoles: managementRoles,
  },
  {
    collection: "absences",
    label: "Afastamentos",
    singularLabel: "Afastamento",
    path: "/absences",
    methods: ["GET", "POST", "PATCH", "DELETE"],
    readRoles: managementRoles,
    createRoles: managementRoles,
    updateRoles: managementRoles,
    deleteRoles: managementRoles,
  },
  {
    collection: "referrals",
    label: "Encaminhamentos",
    singularLabel: "Encaminhamento",
    path: "/referrals",
    methods: ["GET", "POST", "PATCH", "DELETE"],
    readRoles: managementRoles,
    createRoles: managementRoles,
    updateRoles: managementRoles,
    deleteRoles: managementRoles,
  },
];

const extractFilters = (query) =>
  Object.fromEntries(
    Object.entries(query).filter(
      ([, value]) => typeof value === "string" && value.trim().length > 0,
    ),
  );

const createCrudRouter = (store, resource) => {
  const router = Router();
  const schemas = resourceSchemas[resource.collection];
  const createRoles = resource.createRoles ?? resource.writeRoles;
  const updateRoles = resource.updateRoles ?? resource.writeRoles;
  const deleteRoles = resource.deleteRoles ?? updateRoles;

  router.get(
    "/",
    authorize(...resource.readRoles),
    handle(async (req, res) => {
      res.json({
        data: await store.list(
          resource.collection,
          extractFilters(req.query),
          req.authUser,
        ),
      });
    }),
  );

  router.get(
    "/:id",
    authorize(...resource.readRoles),
    handle(async (req, res) => {
      res.json({
        data: await store.get(resource.collection, req.params.id, req.authUser),
      });
    }),
  );

  router.post(
    "/",
    authorize(...createRoles),
    validateBody(schemas.create),
    handle(async (req, res) => {
      const created = await store.create(
        resource.collection,
        req.validatedBody,
        req.authUser,
      );

      res.status(201).json({
        data: created,
        meta: {
          message: "Registro criado com sucesso.",
        },
      });
    }),
  );

  router.patch(
    "/:id",
    authorize(...updateRoles),
    validateBody(schemas.update, { requireAtLeastOne: true }),
    handle(async (req, res) => {
        const updated = await store.update(
          resource.collection,
          req.params.id,
          req.validatedBody,
          req.authUser,
        );

        res.json({
          data: updated,
          meta: {
            message: "Registro atualizado com sucesso.",
          },
        });
    }),
  );

  router.delete(
    "/:id",
    authorize(...deleteRoles),
    handle(async (req, res) => {
      const removed = await store.remove(
        resource.collection,
        req.params.id,
        req.authUser,
      );

      res.json({
        data: removed,
        meta: {
          message: "Registro removido com sucesso.",
        },
      });
    }),
  );

  return router;
};

export const createApiRouter = (store) => {
  const router = Router();

  router.get("/", (_req, res) => {
    res.json({
      data: {
        name: "EXIN Backend API",
        persistence: store.persistenceMode,
        resources: apiResources.map((resource) => ({
          name: resource.label,
          path: `/api${resource.path}`,
          methods: resource.methods,
        })),
      },
    });
  });

  apiResources.forEach((resource) => {
    router.use(resource.path, createCrudRouter(store, resource));
  });

  return router;
};