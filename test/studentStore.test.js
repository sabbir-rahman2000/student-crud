const test = require("node:test");
const assert = require("node:assert/strict");
const { StudentStore } = require("../lib/studentStore");

test("creates, retrieves, updates, searches, and deletes students", () => {
  const store = new StudentStore();
  const student = store.create({
    name: "Ada Lovelace",
    email: "ada@example.com",
    age: 20,
    course: "Mathematics"
  });

  assert.equal(student.id, 1);
  assert.equal(store.get(1).name, "Ada Lovelace");
  assert.equal(store.list("math")[0].id, 1);

  const updated = store.update(1, { course: "Computer Science" });
  assert.equal(updated.course, "Computer Science");
  assert.equal(store.list("science")[0].name, "Ada Lovelace");

  assert.equal(store.delete(1), true);
  assert.equal(store.get(1), null);
});

test("rejects invalid student data", () => {
  const store = new StudentStore();

  assert.throws(
    () => store.create({ name: "", email: "invalid", age: 0 }),
    (error) => error.statusCode === 400 && error.errors.length === 3
  );
});
