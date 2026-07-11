import { Router } from "express";
import { openApiDocument } from "./openapi";

const SWAGGER_UI_VERSION = "5.18.2";

function getSwaggerUiHtml(nonce: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>API Documentation</title>
  <link rel="stylesheet" type="text/css" href="https://unpkg.com/swagger-ui-dist@${SWAGGER_UI_VERSION}/swagger-ui.css">
  <style>
    body { margin: 0; padding: 0; }
    .topbar { display: none; }
  </style>
</head>
<body>
  <div id="swagger-ui"></div>
  <script src="https://unpkg.com/swagger-ui-dist@${SWAGGER_UI_VERSION}/swagger-ui-bundle.js"></script>
  <script nonce="${nonce}">
    window.onload = function() {
      const ui = SwaggerUIBundle({
        url: "/openapi.json",
        dom_id: "#swagger-ui",
        deepLinking: true,
        presets: [SwaggerUIBundle.presets.apis, SwaggerUIBundle.SwaggerUIStandalonePreset],
        layout: "BaseLayout",
        tryItOutEnabled: true,
      });
    };
  </script>
</body>
</html>`;
}

export function registerDocsRoutes(): Router {
  const router = Router();

  router.get("/openapi.json", (_req, res) => {
    res.set("Content-Type", "application/vnd.oai.openapi+json;version=3.1.0");
    res.json(openApiDocument);
  });

  router.get("/docs", (_req, res) => {
    const nonce = (res.locals as { nonce?: string }).nonce ?? "";
    res.set("Content-Type", "text/html");
    res.send(getSwaggerUiHtml(nonce));
  });

  return router;
}
