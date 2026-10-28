import { Account, CategoryGroup, Transaction, Person, GroupOccasion } from '../types';

export const INITIAL_GROUPS: GroupOccasion[] = [];

export const INITIAL_PEOPLE: Person[] = [];

export const INITIAL_ACCOUNTS: Account[] = [
  {
    id: 'acc-bank',
    name: 'Bank',
    type: 'checking',
    initialBalance: 0,
    currency: 'EUR',
    color: '#09090b',
    icon: 'Landmark',
    institution: 'Bank Account',
  },
  {
    id: 'acc-cash',
    name: 'Cash',
    type: 'cash',
    initialBalance: 0,
    currency: 'EUR',
    color: '#16a34a',
    icon: 'Banknote',
    institution: 'Physical Cash',
  },
];

export const INITIAL_CATEGORY_GROUPS: CategoryGroup[] = [
  {
    id: 'grp-essentials',
    name: 'Living & Essentials',
    targetAllocationPercent: 50,
    kind: 'expense',
    description: 'Food, housing, transit, health, and quick capture',
    categories: [
      {
        id: 'cat-sort-later',
        groupId: 'grp-essentials',
        name: 'Sort Later',
        icon: 'Clock',
        color: '#f59e0b',
        kind: 'expense',
        isDefaultSortLater: true,
        subcategories: [
          { id: 'sub-uncat', name: 'Uncategorized / quick capture', icon: 'Clock' },
        ],
      },
      {
        id: 'cat-food',
        groupId: 'grp-essentials',
        name: 'Food & Dining',
        icon: 'Utensils',
        color: '#ea580c',
        kind: 'expense',
        subcategories: [
          { id: 'sub-groceries', name: 'Supermarket & Groceries', icon: 'ShoppingCart' },
          { id: 'sub-restaurants', name: 'Restaurants & Cafes', icon: 'Utensils' },
          { id: 'sub-takeout', name: 'Takeout & Delivery', icon: 'ShoppingBag' },
          { id: 'sub-snacks', name: 'Snacks & Drinks', icon: 'Coffee' },
        ],
      },
      {
        id: 'cat-housing',
        groupId: 'grp-essentials',
        name: 'Housing & Bills',
        icon: 'Home',
        color: '#09090b',
        kind: 'expense',
        subcategories: [
          { id: 'sub-rent', name: 'Rent / Mortgage', icon: 'Home' },
          { id: 'sub-electricity', name: 'Electricity & Gas', icon: 'Zap' },
          { id: 'sub-water', name: 'Water & Trash', icon: 'Zap' },
          { id: 'sub-internet', name: 'Internet & Mobile', icon: 'Wifi' },
          { id: 'sub-home-repairs', name: 'Home Maintenance', icon: 'Tool' },
        ],
      },
      {
        id: 'cat-transportation',
        groupId: 'grp-essentials',
        name: 'Transportation',
        icon: 'Car',
        color: '#4f46e5',
        kind: 'expense',
        subcategories: [
          { id: 'sub-public-transit', name: 'Public Transit', icon: 'Train' },
          { id: 'sub-fuel', name: 'Fuel & Charging', icon: 'Fuel' },
          { id: 'sub-taxi', name: 'Taxi & Rideshare', icon: 'Car' },
          { id: 'sub-parking', name: 'Parking & Tolls', icon: 'CircleParking' },
          { id: 'sub-vehicle-maint', name: 'Maintenance', icon: 'Tool' },
        ],
      },
      {
        id: 'cat-health',
        groupId: 'grp-essentials',
        name: 'Health & Wellness',
        icon: 'HeartPulse',
        color: '#dc2626',
        kind: 'expense',
        subcategories: [
          { id: 'sub-pharmacy', name: 'Pharmacy & Meds', icon: 'HeartPulse' },
          { id: 'sub-doctor', name: 'Doctor & Dental', icon: 'Activity' },
          { id: 'sub-fitness', name: 'Fitness & Sports', icon: 'Dumbbell' },
          { id: 'sub-personal-care', name: 'Personal Care', icon: 'Scissors' },
        ],
      },
    ],
  },
  {
    id: 'grp-lifestyle',
    name: 'Lifestyle & Fun',
    targetAllocationPercent: 30,
    kind: 'expense',
    description: 'Leisure, entertainment, shopping, and travel',
    categories: [
      {
        id: 'cat-lifestyle-fun',
        groupId: 'grp-lifestyle',
        name: 'Lifestyle & Fun',
        icon: 'Film',
        color: '#9333ea',
        kind: 'expense',
        subcategories: [
          { id: 'sub-entertainment', name: 'Entertainment & Cinema', icon: 'Film' },
          { id: 'sub-subscriptions', name: 'Subscriptions', icon: 'Tv' },
          { id: 'sub-hobbies', name: 'Hobbies & Games', icon: 'Gamepad2' },
          { id: 'sub-books', name: 'Books & Media', icon: 'Book' },
        ],
      },
      {
        id: 'cat-shopping-tech',
        groupId: 'grp-lifestyle',
        name: 'Shopping & Tech',
        icon: 'ShoppingBag',
        color: '#db2777',
        kind: 'expense',
        subcategories: [
          { id: 'sub-clothes', name: 'Clothes & Shoes', icon: 'ShoppingBag' },
          { id: 'sub-electronics', name: 'Electronics', icon: 'Laptop' },
          { id: 'sub-home-goods', name: 'Home Goods', icon: 'Home' },
          { id: 'sub-gifts', name: 'Gifts', icon: 'Gift' },
        ],
      },
      {
        id: 'cat-travel',
        groupId: 'grp-lifestyle',
        name: 'Travel',
        icon: 'Plane',
        color: '#0891b2',
        kind: 'expense',
        subcategories: [
          { id: 'sub-flights', name: 'Flights & Transit', icon: 'Plane' },
          { id: 'sub-stays', name: 'Stays & Hotels', icon: 'Bed' },
          { id: 'sub-activities', name: 'Sightseeing & Activities', icon: 'Compass' },
        ],
      },
    ],
  },
  {
    id: 'grp-income',
    name: 'Income Streams',
    targetAllocationPercent: 0,
    kind: 'income',
    description: 'Salaries, freelance, investments, and other income',
    categories: [
      {
        id: 'cat-salary',
        groupId: 'grp-income',
        name: 'Salary & Wages',
        icon: 'Landmark',
        color: '#16a34a',
        kind: 'income',
        subcategories: [
          { id: 'sub-primary-salary', name: 'Primary Salary', icon: 'Landmark' },
          { id: 'sub-bonuses', name: 'Bonuses', icon: 'Award' },
          { id: 'sub-overtime', name: 'Overtime', icon: 'Clock' },
        ],
      },
      {
        id: 'cat-freelance',
        groupId: 'grp-income',
        name: 'Freelance & Projects',
        icon: 'Laptop',
        color: '#0284c7',
        kind: 'income',
        subcategories: [
          { id: 'sub-client-work', name: 'Client Work', icon: 'Briefcase' },
          { id: 'sub-consulting', name: 'Consulting', icon: 'Briefcase' },
          { id: 'sub-royalties', name: 'Royalties', icon: 'Sparkles' },
        ],
      },
      {
        id: 'cat-investments',
        groupId: 'grp-income',
        name: 'Investments & Savings',
        icon: 'TrendingUp',
        color: '#059669',
        kind: 'income',
        subcategories: [
          { id: 'sub-dividends', name: 'Dividends', icon: 'TrendingUp' },
          { id: 'sub-interest', name: 'Interest', icon: 'Percent' },
          { id: 'sub-capital-gains', name: 'Capital Gains', icon: 'TrendingUp' },
        ],
      },
      {
        id: 'cat-other-income',
        groupId: 'grp-income',
        name: 'Other Income',
        icon: 'ArrowDownLeft',
        color: '#8b5cf6',
        kind: 'income',
        subcategories: [
          { id: 'sub-gifts-inc', name: 'Gifts', icon: 'Gift' },
          { id: 'sub-tax-refunds', name: 'Tax Refunds', icon: 'Receipt' },
          { id: 'sub-reimbursements', name: 'Reimbursements', icon: 'Receipt' },
          { id: 'sub-cashbacks', name: 'Cashbacks', icon: 'RotateCcw' },
        ],
      },
    ],
  },
];

export const INITIAL_TRANSACTIONS: Transaction[] = [];
