// ✅ server.js
const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const { MongoClient, ServerApiVersion } = require("mongodb");

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// ✅ Middleware
app.use(cors());
app.use(express.json());

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(process.env.MONGODB_URI, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

async function run() {
  const parcelCollection = client.db("parcelDB").collection("parcels");

  // ✅ GET the latest parcel (optionally filter by senderEmail using query param)
  app.get("/api/parcel/latest", async (req, res) => {
    try {
      const senderEmail = req.query.email;
      const filter = senderEmail ? { senderEmail } : {};

      const latestParcel = await parcelsCollection
        .find(filter)
        .sort({ createdAt: -1 })
        .limit(1)
        .toArray();

      res.json(latestParcel[0] || null);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch latest parcel" });
    }
  });

  try {
    // ✅ POST: Create a parcel
    try {
      app.post("/parcels", async (req, res) => {
        const newParcel = req?.body;
        const result = await parcelCollection.insertOne(newParcel);
        res.status(201).send(result);
      });
    } catch (err) {
      res.status(500).send({ err: "❌ Failed to add parcel" });
    }

    await client.db("admin").command({ ping: 1 });
    console.log(
      "Pinged your deployment. You successfully connected to MongoDB!"
    );
  } finally {
  }
}
run().catch(console.dir);

// ✅ Root Route
app.get("/", (req, res) => {
  res.send("📦 Parcel Delivery Server is running!");
});

// ✅ Start server
app.listen(PORT, () => {
  console.log(`🚀 Server running at http://localhost:${PORT}`);
});
