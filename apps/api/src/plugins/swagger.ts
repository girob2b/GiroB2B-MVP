import fp from "fastify-plugin";
import swagger from "@fastify/swagger";
import swaggerUi from "@fastify/swagger-ui";
import type { FastifyInstance } from "fastify";

export default fp(async function swaggerPlugin(app: FastifyInstance) {
  await app.register(swagger, {
    openapi: {
      openapi: "3.0.3",
      info: {
        title: "GiroB2B Backend API",
        description: "Documentacao das rotas do backend GiroB2B.",
        version: "0.1.0",
      },
      servers: [
        {
          url: `http://localhost:${process.env.PORT ?? "3001"}`,
          description: "Servidor local",
        },
      ],
      tags: [
        { name: "Health", description: "Estado da aplicacao" },
        { name: "Auth", description: "Autenticacao e recuperacao de senha" },
        { name: "CNPJ", description: "Consulta e validacao de CNPJ" },
        { name: "Onboarding", description: "Ativacao inicial de comprador e fornecedor" },
        { name: "Supplier", description: "Perfil e configuracoes do fornecedor" },
        { name: "Products", description: "Gestao de produtos do fornecedor" },
        { name: "Suggestions", description: "Sugestoes de busca" },
        { name: "Inquiries", description: "Cotacoes enviadas e recebidas" },
      ],
      components: {
        securitySchemes: {
          bearerAuth: {
            type: "http",
            scheme: "bearer",
            bearerFormat: "JWT",
          },
        },
      },
    },
  });

  await app.register(swaggerUi, {
    routePrefix: "/docs",
    uiConfig: {
      docExpansion: "list",
      deepLinking: false,
    },
  });
});
