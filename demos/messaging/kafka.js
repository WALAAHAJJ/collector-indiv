import { Kafka, logLevel } from "kafkajs";
import { SIZES, decode, encode, makeEvents, sleep, waitFor } from "./lib/common.js";

const broker = process.env.KAFKA_BROKER ?? "localhost:9092";
const run = Date.now().toString(36);

export async function runKafka() {
  const kafka = new Kafka({ clientId: "collector-demo", brokers: [broker], logLevel: logLevel.NOTHING });
  const admin = kafka.admin();
  await admin.connect();
  const producer = kafka.producer();
  await producer.connect();
  const consumers = [];
  const results = {};

  const topic = async (name, partitions) => {
    const full = `${name}-${run}`;
    await admin.createTopics({
      waitForLeaders: true,
      topics: [{ topic: full, numPartitions: partitions }],
    });
    return full;
  };

  /** Démarre un consommateur et attend qu'il ait rejoint son groupe. */
  const startConsumer = async (groupId, topicName, handler, fromBeginning = true) => {
    const consumer = kafka.consumer({ groupId });
    consumers.push(consumer);
    let joined = false;
    consumer.on(consumer.events.GROUP_JOIN, () => {
      joined = true;
    });
    await consumer.connect();
    await consumer.subscribe({ topic: topicName, fromBeginning });
    await consumer.run({ eachMessage: async ({ message }) => handler(decode(message.value)) });
    await waitFor(() => joined, 30000);
    return consumer;
  };

  const send = (topicName, events) =>
    producer.send({
      topic: topicName,
      messages: events.map((event) => ({ key: event.listingId, value: encode(event) })),
    });

  // 1. Débit : un consommateur, N messages de bout en bout.
  {
    const name = await topic("demo-throughput", 1);
    const events = makeEvents(SIZES.throughput);
    let received = 0;
    await startConsumer(`throughput-${run}`, name, () => {
      received++;
    });
    const start = performance.now();
    for (let i = 0; i < events.length; i += 100) {
      await send(name, events.slice(i, i + 100));
    }
    await waitFor(() => received === events.length);
    const millis = performance.now() - start;
    results.throughput = { messages: received, millis, perSecond: received / (millis / 1000) };
  }

  // 2. Diffusion : deux services (deux groupes) reçoivent chacun tous les messages.
  const events = makeEvents(SIZES.broadcast);
  const eventsTopic = await topic("demo-events", 2);
  {
    const counts = { notifications: 0, fraude: 0 };
    for (const service of Object.keys(counts)) {
      await startConsumer(`${service}-${run}`, eventsTopic, () => {
        counts[service]++;
      });
    }
    await send(eventsTopic, events);
    await waitFor(() => counts.notifications === events.length && counts.fraude === events.length);
    results.broadcast = { ...counts, expected: events.length };
  }

  // 3. Partage : deux consommateurs du même groupe se répartissent les partitions.
  {
    const name = await topic("demo-work", 2);
    const counts = { A: 0, B: 0 };
    for (const label of ["A", "B"]) {
      await startConsumer(`work-${run}`, name, async () => {
        await sleep(2);
        counts[label]++;
      });
    }
    await sleep(3000); // laisse le groupe se rééquilibrer entre les deux consommateurs
    const work = makeEvents(SIZES.sharing);
    await send(name, work);
    await waitFor(() => counts.A + counts.B === work.length);
    results.sharing = { ...counts, total: counts.A + counts.B, expected: work.length };
  }

  // 4. Relecture : un nouveau service relit tout l'historique du sujet.
  {
    let received = 0;
    await startConsumer(`latecomer-${run}`, eventsTopic, () => {
      received++;
    });
    await waitFor(() => received === events.length, 8000);
    results.replay = { published: events.length, received };
  }

  // 5. Panne : un consommateur échoue une fois sur le message 5.
  {
    const name = await topic("demo-failure", 1);
    const deliveries = new Map();
    const completedIds = new Set();
    let failedOnce = false;
    await startConsumer(`failure-${run}`, name, (event) => {
      deliveries.set(event.id, (deliveries.get(event.id) ?? 0) + 1);
      if (event.id === SIZES.failingEventId && !failedOnce) {
        failedOnce = true;
        throw new Error("panne simulée");
      }
      completedIds.add(event.id);
    });
    await send(name, makeEvents(SIZES.failure));
    await waitFor(() => completedIds.size === SIZES.failure, 30000);
    const totalDeliveries = [...deliveries.values()].reduce((sum, n) => sum + n, 0);
    results.failure = {
      deliveriesOfFailingMessage: deliveries.get(SIZES.failingEventId) ?? 0,
      extraDeliveries: totalDeliveries - SIZES.failure,
      completed: completedIds.size,
      expected: SIZES.failure,
    };
  }

  await Promise.allSettled(consumers.map((consumer) => consumer.disconnect()));
  await producer.disconnect();
  await admin.disconnect();
  return results;
}
