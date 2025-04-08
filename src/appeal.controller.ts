import { Request, Response } from "express";
import { db } from "./db";
import { AppealStatus, IAppeal } from "./types";

export async function create(req: Request, res: Response) {
  const { text, topic, created_at } = req.body;

  if (!text || !topic)
    res.status(400).json({ error: "text and topic are required" });

  let insertAppeal;
  if (created_at) {
    if (isNaN(Date.parse(created_at)))
      res.status(400).json({ error: "Invalid created_at format" });

    insertAppeal = db.prepare(`
      INSERT INTO appeals (text, topic, status, created_at) 
      VALUES (?, ?, ?, ?)
    `);
    await insertAppeal.run(text, topic, AppealStatus.new, created_at);
  } else {
    insertAppeal = db.prepare(`
      INSERT INTO appeals (text, topic, status) 
      VALUES (?, ?, ?)
    `);
    await insertAppeal.run(text, topic, AppealStatus.new);
  }

  res.status(201).json({ message: "Appeal created" });
}

export async function getAll(req: Request, res: Response) {
  const { startDate, endDate, date } = req.query;

  const isValidDate = (dateStr: string): boolean => {
    const regex = /^\d{2}-\d{2}-\d{4}$/;
    if (!regex.test(dateStr)) return false;

    const [day, month, year] = dateStr.split("-");
    const d = new Date(`${year}-${month}-${day}`);
    return (
      !isNaN(d.getTime()) &&
      d.getDate() === parseInt(day) &&
      d.getMonth() + 1 === parseInt(month) &&
      d.getFullYear() === parseInt(year)
    );
  };

  if (date && !isValidDate(date as string))
    res.status(400).json({
      error: "Invalid date format. Use strictly DD-MM-YYYY format",
      example: "05-03-2025",
    });

  if (startDate && !isValidDate(startDate as string))
    res.status(400).json({
      error: "Invalid startDate format. Use strictly DD-MM-YYYY format",
      example: "01-03-2025",
    });

  if (endDate && !isValidDate(endDate as string))
    res.status(400).json({
      error: "Invalid endDate format. Use strictly DD-MM-YYYY format",
      example: "10-03-2025",
    });

  let query = "SELECT * FROM appeals";
  const params: string[] = [];

  if (date) {
    query += " WHERE created_at = ?";
    params.push(date as string);
  } else if (startDate || endDate) {
    query += " WHERE";
    if (startDate) {
      query += " created_at >= ?";
      params.push(startDate as string);
    }
    if (endDate) {
      query += params.length ? " AND" : "";
      query += " created_at <= ?";
      params.push(endDate as string);
    }
  }

  try {
    const rows = await db.prepare(query).all(...params);

    res.json(rows);
  } catch (err) {
    res.status(500).json({
      error: "Database error",
      details: (err as Error).message,
    });
  }
}

export async function takeIntoProcessing(req: Request, res: Response) {
  const appealId = req.params.id;

  if (!appealId) {
    res.status(400).json({ message: "Appeal ID is required" });
  }

  try {
    const appeal = (await db
      .prepare("SELECT * FROM appeals WHERE id = ?")
      .all(appealId)[0]) as IAppeal;

    if (!appeal) {
      res.status(404).json({ message: "Appeal not found" });
    }

    if (appeal.status !== AppealStatus.new) {
      res.status(401).json({
        message: "To accept a request for processing, it must be new",
      });
    }

    await db
      .prepare("UPDATE appeals SET status = 'IN_WORK' WHERE id = ?")
      .run(appealId);

    res.status(200).json({ message: "Appeal status updated to processing" });
  } catch (error) {
    res.status(500).json({ message: "Internal server error", error });
  }
}

export async function cancel(req: Request, res: Response) {
  const appealId = req.params.id;
  const { cause } = req.body;

  if (!appealId) res.status(400).json({ message: "Appeal ID is required" });

  try {
    const appeal = (await db
      .prepare("SELECT * FROM appeals WHERE id = ?")
      .all(appealId)[0]) as IAppeal;

    if (!appeal) res.status(404).json({ message: "Appeal not found" });

    if (appeal.status !== AppealStatus.inWork)
      res.status(401).json({
        message: "To cancel a request, it must be in work",
      });

    await db
      .prepare("UPDATE appeals SET status = 'CANCELLED' WHERE id = ?")
      .run(appealId);
    await db
      .prepare(
        "INSERT INTO cancelledAppealReasons (cause, appeal_id) VALUES (?, ?)",
      )
      .run(cause || null, appealId);

    res.status(200).json({ message: "Appeal status updated to cancelled" });
  } catch (error) {
    res.status(500).json({ message: "Internal server error", error });
  }
}

export async function complete(req: Request, res: Response) {
  const appealId = req.params.id;
  const { solution } = req.body;

  if (!appealId) res.status(400).json({ message: "Appeal ID is required" });

  try {
    const appeal = (await db
      .prepare("SELECT * FROM appeals WHERE id = ?")
      .all(appealId)[0]) as IAppeal;

    if (!appeal) res.status(404).json({ message: "Appeal not found" });

    if (appeal.status !== AppealStatus.inWork)
      res.status(401).json({
        message: "To complete a request, it must be in work",
      });

    await db
      .prepare("UPDATE appeals SET status = 'COMPLETED' WHERE id = ?")
      .run(appealId);
    await db
      .prepare(
        "INSERT INTO completedAppealSolutions (solution, appeal_id) VALUES (?, ?)",
      )
      .run(solution || null, appealId);

    res.status(200).json({ message: "Appeal status updated to completed" });
  } catch (error) {
    res.status(500).json({ message: "Internal server error", error });
  }
}

export async function cancelAllInWork(req: Request, res: Response) {
  const { cause } = req.body;

  try {
    const appeals = (await db
      .prepare("SELECT id FROM appeals WHERE status = ?")
      .all(AppealStatus.inWork)) as IAppeal[];

    if (!appeals.length) {
      res.status(404).json({ message: "No appeals in work found" });
    }

    const ids = appeals.map((appeal: { id: number }) => appeal.id);

    await db
      .prepare(
        "UPDATE appeals SET status = 'CANCELLED' WHERE id IN (" +
        ids.map(() => "?").join(",") +
        ")",
      )
      .run(...ids);

    for (const id of ids) {
      await db
        .prepare(
          "INSERT INTO cancelledAppealReasons (cause, appeal_id) VALUES (?, ?)",
        )
        .run(cause || null, id);
    }

    res
      .status(200)
      .json({ message: "All in-work appeals have been cancelled" });
  } catch (error) {
    res.status(500).json({ message: "Internal server error", error });
  }
}
