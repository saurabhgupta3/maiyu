import express from "express";
import cors from "cors";

const app = express();

const PORT = process.env.PORT || 5000;

app.use(cors());

app.get("/api/msg", (req, res) => {
  res.json({
    message: "Hello from Maiyu backend!",
  });
});

app.listen(PORT, () => {
  console.log(`Server running at ${PORT}`);
});