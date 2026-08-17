const fs = require('fs');
const path = require('path');

const dbFile = path.join(__dirname, 'data.json');

let store = {
  users: [],
  trips: [],
  trip_members: [],
  linked_groups: [],
  linked_group_members: [],
  expenses: [],
  expense_payers: [],
  expense_participants: [],
  expense_comments: [],
  settlements: [],
  notifications: [],
  activity_logs: [],
  counters: {
    users: 0,
    trip_members: 0,
    linked_groups: 0,
    linked_group_members: 0,
    expenses: 0,
    expense_payers: 0,
    expense_participants: 0,
    expense_comments: 0,
    settlements: 0,
    notifications: 0,
    activity_logs: 0
  }
};

function loadStore() {
  if (fs.existsSync(dbFile)) {
    try {
      const data = fs.readFileSync(dbFile, 'utf8');
      const loaded = JSON.parse(data);
      store = { ...store, ...loaded };
      if (!store.expense_comments) store.expense_comments = [];
      if (!store.counters.expense_comments) store.counters.expense_comments = 0;
    } catch (err) {
      console.error('Error loading DB file:', err);
      saveStore();
    }
  } else {
    saveStore();
  }
}

function saveStore() {
  fs.writeFileSync(dbFile, JSON.stringify(store, null, 2), 'utf8');
}

loadStore();

class Statement {
  constructor(sql) {
    // Normalize all whitespace (newlines, tabs, multiple spaces) to single space
    this.sql = sql.trim().replace(/\s+/g, ' ');
  }

