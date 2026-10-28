import { Account, CategoryGroup, CategoryItem, ParsedInput, TransactionType } from '../types';

export function parseNaturalLanguageInput(
  rawText: string,
  accounts: Account[],
  categoryGroups: CategoryGroup[]
): ParsedInput {
  const text = rawText.trim();
  if (!text) {
    return { type: 'expense', confidence: 0 };
  }

  let type: TransactionType = 'expense';
  let amount: number | undefined;
  let accountId: string | undefined;
  let toAccountId: string | undefined;
  let categoryId: string | undefined;
  let groupId: string | undefined;
  let noteParts: string[] = [];
  let confidence = 0.2;

  // Flatten categories
  const allCategories: CategoryItem[] = [];
  categoryGroups.forEach(g => {
    g.categories.forEach(c => allCategories.push(c));
  });

  const lower = text.toLowerCase();

  // 1. Detect Type
  if (
    lower.includes('transfer') ||
    lower.includes('move') ||
    lower.includes('->') ||
    lower.includes('to savings') ||
    lower.includes('to credit') ||
    lower.includes('to checking')
  ) {
    type = 'transfer';
    confidence += 0.25;
  } else if (
    lower.startsWith('+') ||
    lower.includes('income') ||
    lower.includes('salary') ||
    lower.includes('deposit') ||
    lower.includes('payout')
  ) {
    type = 'income';
    confidence += 0.25;
  }

  // 2. Extract Amount
  // Matches "$123.45", "123.45", "$123", "120"
  const amountMatch = text.match(/(?:\$|\b)(\d+(?:\.\d{1,2})?)\b/);
  if (amountMatch) {
    const val = parseFloat(amountMatch[1]);
    if (!isNaN(val) && val > 0) {
      amount = val;
      confidence += 0.35;
    }
  }

  // 3. Match Accounts
  // Look for "from [account]" or "to [account]" or general mentions
  const fromMatch = lower.match(/from\s+([a-z0-9\s]+?)(?=\s+(?:to|for|on|in|#|\$|\d)|$)/i);
  const toMatch = lower.match(/to\s+([a-z0-9\s]+?)(?=\s+(?:from|for|on|in|#|\$|\d)|$)/i);

  if (fromMatch) {
    const query = fromMatch[1].trim();
    const found = accounts.find(
      a =>
        a.name.toLowerCase().includes(query) ||
        a.type.toLowerCase().includes(query) ||
        (a.institution && a.institution.toLowerCase().includes(query))
    );
    if (found) accountId = found.id;
  }

  if (toMatch) {
    const query = toMatch[1].trim();
    const found = accounts.find(
      a =>
        a.name.toLowerCase().includes(query) ||
        a.type.toLowerCase().includes(query) ||
        (a.institution && a.institution.toLowerCase().includes(query))
    );
    if (found) {
      if (type === 'transfer') {
        toAccountId = found.id;
      } else if (!accountId) {
        accountId = found.id;
      }
    }
  }

  // If no "from" matched, check if any account name is directly mentioned
  if (!accountId) {
    for (const acc of accounts) {
      const accWords = acc.name.toLowerCase().split(/\s+/);
      if (
        lower.includes(acc.name.toLowerCase()) ||
        lower.includes(acc.type.toLowerCase()) ||
        accWords.some(w => w.length > 3 && lower.includes(w))
      ) {
        accountId = acc.id;
        confidence += 0.15;
        break;
      }
    }
  }

  // If transfer and only one account found, try to find another mentioned account
  if (type === 'transfer' && accountId && !toAccountId) {
    for (const acc of accounts) {
      if (acc.id !== accountId) {
        if (lower.includes(acc.name.toLowerCase()) || lower.includes(acc.type.toLowerCase())) {
          toAccountId = acc.id;
          confidence += 0.15;
          break;
        }
      }
    }
  }

  // 4. Match Categories
  // Check category name and keywords
  const categoryKeywords: Record<string, string[]> = {
    'cat-housing': ['rent', 'lease', 'apartment', 'mortgage', 'landlord'],
    'cat-groceries': ['groceries', 'grocery', 'market', 'trader joe', 'whole foods', 'supermarket', 'food shopping'],
    'cat-utilities': ['utility', 'utilities', 'electric', 'power', 'water', 'internet', 'wifi', 'gas bill'],
    'cat-health': ['health', 'doctor', 'pharmacy', 'medicine', 'dental', 'clinic', 'copay'],
    'cat-dining': ['restaurant', 'dining', 'dinner', 'lunch', 'breakfast', 'coffee', 'cafe', 'latte', 'starbucks', 'takeout', 'food'],
    'cat-entertainment': ['cinema', 'movie', 'concert', 'ticket', 'game', 'bar', 'drinks', 'event'],
    'cat-subscriptions': ['subscription', 'netflix', 'spotify', 'apple', 'streaming', 'prime', 'monthly sub'],
    'cat-travel': ['travel', 'flight', 'hotel', 'airbnb', 'vacation', 'airline'],
    'cat-transit': ['gas', 'fuel', 'petrol', 'chevron', 'shell', 'parking', 'uber', 'lyft', 'train', 'subway', 'transit'],
    'cat-tech': ['software', 'laptop', 'hardware', 'figma', 'github', 'saas', 'app'],
    'cat-apparel': ['clothes', 'clothing', 'shoes', 'apparel', 'shirt', 'jacket'],
    'cat-savings-deposit': ['emergency fund', 'savings deposit'],
    'cat-investing': ['invest', 'stocks', 'etf', 'index', 'crypto', 'brokerage'],
  };

  for (const cat of allCategories) {
    const catName = cat.name.toLowerCase();
    const keywords = categoryKeywords[cat.id] || [];
    if (
      lower.includes(catName) ||
      keywords.some(kw => new RegExp(`\\b${kw}\\b`, 'i').test(lower))
    ) {
      categoryId = cat.id;
      groupId = cat.groupId;
      confidence += 0.25;
      break;
    }
  }

  // 5. Build clean note by stripping recognized tokens
  let cleanNote = text;
  if (amountMatch) {
    cleanNote = cleanNote.replace(amountMatch[0], '');
  }
  cleanNote = cleanNote
    .replace(/\b(transfer|move|income|expense|from|to|into|paid|spent|cost|bought)\b/gi, '')
    .replace(/->/g, '')
    .trim();

  // If there's remaining text, use it as note
  if (cleanNote) {
    // Capitalize first letter
    cleanNote = cleanNote.charAt(0).toUpperCase() + cleanNote.slice(1);
  } else if (categoryId) {
    const matchedCat = allCategories.find(c => c.id === categoryId);
    cleanNote = matchedCat ? matchedCat.name : '';
  } else {
    cleanNote = type === 'transfer' ? 'Account transfer' : type === 'income' ? 'Income' : 'Quick expense';
  }

  return {
    amount,
    type,
    accountId,
    toAccountId,
    categoryId,
    groupId,
    note: cleanNote,
    confidence: Math.min(confidence, 1),
  };
}
