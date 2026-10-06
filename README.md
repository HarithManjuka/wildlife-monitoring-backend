# Smart Wildlife Conservation System - Backend Services

RESTful API backend for the Smart Wildlife Conservation and Anti-Poaching Monitoring System. Built with Node.js, Express, and MongoDB, this service handles field data ingestion, automated alert generation, and analytical processing.

## 🏗 System Architecture & Use Cases

This backend drives four core operational modules:

1. **Field Patrols & Incidents** (Implemented by M.U. Handaragama - IT23819092)
   - Synchronizes offline incident logs captured by field rangers.
   - Handles media attachments and spatial coordinate validation.
2. **Sensor & Geofence Alerts** (Implemented by K.M.S.G.S.C. Karunanayake - IT23818620)
   - Processes simulated GPS collar telemetry.
   - Executes point-in-polygon logic to detect high-risk zone breaches.
3. **Community Conflict Triage** (Implemented by A.M.H.M. Abeykoon - IT23831254)
   - Ingests and parses community SMS/App payload data.
   - Classifies threat levels and identifies duplicate reports automatically.
4. **Conservation Analytics** (Implemented by J.R.I.C.S. Jayakody - IT23839106)
   - Aggregates spatio-temporal data for hotspot mapping.
   - Generates formatted CSV/PDF intelligence reports.

## 🚀 Tech Stack
* **Runtime:** Node.js
* **Framework:** Express.js
* **Database:** MongoDB (Mongoose ODM)
* **Testing:** Jest & Supertest (Unit and Integration testing)

## 🛠 Setup & Installation

1. **Clone the repository and checkout dev:**
   ```bash
   git clone 
   git checkout dev
