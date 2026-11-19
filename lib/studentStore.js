const REQUIRED_FIELDS = ["name", "email"];

function validateStudent(student) {
  const errors = [];

  for (const field of REQUIRED_FIELDS) {
    if (typeof student[field] !== "string" || !student[field].trim()) {
      errors.push(`${field} is required`);
    }
  }

  if (typeof student.email === "string" && student.email.trim() &&
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(student.email.trim())) {
    errors.push("email must be valid");
  }

  if (student.age !== undefined && student.age !== null && student.age !== "") {
    const age = Number(student.age);
    if (!Number.isInteger(age) || age < 1 || age > 150) {
      errors.push("age must be a whole number between 1 and 150");
    }
  }

  return errors;
}

class StudentStore {
  constructor(initialStudents = []) {
    this.students = new Map();
    this.nextId = 1;

    for (const student of initialStudents) {
      const id = Number(student.id);
      this.students.set(id, this.normalizeStudent(student, id));
      this.nextId = Math.max(this.nextId, id + 1);
    }
  }

  normalizeStudent(student, id) {
    return {
      id,
      name: String(student.name).trim(),
      email: String(student.email).trim(),
      age: student.age === undefined || student.age === null || student.age === ""
        ? null
        : Number(student.age),
      course: typeof student.course === "string" ? student.course.trim() : ""
    };
  }

  list(query = "") {
    const needle = String(query).trim().toLowerCase();
    const students = Array.from(this.students.values());

    if (!needle) return students;

    return students.filter((student) =>
      [student.name, student.email, student.course]
        .some((value) => String(value).toLowerCase().includes(needle))
    );
  }

  get(id) {
    return this.students.get(Number(id)) || null;
  }

  create(input) {
    const errors = validateStudent(input);
    if (errors.length) {
      const error = new Error(errors.join("; "));
      error.statusCode = 400;
      error.errors = errors;
      throw error;
    }

    const id = this.nextId++;
    const student = this.normalizeStudent(input, id);
    this.students.set(id, student);
    return student;
  }

  update(id, input) {
    const existing = this.get(id);
    if (!existing) return null;

    const merged = { ...existing, ...input };
    const errors = validateStudent(merged);
    if (errors.length) {
      const error = new Error(errors.join("; "));
      error.statusCode = 400;
      error.errors = errors;
      throw error;
    }

    const student = this.normalizeStudent(merged, existing.id);
    this.students.set(existing.id, student);
    return student;
  }

  delete(id) {
    return this.students.delete(Number(id));
  }
}

module.exports = { StudentStore, validateStudent };
