const form = document.querySelector("#student-form");
const tbody = document.querySelector("#students");
const search = document.querySelector("#search");
const errorElement = document.querySelector("#form-error");
const submitButton = document.querySelector("#submit-button");
const cancelButton = document.querySelector("#cancel-button");

async function request(url, options = {}) {
  const response = await fetch(url, {
    ...options,
    headers: { "Content-Type": "application/json", ...(options.headers || {}) }
  });
  const body = await response.json();
  if (!response.ok) throw new Error(body.error || "Request failed");
  return body;
}

async function loadStudents() {
  const query = search.value.trim();
  const body = await request(`/api/students${query ? `?q=${encodeURIComponent(query)}` : ""}`);
  tbody.replaceChildren();

  for (const student of body.students) {
    const row = document.createElement("tr");
    row.innerHTML = `
      <td></td><td></td><td></td><td></td>
      <td><button type="button" data-action="edit">Edit</button>
          <button type="button" data-action="delete">Delete</button></td>`;
    const cells = row.querySelectorAll("td");
    cells[0].textContent = student.name;
    cells[1].textContent = student.email;
    cells[2].textContent = student.age ?? "";
    cells[3].textContent = student.course;
    row.dataset.id = student.id;
    tbody.append(row);
  }
}

function resetForm() {
  form.reset();
  document.querySelector("#student-id").value = "";
  submitButton.textContent = "Add student";
  cancelButton.hidden = true;
  errorElement.textContent = "";
}

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  const id = document.querySelector("#student-id").value;
  const student = {
    name: document.querySelector("#name").value,
    email: document.querySelector("#email").value,
    age: document.querySelector("#age").value,
    course: document.querySelector("#course").value
  };

  try {
    errorElement.textContent = "";
    if (id) {
      await request(`/api/students/${id}`, { method: "PUT", body: JSON.stringify(student) });
    } else {
      await request("/api/students", { method: "POST", body: JSON.stringify(student) });
    }
    resetForm();
    await loadStudents();
  } catch (error) {
    errorElement.textContent = error.message;
  }
});

cancelButton.addEventListener("click", resetForm);
search.addEventListener("input", () => {
  loadStudents().catch((error) => {
    errorElement.textContent = error.message;
  });
});

tbody.addEventListener("click", async (event) => {
  const button = event.target.closest("button");
  if (!button) return;

  const row = button.closest("tr");
  const id = row.dataset.id;

  if (button.dataset.action === "delete") {
    if (!window.confirm("Delete this student?")) return;
    try {
      await request(`/api/students/${id}`, { method: "DELETE" });
      await loadStudents();
    } catch (error) {
      errorElement.textContent = error.message;
    }
  }

  if (button.dataset.action === "edit") {
    try {
      const body = await request(`/api/students/${id}`);
      document.querySelector("#student-id").value = body.student.id;
      document.querySelector("#name").value = body.student.name;
      document.querySelector("#email").value = body.student.email;
      document.querySelector("#age").value = body.student.age ?? "";
      document.querySelector("#course").value = body.student.course;
      submitButton.textContent = "Update student";
      cancelButton.hidden = false;
      errorElement.textContent = "";
      document.querySelector("#name").focus();
    } catch (error) {
      errorElement.textContent = error.message;
    }
  }
});

loadStudents().catch((error) => {
  errorElement.textContent = error.message;
});
