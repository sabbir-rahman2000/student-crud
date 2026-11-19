const http = require("node:http");
const fs = require("node:fs");
const path = require("node:path");
const { StudentStore } = require("./lib/studentStore");

const PUBLIC_DIR = path.join(__dirname, "public");

function sendJson(response, statusCode, body) {
  const data = JSON.stringify(body);
  response.writeHead(statusCode, {
    "Content-Type": "application/json",
    "Content-Length": Buffer.byteLength(data)
  });
  response.end(data);
}

function readJson(request) {
  return new Promise((resolve, reject) => {
    let body = "";
    request.on("data", (chunk) => {
      body += chunk;
      if (body.length > 1_000_000) {
        reject(Object.assign(new Error("Request body is too large"), { statusCode: 413 }));
        request.destroy();
      }
    });
    request.on("end", () => {
      if (!body) {
        resolve({});
        return;
      }
      try {
        resolve(JSON.parse(body));
      } catch {
        reject(Object.assign(new Error("Invalid JSON"), { statusCode: 400 }));
      }
    });
  });
}

function createApp(store = new StudentStore()) {
  return http.createServer(async (request, response) => {
    const url = new URL(request.url, "http://localhost");
    const parts = url.pathname.split("/").filter(Boolean);

    try {
      if (url.pathname === "/api/health" && request.method === "GET") {
        sendJson(response, 200, { status: "ok" });
        return;
      }

      if (parts[0] === "api" && parts[1] === "students") {
        if (parts.length === 2 && request.method === "GET") {
          sendJson(response, 200, { students: store.list(url.searchParams.get("q") || "") });
          return;
        }

        if (parts.length === 2 && request.method === "POST") {
          const student = store.create(await readJson(request));
          sendJson(response, 201, { student });
          return;
        }

        if (parts.length === 3) {
          const id = parts[2];
          if (request.method === "GET") {
            const student = store.get(id);
            if (!student) {
              sendJson(response, 404, { error: "Student not found" });
              return;
            }
            sendJson(response, 200, { student });
            return;
          }

          if (request.method === "PUT" || request.method === "PATCH") {
            const student = store.update(id, await readJson(request));
            if (!student) {
              sendJson(response, 404, { error: "Student not found" });
              return;
            }
            sendJson(response, 200, { student });
            return;
          }

          if (request.method === "DELETE") {
            if (!store.delete(id)) {
              sendJson(response, 404, { error: "Student not found" });
              return;
            }
            sendJson(response, 200, { deleted: true });
            return;
          }
        }
      }

      if (parts[0] === "api") {
        sendJson(response, 404, { error: "Not found" });
        return;
      }

      const relativePath = url.pathname === "/" ? "index.html" : url.pathname.slice(1);
      const filePath = path.resolve(PUBLIC_DIR, relativePath);
      if (!filePath.startsWith(`${PUBLIC_DIR}${path.sep}`) && filePath !== PUBLIC_DIR) {
        sendJson(response, 403, { error: "Forbidden" });
        return;
      }

      fs.readFile(filePath, (error, data) => {
        if (error) {
          sendJson(response, 404, { error: "Not found" });
          return;
        }
        const types = {
          ".html": "text/html; charset=utf-8",
          ".css": "text/css; charset=utf-8",
          ".js": "text/javascript; charset=utf-8"
        };
        response.writeHead(200, { "Content-Type": types[path.extname(filePath)] || "application/octet-stream" });
        response.end(data);
      });
    } catch (error) {
      sendJson(response, error.statusCode || 500, {
        error: error.message || "Internal server error",
        ...(error.errors ? { errors: error.errors } : {})
      });
    }
  });
}

if (require.main === module) {
  const port = Number(process.env.PORT) || 3000;
  createApp().listen(port, () => {
    console.log(`Student CRUD server listening on http://localhost:${port}`);
  });
}

module.exports = { createApp };
