const express = require('express');
const db = require('../db');
const { verifyToken, verifyTripMember } = require('../middleware/auth');
const calculationEngine = require('../services/calculationEngine');

const router = express.Router();

// Export Trip Report as CSV
router.get('/export-csv', verifyToken, verifyTripMember, (req, res) => {
  const { tripId } = req.query;
  const trip = db.prepare('SELECT * FROM trips WHERE id = ?').get(tripId);
  const summary = calculationEngine.getTripSummary(tripId);
  const expenses = db.prepare('SELECT * FROM expenses WHERE trip_id = ? ORDER BY date DESC').all(tripId);

  if (!trip) {
    return res.status(404).json({ error: 'Trip not found' });
  }

  let csvContent = `TRIPSPLIT TRIP REPORT: ${trip.name.toUpperCase()}\n`;
  csvContent += `Start Date,${trip.start_date || 'N/A'},End Date,${trip.end_date || 'N/A'},Currency,${trip.currency}\n`;
  csvContent += `Total Trip Expenses,${trip.currency}${summary.totalTripExpense}\n\n`;

  // Member Balances Table
  csvContent += `--- MEMBER SUMMARY ---\n`;
  csvContent += `Member Name,Total Paid (${trip.currency}),Total Share (${trip.currency}),Net Balance (${trip.currency})\n`;
  summary.members.forEach(m => {
    csvContent += `"${m.display_name}",${m.totalPaid},${m.totalShare},${m.netBalance}\n`;
  });

  if (summary.linkedGroups.length) {
    csvContent += `\n--- LINKED FAMILY GROUPS ---\n`;
    csvContent += `Group Name,Members,Combined Paid (${trip.currency}),Combined Share (${trip.currency}),Combined Balance (${trip.currency})\n`;
    summary.linkedGroups.forEach(lg => {
      const names = lg.members.map(m => m.display_name).join(' & ');
      csvContent += `"${lg.name}","${names}",${lg.totalPaid},${lg.totalShare},${lg.combinedBalance}\n`;
    });
  }

  // Expense Details Table
  csvContent += `\n--- EXPENSE HISTORY ---\n`;
  csvContent += `Date,Title,Category,Total Amount (${trip.currency}),Split Method,Paid By\n`;

  expenses.forEach(e => {
    const ep = db.prepare('SELECT * FROM expense_payers WHERE expense_id = ?').all(e.id);
    const payerNames = ep.map(p => {
      const m = summary.members.find(mem => mem.id === p.member_id);
      return m ? m.display_name : 'Member';
    }).join(', ');

    csvContent += `"${e.date}","${e.title}","${e.category}",${e.total_amount},"${e.split_method}","${payerNames}"\n`;
  });

  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', `attachment; filename="${trip.name.replace(/\s+/g, '_')}_Report.csv"`);
  res.send(csvContent);
});

module.exports = router;