  run(...params) {
    if (params.length === 1 && Array.isArray(params[0])) params = params[0];
    const sql = this.sql;
    let lastInsertRowid = 0;
    let changes = 0;

    // --- UPDATE trips SET budget_limit ---
    if (sql.startsWith('UPDATE trips SET budget_limit')) {
      const [budget_limit, id] = params;
      const t = store.trips.find(x => x.id === id);
      if (t) {
        t.budget_limit = Number(budget_limit);
        changes = 1;
        saveStore();
      }
      return { changes };
    }

    // --- INSERT INTO users ---
    if (sql.startsWith('INSERT INTO users')) {
      const [name, email, password_hash, avatar_url] = params;
      store.counters.users++;
      const id = store.counters.users;
      store.users.push({ id, name, email, password_hash, avatar_url, created_at: new Date().toISOString() });
      saveStore();
      return { lastInsertRowid: id, changes: 1 };
    }

    // --- UPDATE users ---
    if (sql.startsWith('UPDATE users SET password_hash')) {
      const [password_hash, id] = params;
      const u = store.users.find(x => x.id === Number(id));
      if (u) { u.password_hash = password_hash; saveStore(); }
      return { changes: 1 };
    }

    if (sql.startsWith('UPDATE users SET name = ?, avatar_url = ? WHERE id = ?')) {
      const [name, avatar_url, id] = params;
      const u = store.users.find(x => x.id === Number(id));
      if (u) { u.name = name; u.avatar_url = avatar_url; saveStore(); }
      return { changes: 1 };
    }

    // --- INSERT INTO trips ---
    if (sql.startsWith('INSERT INTO trips')) {
      const [id, code, name, description, start_date, end_date, currency, image_url, created_by, budget_limit] = params;
      store.trips.push({
        id, code, name,
        description: description || '',
        start_date: start_date || '',
        end_date: end_date || '',
        currency: currency || '₹',
        image_url: image_url || '',
        created_by,
        budget_limit: budget_limit ? Number(budget_limit) : 50000,
        created_at: new Date().toISOString()
      });
      saveStore();
      return { lastInsertRowid: id, changes: 1 };
    }

    // --- INSERT INTO trip_members ---
    if (sql.startsWith('INSERT INTO trip_members')) {
      const [trip_id, user_id, display_name, avatar_url, role] = params;
      store.counters.trip_members++;
      const id = store.counters.trip_members;
      store.trip_members.push({ id, trip_id, user_id: user_id ? Number(user_id) : null, display_name, avatar_url, role: role || 'member', joined_at: new Date().toISOString() });
      saveStore();
      return { lastInsertRowid: id, changes: 1 };
    }

    // --- UPDATE trip_members ---
    if (sql.startsWith('UPDATE trip_members SET display_name = ?, avatar_url = ? WHERE user_id = ?')) {
      const [display_name, avatar_url, user_id] = params;
      store.trip_members.forEach(tm => {
        if (tm.user_id === Number(user_id)) { tm.display_name = display_name; tm.avatar_url = avatar_url; }
      });
      saveStore();
      return { changes: 1 };
    }

    if (sql.startsWith('UPDATE trip_members SET display_name = ? WHERE id = ?')) {
      const [display_name, id] = params;
      const tm = store.trip_members.find(x => x.id === Number(id));
      if (tm) { tm.display_name = display_name; saveStore(); }
      return { changes: 1 };
    }

    if (sql.startsWith('DELETE FROM trip_members WHERE id = ?')) {
      const [id] = params;
      const memId = Number(id);
      store.trip_members = store.trip_members.filter(tm => tm.id !== memId);
      store.linked_group_members = store.linked_group_members.filter(lgm => lgm.member_id !== memId);
      saveStore();
      return { changes: 1 };
    }

    // --- INSERT INTO linked_groups ---
    if (sql.startsWith('INSERT INTO linked_groups')) {
      const [trip_id, name] = params;
      store.counters.linked_groups++;
      const id = store.counters.linked_groups;
      store.linked_groups.push({ id, trip_id, name, created_at: new Date().toISOString() });
      saveStore();
      return { lastInsertRowid: id, changes: 1 };
    }

    // --- INSERT INTO linked_group_members ---
    if (sql.startsWith('INSERT INTO linked_group_members')) {
      const [group_id, member_id] = params;
      store.counters.linked_group_members++;
      const id = store.counters.linked_group_members;
      store.linked_group_members.push({ id, group_id: Number(group_id), member_id: Number(member_id) });
      saveStore();
      return { lastInsertRowid: id, changes: 1 };
    }

    // --- DELETE FROM linked_groups ---
    if (sql.startsWith('DELETE FROM linked_groups WHERE id = ?')) {
      const [id] = params;
      const groupNum = Number(id);
      store.linked_groups = store.linked_groups.filter(lg => lg.id !== groupNum);
      store.linked_group_members = store.linked_group_members.filter(lgm => lgm.group_id !== groupNum);
      saveStore();
      return { changes: 1 };
    }

    // --- INSERT INTO expenses ---
    if (sql.startsWith('INSERT INTO expenses')) {
      const [trip_id, title, total_amount, date, category, split_method, notes, receipt_url, created_by_member_id, original_currency, exchange_rate, is_recurring] = params;
      store.counters.expenses++;
      const id = store.counters.expenses;
      store.expenses.push({
        id,
        trip_id,
        title,
        total_amount: Number(total_amount),
        date,
        category,
        split_method: split_method || 'equal',
        notes: notes || '',
        receipt_url: receipt_url || '',
        created_by_member_id: Number(created_by_member_id),
        original_currency: original_currency || '',
        exchange_rate: exchange_rate ? Number(exchange_rate) : 1,
        is_recurring: is_recurring ? 1 : 0,
        created_at: new Date().toISOString()
      });
      saveStore();
      return { lastInsertRowid: id, changes: 1 };
    }

    // --- UPDATE expenses ---
    if (sql.startsWith('UPDATE expenses SET title')) {
      const [title, total_amount, date, category, split_method, notes, receipt_url, original_currency, exchange_rate, is_recurring, id] = params;
      const exp = store.expenses.find(e => e.id === Number(id));
      if (exp) {
        exp.title = title;
        exp.total_amount = Number(total_amount);
        exp.date = date;
        exp.category = category;
        exp.split_method = split_method;
        exp.notes = notes;
        exp.receipt_url = receipt_url;
        exp.original_currency = original_currency || '';
        exp.exchange_rate = exchange_rate ? Number(exchange_rate) : 1;
        exp.is_recurring = is_recurring ? 1 : 0;
        saveStore();
      }
      return { changes: 1 };
    }

    // --- DELETE FROM expenses ---
    if (sql.startsWith('DELETE FROM expenses WHERE id = ?')) {
      const [id] = params;
      const expNum = Number(id);
      store.expenses = store.expenses.filter(e => e.id !== expNum);
      store.expense_payers = store.expense_payers.filter(ep => ep.expense_id !== expNum);
      store.expense_participants = store.expense_participants.filter(ep => ep.expense_id !== expNum);
      store.expense_comments = store.expense_comments.filter(ec => ec.expense_id !== expNum);
      saveStore();
      return { changes: 1 };
    }

    // --- INSERT INTO expense_payers ---
    if (sql.startsWith('INSERT INTO expense_payers')) {
      const [expense_id, member_id, amount_paid] = params;
      store.counters.expense_payers++;
      const id = store.counters.expense_payers;
      store.expense_payers.push({ id, expense_id: Number(expense_id), member_id: Number(member_id), amount_paid: Number(amount_paid) });
      saveStore();
      return { lastInsertRowid: id, changes: 1 };
    }

    if (sql.startsWith('DELETE FROM expense_payers WHERE expense_id = ?')) {
      const [expense_id] = params;
      store.expense_payers = store.expense_payers.filter(ep => ep.expense_id !== Number(expense_id));
      saveStore();
      return { changes: 1 };
    }

    // --- INSERT INTO expense_participants ---
    if (sql.startsWith('INSERT INTO expense_participants')) {
      const [expense_id, member_id, share_amount, percentage, custom_amount] = params;
      store.counters.expense_participants++;
      const id = store.counters.expense_participants;
      store.expense_participants.push({ id, expense_id: Number(expense_id), member_id: Number(member_id), share_amount: Number(share_amount), percentage: percentage !== undefined ? Number(percentage) : null, custom_amount: custom_amount !== undefined ? Number(custom_amount) : null });
      saveStore();
      return { lastInsertRowid: id, changes: 1 };
    }

    if (sql.startsWith('DELETE FROM expense_participants WHERE expense_id = ?')) {
      const [expense_id] = params;
      store.expense_participants = store.expense_participants.filter(ep => ep.expense_id !== Number(expense_id));
      saveStore();
      return { changes: 1 };
    }

    // --- INSERT INTO expense_comments ---
    if (sql.startsWith('INSERT INTO expense_comments')) {
      const [expense_id, member_id, author_name, content] = params;
      store.counters.expense_comments++;
      const id = store.counters.expense_comments;
      store.expense_comments.push({
        id,
        expense_id: Number(expense_id),
        member_id: Number(member_id),
        author_name,
        content,
        created_at: new Date().toISOString()
      });
      saveStore();
      return { lastInsertRowid: id, changes: 1 };
    }

    // --- INSERT INTO settlements ---
    if (sql.startsWith('INSERT INTO settlements')) {
      const [trip_id, payer_member_id, payee_member_id, amount, date, notes, status] = params;
      store.counters.settlements++;
      const id = store.counters.settlements;
      store.settlements.push({ id, trip_id, payer_member_id: Number(payer_member_id), payee_member_id: Number(payee_member_id), amount: Number(amount), date: date || new Date().toISOString().split('T')[0], notes: notes || '', status: status || 'completed', created_at: new Date().toISOString() });
      saveStore();
      return { lastInsertRowid: id, changes: 1 };
    }

    // --- INSERT INTO notifications ---
    if (sql.startsWith('INSERT INTO notifications')) {
      const [trip_id, user_id, message, type] = params;
      store.counters.notifications++;
      const id = store.counters.notifications;
      store.notifications.push({ id, trip_id, user_id: Number(user_id), message, type, is_read: 0, created_at: new Date().toISOString() });
      saveStore();
      return { lastInsertRowid: id, changes: 1 };
    }

    // --- INSERT INTO activity_logs ---
    if (sql.startsWith('INSERT INTO activity_logs')) {
      const [trip_id, user_name, action, details] = params;
      store.counters.activity_logs++;
      const id = store.counters.activity_logs;
      store.activity_logs.push({ id, trip_id, user_name, action, details: details || '', created_at: new Date().toISOString() });
      saveStore();
      return { lastInsertRowid: id, changes: 1 };
    }

    return { lastInsertRowid, changes };
  }

