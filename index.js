// ✅ server.js
const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const { default: Stripe } = require("stripe");
const admin = require("firebase-admin");
const serviceAccount = require("./firebase-service-key.json");
dotenv.config();

const stripe = require("stripe")(process.env.PAYMENT_GATEWAY_KEY);

const app = express();
const PORT = process.env.PORT || 5000;

// ✅ Middleware
app.use(cors());
app.use(express.json());

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

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
  const paymentsCollection = client.db("parcelDB").collection("payments");
  const usersCollection = client.db("parcelDB").collection("users");
  const ridersCollection = client.db("parcelDB").collection("riders");
  try {
    const verifyToken = async (req, res, next) => {
      const authHeader = req.headers.authorization;

      if (!authHeader || !authHeader.startsWith("Bearer ")) {
        return res
          .status(401)
          .json({ message: "Unauthorized: Missing or invalid token" });
      }

      const idToken = authHeader.split(" ")[1];

      try {
        const decoded = await admin.auth().verifyIdToken(idToken);
        req.decoded = decoded; // user data (uid, email, etc.)
        next();
      } catch (error) {
        console.error("Token verification failed:", error);
        res.status(401).json({ message: "Unauthorized: Invalid token" });
      }
    };

    app.get("/riders", async (req, res) => {
      try {
        // Find riders with status "pending"
        const pendingRiders = await ridersCollection
          .find({ status: "pending" })
          .toArray();

        res.send(pendingRiders);
      } catch (error) {
        console.error("Error fetching pending riders:", error);
        res.status(500).json({ message: "Server error" });
      }
    });

    app.post("/riders", async (req, res) => {
      try {
        const riderData = req.body;
        const result = await ridersCollection.insertOne(riderData);
        res.send(result);
      } catch (error) {
        console.error(error);
        res.status(500).send({ message: "Failed to add rider" });
      }
    });

    app.patch("/riders/:riderId", async (req, res) => {
      const { riderId } = req.params;
      const { status } = req.body;

      if (!status) {
        return res.status(400).send("Status is required");
      }

      try {
        const result = await ridersCollection.updateOne(
          { _id: new ObjectId(riderId) },
          { $set: { status } }
        );

        if (result.matchedCount === 0) {
          return res.status(404).send("Rider not found");
        }

        res.send("Status updated successfully");
      } catch (error) {
        console.error(error);
        res.status(500).send("Server error");
      }
    });

    // POST /api/users
    app.post("/users", async (req, res) => {
      const { email } = req.body;

      if (!email) {
        return res.status(400).json({ message: "Missing name, email or uid" });
      }

      try {
        // Check if email already exists
        const existingUser = await usersCollection.findOne({ email });

        if (existingUser) {
          return res
            .status(200)
            .json({ message: "User already exists", user: existingUser });
        }

        // Insert new user
        const newUser = req.body;

        await usersCollection.insertOne(newUser);

        return res
          .status(201)
          .json({ message: "User created successfully", user: newUser });
      } catch (err) {
        console.error("User insert error:", err);
        return res.status(500).json({ message: "Internal server error" });
      }
    });

    //GET the latest parcel (optionally filter by senderEmail using query param)
    app.get("/parcels", async (req, res) => {
      try {
        const senderEmail = req.query.email;
        const filter = senderEmail ? { senderEmail } : {};

        const latestParcel = await parcelCollection
          .find(filter)
          .sort({ createdAt: -1 })
          .toArray();

        res.send(latestParcel);
      } catch (error) {
        res.status(500).json({ error: "Failed to fetch latest parcel" });
      }
    });

    app.get("/parcel/:id", async (req, res) => {
      try {
        const id = req.params.id;

        const query = { _id: new ObjectId(id) };
        const parcel = await parcelCollection.findOne(query);

        if (!parcel) {
          return res.status(404).json({ message: "Parcel not found" });
        }

        res.send(parcel);
      } catch (error) {
        res.status(500).json({ message: "Server error" });
      }
    });

    // POST: Create a parcel
    try {
      app.post("/parcels", async (req, res) => {
        const newParcel = req?.body;
        const result = await parcelCollection.insertOne(newParcel);
        res.status(201).send(result);
      });
    } catch (err) {
      res.status(500).send({ err: "❌ Failed to add parcel" });
    }

    // Delete: Delete a parcel
    app.delete("/parcels/:id", async (req, res) => {
      try {
        const id = req.params.id;
        console.log(id);
        const query = { _id: new ObjectId(id) };
        const result = await parcelCollection.deleteOne(query);

        if (result.deletedCount === 1) {
          res.send(result);
        } else {
          res
            .status(404)
            .send({ success: false, message: "Parcel not found." });
        }
      } catch (error) {
        res
          .status(500)
          .send({ success: false, message: "Failed to delete parcel.", error });
      }
    });

    // ✅ GET: Get payment history by user email
    app.get("/payment/history", async (req, res) => {
      const userEmail = req.query.email;

      console.log(req.headers);

      if (!userEmail) {
        return res.status(400).json({ message: "Email query is required" });
      }

      try {
        const payments = await paymentsCollection
          .find({ userEmail })
          .sort({ createdAt: -1 }) // latest first
          .toArray();

        res.send(payments);
      } catch (err) {
        res
          .status(500)
          .json({ message: "Error loading history", error: err.message });
      }
    });

    app.post("/tracking", async (req, res) => {
      const {
        tracking_id,
        parcel_id,
        status,
        message,
        updated_by = "",
      } = req.body;
      const log = {
        tracking_id,
        parcel_id: parcel_id ? new ObjectId(parcel_id) : undefined,
        status,
        message,
        time: new Date(),
        updated_by,
      };
    });

    // ✅ POST: Confirm payment and save history
    app.post("/payments", async (req, res) => {
      const {
        parcelId,
        userEmail,
        amount,
        currency,
        status,
        paymentMethod,
        transactionId, // from frontend or Stripe
      } = req.body;

      try {
        // 🔁 Step 1: Update parcel's payment_status to 'paid'
        const updateResult = await parcelCollection.updateOne(
          { _id: new ObjectId(parcelId) },
          { $set: { payment_status: "paid" } }
        );

        if (updateResult.modifiedCount === 0) {
          return res
            .status(404)
            .json({ message: "Parcel not found or already updated" });
        }

        // 💾 Step 2: Store payment history in "payments" collection

        const newPayment = {
          parcelId: new ObjectId(parcelId),
          userEmail,
          amount,
          currency,
          status,
          paymentMethod,
          transactionId,
          createdAt: new Date(),
          createdAtIso: new Date().toISOString(), // store ISO date as string
        };

        const result = await paymentsCollection.insertOne(newPayment);

        res.send(result);
      } catch (err) {
        res
          .status(500)
          .json({ message: "❌ Server error", error: err.message });
      }
    });

    //Stripe Payment Intent
    app.post("/create-payment-intent", async (req, res) => {
      const amountInCents = req.body.amountInCents;
      console.log(amountInCents);

      try {
        const paymentIntent = await stripe.paymentIntents.create({
          amount: amountInCents, // amount in cents
          currency: "usd",
          payment_method_types: ["card"],
        });
        res.json({ clientSecret: paymentIntent.client_secret });
      } catch (err) {
        res.status(500).json({ error: err.message });
      }
    });

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
