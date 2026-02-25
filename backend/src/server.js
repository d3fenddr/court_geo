import "dotenv/config";
import express from "express";
import cors from "cors";

import { PORT, DEV_MODE } from "./config/constants.js";
import { errorHandler } from "./middleware/errorHandler.js";

import healthRoutes from "./routes/health.routes.js";
import authRoutes from "./routes/auth.routes.js";
import courtsRoutes from "./routes/courts.routes.js";
import meetingsRoutes from "./routes/meetings.routes.js";
import myRoutes from "./routes/my.routes.js";
import usersRoutes from "./routes/users.routes.js";

const app = express();

app.use(
  cors({
    origin: true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  }),
);

app.use(express.json());

app.use(healthRoutes);
app.use(authRoutes);
app.use(courtsRoutes);
app.use(meetingsRoutes);
app.use(myRoutes);
app.use(usersRoutes);

app.use((req, res) => {
  res.status(404).json({ error: "Not found" });
});

app.use(errorHandler);

//  Vercel
export default app;

if (!process.env.VERCEL) {
  app.listen(PORT, () => {
    // eslint-disable-next-line no-console
    console.log(`Backend running on http://localhost:${PORT}`);
    // eslint-disable-next-line no-console
    console.log(
      `DEV_MODE=${DEV_MODE ? "ON" : "OFF"} (set DEV_MODE=1 to bypass distance check)`,
    );
  });
}