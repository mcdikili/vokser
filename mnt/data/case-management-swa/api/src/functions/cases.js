const { app } = require('@azure/functions');
const { v4: uuidv4 } = require('uuid');
const { listCases, createCase, updateCase } = require('../storage');

const allowedStatuses = new Set(['New', 'In Progress', 'Waiting on Customer', 'Resolved', 'Closed']);
const allowedPriorities = new Set(['Low', 'Medium', 'High', 'Critical']);

function json(body, status = 200) {
  return { status, jsonBody: body, headers: { 'Content-Type': 'application/json' } };
}

function sanitizeText(value, maxLength) {
  return String(value || '').trim().slice(0, maxLength);
}

function validateCase(payload) {
  const title = sanitizeText(payload.title, 160);
  const description = sanitizeText(payload.description, 5000);
  const requesterName = sanitizeText(payload.requesterName, 120);
  const requesterEmail = sanitizeText(payload.requesterEmail, 240).toLowerCase();
  const category = sanitizeText(payload.category || 'General Support', 80);
  const priority = allowedPriorities.has(payload.priority) ? payload.priority : 'Medium';

  if (title.length < 5) return { error: 'Please enter a title of at least 5 characters.' };
  if (description.length < 20) return { error: 'Please enter a description of at least 20 characters.' };
  if (requesterName.length < 2) return { error: 'Please enter your name.' };
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(requesterEmail)) return { error: 'Please enter a valid email address.' };

  return { title, description, requesterName, requesterEmail, category, priority };
}

app.http('listCases', {
  route: 'cases',
  methods: ['GET'],
  authLevel: 'anonymous',
  handler: async () => {
    try {
      const items = await listCases();
      return json({ items });
    } catch (error) {
      return json({ error: error.message || 'Unable to list cases.' }, 500);
    }
  }
});

app.http('createCase', {
  route: 'cases',
  methods: ['POST'],
  authLevel: 'anonymous',
  handler: async (request) => {
    try {
      const payload = await request.json();
      const validated = validateCase(payload || {});
      if (validated.error) return json({ error: validated.error }, 400);
      const now = new Date();
      const item = {
        id: uuidv4(),
        caseNumber: `CASE-${now.getFullYear()}-${String(Math.floor(Math.random() * 900000) + 100000)}`,
        status: 'New',
        createdAt: now.toISOString(),
        updatedAt: now.toISOString(),
        ...validated
      };
      await createCase(item);
      return json({ item }, 201);
    } catch (error) {
      return json({ error: error.message || 'Unable to create case.' }, 500);
    }
  }
});

app.http('updateCase', {
  route: 'cases/{id}',
  methods: ['PATCH'],
  authLevel: 'anonymous',
  handler: async (request) => {
    try {
      const id = request.params.id;
      const payload = await request.json();
      const patch = {};
      if (payload.status) {
        if (!allowedStatuses.has(payload.status)) return json({ error: 'Invalid status.' }, 400);
        patch.status = payload.status;
      }
      const item = await updateCase(id, patch);
      if (!item) return json({ error: 'Case not found.' }, 404);
      return json({ item });
    } catch (error) {
      return json({ error: error.message || 'Unable to update case.' }, 500);
    }
  }
});
