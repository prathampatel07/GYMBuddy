/**
 * Mock Database — GymBuddy
 * JSON file-based storage for local development without MongoDB.
 * Supports Mongoose-compatible API including basic aggregation pipeline simulation.
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_DIR = path.join(__dirname, '..', '..', 'data');

// Ensure data directory exists
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

class MockCollection {
  constructor(name) {
    this.name = name;
    this.filePath = path.join(DATA_DIR, `${name}.json`);
    if (!fs.existsSync(this.filePath)) {
      fs.writeFileSync(this.filePath, JSON.stringify([], null, 2));
    }
  }

  // ── Internal I/O ──────────────────────────────────────────────────────
  read() {
    try {
      const content = fs.readFileSync(this.filePath, 'utf-8');
      return JSON.parse(content);
    } catch {
      return [];
    }
  }

  write(data) {
    fs.writeFileSync(this.filePath, JSON.stringify(data, null, 2));
  }

  _generateId() {
    return Math.random().toString(36).substring(2, 15) + Date.now().toString(36);
  }

  // ── Query helpers ─────────────────────────────────────────────────────
  _matchesQuery(item, query = {}) {
    for (const key in query) {
      const val = query[key];
      // Support $in operator
      if (val && typeof val === 'object' && val.$in) {
        if (!val.$in.includes(item[key])) return false;
      } else if (val && typeof val === 'object' && val.$gte !== undefined) {
        if (item[key] < val.$gte) return false;
      } else if (val && typeof val === 'object' && val.$lte !== undefined) {
        if (item[key] > val.$lte) return false;
      } else {
        if (String(item[key]) !== String(val) && item[key] !== val) return false;
      }
    }
    return true;
  }

  // ── CRUD ──────────────────────────────────────────────────────────────
  async find(query = {}) {
    const items = this.read();
    return items.filter((item) => this._matchesQuery(item, query));
  }

  async findOne(query = {}) {
    const items = this.read();
    return items.find((item) => this._matchesQuery(item, query)) || null;
  }

  async findById(id) {
    const items = this.read();
    return items.find((item) => item.id === id || item._id === id) || null;
  }

  async create(data) {
    const items = this.read();
    const id = this._generateId();
    const newItem = {
      _id: id,
      id,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      ...data,
    };
    items.push(newItem);
    this.write(items);
    return newItem;
  }

  async findByIdAndUpdate(id, updateData, options = { new: true }) {
    const items = this.read();
    const index = items.findIndex((item) => item.id === id || item._id === id);
    if (index === -1) return null;

    let updated = { ...items[index] };
    updated = this._applyUpdate(updated, updateData);
    updated.updatedAt = new Date().toISOString();

    items[index] = updated;
    this.write(items);
    return options.new !== false ? updated : items[index];
  }

  async findOneAndUpdate(query, updateData, options = { new: true }) {
    const items = this.read();
    const index = items.findIndex((item) => this._matchesQuery(item, query));
    if (index === -1) return null;

    let updated = { ...items[index] };
    updated = this._applyUpdate(updated, updateData);
    updated.updatedAt = new Date().toISOString();

    items[index] = updated;
    this.write(items);
    return options.new !== false ? updated : items[index];
  }

  async deleteOne(query = {}) {
    let items = this.read();
    const initialLength = items.length;
    let deleted = false;
    items = items.filter((item) => {
      if (!deleted && this._matchesQuery(item, query)) {
        deleted = true;
        return false;
      }
      return true;
    });
    this.write(items);
    return { deletedCount: initialLength - items.length };
  }

  async countDocuments(query = {}) {
    const items = this.read();
    return items.filter((item) => this._matchesQuery(item, query)).length;
  }

  // ── Update operator engine ─────────────────────────────────────────────
  _applyUpdate(doc, updateData) {
    let updated = { ...doc };

    // $set — set specific fields
    if (updateData.$set) {
      for (const [key, val] of Object.entries(updateData.$set)) {
        updated[key] = val;
      }
    }
    // $unset — remove specific fields
    if (updateData.$unset) {
      for (const key of Object.keys(updateData.$unset)) {
        delete updated[key];
      }
    }
    // $inc — increment numeric fields
    if (updateData.$inc) {
      for (const [key, val] of Object.entries(updateData.$inc)) {
        updated[key] = (updated[key] || 0) + val;
      }
    }
    // $push — append to array
    if (updateData.$push) {
      for (const [key, val] of Object.entries(updateData.$push)) {
        if (!Array.isArray(updated[key])) updated[key] = [];
        updated[key] = [...updated[key], val];
      }
    }
    // $pull — remove matching items from array
    if (updateData.$pull) {
      for (const [key, matcher] of Object.entries(updateData.$pull)) {
        if (Array.isArray(updated[key])) {
          updated[key] = updated[key].filter(
            (item) => !this._matchesQuery(item, matcher)
          );
        }
      }
    }
    // $addToSet — push only if unique
    if (updateData.$addToSet) {
      for (const [key, val] of Object.entries(updateData.$addToSet)) {
        if (!Array.isArray(updated[key])) updated[key] = [];
        if (!updated[key].includes(val)) updated[key] = [...updated[key], val];
      }
    }

    // Direct field assignments (non-operator keys)
    const directUpdates = { ...updateData };
    for (const op of ['$set', '$unset', '$inc', '$push', '$pull', '$addToSet']) {
      delete directUpdates[op];
    }
    if (Object.keys(directUpdates).length > 0) {
      updated = { ...updated, ...directUpdates };
    }

    return updated;
  }

  // ── Aggregation Pipeline (JS simulation) ────────────────────────────────
  /**
   * Simulates a subset of MongoDB aggregation stages for mock mode:
   * Supported stages: $match, $group, $sort, $limit, $skip, $project, $count, $addFields, $unwind
   */
  async aggregate(pipeline = []) {
    let docs = this.read();

    for (const stage of pipeline) {
      const [operator, config] = Object.entries(stage)[0];

      switch (operator) {
        case '$match':
          docs = docs.filter((doc) => this._matchesQuery(doc, config));
          break;

        case '$sort': {
          const sortKeys = Object.entries(config);
          docs = [...docs].sort((a, b) => {
            for (const [key, dir] of sortKeys) {
              const av = a[key], bv = b[key];
              if (av < bv) return -1 * dir;
              if (av > bv) return 1 * dir;
            }
            return 0;
          });
          break;
        }

        case '$limit':
          docs = docs.slice(0, config);
          break;

        case '$skip':
          docs = docs.slice(config);
          break;

        case '$group': {
          const { _id: groupBy, ...accumulators } = config;
          const groups = {};

          for (const doc of docs) {
            // Resolve group key (supports $field references and $dateToString-like string keys)
            let key;
            if (groupBy === null) {
              key = '__all__';
            } else if (typeof groupBy === 'string' && groupBy.startsWith('$')) {
              key = doc[groupBy.slice(1)];
            } else if (typeof groupBy === 'object') {
              // e.g. { year: { $year: '$date' }, week: { $week: '$date' } }
              const keyParts = {};
              for (const [k, expr] of Object.entries(groupBy)) {
                if (typeof expr === 'object') {
                  const [op, field] = Object.entries(expr)[0];
                  const fieldName = typeof field === 'string' ? field.slice(1) : null;
                  const date = fieldName && doc[fieldName] ? new Date(doc[fieldName]) : null;
                  if (op === '$year' && date) keyParts[k] = date.getFullYear();
                  else if (op === '$month' && date) keyParts[k] = date.getMonth() + 1;
                  else if (op === '$week' && date) keyParts[k] = this._getISOWeek(date);
                  else if (op === '$dayOfWeek' && date) keyParts[k] = date.getDay();
                  else keyParts[k] = null;
                } else {
                  keyParts[k] = doc[typeof expr === 'string' ? expr.slice(1) : k];
                }
              }
              key = JSON.stringify(keyParts);
            } else {
              key = String(groupBy);
            }

            if (!groups[key]) {
              groups[key] = { _id: typeof groupBy === 'object' && groupBy !== null ? JSON.parse(key === '__all__' ? '{}' : key) : key };
              // Init accumulators
              for (const [acc, expr] of Object.entries(accumulators)) {
                if (expr.$sum !== undefined) groups[key][acc] = 0;
                else if (expr.$avg !== undefined) { groups[key][acc] = 0; groups[key][`__count_${acc}`] = 0; }
                else if (expr.$count !== undefined) groups[key][acc] = 0;
                else if (expr.$max !== undefined) groups[key][acc] = -Infinity;
                else if (expr.$min !== undefined) groups[key][acc] = Infinity;
                else if (expr.$push !== undefined) groups[key][acc] = [];
                else if (expr.$first !== undefined) groups[key][acc] = undefined;
              }
            }

            // Apply accumulators
            for (const [acc, expr] of Object.entries(accumulators)) {
              const getField = (ref) => {
                if (typeof ref === 'number') return ref;
                if (typeof ref === 'string' && ref.startsWith('$')) return doc[ref.slice(1)] || 0;
                return ref;
              };

              if (expr.$sum !== undefined) groups[key][acc] += Number(getField(expr.$sum)) || 0;
              else if (expr.$avg !== undefined) {
                groups[key][acc] += Number(getField(expr.$avg)) || 0;
                groups[key][`__count_${acc}`]++;
              }
              else if (expr.$count !== undefined) groups[key][acc]++;
              else if (expr.$max !== undefined) {
                const v = getField(expr.$max);
                if (v > groups[key][acc]) groups[key][acc] = v;
              }
              else if (expr.$min !== undefined) {
                const v = getField(expr.$min);
                if (v < groups[key][acc]) groups[key][acc] = v;
              }
              else if (expr.$push !== undefined) groups[key][acc].push(getField(expr.$push));
              else if (expr.$first !== undefined && groups[key][acc] === undefined) {
                groups[key][acc] = getField(expr.$first);
              }
            }
          }

          // Finalize averages
          docs = Object.values(groups).map((g) => {
            for (const [acc, expr] of Object.entries(accumulators)) {
              if (expr.$avg !== undefined) {
                const count = g[`__count_${acc}`] || 1;
                g[acc] = g[acc] / count;
                delete g[`__count_${acc}`];
              }
              if (g[acc] === -Infinity || g[acc] === Infinity) g[acc] = 0;
            }
            return g;
          });
          break;
        }

        case '$project': {
          docs = docs.map((doc) => {
            const projected = {};
            for (const [key, val] of Object.entries(config)) {
              if (val === 1 || val === true) projected[key] = doc[key];
              else if (val === 0 || val === false) { /* exclude */ }
              else if (typeof val === 'string' && val.startsWith('$')) {
                projected[key] = doc[val.slice(1)];
              } else {
                projected[key] = val;
              }
            }
            return projected;
          });
          break;
        }

        case '$addFields': {
          docs = docs.map((doc) => {
            const added = {};
            for (const [key, expr] of Object.entries(config)) {
              if (typeof expr === 'string' && expr.startsWith('$')) {
                added[key] = doc[expr.slice(1)];
              } else {
                added[key] = expr;
              }
            }
            return { ...doc, ...added };
          });
          break;
        }

        case '$unwind': {
          const field = typeof config === 'string' ? config.slice(1) : config.path?.slice(1);
          const newDocs = [];
          for (const doc of docs) {
            const arr = doc[field];
            if (Array.isArray(arr)) {
              arr.forEach((item) => newDocs.push({ ...doc, [field]: item }));
            } else {
              newDocs.push(doc);
            }
          }
          docs = newDocs;
          break;
        }

        case '$count': {
          docs = [{ [config]: docs.length }];
          break;
        }

        default:
          // Unknown stage — pass through
          break;
      }
    }

    return docs;
  }

  _getISOWeek(date) {
    const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
    d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    return Math.ceil(((d - yearStart) / 86400000 + 1) / 7);
  }
}

export const db = {
  users: new MockCollection('users'),
  workouts: new MockCollection('workouts'),
  matches: new MockCollection('matches'),
  streaks: new MockCollection('streaks'),
  rewards: new MockCollection('rewards'),         // Legacy (reward catalog v1)
  rewardItems: new MockCollection('rewardItems'), // New proper catalog
  transactions: new MockCollection('transactions'),
};
