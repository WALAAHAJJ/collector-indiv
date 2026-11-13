export const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/** Les mêmes événements « prix modifié » pour les deux brokers. */
export function makeEvents(count) {
  return Array.from({ length: count }, (_, id) => ({
    id,
    listingId: `annonce-${id % 20}`,
    oldPrice: 100 + (id % 7),
    newPrice: 90 + (id % 11),
  }));
}

export const encode = (event) => Buffer.from(JSON.stringify(event));
export const decode = (buffer) => JSON.parse(buffer.toString());

/** Attend qu'une condition devienne vraie, ou renvoie false après le délai. */
export async function waitFor(condition, timeoutMs = 20000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    if (condition()) return true;
    await sleep(25);
  }
  return condition();
}

/** Tailles des scénarios, identiques pour RabbitMQ et Kafka. */
export const SIZES = {
  throughput: 2000,
  broadcast: 200,
  sharing: 200,
  failure: 10,
  failingEventId: 5,
};
