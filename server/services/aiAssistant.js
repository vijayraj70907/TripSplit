const calculationEngine = require('./calculationEngine');
const db = require('../db');

/**
 * Natural language processor for:
 * 1. Extracting expense details from text (e.g. "I paid ₹850 for dinner for 3 people")
 * 2. Answering trip Q&A queries (e.g. "How much did I spend?", "Who owes me money?", "What is total trip cost?")
 */
function parseExpensePrompt(promptText, members, currentMemberId) {
  const text = promptText.toLowerCase();

  // Extract amount using regex (matches ₹850, 850 rs, rs. 850, 850 INR, or just numbers)
  const amountMatch = promptText.match(/(?:₹|rs\.?|inr)?\s*(\d+(?:\.\d{1,2})?)/i);
  let amount = amountMatch ? parseFloat(amountMatch[1]) : 0;

  // Infer Category from keywords
  let category = 'Other';
  const categoryKeywords = {
    'Food': ['dinner', 'lunch', 'breakfast', 'snack', 'food', 'restaurant', 'pizza', 'burger', 'cafe', 'tea', 'coffee', 'meal', 'swiggy', 'zomato'],
    'Hotel': ['hotel', 'stay', 'room', 'resort', 'airbnb', 'accommodation', 'lodge'],
    'Transport': ['cab', 'taxi', 'uber', 'ola', 'auto', 'flight', 'train', 'bus', 'fare', 'transport'],
    'Fuel': ['fuel', 'petrol', 'diesel', 'gas', 'tank'],
    'Tickets': ['ticket', 'entry', 'monument', 'museum', 'show', 'pass'],
    'Shopping': ['shopping', 'clothes', 'souvenir', 'mall', 'market'],
    'Activities': ['activity', 'scuba', 'boating', 'safari', 'ride', 'sports', 'games', 'beach', 'trekking'],
    'Drinks': ['drinks', 'beer', 'cocktail', 'pub', 'bar', 'wine', 'alcohol'],
    'Parking': ['parking', 'toll', 'fastag']
  };

  for (const [cat, keywords] of Object.entries(categoryKeywords)) {
    if (keywords.some(kw => text.includes(kw))) {
      category = cat;
      break;
    }
  }

  // Extract Title (fallback to category or sentence snippet)
  let title = category + ' expense';
  if (text.includes('dinner')) title = 'Dinner';
  else if (text.includes('lunch')) title = 'Lunch';
  else if (text.includes('breakfast')) title = 'Breakfast';
  else if (text.includes('hotel') || text.includes('stay')) title = 'Hotel Stay';
  else if (text.includes('cab') || text.includes('taxi') || text.includes('uber')) title = 'Cab Ride';
  else if (text.includes('fuel') || text.includes('petrol')) title = 'Fuel fill-up';
  else if (text.includes('drinks') || text.includes('beer')) title = 'Drinks & Party';

  // Identify Payer
  let paidByMember = members.find(m => m.id === currentMemberId) || members[0];
  for (const m of members) {
    const nameLower = m.display_name.toLowerCase();
    if (text.includes(`${nameLower} paid`) || text.includes(`paid by ${nameLower}`)) {
      paidByMember = m;
      break;
    }
  }

  // Identify Participants
  let participantIds = [];
  members.forEach(m => {
    const nameLower = m.display_name.toLowerCase();
    if (text.includes(nameLower) || (nameLower === paidByMember.display_name.toLowerCase() && (text.includes('me') || text.includes('myself') || text.includes('i ')))) {
      participantIds.push(m.id);
    }
  });

  // If text mentions 'all' or 'everyone' or no names found, include all members
  if (text.includes('all') || text.includes('everyone') || participantIds.length === 0) {
    participantIds = members.map(m => m.id);
  }

  // Make sure paidByMember is in participants unless specified otherwise
  if (!participantIds.includes(paidByMember.id)) {
    participantIds.push(paidByMember.id);
  }

  return {
    type: 'expense_parsed',
    data: {
      title,
      amount,
      category,
      paidByMemberId: paidByMember.id,
      paidByName: paidByMember.display_name,
      participantIds,
      participantNames: members.filter(m => participantIds.includes(m.id)).map(m => m.display_name),
      splitMethod: 'equal'
    }
  };
}

