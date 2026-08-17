const db = require('../db');

/**
 * Calculates complete financial status for a given trip.
 * 
 * Rules:
 * 1. Total expense = Sum of total_amount for all expenses in trip.
 * 2. Member Paid = Sum of expense_payers.amount_paid for member.
 * 3. Member Share = Sum of expense_participants.share_amount for member.
 * 4. Member Settlement Paid = Sum of settlements.amount where payer_member_id = member.id.
 * 5. Member Settlement Received = Sum of settlements.amount where payee_member_id = member.id.
 * 6. Net Balance = (Paid - Share) + (Settlements Paid - Settlements Received).
 *    - Positive balance (+): Member is owed money.
 *    - Negative balance (-): Member owes money.
 * 7. Linked Group balance = Sum of individual balances of linked members.
 * 8. Debt Simplification minimizes transactions between net debtors and net creditors.
 */
function getTripSummary(tripId) {
  // Fetch members
  const members = db.prepare(`
    SELECT tm.id, tm.trip_id, tm.user_id, tm.display_name, tm.avatar_url, tm.role
    FROM trip_members tm
    WHERE tm.trip_id = ?
    ORDER BY tm.id ASC
  `).all(tripId);

  if (!members.length) {
    return {
      totalTripExpense: 0,
      members: [],
      linkedGroups: [],
      simplifiedSettlements: [],
      categoryBreakdown: [],
      recentExpenses: []
    };
  }

  // Fetch all expenses
  const expenses = db.prepare(`
    SELECT id, title, total_amount, date, category, split_method, notes, receipt_url, created_by_member_id, created_at
    FROM expenses
    WHERE trip_id = ?
  `).all(tripId);

  // Fetch payers
  const payers = db.prepare(`
    SELECT ep.expense_id, ep.member_id, ep.amount_paid
    FROM expense_payers ep
    JOIN expenses e ON e.id = ep.expense_id
    WHERE e.trip_id = ?
  `).all(tripId);

  // Fetch participants
  const participants = db.prepare(`
    SELECT ep.expense_id, ep.member_id, ep.share_amount, ep.percentage, ep.custom_amount
    FROM expense_participants ep
    JOIN expenses e ON e.id = ep.expense_id
    WHERE e.trip_id = ?
  `).all(tripId);

  // Fetch completed settlements
  const settlements = db.prepare(`
    SELECT id, payer_member_id, payee_member_id, amount, date, notes, status, created_at
    FROM settlements
    WHERE trip_id = ? AND status = 'completed'
  `).all(tripId);

  // Calculate totals per member
  const memberStats = {};
  members.forEach(m => {
    memberStats[m.id] = {
      ...m,
      totalPaid: 0,
      totalShare: 0,
      settlementPaid: 0,
      settlementReceived: 0,
      rawBalance: 0,
      netBalance: 0
    };
  });

  payers.forEach(p => {
    if (memberStats[p.member_id]) {
      memberStats[p.member_id].totalPaid += p.amount_paid;
    }
  });

  participants.forEach(pt => {
    if (memberStats[pt.member_id]) {
      memberStats[pt.member_id].totalShare += pt.share_amount;
    }
  });

  settlements.forEach(s => {
    if (memberStats[s.payer_member_id]) {
      memberStats[s.payer_member_id].settlementPaid += s.amount;
    }
    if (memberStats[s.payee_member_id]) {
      memberStats[s.payee_member_id].settlementReceived += s.amount;
    }
  });

  let totalTripExpense = 0;
  expenses.forEach(e => {
    totalTripExpense += e.total_amount;
  });

  const memberList = Object.values(memberStats).map(m => {
    // rawBalance: expense paid - share
    const rawBalance = Math.round((m.totalPaid - m.totalShare) * 100) / 100;
    // netBalance: rawBalance + settlements paid - settlements received
    const netBalance = Math.round((rawBalance + m.settlementPaid - m.settlementReceived) * 100) / 100;

    return {
      ...m,
      totalPaid: Math.round(m.totalPaid * 100) / 100,
      totalShare: Math.round(m.totalShare * 100) / 100,
      settlementPaid: Math.round(m.settlementPaid * 100) / 100,
      settlementReceived: Math.round(m.settlementReceived * 100) / 100,
      rawBalance,
      netBalance
    };
  });

  // Linked Groups processing
  const dbLinkedGroups = db.prepare(`
    SELECT lg.id, lg.name, lg.created_at
    FROM linked_groups lg
    WHERE lg.trip_id = ?
  `).all(tripId);

  const linkedGroups = dbLinkedGroups.map(lg => {
    const lgMembers = db.prepare(`
      SELECT lgm.member_id, tm.display_name, tm.avatar_url
      FROM linked_group_members lgm
      JOIN trip_members tm ON tm.id = lgm.member_id
      WHERE lgm.group_id = ?
    `).all(lg.id);

    const memberIds = lgMembers.map(m => m.member_id);
    let groupPaid = 0;
    let groupShare = 0;
    let groupNetBalance = 0;

    memberIds.forEach(id => {
      const m = memberStats[id];
      if (m) {
        groupPaid += m.totalPaid;
        groupShare += m.totalShare;
        groupNetBalance += m.netBalance;
      }
    });

    return {
      id: lg.id,
      name: lg.name,
      members: lgMembers,
      totalPaid: Math.round(groupPaid * 100) / 100,
      totalShare: Math.round(groupShare * 100) / 100,
      combinedBalance: Math.round(groupNetBalance * 100) / 100
    };
  });

  // Calculate Debt Simplification algorithm
  const simplifiedSettlements = calculateSimplifiedSettlements(memberList);

  // Category breakdown
  const categoryMap = {};
  expenses.forEach(e => {
    categoryMap[e.category] = (categoryMap[e.category] || 0) + e.total_amount;
  });

  const categoryBreakdown = Object.entries(categoryMap).map(([category, amount]) => ({
    category,
    amount: Math.round(amount * 100) / 100,
    percentage: totalTripExpense > 0 ? Math.round((amount / totalTripExpense) * 100) : 0
  })).sort((a, b) => b.amount - a.amount);

  return {
    totalTripExpense: Math.round(totalTripExpense * 100) / 100,
    members: memberList,
    linkedGroups,
    simplifiedSettlements,
    categoryBreakdown,
    totalExpensesCount: expenses.length
  };
}

