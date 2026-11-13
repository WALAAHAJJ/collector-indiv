import amqp from "amqplib";
import { SIZES, decode, encode, makeEvents, sleep, waitFor } from "./lib/common.js";

const url = process.env.RABBITMQ_URL ?? "amqp://guest:guest@localhost:5672";

export async function runRabbitMq() {
  const connection = await amqp.connect(url);
  const channel = await connection.createConfirmChannel();
  const results = {};
  const queues = [];

  const queue = async (name) => {
    queues.push(name);
    await channel.assertQueue(name, { durable: true });
    await channel.purgeQueue(name);
    return name;
  };

  // 1. Débit : un consommateur, N messages de bout en bout.
  {
    const name = await queue("demo.throughput");
    const events = makeEvents(SIZES.throughput);
    let received = 0;
    const consumer = await channel.consume(name, (message) => {
      if (!message) return;
      received++;
      channel.ack(message);
    });
    const start = performance.now();
    for (const event of events) {
      channel.sendToQueue(name, encode(event), { persistent: true });
    }
    await channel.waitForConfirms();
    await waitFor(() => received === events.length);
    const millis = performance.now() - start;
    await channel.cancel(consumer.consumerTag);
    results.throughput = { messages: received, millis, perSecond: received / (millis / 1000) };
  }

  // 2. Diffusion : deux services reçoivent chacun tous les messages.
  const events = makeEvents(SIZES.broadcast);
  {
    await channel.assertExchange("demo.events", "fanout", { durable: false });
    const counts = { notifications: 0, fraude: 0 };
    for (const service of Object.keys(counts)) {
      const name = await queue(`demo.${service}`);
      await channel.bindQueue(name, "demo.events", "");
      await channel.consume(name, (message) => {
        if (!message) return;
        counts[service]++;
        channel.ack(message);
      });
    }
    for (const event of events) {
      channel.publish("demo.events", "", encode(event), { persistent: true });
    }
    await channel.waitForConfirms();
    await waitFor(() => counts.notifications === events.length && counts.fraude === events.length);
    results.broadcast = { ...counts, expected: events.length };
  }

  // 3. Partage : deux consommateurs du même service se répartissent le travail.
  {
    const name = await queue("demo.work");
    const channelB = await connection.createChannel();
    const counts = { A: 0, B: 0 };
    for (const [label, ch] of [["A", channel], ["B", channelB]]) {
      await ch.prefetch(1);
      await ch.consume(name, async (message) => {
        if (!message) return;
        await sleep(2);
        counts[label]++;
        ch.ack(message);
      });
    }
    const work = makeEvents(SIZES.sharing);
    for (const event of work) {
      channel.sendToQueue(name, encode(event), { persistent: true });
    }
    await channel.waitForConfirms();
    await waitFor(() => counts.A + counts.B === work.length);
    results.sharing = { ...counts, total: counts.A + counts.B, expected: work.length };
    await channelB.close();
  }

  // 4. Relecture : un service qui arrive après la publication retrouve-t-il l'historique ?
  {
    const name = await queue("demo.latecomer");
    await channel.bindQueue(name, "demo.events", "");
    await sleep(300);
    const info = await channel.checkQueue(name);
    results.replay = { published: events.length, received: info.messageCount };
  }

  // 5. Panne : un consommateur échoue une fois sur le message 5.
  {
    const name = await queue("demo.failure");
    const deliveries = new Map();
    const completedIds = new Set();
    let failedOnce = false;
    await channel.consume(name, (message) => {
      if (!message) return;
      const event = decode(message.content);
      deliveries.set(event.id, (deliveries.get(event.id) ?? 0) + 1);
      if (event.id === SIZES.failingEventId && !failedOnce) {
        failedOnce = true;
        channel.nack(message, false, true);
        return;
      }
      completedIds.add(event.id);
      channel.ack(message);
    });
    for (const event of makeEvents(SIZES.failure)) {
      channel.sendToQueue(name, encode(event), { persistent: true });
    }
    await channel.waitForConfirms();
    await waitFor(() => completedIds.size === SIZES.failure);
    const totalDeliveries = [...deliveries.values()].reduce((sum, n) => sum + n, 0);
    results.failure = {
      deliveriesOfFailingMessage: deliveries.get(SIZES.failingEventId) ?? 0,
      extraDeliveries: totalDeliveries - SIZES.failure,
      completed: completedIds.size,
      expected: SIZES.failure,
    };
  }

  for (const name of queues) await channel.deleteQueue(name);
  await channel.deleteExchange("demo.events");
  await connection.close();
  return results;
}
