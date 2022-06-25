const express = require("express");
const app = express();
const path = require("path");
const sqlite3 = require("sqlite3");
const { open } = require("sqlite");
const format = require("date-fns/format");
const isValid = require("date-fns/isValid");

app.use(express.json());

const dbPath = path.join(__dirname, "todoApplication.db");

let db = null;

const initializeServer = async () => {
  try {
    db = await open({
      filename: dbPath,
      driver: sqlite3.Database,
    });
    app.listen(3000, () => {
      console.log("Server started successfully");
    });
  } catch (e) {
    console.log(`DB Error: ${e.message}`);
  }
};

initializeServer();

const validateStatus = (val) => {
  const arr = ["", "TO DO", "IN PROGRESS", "DONE"];
  return arr.includes(val);
};
const validatePriority = (val) => {
  const arr = ["", "HIGH", "MEDIUM", "LOW"];
  return arr.includes(val);
};

const validateCategory = (val) => {
  const arr = ["", "WORK", "HOME", "LEARNING"];
  return arr.includes(val);
};

const validateDate = (val) => {
  return isValid(val);
};

// API 1

app.get("/todos/", async (request, response) => {
  const {
    status = "",
    priority = "",
    search_q = "",
    category = "",
  } = request.query;
  if (!validateStatus(status)) {
    response.status(400);
    response.send("Invalid Todo Status");
  } else if (!validatePriority(priority)) {
    response.status(400);
    response.send("Invalid Todo Priority");
  } else if (!validateCategory(category)) {
    response.status(400);
    response.send("Invalid Todo Category");
  } else {
    const query = `
        select * from todo
        where
            status like '%${status}%' and
            priority like '%${priority}%' and
            todo like '%${search_q}%' and
            category like '%${category}%'
    `;
    const resp = await db.all(query);
    response.send(
      resp.map((val) => {
        return {
          id: val.id,
          todo: val.todo,
          priority: val.priority,
          status: val.status,
          category: val.category,
          dueDate: val.due_date,
        };
      })
    );
  }
});

// API 2

app.get("/todos/:todoId", async (request, response) => {
  const { todoId } = request.params;
  const query = `select * from todo where id = ${todoId}`;
  const val = await db.get(query);
  response.send({
    id: val.id,
    todo: val.todo,
    priority: val.priority,
    status: val.status,
    category: val.category,
    dueDate: val.due_date,
  });
});

// API 3

app.get("/agenda", async (request, response) => {
  const { date } = request.query;
  if (!validateDate(new Date(date))) {
    response.status(400);
    response.send("Invalid Due Date");
  } else {
    const dt = format(new Date(date), "yyyy-MM-dd");
    const query = `select * from todo where due_date = '${dt}';`;
    const resp = await db.all(query);
    response.send(
      resp.map((val) => {
        return {
          id: val.id,
          todo: val.todo,
          priority: val.priority,
          status: val.status,
          category: val.category,
          dueDate: val.due_date,
        };
      })
    );
  }
});

// API 4

app.post("/todos/", async (request, response) => {
  const { id, todo, priority, status, category, dueDate } = request.body;
  if (!validateStatus(status)) {
    response.status(400);
    response.send("Invalid Todo Status");
  } else if (!validatePriority(priority)) {
    response.status(400);
    response.send("Invalid Todo Priority");
  } else if (!validateCategory(category)) {
    response.status(400);
    response.send("Invalid Todo Category");
  } else if (!validateDate(new Date(dueDate))) {
    response.status(400);
    response.send("Invalid Due Date");
  } else {
    const query = `
        insert into todo
        (id, todo, priority, status, category, due_date) values
        (${id}, '${todo}', '${priority}', '${status}', '${category}', '${dueDate}');
    `;
    const resp = await db.run(query);
    response.send("Todo Successfully Added");
  }
});

// API 5

app.put("/todos/:todoId", async (request, response) => {
  const { todoId } = request.params;
  const q1 = `select * from todo where id = ${todoId}`;
  const op1 = await db.get(q1);
  const k = Object.keys(request.body)[0];
  op1[k] = request.body[k];
  let str = k;
  if (k === "status") {
    str = "Status";
    if (!validateStatus(op1[k])) {
      response.status(400);
      response.send("Invalid Todo Status");
      return;
    }
  } else if (k === "priority") {
    str = "Priority";
    if (!validatePriority(op1[k])) {
      response.status(400);
      response.send("Invalid Todo Priority");
      return;
    }
  } else if (k === "todo") {
    str = "Todo";
  } else if (k === "category") {
    str = "Category";
    if (!validateCategory(op1[k])) {
      response.status(400);
      response.send("Invalid Todo Category");
      return;
    }
  } else {
    str = "Due Date";
    if (!validateDate(new Date(op1[k]))) {
      response.status(400);
      response.send("Invalid Due Date");
      return;
    }
  }
  const q2 = `
    update todo
    set
        todo = '${op1.todo}',
        priority = '${op1.priority}',
        status = '${op1.status}',
        category = '${op1.category}',
        due_date = '${op1.dueDate}'
    where id = ${todoId};
  `;
  const resp = await db.run(q2);
  response.send(`${str} Updated`);
});

// API 6

app.delete("/todos/:todoId", async (request, response) => {
  const { todoId } = request.params;
  const query = `delete from todo where id = ${todoId}`;
  const resp = await db.run(query);
  response.send("Todo Deleted");
});

module.exports = app;
