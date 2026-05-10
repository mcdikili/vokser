const { TableClient, AzureNamedKeyCredential } = require('@azure/data-tables');

const tableName = process.env.CASE_TABLE_NAME || 'Cases';
let clientPromise;
const demoStore = new Map();

async function getClient() {
  if (!process.env.AZURE_STORAGE_CONNECTION_STRING) return null;
  if (!clientPromise) {
    const client = TableClient.fromConnectionString(process.env.AZURE_STORAGE_CONNECTION_STRING, tableName);
    clientPromise = client.createTable().catch((error) => {
      if (error.statusCode !== 409) throw error;
    }).then(() => client);
  }
  return clientPromise;
}

function toEntity(item) {
  return { partitionKey: 'CASE', rowKey: item.id, ...item };
}

function fromEntity(entity) {
  const { partitionKey, rowKey, etag, timestamp, ...item } = entity;
  return item;
}

async function listCases() {
  const client = await getClient();
  if (!client) return [...demoStore.values()].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const items = [];
  for await (const entity of client.listEntities({ queryOptions: { filter: `PartitionKey eq 'CASE'` } })) {
    items.push(fromEntity(entity));
  }
  return items.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

async function getCase(id) {
  const client = await getClient();
  if (!client) return demoStore.get(id) || null;
  try {
    const entity = await client.getEntity('CASE', id);
    return fromEntity(entity);
  } catch (error) {
    if (error.statusCode === 404) return null;
    throw error;
  }
}

async function createCase(item) {
  const client = await getClient();
  if (!client) {
    demoStore.set(item.id, item);
    return item;
  }
  await client.createEntity(toEntity(item));
  return item;
}

async function updateCase(id, patch) {
  const existing = await getCase(id);
  if (!existing) return null;
  const updated = { ...existing, ...patch, updatedAt: new Date().toISOString() };
  const client = await getClient();
  if (!client) {
    demoStore.set(id, updated);
    return updated;
  }
  await client.updateEntity(toEntity(updated), 'Merge');
  return updated;
}

module.exports = { listCases, createCase, updateCase, getCase };
