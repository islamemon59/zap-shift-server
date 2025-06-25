// ✅ server.js
const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const { default: Stripe } = require("stripe");

dotenv.config();

const stripe = require("stripe")(process.env.PAYMENT_GATEWAY_KEY);

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

  try {
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


    

    //Stripe Payment Intent
    app.post("/create-payment-intent", async (req, res) => {
      const amountInCents = req.body.amountInCents
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
