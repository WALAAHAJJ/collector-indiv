import { writeFileSync } from "node:fs";
import { SIZES } from "./lib/common.js";
import { runKafka } from "./kafka.js";
import { runRabbitMq } from "./rabbitmq.js";

const wanted = process.argv[2];
const brokers = [
  { name: "RabbitMQ", key: "rabbitmq", run: runRabbitMq, help: "docker compose up -d  (port 5672)" },
  { name: "Kafka", key: "kafka", run: runKafka, help: "docker compose up -d  (port 9092, attendre une vingtaine de secondes)" },
].filter((broker) => !wanted || broker.key === wanted);

const results = {};
for (const broker of brokers) {
  process.stdout.write(`Exécution des 5 scénarios sur ${broker.name}… `);
  try {
    const start = Date.now();
    results[broker.name] = await broker.run();
    console.log(`terminé en ${((Date.now() - start) / 1000).toFixed(1)} s`);
  } catch (error) {
    console.log("échec");
    console.error(`  ${broker.name} : ${error.message}`);
    console.error(`  Le broker est-il lancé ? ${broker.help}`);
    results[broker.name] = null;
  }
}

const cell = (broker, text) => (results[broker] ? text(results[broker]) : "non mesuré");
const rows = [
  [
    `1. Débit (${SIZES.throughput} messages, un consommateur)`,
    (r) => `${Math.round(r.throughput.perSecond)} messages/s (${Math.round(r.throughput.millis)} ms)`,
  ],
  [
    `2. Diffusion à deux services (${SIZES.broadcast} messages)`,
    (r) => `notifications ${r.broadcast.notifications}, fraude ${r.broadcast.fraude}`,
  ],
  [
    `3. Partage entre deux consommateurs (${SIZES.sharing} messages)`,
    (r) => `A ${r.sharing.A}, B ${r.sharing.B}, total ${r.sharing.total}`,
  ],
  [
    `4. Relecture par un service arrivé après (${SIZES.broadcast} messages déjà publiés)`,
    (r) => `reçoit ${r.replay.received} sur ${r.replay.published}`,
  ],
  [
    `5. Panne sur le message ${SIZES.failingEventId} (${SIZES.failure} messages)`,
    (r) => `${r.failure.deliveriesOfFailingMessage} livraisons du message ${SIZES.failingEventId}, ${r.failure.extraDeliveries} livraison(s) en trop au total, ${r.failure.completed}/${r.failure.expected} traités`,
  ],
];

const lines = [
  "| Scénario | RabbitMQ | Kafka |",
  "|---|---|---|",
  ...rows.map(([label, text]) => `| ${label} | ${cell("RabbitMQ", text)} | ${cell("Kafka", text)} |`),
];
const table = lines.join("\n");

console.log(`\n${table}\n`);

const report = `# Résultats de la démonstration\n\nMesurés le ${new Date().toISOString().slice(0, 10)} sur la machine de développement.\n\n${table}\n`;
writeFileSync(new URL("./resultats.md", import.meta.url), report);
console.log("Résultats enregistrés dans demos/messaging/resultats.md");
