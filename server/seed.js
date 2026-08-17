const bcrypt = require('bcryptjs');
const db = require('./db');

function seedDatabase() {
  console.log('Seeding TripSplit database with clean demo data...');

  // Reset store
  db._resetStore();

  // Create Users
  const salt = bcrypt.genSaltSync(10);
  const pwHash = bcrypt.hashSync('password123', salt);

  const usersData = [
    { name: 'Alex Morgan', email: 'alex@example.com', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Alex' },
    { name: 'Sarah Jenkins', email: 'sarah@example.com', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Sarah' },
    { name: 'Kiran Patel', email: 'kiran@example.com', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Kiran' },
    { name: 'Ananya Verma', email: 'ananya@example.com', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Ananya' },
    { name: 'David Miller', email: 'david@example.com', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=David' }
  ];

  const userIds = [];
  usersData.forEach(u => {
    const res = db.prepare('INSERT INTO users (name, email, password_hash, avatar_url) VALUES (?, ?, ?, ?)').run(
      u.name, u.email, pwHash, u.avatar
    );
    userIds.push(res.lastInsertRowid);
  });

  console.log(`Created ${userIds.length} demo users (password: password123).`);

  // Create Demo Trip "GOA TRIP 2026"
  const tripId = 'trip_goa_2026';
  const tripCode = 'GOA7821';
  db.prepare(`
    INSERT INTO trips (id, code, name, description, start_date, end_date, currency, image_url, created_by, budget_limit)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    tripId,
    tripCode,
    'Goa Trip 2026',
    'Sun, sand, seafood and beaches! 🏖️ Annual group trip to North & South Goa.',
    '2026-03-10',
    '2026-03-16',
    '₹',
    'https://images.unsplash.com/photo-1512343879784-a960bf40e7f2?auto=format&fit=crop&w=1200&q=80',
    userIds[0],
    50000
  );

  // Add 5 Members
  const memberIds = [];
  const memberRoles = ['owner', 'member', 'member', 'member', 'member'];
  usersData.forEach((u, idx) => {
    const res = db.prepare(`
      INSERT INTO trip_members (trip_id, user_id, display_name, avatar_url, role)
      VALUES (?, ?, ?, ?, ?)
    `).run(tripId, userIds[idx], u.name.split(' ')[0], u.avatar, memberRoles[idx]);
    memberIds.push(res.lastInsertRowid);
  });

  const [mAlex, mSarah, mKiran, mAnanya, mDavid] = memberIds;

  // Create Linked Family Group (Alex + Sarah)
  const lgStmt = db.prepare('INSERT INTO linked_groups (trip_id, name) VALUES (?, ?)').run(tripId, 'Alex & Sarah (Family)');
  db.prepare('INSERT INTO linked_group_members (group_id, member_id) VALUES (?, ?)').run(lgStmt.lastInsertRowid, mAlex);
  db.prepare('INSERT INTO linked_group_members (group_id, member_id) VALUES (?, ?)').run(lgStmt.lastInsertRowid, mSarah);

  console.log('Created Linked Family Group (Alex + Sarah).');

  // Seed Expenses
  // 1. Hotel & Villa Booking (Equal split)
  const exp1 = db.prepare(`
    INSERT INTO expenses (trip_id, title, total_amount, date, category, split_method, notes, created_by_member_id)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(tripId, 'Beach Resort & Villa', 15000, '2026-03-10', 'Hotel', 'equal', '4 Nights luxury stay at Calangute resort', mAlex);

  db.prepare('INSERT INTO expense_payers (expense_id, member_id, amount_paid) VALUES (?, ?, ?)').run(exp1.lastInsertRowid, mAlex, 15000);
  memberIds.forEach(mId => {
    db.prepare('INSERT INTO expense_participants (expense_id, member_id, share_amount) VALUES (?, ?, ?)').run(exp1.lastInsertRowid, mId, 3000);
  });

  // 2. Seafood Dinner at Baga (Equal split)
  const exp2 = db.prepare(`
    INSERT INTO expenses (trip_id, title, total_amount, date, category, split_method, notes, created_by_member_id)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(tripId, 'Seafood Dinner at Baga', 3500, '2026-03-11', 'Food', 'equal', 'Grilled fish, prawns and drinks', mSarah);

  db.prepare('INSERT INTO expense_payers (expense_id, member_id, amount_paid) VALUES (?, ?, ?)').run(exp2.lastInsertRowid, mSarah, 3500);
  memberIds.forEach(mId => {
    db.prepare('INSERT INTO expense_participants (expense_id, member_id, share_amount) VALUES (?, ?, ?)').run(exp2.lastInsertRowid, mId, 700);
  });

  // 3. Fuel & Tolls (4 People selected)
  const exp3 = db.prepare(`
    INSERT INTO expenses (trip_id, title, total_amount, date, category, split_method, notes, created_by_member_id)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(tripId, 'SUV Fuel & FASTag Tolls', 2000, '2026-03-12', 'Fuel', 'select', 'Full tank refuel for drive to South Goa', mAlex);

  db.prepare('INSERT INTO expense_payers (expense_id, member_id, amount_paid) VALUES (?, ?, ?)').run(exp3.lastInsertRowid, mAlex, 2000);
  [mAlex, mSarah, mKiran, mAnanya].forEach(mId => {
    db.prepare('INSERT INTO expense_participants (expense_id, member_id, share_amount) VALUES (?, ?, ?)').run(exp3.lastInsertRowid, mId, 500);
  });

  // 4. Beach Party & Cocktails (Percentage split: 30%, 20%, 30%, 10%, 10%)
  const exp4 = db.prepare(`
    INSERT INTO expenses (trip_id, title, total_amount, date, category, split_method, notes, created_by_member_id)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(tripId, 'Sunset Beach Party & Drinks', 4500, '2026-03-13', 'Drinks', 'percentage', 'Cocktails and snacks at Curlies', mKiran);

  db.prepare('INSERT INTO expense_payers (expense_id, member_id, amount_paid) VALUES (?, ?, ?)').run(exp4.lastInsertRowid, mKiran, 4500);
  const pShares = [
    { id: mAlex, pct: 30, val: 1350 },
    { id: mSarah, pct: 20, val: 900 },
    { id: mKiran, pct: 30, val: 1350 },
    { id: mAnanya, pct: 10, val: 450 },
    { id: mDavid, pct: 10, val: 450 }
  ];
  pShares.forEach(p => {
    db.prepare('INSERT INTO expense_participants (expense_id, member_id, share_amount, percentage) VALUES (?, ?, ?, ?)').run(exp4.lastInsertRowid, p.id, p.val, p.pct);
  });

  // 5. Scooter Rentals (Custom amount split)
  const exp5 = db.prepare(`
    INSERT INTO expenses (trip_id, title, total_amount, date, category, split_method, notes, created_by_member_id)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(tripId, 'Scooter Rentals for 3 Days', 3000, '2026-03-14', 'Transport', 'custom', '5 Activas rented', mAnanya);

  db.prepare('INSERT INTO expense_payers (expense_id, member_id, amount_paid) VALUES (?, ?, ?)').run(exp5.lastInsertRowid, mAnanya, 3000);
  const cShares = [
    { id: mAlex, custom: 800 },
    { id: mSarah, custom: 800 },
    { id: mKiran, custom: 700 },
    { id: mAnanya, custom: 700 },
    { id: mDavid, custom: 0 }
  ];
  cShares.forEach(p => {
    db.prepare('INSERT INTO expense_participants (expense_id, member_id, share_amount, custom_amount) VALUES (?, ?, ?, ?)').run(exp5.lastInsertRowid, p.id, p.custom, p.custom);
  });

  // 6. Water Sports & Scuba (Select split: Kiran, Ananya, David)
  const exp6 = db.prepare(`
    INSERT INTO expenses (trip_id, title, total_amount, date, category, split_method, notes, created_by_member_id)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(tripId, 'Scuba Diving at Grande Island', 6000, '2026-03-15', 'Activities', 'select', 'Deep sea diving with video', mDavid);

  db.prepare('INSERT INTO expense_payers (expense_id, member_id, amount_paid) VALUES (?, ?, ?)').run(exp6.lastInsertRowid, mDavid, 6000);
  [mKiran, mAnanya, mDavid].forEach(mId => {
    db.prepare('INSERT INTO expense_participants (expense_id, member_id, share_amount) VALUES (?, ?, ?)').run(exp6.lastInsertRowid, mId, 2000);
  });

  // Seed 1 Settlement Payment (Kiran paid Alex ₹1,000)
  db.prepare(`
    INSERT INTO settlements (trip_id, payer_member_id, payee_member_id, amount, date, notes, status)
    VALUES (?, ?, ?, ?, ?, ?, 'completed')
  `).run(tripId, mKiran, mAlex, 1000, '2026-03-14', 'Partial advance settlement via UPI', 'completed');

  // Activity Logs
  db.prepare('INSERT INTO activity_logs (trip_id, user_name, action, details) VALUES (?, ?, ?, ?)').run(tripId, 'Alex', 'created_trip', 'Created trip "Goa Trip 2026"');
  db.prepare('INSERT INTO activity_logs (trip_id, user_name, action, details) VALUES (?, ?, ?, ?)').run(tripId, 'Alex', 'created_linked_group', 'Linked Alex & Sarah as Family Group');
  db.prepare('INSERT INTO activity_logs (trip_id, user_name, action, details) VALUES (?, ?, ?, ?)').run(tripId, 'Kiran', 'settlement_paid', 'Kiran paid Alex ₹1,000');

  console.log('Database successfully seeded with clean demo data!');
}

if (require.main === module) {
  seedDatabase();
}

module.exports = seedDatabase;
