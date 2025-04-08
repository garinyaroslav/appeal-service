import express, { Application } from "express";
import Server from "./src/index";
import { initializeDb, db } from "./src/db";
import {
  create,
  getAll,
  takeIntoProcessing,
  cancel,
  complete,
  cancelAllInWork,
} from "./src/appeal.controller";

const app: Application = express();
const server: Server = new Server(app);
const PORT: number = process.env.PORT ? parseInt(process.env.PORT, 10) : 8080;

initializeDb();

app.get("/", getAll);
app.post("/", create);
app.post("/:id/process", takeIntoProcessing);
app.post("/:id/cancel", cancel);
app.post("/:id/complete", complete);
app.post("/cancelAllInWork", cancelAllInWork);

app
  .listen(PORT, "localhost", function() {
    console.log(`Server is running on port ${PORT}.`);
  })
  .on("error", (err: any) => {
    db.close();
    if (err.code === "EADDRINUSE") {
      console.log("Error: address already in use");
    } else {
      console.log(err);
    }
  });