  get(...params) {
    if (params.length === 1 && Array.isArray(params[0])) params = params[0];
    const results = this.all(...params);
    return results.length ? results[0] : undefined;
  }

  all(...params) {
    if (params.length === 1 && Array.isArray(params[0])) params = params[0];
    const sql = this.sql;

    if (sql.includes('FROM users WHERE email = ?')) {
      return store.users.filter(u => u.email.toLowerCase() === String(params[0]).toLowerCase());
    }

    if (sql.includes('FROM users WHERE id = ?')) {
      return store.users.filter(u => u.id === Number(params[0]));
    }

    if (sql.includes('FROM trips t') && sql.includes('WHERE tm.user_id = ?')) {
      const userId = Number(params[0]);
      const myMemberTrips = store.trip_members.filter(tm => tm.user_id === userId);
      const tripIds = new Set(myMemberTrips.map(tm => tm.trip_id));
      return store.trips.filter(t => tripIds.has(t.id)).map(t => ({
        ...t,
        role: myMemberTrips.find(tm => tm.trip_id === t.id)?.role || 'member',
        member_count: store.trip_members.filter(tm => tm.trip_id === t.id).length
      })).sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    }

    if (sql.includes('FROM trips WHERE code = ? OR id = ?')) {
      return store.trips.filter(t => t.code === params[0] || t.id === params[1]);
    }

    if (sql.includes('FROM trips WHERE code = ?')) {
      return store.trips.filter(t => t.code === params[0]);
    }

    if (sql.includes('FROM trips WHERE id = ?')) {
      return store.trips.filter(t => t.id === params[0]);
    }

    if (sql.includes('FROM trip_members tm') && sql.includes('WHERE tm.trip_id = ? AND tm.user_id = ?')) {
      return store.trip_members.filter(tm => tm.trip_id === params[0] && tm.user_id === Number(params[1]))
        .map(tm => ({ member_id: tm.id, user_id: tm.user_id, role: tm.role, display_name: tm.display_name }));
    }

    if (sql.includes('FROM trip_members') && sql.includes('WHERE id = ?')) {
      return store.trip_members.filter(tm => tm.id === Number(params[0]));
    }

    if (sql.includes('FROM trip_members') && sql.includes('user_id = ?')) {
      return store.trip_members.filter(tm => tm.trip_id === params[0] && tm.user_id === Number(params[1]));
    }

    if (sql.includes('FROM trip_members') && sql.includes('display_name = ?')) {
      return store.trip_members.filter(tm => tm.trip_id === params[0] && tm.display_name.toLowerCase() === String(params[1]).toLowerCase());
    }

    if (sql.includes('FROM trip_members') && (sql.includes('WHERE tm.trip_id = ?') || sql.includes('WHERE trip_id = ?'))) {
      return store.trip_members.filter(tm => tm.trip_id === params[0]).sort((a, b) => a.id - b.id);
    }

    if (sql.includes('FROM expenses') && sql.includes('WHERE trip_id = ?')) {
      return store.expenses.filter(e => e.trip_id === params[0]).sort((a, b) => new Date(b.date) - new Date(a.date));
    }

    if (sql.includes('FROM expenses WHERE id = ?')) {
      return store.expenses.filter(e => e.id === Number(params[0]));
    }

    if (sql.includes('FROM expense_payers') && sql.includes('WHERE e.trip_id = ?')) {
      const tripExpIds = new Set(store.expenses.filter(e => e.trip_id === params[0]).map(e => e.id));
      return store.expense_payers.filter(ep => tripExpIds.has(ep.expense_id));
    }

    if (sql.includes('FROM expense_payers WHERE expense_id = ?')) {
      return store.expense_payers.filter(ep => ep.expense_id === Number(params[0]));
    }

    if (sql.includes('FROM expense_participants') && sql.includes('WHERE e.trip_id = ?')) {
      const tripExpIds = new Set(store.expenses.filter(e => e.trip_id === params[0]).map(e => e.id));
      return store.expense_participants.filter(ep => tripExpIds.has(ep.expense_id));
    }

    if (sql.includes('FROM expense_participants WHERE expense_id = ?')) {
      return store.expense_participants.filter(ep => ep.expense_id === Number(params[0]));
    }

    if (sql.includes('FROM expense_comments WHERE expense_id = ?')) {
      return store.expense_comments.filter(ec => ec.expense_id === Number(params[0]))
        .sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
    }

    if (sql.includes('FROM settlements') && sql.includes("status = 'completed'")) {
      return store.settlements.filter(s => s.trip_id === params[0] && s.status === 'completed');
    }

    if (sql.includes('FROM settlements WHERE trip_id = ?')) {
      return store.settlements.filter(s => s.trip_id === params[0]).sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    }

    if (sql.includes('FROM linked_groups') && sql.includes('WHERE lg.trip_id = ?')) {
      return store.linked_groups.filter(lg => lg.trip_id === params[0]);
    }

    if (sql.includes('FROM linked_group_members') && sql.includes('WHERE lgm.group_id = ?')) {
      return store.linked_group_members.filter(lgm => lgm.group_id === Number(params[0])).map(lgm => {
        const tm = store.trip_members.find(m => m.id === lgm.member_id);
        return { member_id: lgm.member_id, display_name: tm ? tm.display_name : 'Member', avatar_url: tm ? tm.avatar_url : '' };
      });
    }

    if (sql.includes('FROM activity_logs WHERE trip_id = ?')) {
      return store.activity_logs.filter(a => a.trip_id === params[0]).sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    }

    return [];
  }
}

const db = {
  exec(sql) {},
  prepare(sql) { return new Statement(sql); },
  _getStore() { return store; },
  _resetStore() {
    store = {
      users: [],
      trips: [],
      trip_members: [],
      linked_groups: [],
      linked_group_members: [],
      expenses: [],
      expense_payers: [],
      expense_participants: [],
      expense_comments: [],
      settlements: [],
      notifications: [],
      activity_logs: [],
      counters: {
        users: 0,
        trip_members: 0,
        linked_groups: 0,
        linked_group_members: 0,
        expenses: 0,
        expense_payers: 0,
        expense_participants: 0,
        expense_comments: 0,
        settlements: 0,
        notifications: 0,
        activity_logs: 0
      }
    };
    saveStore();
  }
};

module.exports = db;