function processAIQuery(tripId, promptText, currentMemberId) {
  const text = promptText.toLowerCase();
  const summary = calculationEngine.getTripSummary(tripId);
  const currentMember = summary.members.find(m => m.id === currentMemberId) || summary.members[0];

  // 1. "How much did I spend?"
  if (text.includes('i spend') || text.includes('my spend') || text.includes('my share')) {
    const currency = '₹';
    return {
      type: 'qa_response',
      reply: `You (${currentMember.display_name}) have spent a total of **${currency}${currentMember.totalShare}** as your share for this trip, and you have paid **${currency}${currentMember.totalPaid}** upfront across expenses.`
    };
  }

  // 2. "Who owes me money?" or "who owes who"
  if (text.includes('who owes me') || text.includes('who owes') || text.includes('owe me')) {
    const currency = '₹';
    const myOwedSettlements = summary.simplifiedSettlements.filter(s => s.toId === currentMember.id);
    if (myOwedSettlements.length === 0) {
      if (currentMember.netBalance < -0.01) {
        const myDebts = summary.simplifiedSettlements.filter(s => s.fromId === currentMember.id);
        const debtText = myDebts.map(s => `**${s.toName}** (${currency}${s.amount})`).join(', ');
        return {
          type: 'qa_response',
          reply: `No one owes you money right now. In fact, you owe ${debtText || currency + Math.abs(currentMember.netBalance)} to settle up.`
        };
      }
      return {
        type: 'qa_response',
        reply: `All clear! No one owes you money, and you have no pending debts.`
      };
    }

    const oweList = myOwedSettlements.map(s => `**${s.fromName}** owes you **${currency}${s.amount}**`).join('\n• ');
    return {
      type: 'qa_response',
      reply: `Here is who owes you money:\n\n• ${oweList}`
    };
  }

  // 3. "How much did we spend on food?" or category spending
  if (text.includes('spend on') || text.includes('spent on') || text.includes('category')) {
    const matchedCategory = summary.categoryBreakdown.find(cb => text.includes(cb.category.toLowerCase()));
    const currency = '₹';
    if (matchedCategory) {
      return {
        type: 'qa_response',
        reply: `Total spent on **${matchedCategory.category}** is **${currency}${matchedCategory.amount}** (${matchedCategory.percentage}% of total trip budget).`
      };
    }
    const catList = summary.categoryBreakdown.map(cb => `**${cb.category}**: ${currency}${cb.amount}`).join(', ');
    return {
      type: 'qa_response',
      reply: `Here is the spending breakdown by category:\n${catList}`
    };
  }

  // 4. "Show [member]'s expenses" or member spending
  const mentionedMember = summary.members.find(m => text.includes(m.display_name.toLowerCase()));
  if (mentionedMember) {
    const currency = '₹';
    return {
      type: 'qa_response',
      reply: `**${mentionedMember.display_name}**:\n• Total Paid: **${currency}${mentionedMember.totalPaid}**\n• Total Share: **${currency}${mentionedMember.totalShare}**\n• Net Balance: **${mentionedMember.netBalance >= 0 ? '+' : ''}${currency}${mentionedMember.netBalance}**`
    };
  }

  // 5. "What is total trip cost?"
  if (text.includes('total trip') || text.includes('total cost') || text.includes('total expense') || text.includes('overall cost')) {
    const currency = '₹';
    return {
      type: 'qa_response',
      reply: `The total overall trip cost so far is **${currency}${summary.totalTripExpense}** across **${summary.totalExpensesCount}** expenses.`
    };
  }

  // 6. "Who paid the most?"
  if (text.includes('paid the most') || text.includes('highest spender') || text.includes('who paid most')) {
    const highestPayer = [...summary.members].sort((a, b) => b.totalPaid - a.totalPaid)[0];
    const currency = '₹';
    return {
      type: 'qa_response',
      reply: `**${highestPayer.display_name}** paid the most upfront with a total of **${currency}${highestPayer.totalPaid}**.`
    };
  }

  // Default: Parse as natural language expense input
  return parseExpensePrompt(promptText, summary.members, currentMemberId);
}

module.exports = {
  parseExpensePrompt,
  processAIQuery
};