/**
 * Greedy Debt Simplification Algorithm
 * Takes individual member net balances and computes the minimum necessary payments.
 */
function calculateSimplifiedSettlements(memberList) {
  // Debtors: netBalance < -0.01 (owes money)
  // Creditors: netBalance > 0.01 (owed money)
  const debtors = [];
  const creditors = [];

  memberList.forEach(m => {
    const bal = m.netBalance;
    if (bal < -0.01) {
      debtors.push({ id: m.id, name: m.display_name, avatar: m.avatar_url, amount: Math.abs(bal) });
    } else if (bal > 0.01) {
      creditors.push({ id: m.id, name: m.display_name, avatar: m.avatar_url, amount: bal });
    }
  });

  debtors.sort((a, b) => b.amount - a.amount);
  creditors.sort((a, b) => b.amount - a.amount);

  const transactions = [];
  let i = 0;
  let j = 0;

  while (i < debtors.length && j < creditors.length) {
    const debtor = debtors[i];
    const creditor = creditors[j];

    const amount = Math.min(debtor.amount, creditor.amount);
    const roundedAmount = Math.round(amount * 100) / 100;

    if (roundedAmount > 0) {
      transactions.push({
        fromId: debtor.id,
        fromName: debtor.name,
        fromAvatar: debtor.avatar,
        toId: creditor.id,
        toName: creditor.name,
        toAvatar: creditor.avatar,
        amount: roundedAmount
      });
    }

    debtor.amount -= amount;
    creditor.amount -= amount;

    if (debtor.amount < 0.01) i++;
    if (creditor.amount < 0.01) j++;
  }

  return transactions;
}

module.exports = {
  getTripSummary,
  calculateSimplifiedSettlements
};
