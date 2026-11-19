const test = require("node:test");
const assert = require("node:assert/strict");
const { createApp } = require("../server");
const { StudentStore } = require("../lib/studentStore");

async function withServer(callback) {
  const server = createApp(new StudentStore());
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  const address = server.address();
  const baseUrl = `http://127.0.0.1:${address.port}`;

  try {
    await callback(baseUrl);
  } finally {
    await new Promise((resolve, reject) =>
      server.close((error) => error ? reject(error) : resolve())
    );
  }
}

test("serves health and student CRUD API", async () => {
  await withServer(async (baseUrl) => {
    const health = await fetch(`${baseUrl}/api/health`);
    assert.equal(health.status, 200);
    assert.deepEqual(await health.json(), { status: "ok" });

    const createdResponse = await fetch(`${baseUrl}/api/students`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: "Grace Hopper",
        email: "grace@example.com",
        age: 45,
        course: "Computer Science"
      })
    });
    assert.equal(createdResponse.status, 201);
    const created = await createdResponse.json();
    assert.equal(created.student.name, "Grace Hopper");

    const searchResponse = await fetch(`${baseUrl}/api/students?q=grace`);
    assert.equal(searchResponse.status, 200);
    assert.equal((await searchResponse.json()).students.length, 1);

    const updatedResponse = await fetch(`${baseUrl}/api/students/${created.student.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ course: "Mathematics" })
    });
    assert.equal(updatedResponse.status, 200);
    assert.equal((await updatedResponse.json()).student.course, "Mathematics");

    const deletedResponse = await fetch(`${baseUrl}/api/students/${created.student.id}`, {
      method: "DELETE"
    });
    assert.equal(deletedResponse.status, 200);
    assert.equal((await deletedResponse.json()).deleted, true);

    const missingResponse = await fetch(`${baseUrl}/api/students/${created.student.id}`);
    assert.equal(missingResponse.status, 404);
  });
});

test("returns validation errors for invalid student input", async () => {
  await withServer(async (baseUrl) => {
    const response = await fetch(`${baseUrl}/api/students`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "", email: "not-email" })
    });
    assert.equal(response.status, 400);
    const body = await response.json();
    assert.ok(body.errors.includes("name is required"));
  });
});
